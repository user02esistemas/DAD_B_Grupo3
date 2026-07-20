"use server";

import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/utils";
import bcrypt from "bcrypt";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCustomerProfileByUserId } from "@/lib/customer-profile";
import { Resend } from "resend";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { refundCulqiCharge, verifyCulqiCharge } from "@/lib/culqi";
import { createComplaintCode } from "@/lib/complaints";
import { getPeruDayRange } from "@/lib/dates";
import { headers } from "next/headers";
import { assertRateLimit, rateLimitKey, requestAddress } from "@/lib/rate-limit";

async function checkPublicRateLimit(scope: string, discriminator = "") {
  try {
    const requestHeaders = await headers();
    const address = requestAddress(requestHeaders);
    assertRateLimit(rateLimitKey(scope, address, discriminator), 10, 60_000);
  } catch (err: any) {
    if (err?.message?.includes("outside a request scope") || err?.digest === "DYNAMIC_SERVER_USAGE") {
      return;
    }
    throw new Error("Límite de solicitudes excedido. Intenta de nuevo en 1 minuto.");
  }
}

// Esquemas de Validación (Zod)
const pasajeroSchema = z.object({
  nombres: z.string().regex(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/, "Formato inválido").max(50),
  apellidos: z.string().regex(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/, "Formato inválido").max(50),
  dni: z.string().regex(/^\d{8}$/, "DNI debe tener 8 números"),
  telefono: z.string().regex(/^\d{9}$/, "Celular debe tener 9 números").optional().or(z.literal('')),
});

const checkoutSchema = z.array(z.object({
  seatId: z.string(),
  pasajeroData: pasajeroSchema
})).min(1).max(6);

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char] || char
  ));
}

async function validateCheckoutReservation(
  viajeId: string,
  seatIds: string[],
  guestToken?: string,
  userId?: bigint | null,
) {
  const uniqueSeatIds = [...new Set(seatIds)];
  if (
    !/^\d+$/.test(viajeId) ||
    uniqueSeatIds.length !== seatIds.length ||
    uniqueSeatIds.length === 0 ||
    uniqueSeatIds.length > 6 ||
    uniqueSeatIds.some((id) => !/^\d+$/.test(id))
  ) {
    throw new Error("La selección de asientos no es válida.");
  }

  const asientos = await prisma.asientoViaje.findMany({
    where: { id: { in: uniqueSeatIds.map(BigInt) } },
    include: { viaje: { include: { ruta: true } } },
  });
  if (asientos.length !== uniqueSeatIds.length) throw new Error("Uno o más asientos no existen.");

  const expectedTripId = BigInt(viajeId);
  for (const asiento of asientos) {
    if (asiento.viaje_id !== expectedTripId) throw new Error("Todos los asientos deben pertenecer al mismo viaje.");
    if (asiento.viaje.estado !== "programado") throw new Error("El viaje ya no está disponible para venta.");
    if (asiento.viaje.fecha_salida <= new Date()) throw new Error("No se pueden comprar pasajes para un viaje que ya salió.");
    if (asiento.estado !== "pendiente") throw new Error(`El asiento ${asiento.numero_asiento} ya no está reservado.`);
    const ownedByUser = Boolean(userId) && asiento.bloqueado_por_usuario_id === userId;
    const ownedByToken = Boolean(guestToken) && asiento.bloqueado_por_token === guestToken;
    if (!ownedByUser && !ownedByToken) throw new Error(`El asiento ${asiento.numero_asiento} pertenece a otra reserva.`);
  }

  return {
    asientos,
    total: asientos.reduce((sum, asiento) => sum + Number(asiento.viaje.ruta.precio_base), 0),
  };
}

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return null;
  }
  const user = await prisma.usuario.findUnique({
    where: { id: BigInt(session.user.id) },
    include: { persona: true }
  });
  return user;
}

async function requireLegacyRoles(roles: string[]) {
  const user = await getCurrentUser();
  if (!user || !roles.includes(user.rol)) throw new Error("No autorizado.");
  return user;
}
// Función auxiliar para liberar asientos bloqueados que ya excedieron los 8 minutos
export async function limpiarBloqueosExpirados() {
  try {
    const limiteTiempo = new Date(Date.now() - 8 * 60 * 1000); // 8 minutos atrás
    await prisma.asientoViaje.updateMany({
      where: {
        estado: "pendiente",
        bloqueado_en: {
          lt: limiteTiempo,
        },
      },
      data: {
        estado: "disponible",
        bloqueado_por_usuario_id: null,
        bloqueado_por_token: null,
        bloqueado_en: null,
      } as any,
    });
  } catch (error) {
    console.error("Error limpiando bloqueos de asientos expirados:", error);
  }
}


// 1. buscarEncomiendasPorDNI
export async function buscarEncomiendasPorDNI(dni: string) {
  try {
    // 1. Obtener la sesión del usuario actual
    const sessionUser = await getCurrentUser().catch(() => null);
    if (!sessionUser) {
      throw new Error("No autorizado. Inicie sesión para realizar la búsqueda.");
    }

    // 2. Validar propiedad o rol de staff (admin, vendedor, conductor, operario)
    const isOwner = sessionUser.persona?.dni === dni.trim();
    const isStaff = ["admin", "vendedor", "conductor", "operario"].includes(sessionUser.rol);

    if (!isOwner && !isStaff) {
      throw new Error("No autorizado para consultar encomiendas de otro DNI.");
    }

    const encomiendas = await prisma.encomienda.findMany({
      where: {
        OR: [
          { remitente: { dni: dni.trim() } },
          { destinatario: { dni: dni.trim() } },
        ],
      },
      include: {
        origen: true,
        destino: true,
        viaje: true,
        destinatario: true,
        remitente: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    // Mapear los nombres para la vista pública
    const encomiendasMapeadas = encomiendas.map(enc => ({
      ...enc,
      remitente_nombre: enc.remitente ? `${enc.remitente.nombres} ${enc.remitente.apellidos}` : "Desconocido",
      destinatario_nombre: enc.destinatario ? `${enc.destinatario.nombres} ${enc.destinatario.apellidos}` : "Desconocido"
    }));

    return serializeBigInt(encomiendasMapeadas);
  } catch (error) {
    console.error("Error buscando encomiendas:", error);
    return [];
  }
}

// 2. getLocations
export async function getLocations() {
  try {
    const locs = await prisma.sucursal.findMany({
      orderBy: {
        nombre: "asc",
      },
    });
    return serializeBigInt(locs);
  } catch (error) {
    console.error("Error getting locations:", error);
    return [];
  }
}

// 3. searchTrips
export async function searchTrips(originId: string, destinationId: string, date: string) {
  try {
    await limpiarBloqueosExpirados();
    
    // Rango completo del día solicitado en huso horario de Perú (America/Lima UTC-5)
    const startDate = new Date(`${date}T00:00:00.000-05:00`);
    const endDate = new Date(`${date}T23:59:59.999-05:00`);

    const nowInPeru = new Date();
    const filterStartDate = nowInPeru > startDate && nowInPeru < endDate ? nowInPeru : startDate;

    const trips = await prisma.viaje.findMany({
      where: {
        estado: "programado",
        ruta: {
          origen_id: BigInt(originId),
          destino_id: BigInt(destinationId),
        },
        fecha_salida: {
          gte: filterStartDate,
          lte: endDate,
        },
      },
      include: {
        ruta: {
          include: {
            origen: true,
            destino: true,
          }
        },
        bus: true,
        asientos_viaje: {
          select: {
            estado: true
          }
        },
      },
      orderBy: {
        fecha_salida: "asc",
      },
    });

    const serialized = serializeBigInt(trips);
    return serialized.map((trip: any) => {
      let timeStr = "";
      if (trip.fecha_salida) {
        const d = new Date(trip.fecha_salida);
        timeStr = d.toLocaleTimeString("en-US", {
          timeZone: "America/Lima",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      }

      let available = 0;
      if (trip.asientos_viaje && trip.asientos_viaje.length > 0) {
        available = trip.asientos_viaje.filter((s: any) => s.estado === "disponible").length;
      } else {
        available = trip.bus?.capacidad || 40;
      }

      return {
        ...trip,
        departure_time_formatted: timeStr,
        available_seats: available
      };
    });

  } catch (error) {
    console.error("Error searching trips:", error);
    return [];
  }
}

// 4. getTripSeats
export async function getTripSeats(tripId: string) {
  try {
    await limpiarBloqueosExpirados();
    
    let seats = await prisma.asientoViaje.findMany({
      where: {
        viaje_id: BigInt(tripId),
      },
      orderBy: {
        numero_asiento: "asc",
      },
    });

    if (seats.length === 0) {
      const trip = await prisma.viaje.findUnique({
        where: { id: BigInt(tripId) },
        include: { bus: true }
      });
      const capacity = trip?.bus?.capacidad || 40;
      const pisos = trip?.bus?.pisos || 1;
      const asientosPiso1 = (trip?.bus as any)?.asientos_piso_1 || Math.floor(capacity / 2);
      
      let restringidos: number[] = [];
      if ((trip?.bus as any)?.asientos_restringidos) {
        try {
          restringidos = JSON.parse((trip?.bus as any).asientos_restringidos);
        } catch (e) {}
      }
      
      const newSeatsData = Array.from({ length: capacity }).map((_, i) => {
        const num = i + 1;
        return {
          viaje_id: BigInt(tripId),
          numero_asiento: num,
          piso: pisos === 2 && i >= asientosPiso1 ? 2 : 1,
          estado: (restringidos.includes(num) ? "inactivo" : "disponible") as "inactivo" | "disponible"
        };
      });

      await prisma.asientoViaje.createMany({ data: newSeatsData });

      seats = await prisma.asientoViaje.findMany({
        where: { viaje_id: BigInt(tripId) },
        orderBy: { numero_asiento: "asc" },
      });
    }

    return serializeBigInt(seats);
  } catch (error) {
    console.error("Error getting trip seats:", error);
    return [];
  }
}

// 5. simularPagoYCrearTicket
export async function simularPagoYCrearTicket() {
  throw new Error("Acción deshabilitada por motivos de seguridad.");
}

// 6. getClienteProfile
export async function getClienteProfile(email?: string) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) return null;
    if (email && email.trim().toLowerCase() !== sessionUser.correo.toLowerCase()) return null;
    return await getCustomerProfileByUserId(sessionUser.id);
  } catch (error) {
    console.error("Error al obtener perfil de cliente:", error);
    return null;
  }
}
// 7. updateClienteProfile

export async function updateClienteProfile(
  email: string,
  data: { nombre: string; correo?: string; dni?: string; telefono?: string; newPassword?: string }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser || sessionUser.correo.toLowerCase() !== email.trim().toLowerCase()) {
      return { success: false, error: "No autorizado." };
    }
    const usuario = await prisma.usuario.findUnique({ where: { correo: email } });
    if (!usuario) throw new Error("Usuario no encontrado");

    // Verificar si el nuevo correo electrónico ya está tomado
    if (data.correo && data.correo.trim().toLowerCase() !== email.toLowerCase()) {
      const correoExiste = await prisma.usuario.findUnique({
        where: { correo: data.correo.trim().toLowerCase() }
      });
      if (correoExiste) {
        return { success: false, error: "El correo electrónico ingresado ya está registrado por otra cuenta." };
      }
    }

    const partes = data.nombre.trim().split(" ");
    const nombres = partes[0] || "";
    const apellidos = partes.length > 1 ? partes.slice(1).join(" ") : ".";

    const personaActualizada = await prisma.persona.update({
      where: { id: usuario.persona_id },
      data: {
        nombres: nombres,
        apellidos: apellidos,
        dni: data.dni || undefined,
        telefono: data.telefono || null,
      },
    });

    let usuarioActualizado = usuario;

    // Actualizar el correo si cambió
    if (data.correo && data.correo.trim().toLowerCase() !== email.toLowerCase()) {
      usuarioActualizado = await prisma.usuario.update({
        where: { id: usuario.id },
        data: { correo: data.correo.trim().toLowerCase() },
      });
    }

    // Actualizar contraseña si se ingresó
    if (data.newPassword && data.newPassword.trim().length >= 8) {
      const hashedPassword = await bcrypt.hash(data.newPassword, 12);
      usuarioActualizado = await prisma.usuario.update({
        where: { id: usuario.id },
        data: { contrasena: hashedPassword },
      });
    }

    const { contrasena: _contrasena, ...usuarioSeguro } = usuarioActualizado;
    return { success: true, user: serializeBigInt({ ...usuarioSeguro, persona: personaActualizada }) };
  } catch (error: any) {
    console.error("Error al actualizar perfil:", error);
    let errorMessage = "Ocurrió un error inesperado al guardar los datos.";
    
    // Controlar DNI duplicado
    if (error.code === "P2002" && error.meta?.target?.includes("dni")) {
      errorMessage = "El DNI ingresado ya está registrado por otro cliente.";
    }

    return { success: false, error: errorMessage };
  }
}


// 8. getAdminDashboardStats
export async function getAdminDashboardStats() {
  try {
    await requireLegacyRoles(["admin", "vendedor", "gerente"]);
    const { start: startOfToday } = getPeruDayRange();

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const pasajesHoyCount = await prisma.pasaje.count({
      where: {
        fecha_compra: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    const encomiendasActivasCount = await prisma.encomienda.count({
      where: {
        estado: {
          in: ["recepcionado", "en ruta", "arribado"],
        },
      },
    });

    const busesCount = await prisma.bus.count();

    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const nuevosClientesCount = await prisma.persona.count({
      where: {
        created_at: {
          gte: hace24h,
        },
      },
    });

    const ultimaActividad = await prisma.pasaje.findMany({
      take: 5,
      orderBy: {
        fecha_compra: "desc",
      },
      include: {
        pasajero: true,
        comprador: { select: { id: true, correo: true, rol: true } },
        asiento_viaje: {
          include: {
            viaje: {
              include: {
                ruta: {
                  include: {
                    origen: true,
                    destino: true,
                  },
                },
                bus: true,
              },
            },
          },
        },
      },
    });

    return {
      pasajesHoy: pasajesHoyCount,
      encomiendasActivas: encomiendasActivasCount,
      busesCount: busesCount,
      nuevosClientes: nuevosClientesCount,
      actividadReciente: serializeBigInt(ultimaActividad),
    };
  } catch (error) {
    console.error("Error al obtener estadísticas de admin:", error);
    return {
      pasajesHoy: 0,
      encomiendasActivas: 0,
      busesCount: 0,
      nuevosClientes: 0,
      actividadReciente: [],
    };
  }
}

// 9. getBuses
export async function getBuses() {
  try {
    await requireLegacyRoles(["admin", "gerente"]);
    const buses = await prisma.bus.findMany({
      orderBy: {
        created_at: "desc",
      },
    });
    return serializeBigInt(buses);
  } catch (error) {
    console.error("Error al obtener flota de buses:", error);
    return [];
  }
}

// 10. createBus
export async function createBus(data: { placa: string; marca: string; capacidad: number; pisos: number }) {
  try {
    await requireLegacyRoles(["admin"]);
    const existe = await prisma.bus.findUnique({ where: { placa: data.placa } });
    if (existe) {
      return { success: false, error: "La placa de bus ingresada ya está registrada." };
    }

    const nuevoBus = await prisma.bus.create({
      data: {
        placa: data.placa.toUpperCase(),
        marca: data.marca,
        capacidad: data.capacidad,
        pisos: data.pisos,
      },
    });

    return { success: true, bus: serializeBigInt(nuevoBus) };
  } catch (error: any) {
    console.error("Error al registrar bus:", error);
    return { success: false, error: error.message || "Error inesperado al registrar el bus." };
  }
}

// 11. deleteBus
export async function deleteBus(id: string) {
  try {
    await requireLegacyRoles(["admin"]);
    const tieneViajes = await prisma.viaje.findFirst({
      where: { bus_id: BigInt(id) },
    });

    if (tieneViajes) {
      return { success: false, error: "No se puede eliminar el bus porque está asociado a viajes programados." };
    }

    await prisma.bus.delete({
      where: { id: BigInt(id) },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar bus:", error);
    return { success: false, error: error.message || "Error al eliminar el bus." };
  }
}

// 12. getAdminEncomiendas
export async function getAdminEncomiendas(query?: string) {
  try {
    await requireLegacyRoles(["admin", "vendedor", "gerente"]);
    const whereClause: any = {};

    if (query && query.trim() !== "") {
      const q = query.trim();
      whereClause.OR = [
        { codigo_seguimiento: { contains: q } },
        { remitente_dni: { contains: q } },
        { destinatario_dni: { contains: q } },
        { remitente_nombre: { contains: q } },
        { destinatario_nombre: { contains: q } },
      ];
    }

    const encomiendas = await prisma.encomienda.findMany({
      where: whereClause,
      include: {
        origen: true,
        destino: true,
        viaje: {
          include: {
            ruta: {
              include: {
                origen: true,
                destino: true,
              },
            },
            bus: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return serializeBigInt(encomiendas);
  } catch (error) {
    console.error("Error al obtener encomiendas para admin:", error);
    return [];
  }
}

// 13. createEncomienda
export async function createEncomienda(data: {
  remitente_nombre: string;
  remitente_dni: string;
  destinatario_nombre: string;
  destinatario_dni: string;
  origen_id: string;
  destino_id: string;
  peso_kg: number;
  descripcion?: string;
  precio: number;
  viaje_id?: string;
}) {
  try {
    await requireLegacyRoles(["admin", "vendedor"]);
    const result = await prisma.$transaction(async (tx) => {
      let codigo = "";
      let esUnico = false;

      while (!esUnico) {
        codigo = `ENT-${randomBytes(16).toString("hex").toUpperCase()}`;
        const existe = await tx.encomienda.findUnique({ where: { codigo_seguimiento: codigo } });
        if (!existe) esUnico = true;
      }

      const getNames = (fullName: string) => {
        const parts = fullName.trim().split(/\s+/);
        const nombres = parts.slice(0, Math.ceil(parts.length / 2)).join(" ");
        const apellidos = parts.slice(Math.ceil(parts.length / 2)).join(" ") || "-";
        return { nombres, apellidos };
      };

      const remNames = getNames(data.remitente_nombre);
      const remitente = await tx.persona.upsert({
        where: { dni: data.remitente_dni },
        create: { nombres: remNames.nombres, apellidos: remNames.apellidos, dni: data.remitente_dni },
        update: {},
      });

      const destNames = getNames(data.destinatario_nombre);
      const destinatario = await tx.persona.upsert({
        where: { dni: data.destinatario_dni },
        create: { nombres: destNames.nombres, apellidos: destNames.apellidos, dni: data.destinatario_dni },
        update: {},
      });

      const nuevaEncomienda = await tx.encomienda.create({
        data: {
          codigo_seguimiento: codigo,
          remitente_id: remitente.id,
          destinatario_id: destinatario.id,
          origen_id: BigInt(data.origen_id),
          destino_id: BigInt(data.destino_id),
          peso_kg: data.peso_kg,
          descripcion: data.descripcion || null,
          precio: data.precio,
          viaje_id: data.viaje_id ? BigInt(data.viaje_id) : null,
          estado: "recepcionado",
        },
      });
      return nuevaEncomienda;
    });

    return { success: true, encomienda: serializeBigInt(result) };
  } catch (error: any) {
    console.error("Error al registrar encomienda:", error);
    return { success: false, error: error.message || "Error al registrar la encomienda." };
  }
}

// 14. updateEncomiendaEstado
export async function updateEncomiendaEstado(id: string, nuevoEstado: string) {
  try {
    await requireLegacyRoles(["admin", "vendedor"]);
    const actualizada = await prisma.encomienda.update({
      where: { id: BigInt(id) },
      data: { estado: nuevoEstado },
    });
    return { success: true, encomienda: serializeBigInt(actualizada) };
  } catch (error: any) {
    console.error("Error al actualizar estado de encomienda:", error);
    return { success: false, error: error.message || "Error al cambiar el estado." };
  }
}

// 15. getAdminPasajes
export async function getAdminPasajes() {
  try {
    await requireLegacyRoles(["admin", "vendedor", "gerente"]);
    const pasajes = await prisma.pasaje.findMany({
      include: {
        pasajero: true,
        comprador: { select: { id: true, correo: true, rol: true } },
        asiento_viaje: {
          include: {
            viaje: {
              include: {
                ruta: {
                  include: {
                    origen: true,
                    destino: true,
                  },
                },
                bus: true,
              },
            },
          },
        },
      },
      orderBy: {
        fecha_compra: "desc",
      },
    });
    return serializeBigInt(pasajes);
  } catch (error) {
    console.error("Error al obtener historial de pasajes:", error);
    return [];
  }
}

// 16. venderPasajePresencial
export async function venderPasajePresencial(
  asientoViajeId: string,
  clienteDni: string,
  clienteNombre: string,
  precio: number
) {
  try {
    await requireLegacyRoles(["admin", "vendedor"]);
    const nameParts = clienteNombre.trim().split(/\s+/);
    const nombres = nameParts.slice(0, Math.ceil(nameParts.length / 2)).join(" ");
    const apellidos = nameParts.slice(Math.ceil(nameParts.length / 2)).join(" ") || "-";

    const result = await prisma.$transaction(async (tx) => {
      const seat = await tx.asientoViaje.findUnique({
        where: { id: BigInt(asientoViajeId) },
      });

      if (!seat || seat.estado !== "disponible") {
        throw new Error("Asiento ya ocupado o no disponible.");
      }

      await tx.asientoViaje.update({
        where: { id: BigInt(asientoViajeId) },
        data: { estado: "vendido" },
      });

      // Validar que el pasajero no tenga otro pasaje para el mismo viaje
      const pasajeExistente = await tx.pasaje.findFirst({
        where: {
          pasajero: { dni: clienteDni },
          asiento_viaje: { viaje_id: seat.viaje_id }
        }
      });

      if (pasajeExistente) {
        throw new Error(`El pasajero con DNI ${clienteDni} ya tiene un pasaje registrado para este viaje.`);
      }

      const persona = await tx.persona.upsert({
        where: { dni: clienteDni },
        create: {
          nombres: nombres,
          apellidos: apellidos,
          dni: clienteDni,
        },
        update: {},
      });

      const pasaje = await tx.pasaje.create({
        data: {
          asiento_viaje_id: BigInt(asientoViajeId),
          persona_id: persona.id,
          comprador_id: null,
          precio: precio,
          codigo_qr: `QR-PRES-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now()}`,
        },
      });

      return pasaje;
    });

    return { success: true, pasaje: serializeBigInt(result) };
  } catch (error: any) {
    console.error("Error en venta presencial de pasaje:", error);
    return { success: false, error: error.message || "Error al procesar la venta presencial." };
  }
}

// 17. getRutas
export async function getRutas() {
  try {
    await requireLegacyRoles(["admin", "vendedor", "gerente"]);
    const rutas = await prisma.ruta.findMany({
      include: {
        origen: true,
        destino: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });
    return serializeBigInt(rutas);
  } catch (error) {
    console.error("Error al obtener rutas:", error);
    return [];
  }
}

// 18. createRuta
export async function createRuta(data: {
  origen_id: string;
  destino_id: string;
  duracion_estimada_minutos: number;
  precio_base: number;
}) {
  try {
    await requireLegacyRoles(["admin"]);
    if (data.origen_id === data.destino_id) {
      return { success: false, error: "El origen y el destino de la ruta no pueden ser iguales." };
    }

    const existe = await prisma.ruta.findFirst({
      where: {
        origen_id: BigInt(data.origen_id),
        destino_id: BigInt(data.destino_id),
      },
    });

    if (existe) {
      return { success: false, error: "Ya existe una ruta configurada con este origen y destino." };
    }

    const nuevaRuta = await prisma.ruta.create({
      data: {
        origen_id: BigInt(data.origen_id),
        destino_id: BigInt(data.destino_id),
        duracion_estimada_minutos: data.duracion_estimada_minutos,
        precio_base: data.precio_base,
      },
    });

    return { success: true, ruta: serializeBigInt(nuevaRuta) };
  } catch (error: any) {
    console.error("Error al crear ruta:", error);
    return { success: false, error: error.message || "Error al registrar la ruta." };
  }
}

// 19. deleteRuta
export async function deleteRuta(id: string) {
  try {
    await requireLegacyRoles(["admin"]);
    const tieneViajes = await prisma.viaje.findFirst({
      where: { ruta_id: BigInt(id) },
    });

    if (tieneViajes) {
      return { success: false, error: "No se puede eliminar la ruta porque posee viajes programados asociados." };
    }

    await prisma.ruta.delete({
      where: { id: BigInt(id) },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar ruta:", error);
    return { success: false, error: error.message || "Error al eliminar la ruta." };
  }
}

// 20. getViajesAdmin
export async function getViajesAdmin() {
  try {
    await requireLegacyRoles(["admin", "vendedor", "gerente"]);
    const viajes = await prisma.viaje.findMany({
      include: {
        ruta: {
          include: {
            origen: true,
            destino: true,
          },
        },
        bus: true,
        asientos_viaje: true,
      },
      orderBy: {
        fecha_salida: "desc",
      },
    });

    const serialized = serializeBigInt(viajes);
    return serialized.map((trip: any) => {
      let timeStr = "";
      if (trip.fecha_salida) {
        const d = new Date(trip.fecha_salida);
        timeStr = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
      }

      let sold = 0;
      if (trip.asientos_viaje) {
        sold = trip.asientos_viaje.filter((s: any) => s.estado === "vendido").length;
      }

      return {
        ...trip,
        departure_time_formatted: timeStr,
        sold_seats: sold,
      };
    });
  } catch (error) {
    console.error("Error al obtener viajes de administración:", error);
    return [];
  }
}

// 21. createViaje
export async function createViaje(data: { ruta_id: string; bus_id: string; fecha_salida: string }) {
  try {
    await requireLegacyRoles(["admin", "vendedor"]);
    const ruta = await prisma.ruta.findUnique({
      where: { id: BigInt(data.ruta_id) },
    });

    if (!ruta) {
      return { success: false, error: "Ruta no encontrada." };
    }

    const bus = await prisma.bus.findUnique({
      where: { id: BigInt(data.bus_id) },
    });

    if (!bus) {
      return { success: false, error: "Bus no encontrado." };
    }

    const fechaSalida = new Date(data.fecha_salida);
    const fechaLlegada = new Date(fechaSalida.getTime() + ruta.duracion_estimada_minutos * 60 * 1000);

    const nuevoViaje = await prisma.viaje.create({
      data: {
        ruta_id: BigInt(data.ruta_id),
        bus_id: BigInt(data.bus_id),
        fecha_salida: fechaSalida,
        fecha_llegada: fechaLlegada,
        estado: "programado",
      },
    });

    const capacity = bus.capacidad;
    const pisos = bus.pisos;
    const asientosData = Array.from({ length: capacity }).map((_, i) => ({
      viaje_id: nuevoViaje.id,
      numero_asiento: i + 1,
      piso: pisos === 2 && i >= capacity / 2 ? 2 : 1,
      estado: "disponible" as const,
    }));

    await prisma.asientoViaje.createMany({
      data: asientosData,
    });

    return { success: true, viaje: serializeBigInt(nuevoViaje) };
  } catch (error: any) {
    console.error("Error al crear viaje:", error);
    return { success: false, error: error.message || "Error al crear el viaje." };
  }
}

// 22. updateViajeEstado
export async function updateViajeEstado(id: string, nuevoEstado: string) {
  try {
    await requireLegacyRoles(["admin", "vendedor"]);
    const actualizado = await prisma.viaje.update({
      where: { id: BigInt(id) },
      data: { estado: nuevoEstado },
    });
    return { success: true, viaje: serializeBigInt(actualizado) };
  } catch (error: any) {
    console.error("Error al actualizar estado de viaje:", error);
    return { success: false, error: error.message || "Error al cambiar el estado del viaje." };
  }
}

// 23. deleteViaje
export async function deleteViaje(id: string) {
  try {
    await requireLegacyRoles(["admin"]);
    const tieneVentas = await prisma.asientoViaje.findFirst({
      where: {
        viaje_id: BigInt(id),
        estado: "vendido",
      },
    });

    if (tieneVentas) {
      return { success: false, error: "No se puede eliminar el viaje porque posee asientos ya vendidos." };
    }

    await prisma.viaje.delete({
      where: { id: BigInt(id) },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar viaje:", error);
    return { success: false, error: error.message || "Error al eliminar el viaje." };
  }
}

// 24. updateBus
export async function updateBus(id: string, data: { placa: string; marca: string; capacidad: number; pisos: number }) {
  try {
    await requireLegacyRoles(["admin"]);
    const existePlaca = await prisma.bus.findFirst({
      where: {
        placa: data.placa.toUpperCase(),
        NOT: { id: BigInt(id) },
      },
    });

    if (existePlaca) {
      return { success: false, error: "La placa ingresada ya está registrada en otro bus." };
    }

    const actualizado = await prisma.bus.update({
      where: { id: BigInt(id) },
      data: {
        placa: data.placa.toUpperCase(),
        marca: data.marca,
        capacidad: data.capacidad,
        pisos: data.pisos,
      },
    });

    return { success: true, bus: serializeBigInt(actualizado) };
  } catch (error: any) {
    console.error("Error al editar bus:", error);
    return { success: false, error: error.message || "Error al actualizar el bus." };
  }
}

// 25. updateRuta
export async function updateRuta(
  id: string,
  data: { origen_id: string; destino_id: string; duracion_estimada_minutos: number; precio_base: number }
) {
  try {
    await requireLegacyRoles(["admin"]);
    if (data.origen_id === data.destino_id) {
      return { success: false, error: "El origen y el destino de la ruta no pueden ser iguales." };
    }

    const existeDuplicada = await prisma.ruta.findFirst({
      where: {
        origen_id: BigInt(data.origen_id),
        destino_id: BigInt(data.destino_id),
        NOT: { id: BigInt(id) },
      },
    });

    if (existeDuplicada) {
      return { success: false, error: "Ya existe otra ruta configurada con ese origen y destino." };
    }

    const actualizada = await prisma.ruta.update({
      where: { id: BigInt(id) },
      data: {
        origen_id: BigInt(data.origen_id),
        destino_id: BigInt(data.destino_id),
        duracion_estimada_minutos: data.duracion_estimada_minutos,
        precio_base: data.precio_base,
      },
    });

    return { success: true, ruta: serializeBigInt(actualizada) };
  } catch (error: any) {
    console.error("Error al editar ruta:", error);
    return { success: false, error: error.message || "Error al actualizar la ruta." };
  }
}

// 26. updateViaje
export async function updateViaje(id: string, data: { ruta_id: string; bus_id: string; fecha_salida: string }) {
  try {
    await requireLegacyRoles(["admin", "vendedor"]);
    const viajeActual = await prisma.viaje.findUnique({
      where: { id: BigInt(id) },
      include: { asientos_viaje: true, bus: true },
    });

    if (!viajeActual) {
      return { success: false, error: "Viaje no encontrado." };
    }

    const ruta = await prisma.ruta.findUnique({
      where: { id: BigInt(data.ruta_id) },
    });

    if (!ruta) {
      return { success: false, error: "Ruta no encontrada." };
    }

    const bus = await prisma.bus.findUnique({
      where: { id: BigInt(data.bus_id) },
    });

    if (!bus) {
      return { success: false, error: "Bus no encontrado." };
    }

    if (viajeActual.bus_id !== BigInt(data.bus_id)) {
      const vendidosCount = viajeActual.asientos_viaje.filter((s: any) => s.estado === "vendido").length;
      if (bus.capacidad < vendidosCount) {
        return {
          success: false,
          error: `No se puede asignar este bus. El viaje posee ${vendidosCount} asientos ya vendidos, pero la capacidad del nuevo bus es de solo ${bus.capacidad} asientos.`,
        };
      }

      await prisma.$transaction(async (tx) => {
        await tx.asientoViaje.deleteMany({
          where: {
            viaje_id: BigInt(id),
            estado: { not: "vendido" },
          },
        });

        const vendidos = await tx.asientoViaje.findMany({
          where: { viaje_id: BigInt(id), estado: "vendido" },
        });
        const numerosVendidos = vendidos.map((s: any) => s.numero_asiento);

        const capacity = bus.capacidad;
        const pisos = bus.pisos;
        
        const nuevosAsientosData: any[] = [];
        for (let i = 1; i <= capacity; i++) {
          if (!numerosVendidos.includes(i)) {
            nuevosAsientosData.push({
              viaje_id: BigInt(id),
              numero_asiento: i,
              piso: pisos === 2 && i > capacity / 2 ? 2 : 1,
              estado: "disponible",
            });
          }
        }

        if (nuevosAsientosData.length > 0) {
          await tx.asientoViaje.createMany({
            data: nuevosAsientosData,
          });
        }
      });
    }

    const fechaSalida = new Date(data.fecha_salida);
    const fechaLlegada = new Date(fechaSalida.getTime() + ruta.duracion_estimada_minutos * 60 * 1000);

    const actualizado = await prisma.viaje.update({
      where: { id: BigInt(id) },
      data: {
        ruta_id: BigInt(data.ruta_id),
        bus_id: BigInt(data.bus_id),
        fecha_salida: fechaSalida,
        fecha_llegada: fechaLlegada,
      },
    });

    return { success: true, viaje: serializeBigInt(actualizado) };
  } catch (error: any) {
    console.error("Error al actualizar viaje:", error);
    return { success: false, error: error.message || "Error al actualizar el viaje." };
  }
}

export async function crearOrdenCulqi(
  amount: number, 
  email: string, 
  firstName: string, 
  lastName: string, 
  phone: string,
  seatIds?: string[]
) {
  try {
    const SECRET_KEY = process.env.CULQI_SECRET_KEY;
    if (!SECRET_KEY) {
      throw new Error("CULQI_SECRET_KEY no está configurada en las variables de entorno.");
    }

    // Validar monto contra precios en base de datos si se proveen seatIds
    if (seatIds && Array.isArray(seatIds) && seatIds.length > 0) {
      const asientos = await prisma.asientoViaje.findMany({
        where: { id: { in: seatIds.map(id => BigInt(id)) } },
        include: { viaje: { include: { ruta: true } } }
      });
      if (asientos.length === 0) {
        throw new Error("Los asientos seleccionados no existen.");
      }
      const totalEsperado = asientos.reduce((acc, a) => acc + Number(a.viaje.ruta.precio_base), 0);
      if (Math.abs(totalEsperado - amount) > 0.01) {
        throw new Error("El monto de pago no coincide con el precio de los asientos en el sistema.");
      }
    }

    const response = await fetch("https://api.culqi.com/v2/orders", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency_code: "PEN",
        description: "Pasajes de Bus El Cumbe",
        order_number: `CUMBE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        client_details: {
          first_name: firstName || "Cliente",
          last_name: lastName || "Cumbe",
          email: email,
          phone_number: phone || "+51900000000"
        },
        expiration_date: Math.floor(Date.now() / 1000) + 24 * 60 * 60 // Expira en 1 día
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Culqi Order Error Response:", data);
      return { success: false, error: data.user_message || "Error al crear la orden" };
    }

    return { success: true, orderId: data.id };
  } catch (error: any) {
    console.error("Error al crear orden en Culqi:", error);
    return { success: false, error: error.message || "Error de conexión" };
  }
}

export async function crearCargoCulqi(
  tokenId: string,
  email: string,
  amount: number,
  seatIds: string[],
  viajeId: string,
  guestToken?: string,
) {
  try {
    const SECRET_KEY = process.env.CULQI_SECRET_KEY;
    if (!SECRET_KEY) {
      throw new Error("CULQI_SECRET_KEY no está configurada en las variables de entorno.");
    }

    const session = await getServerSession(authOptions);
    const currentUser = session?.user?.id
      ? await prisma.usuario.findUnique({ where: { id: BigInt(session.user.id) }, select: { id: true } })
      : null;
    const reservation = await validateCheckoutReservation(viajeId, seatIds, guestToken, currentUser?.id);
    if (Math.abs(reservation.total - amount) > 0.01) {
      throw new Error("El monto de pago no coincide con el precio de los asientos en el sistema.");
    }

    const response = await fetch("https://api.culqi.com/v2/charges", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Centavos
        currency_code: "PEN",
        email: email,
        source_id: tokenId,
        capture: true,
        metadata: {
          viaje_id: viajeId,
          asiento_ids: seatIds.join(","),
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.user_message || "Error al procesar el pago con Culqi" };
    }

    return { success: true, chargeId: data.id };
  } catch (error: any) {
    console.error("Error al crear cargo en Culqi:", error);
    return { success: false, error: error.message || "Error en el servidor de pagos" };
  }
}

export async function procesarPagoMultiplesAsientosCulqi(
  viajeId: string,
  asientosPasajeros: {
    seatId: string;
    pasajeroData: { nombres: string; apellidos: string; dni: string; telefono?: string };
  }[],
  amount: number,
  chargeId: string,
  email?: string,
  guestToken?: string
) {
  let verifiedCharge = false;
  try {
    // Validación de seguridad estricta en el servidor con Zod
    try {
      checkoutSchema.parse(asientosPasajeros);
    } catch (e: any) {
      console.error("Fallo de validación Zod:", e.errors);
      return { success: false, error: "Datos de pasajeros inválidos, manipulados o con formato incorrecto." };
    }

    const uniqueSeatIds = [...new Set(asientosPasajeros.map((item) => item.seatId))];
    if (uniqueSeatIds.length !== asientosPasajeros.length) {
      return { success: false, error: "No se puede comprar el mismo asiento más de una vez." };
    }

    let userId: bigint | null = null;
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const user = await prisma.usuario.findUnique({ where: { id: BigInt(session.user.id) } });
      userId = user?.id ?? null;
    }

    const reservation = await validateCheckoutReservation(viajeId, uniqueSeatIds, guestToken, userId);
    if (Math.abs(reservation.total - amount) > 0.01) {
      throw new Error("El monto no coincide con el precio vigente de los asientos.");
    }
    await verifyCulqiCharge(chargeId, reservation.total, email);
    verifiedCharge = true;

    const result = await prisma.$transaction(async (tx) => {
      const pagoExistente = await tx.pago.findFirst({ where: { preference_id: chargeId }, select: { id: true } });
      if (pagoExistente) throw new Error("CHARGE_ALREADY_PROCESSED");

      const tickets = [];
      const paymentAmountPerSeat = reservation.total / asientosPasajeros.length;

      for (const item of asientosPasajeros) {
        // Validar que el asiento exista y esté en estado 'pendiente' (reservado por el usuario temporalmente)
        const asientoActual = await tx.asientoViaje.findUnique({
          where: { id: BigInt(item.seatId) },
          include: { viaje: true },
        });

        if (!asientoActual) {
          throw new Error("El asiento seleccionado no existe.");
        }

        if (asientoActual.estado !== "pendiente") {
          throw new Error(`El asiento número ${asientoActual.numero_asiento} ya no está reservado (estado actual: ${asientoActual.estado}). Su tiempo de reserva de 8 minutos pudo haber expirado.`);
        }

        if (asientoActual.viaje_id !== BigInt(viajeId) || asientoActual.viaje.estado !== "programado") {
          throw new Error("El asiento no pertenece a un viaje disponible.");
        }

        // Validar propiedad de la reserva del asiento
        if (userId) {
          const reservadoPorUsuario = asientoActual.bloqueado_por_usuario_id === userId;
          const reservadoPorToken = Boolean(guestToken) && asientoActual.bloqueado_por_token === guestToken;
          if (!reservadoPorUsuario && !reservadoPorToken) {
            throw new Error(`El asiento número ${asientoActual.numero_asiento} no está reservado por su usuario.`);
          }        } else if (guestToken) {
          if (asientoActual.bloqueado_por_token !== guestToken) {
            throw new Error(`El asiento número ${asientoActual.numero_asiento} no está reservado con su sesión de invitado.`);
          }
        } else {
          throw new Error(`No autorizado para adquirir el asiento número ${asientoActual.numero_asiento}.`);
        }

        // 1. Registrar el pago proporcional por cada asiento para mantener consistencia contable
        await tx.pago.create({
          data: {
            viaje_id: BigInt(viajeId),
            asiento_id: BigInt(item.seatId),
            preference_id: chargeId,
            status: "approved",
            amount: paymentAmountPerSeat,
          },
        });

        // 2. Actualizar el asiento a vendido y limpiar el token de invitado
        await tx.asientoViaje.update({
          where: { id: BigInt(item.seatId) },
          data: {
            estado: "vendido",
            bloqueado_por_usuario: userId ? { connect: { id: userId } } : { disconnect: true },
            bloqueado_por_token: null,
            bloqueado_en: null,
          },
        });

        // Validar que el pasajero no tenga otro pasaje para el mismo viaje
        const pasajeExistente = await tx.pasaje.findFirst({
          where: {
            pasajero: { dni: item.pasajeroData.dni },
            asiento_viaje: { viaje_id: BigInt(viajeId) }
          }
        });

        if (pasajeExistente) {
          throw new Error(`El pasajero con DNI ${item.pasajeroData.dni} ya tiene un pasaje registrado para este viaje.`);
        }

        const persona = await tx.persona.upsert({
          where: { dni: item.pasajeroData.dni },
          create: {
            nombres: item.pasajeroData.nombres.toUpperCase(),
            apellidos: item.pasajeroData.apellidos.toUpperCase(),
            dni: item.pasajeroData.dni,
            telefono: item.pasajeroData.telefono || null,
          },
          update: {
            telefono: item.pasajeroData.telefono || undefined,
          }
        });

        // 3. Crear el ticket/pasaje para el pasajero específico
        const ticket = await tx.pasaje.create({
          data: {
            asiento_viaje_id: BigInt(item.seatId),
            persona_id: persona.id,
            comprador_id: userId,
            precio: paymentAmountPerSeat,
            codigo_qr: `QR-${randomBytes(18).toString("base64url")}`,
          },
        });
        tickets.push({
          ...ticket,
          nombres: persona.nombres,
          apellidos: persona.apellidos,
          dni: persona.dni
        });
      }

      return tickets;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return { success: true, tickets: serializeBigInt(result) };
  } catch (error: any) {
    console.error("Error al registrar pasajes con Culqi:", error);
    if (error?.message === "CHARGE_ALREADY_PROCESSED") {
      return { success: false, error: "Este cargo ya fue procesado anteriormente." };
    }
    if (verifiedCharge) {
      const refunded = await refundCulqiCharge(chargeId, amount).catch(() => false);
      return {
        success: false,
        error: refunded
          ? "No se pudieron emitir los boletos y el cargo fue devuelto automáticamente."
          : "No se pudieron emitir los boletos. El cargo requiere revisión manual por soporte.",
      };
    }
    return { success: false, error: error.message || "Error al emitir los pasajes en la base de datos." };
  }
}

// 27. marcarAsientosPendientes
export async function marcarAsientosPendientes(seatIds: string[], guestToken: string, _email?: string) {
  try {
    const uniqueSeatIds = [...new Set(seatIds)];
    if (uniqueSeatIds.length === 0 || uniqueSeatIds.length > 6 || uniqueSeatIds.some((id) => !/^\d+$/.test(id))) throw new Error("La selección de asientos no es válida.");
    if (typeof guestToken !== "string" || guestToken.length < 16) throw new Error("La sesión de reserva no es válida.");
    await checkPublicRateLimit("seat-reservation", guestToken);
    await limpiarBloqueosExpirados();

    const ids = uniqueSeatIds.map((id) => BigInt(id));
    const result = await prisma.$transaction(async (tx) => {
      await tx.asientoViaje.updateMany({
        where: { bloqueado_por_token: guestToken, estado: "pendiente", id: { notIn: ids } },
        data: { estado: "disponible", bloqueado_por_usuario_id: null, bloqueado_por_token: null, bloqueado_en: null },
      });
      const updatedSeats = await tx.asientoViaje.updateMany({
        where: { id: { in: ids }, estado: "disponible" },
        data: { estado: "pendiente", bloqueado_por_usuario_id: null, bloqueado_por_token: guestToken, bloqueado_en: new Date() },
      });
      if (updatedSeats.count !== ids.length) throw new Error("Uno o más asientos ya fueron reservados o vendidos.");
      return updatedSeats;
    });
    return { success: true, count: result.count };
  } catch (error) {
    console.error("Error al marcar asientos pendientes:", error);
    return { success: false, error: error instanceof Error ? error.message : "No se pudieron reservar los asientos." };
  }
}

export async function liberarAsientos(seatIds: string[], guestToken?: string) {
  try {
    const uniqueSeatIds = [...new Set(seatIds)];
    if (uniqueSeatIds.length === 0) return { success: true, count: 0 };
    if (uniqueSeatIds.some((id) => !/^\d+$/.test(id))) throw new Error("IDs de asiento inválidos.");
    if (!guestToken || guestToken.length < 16) throw new Error("No autorizado para liberar estos asientos.");

    const result = await prisma.asientoViaje.updateMany({
      where: { id: { in: uniqueSeatIds.map((id) => BigInt(id)) }, estado: "pendiente", bloqueado_por_token: guestToken },
      data: { estado: "disponible", bloqueado_por_usuario_id: null, bloqueado_por_token: null, bloqueado_en: null },
    });
    return { success: true, count: result.count };
  } catch (error) {
    console.error("Error al liberar asientos:", error);
    return { success: false, error: error instanceof Error ? error.message : "No se pudieron liberar los asientos." };
  }
}
export async function enviarTicketEmail(emailDestino: string, tickets: any[], tripDetails: any) {
  try {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailDestino) || !Array.isArray(tickets) || tickets.length === 0 || tickets.length > 6) {
      throw new Error("Solicitud de correo inválida.");
    }
    const ticketIds = [...new Set(tickets.map((ticket) => String(ticket?.id || "")))];
    if (ticketIds.length !== tickets.length || ticketIds.some((id) => !/^\d+$/.test(id))) {
      throw new Error("Los boletos proporcionados no son válidos.");
    }

    const storedTickets = await prisma.pasaje.findMany({
      where: { id: { in: ticketIds.map((id) => BigInt(id)) } },
      include: {
        pasajero: true,
        asiento_viaje: {
          include: {
            pagos: { where: { status: "approved" }, orderBy: { created_at: "desc" } },
            viaje: { include: { ruta: { include: { origen: true, destino: true } }, bus: true } },
          },
        },
      },
    });
    if (storedTickets.length !== ticketIds.length) throw new Error("No se encontraron todos los boletos.");
    const viajeId = storedTickets[0].asiento_viaje.viaje_id;
    if (storedTickets.some((ticket) => ticket.asiento_viaje.viaje_id !== viajeId)) {
      throw new Error("Los boletos no pertenecen al mismo viaje.");
    }

    const session = await getServerSession(authOptions);
    const sessionUser = session?.user?.id
      ? await prisma.usuario.findUnique({ where: { id: BigInt(session.user.id) }, select: { id: true, correo: true } })
      : null;
    const ownsAllTickets = Boolean(sessionUser) && storedTickets.every((ticket) => ticket.comprador_id === sessionUser!.id);
    if (ownsAllTickets) {
      emailDestino = sessionUser!.correo;
    } else {
      const chargeIds = storedTickets.map((ticket) => ticket.asiento_viaje.pagos[0]?.preference_id).filter(Boolean) as string[];
      const commonChargeId = chargeIds[0];
      if (!commonChargeId || chargeIds.some((id) => id !== commonChargeId)) throw new Error("No se pudo acreditar la compra de los boletos.");
      const total = storedTickets.reduce((sum, ticket) => sum + Number(ticket.precio), 0);
      await verifyCulqiCharge(commonChargeId, total, emailDestino);
    }

    tickets = storedTickets.map((ticket) => ({
      id: ticket.id.toString(),
      nombres: ticket.pasajero.nombres,
      apellidos: ticket.pasajero.apellidos,
      dni: ticket.pasajero.dni,
      numero_asiento: ticket.asiento_viaje.numero_asiento,
      codigo_qr: ticket.codigo_qr,
    }));
    tripDetails = storedTickets[0].asiento_viaje.viaje;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log("No se ha configurado RESEND_API_KEY, no se enviará el correo.");
      return { success: false, error: "Resend no configurado" };
    }

    const resend = new Resend(apiKey);

    const origenNombre = tripDetails.ruta?.origen?.nombre || tripDetails.origen?.nombre || tripDetails.origen || "Agencia Origen";
    const destinoNombre = tripDetails.ruta?.destino?.nombre || tripDetails.destino?.nombre || tripDetails.destino || "Agencia Destino";
    const fechaSalida = tripDetails.fecha_salida ? new Date(tripDetails.fecha_salida) : new Date();

    const dateStr = fechaSalida.toLocaleDateString("es-PE", { timeZone: "America/Lima" });
    const timeStr = fechaSalida.toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: '2-digit', minute: '2-digit' });

    // 1. Generar Documento PDF con jsPDF y Códigos QR
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setTextColor(240, 118, 57); // #f07639
    doc.text("EMPRESA DE TRANSPORTES EL CUMBE S.A.C.", 14, 22);

    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("BOLETO DIGITAL DE VIAJE - COMPROBANTE DE ABORDAJE", 14, 32);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fecha de Emisión: ${new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })}`, 14, 40);

    doc.setLineWidth(0.5);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 45, 196, 45);

    let yOffset = 55;

    for (const [index, t] of tickets.entries()) {
      if (index > 0) {
        doc.addPage();
        yOffset = 30;
      }
      const qrDataUrl = await QRCode.toDataURL(t.codigo_qr || `QR-${t.id}`);

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`BOLETO #${index + 1} - DATOS DEL PASAJERO`, 14, yOffset);

      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      doc.text(`Pasajero: ${t.nombres || ''} ${t.apellidos || ''}`, 14, yOffset + 8);
      doc.text(`DNI / Identificación: ${t.dni || 'N/A'}`, 14, yOffset + 15);
      doc.text(`Asiento N°: #${t.numero_asiento}`, 14, yOffset + 22);
      doc.text(`Código de Abordaje: ${t.codigo_qr || 'N/A'}`, 14, yOffset + 29);

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("ITINERARIO DEL VIAJE", 14, yOffset + 42);

      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      doc.text(`Origen: ${origenNombre}`, 14, yOffset + 50);
      doc.text(`Destino: ${destinoNombre}`, 14, yOffset + 57);
      doc.text(`Fecha y Hora de Salida: ${dateStr} - ${timeStr}`, 14, yOffset + 64);

      // Renderizar Imagen QR de Abordaje en el PDF
      doc.addImage(qrDataUrl, "PNG", 130, yOffset, 55, 55);

      yOffset += 78;
      doc.line(14, yOffset, 196, yOffset);
      yOffset += 10;
    }

    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("Por favor, presente este boleto PDF o código QR al embarcar.", 14, yOffset + 5);
    doc.text("Transportes El Cumbe S.A.C. - Todos los derechos reservados.", 14, yOffset + 11);

    // Convertir PDF a Buffer
    const pdfArrayBuffer = doc.output("arraybuffer");
    const pdfBuffer = Buffer.from(pdfArrayBuffer);

    // 2. Construir HTML del correo
    let ticketsHtml = tickets.map(t => `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; background-color: #f9fafb;">
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #111827;">Pasajero: ${escapeHtml(t.nombres)} ${escapeHtml(t.apellidos)}</p>
        <p style="margin: 0 0 8px 0; color: #4b5563;">DNI: ${escapeHtml(t.dni)}</p>
        <p style="margin: 0 0 8px 0; color: #4b5563;">Asiento: ${escapeHtml(t.numero_asiento)}</p>
        <div style="background-color: #fff; border: 1px dashed #f07639; padding: 12px; text-align: center; border-radius: 4px; margin-top: 12px;">
          <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Código de Abordaje</p>
          <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: bold; color: #f07639; font-family: monospace;">${escapeHtml(t.codigo_qr)}</p>
        </div>
      </div>
    `).join("");

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #374151;">
        <div style="text-align: center; padding: 24px 0;">
          <h1 style="color: #f07639; margin: 0; font-size: 28px;">El Cumbe</h1>
          <p style="color: #6b7280; margin-top: 8px;">Tu pasaje ha sido confirmado</p>
        </div>
        
        <div style="background-color: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
          <h2 style="font-size: 18px; color: #111827; margin-top: 0; border-bottom: 2px solid #f3f4f6; padding-bottom: 12px;">Detalles del Viaje</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Origen:</td>
              <td style="padding: 8px 0; font-weight: bold; text-align: right;">${escapeHtml(origenNombre)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Destino:</td>
              <td style="padding: 8px 0; font-weight: bold; text-align: right;">${escapeHtml(destinoNombre)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Fecha y Hora:</td>
              <td style="padding: 8px 0; font-weight: bold; text-align: right;">${dateStr} - ${timeStr}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #fff7ed; border-left: 4px solid #f07639; padding: 14px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 13px; color: #c2410c;">📄 En este correo se encuentra adjunto tu <strong>Boleto Digital de Viaje (PDF)</strong> con tu código QR oficial.</p>
        </div>

        <h2 style="font-size: 18px; color: #111827;">Tus Boletos</h2>
        ${ticketsHtml}

        <p style="text-align: center; color: #9ca3af; font-size: 14px; margin-top: 32px;">
          Gracias por confiar en Transportes El Cumbe.<br>
          Por favor, preséntate 30 minutos antes del embarque.
        </p>
      </div>
    `;

    // 3. Enviar Correo mediante Resend con el PDF adjunto
    const fromAddress = process.env.RESEND_FROM || 'El Cumbe <onboarding@resend.dev>';
    const data = await resend.emails.send({
      from: fromAddress,
      to: [emailDestino],
      subject: '¡Tu pasaje está confirmado! - El Cumbe',
      html: html,
      attachments: [
        {
          filename: 'Boleto_Digital_ElCumbe.pdf',
          content: pdfBuffer,
        }
      ]
    });

    console.log("Correo enviado con PDF adjunto exitosamente:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error al enviar correo con PDF:", error);
    return { success: false, error: "Error al enviar correo de ticket" };
  }
}

export async function registrarReclamo(data: {
  nombres: string;
  apellidos: string;
  dni: string;
  telefono: string;
  correo: string;
  tipo: string;
  fecha_incidente: string;
  detalle_incidente: string;
  pedido_cliente: string;
}) {
  try {
    const { nombres, apellidos, dni, telefono, correo, tipo, fecha_incidente, detalle_incidente, pedido_cliente } = data;
    await checkPublicRateLimit("complaint", dni);

    if (!nombres || !apellidos || !dni || !tipo || !fecha_incidente || !detalle_incidente || !pedido_cliente) {
      return { success: false, error: "Todos los campos obligatorios deben ser completados." };
    }

    // Validaciones en servidor
    if (!nombres.trim() || !apellidos.trim()) {
      return { success: false, error: "Los nombres y apellidos no pueden estar vacíos." };
    }

    if (!/^\d{8}$/.test(dni)) {
      return { success: false, error: "DNI inválido (debe tener 8 dígitos numéricos)." };
    }

    if (telefono && !/^\d{9}$/.test(telefono)) {
      return { success: false, error: "Teléfono inválido (debe tener 9 dígitos numéricos)." };
    }

    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return { success: false, error: "Formato de correo electrónico inválido." };
    }

    if (tipo !== "reclamo" && tipo !== "queja") {
      return { success: false, error: "Tipo de incidente no permitido (debe ser reclamo o queja)." };
    }

    const fecha = new Date(fecha_incidente);
    if (isNaN(fecha.getTime())) {
      return { success: false, error: "La fecha del incidente no es válida." };
    }

    // 1. Buscar o crear la Persona a partir del DNI
    const persona = await prisma.persona.upsert({
      where: { dni },
      update: {},
      create: {
        nombres: nombres.trim().toUpperCase(),
        apellidos: apellidos.trim().toUpperCase(),
        dni: dni.trim(),
        telefono: telefono ? telefono.trim() : null
      }
    });

    // 2. Generar código correlativo de reclamo
    const codigoReclamo = createComplaintCode();

    // 3. Registrar el reclamo en la base de datos
    const nuevoReclamo = await prisma.reclamo.create({
      data: {
        codigo_reclamo: codigoReclamo,
        persona_id: persona.id,
        tipo: tipo, // "reclamo" o "queja"
        fecha_incidente: new Date(fecha_incidente),
        detalle_incidente: detalle_incidente.trim(),
        pedido_cliente: pedido_cliente.trim(),
        correo_contacto: correo ? correo.trim().toLowerCase() : null,
        estado: "pendiente"
      }
    });

    return { 
      success: true, 
      data: {
        codigo: nuevoReclamo.codigo_reclamo,
        tipo: nuevoReclamo.tipo,
        persona: {
          nombres: persona.nombres,
          apellidos: persona.apellidos,
          dni: persona.dni
        }
      } 
    };

  } catch (error: any) {
    console.error("Error al registrar reclamo:", error);
    return { success: false, error: error.message || "Error interno al procesar el reclamo." };
  }
}

export async function buscarPersonaPorDNI(dni: string) {
  try {
    const persona = await prisma.persona.findUnique({
      where: { dni: dni.trim() },
      include: {
        usuario: {
          select: { correo: true }
        }
      }
    });

    if (!persona) {
      return { success: false, error: "Persona no encontrada" };
    }

    // Obtener sesión del usuario actual
    const sessionUser = await getCurrentUser().catch(() => null);
    const isOwner = sessionUser && (
      sessionUser.correo.toLowerCase() === persona.usuario?.correo?.toLowerCase() ||
      sessionUser.persona?.dni === persona.dni
    );
    const isAdmin = sessionUser && (sessionUser.rol === "admin" || sessionUser.rol === "vendedor");

    if (!isOwner && !isAdmin) return { success: false, error: "No autorizado." };

    return {
      success: true,
      data: {
        nombres: persona.nombres,
        apellidos: persona.apellidos,
        // Solo devolvemos teléfono y correo si el solicitante es el dueño de los datos o un administrador
        telefono: (isOwner || isAdmin) ? (persona.telefono || "") : "",
        correo: (isOwner || isAdmin) ? (persona.usuario?.correo || "") : ""
      }
    };
  } catch (error: any) {
    console.error("Error al buscar persona por DNI:", error);
    return { success: false, error: error.message || "Error al buscar persona" };
  }
}

export async function buscarEncomiendaPorCodigo(codigo: string) {
  try {
    await checkPublicRateLimit("shipment-tracking");
    if (!codigo || codigo.trim().length === 0) {
      return { success: false, error: "Debe ingresar un código de seguimiento válido." };
    }

    const enc = await prisma.encomienda.findUnique({
      where: { codigo_seguimiento: codigo.trim().toUpperCase() },
      include: {
        origen: true,
        destino: true,
        viaje: true,
        destinatario: true,
        remitente: true
      }
    });

    if (!enc) {
      return { success: false, error: "Encomienda no encontrada." };
    }

    // Ofuscar datos sensibles
    const ofuscarDni = (d: string) => d.slice(0, 4) + "****";
    const ofuscarTelefono = (t: string | null) => t ? t.slice(0, 4) + "****" : "";

    const encMapeada = {
      id: enc.id,
      codigo_seguimiento: enc.codigo_seguimiento,
      origen_id: enc.origen_id,
      destino_id: enc.destino_id,
      viaje_id: enc.viaje_id,
      peso_kg: enc.peso_kg,
      descripcion: enc.descripcion,
      precio: enc.precio,
      estado: enc.estado,
      created_at: enc.created_at,
      updated_at: enc.updated_at,
      origen: enc.origen,
      destino: enc.destino,
      viaje: enc.viaje,
      remitente_nombre: `${enc.remitente.nombres} ${enc.remitente.apellidos}`,
      destinatario_nombre: `${enc.destinatario.nombres} ${enc.destinatario.apellidos}`,
      // Reemplazar campos de datos sensibles para invitados
      remitente_dni: ofuscarDni(enc.remitente.dni),
      destinatario_dni: ofuscarDni(enc.destinatario.dni),
      remitente_telefono: ofuscarTelefono(enc.remitente.telefono),
      destinatario_telefono: ofuscarTelefono(enc.destinatario.telefono),
    };

    return { success: true, data: serializeBigInt(encMapeada) };
  } catch (error: any) {
    console.error("Error buscando encomienda por código:", error);
    return { success: false, error: error.message || "Error al buscar la encomienda." };
  }
}


