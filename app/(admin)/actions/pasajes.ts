"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdminOrVendedor } from "./_auth";

// Helper genérico para resolver BigInts
function serializeBigInt<T>(obj: T): any {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

// 1. Buscar Viajes Disponibles
export async function buscarViajes(origenId: string | number, destinoId: string | number, fechaStr: string) {
  try {
    await requireAdminOrVendedor();
    const fechaInicio = new Date(`${fechaStr}T00:00:00.000Z`);
    const fechaFin = new Date(`${fechaStr}T23:59:59.999Z`);

    const viajes = await prisma.viaje.findMany({
      where: {
        estado: "programado",
        fecha_salida: {
          gte: fechaInicio,
          lte: fechaFin,
        },
        ruta: {
          origen_id: BigInt(origenId),
          destino_id: BigInt(destinoId),
        }
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
          select: { estado: true } // Para calcular asientos libres rápidamente
        }
      },
      orderBy: { fecha_salida: "asc" }
    });

    return { success: true, data: serializeBigInt(viajes) };
  } catch (error) {
    console.error("Error al buscar viajes:", error);
    return { success: false, error: "Error al buscar viajes." };
  }
}

// 2. Obtener Asientos de un Viaje
export async function obtenerAsientosPorViaje(viajeId: string | number) {
  try {
    await requireAdminOrVendedor();
    const asientos = await prisma.asientoViaje.findMany({
      where: { viaje_id: BigInt(viajeId) },
      orderBy: { numero_asiento: "asc" },
      include: {
        pasaje: {
          include: { pasajero: true, comprador: true }
        }
      }
    });

    return { success: true, data: serializeBigInt(asientos) };
  } catch (error) {
    console.error("Error al obtener asientos:", error);
    return { success: false, error: "Error al obtener asientos del viaje." };
  }
}

// 3. Buscar Pasajero por DNI
export async function buscarPasajeroPorDni(dni: string) {
  if (!dni || dni.length < 5) return { success: false };

  try {
    await requireAdminOrVendedor();
    const persona = await prisma.persona.findUnique({
      where: { dni: dni }
    });

    if (persona) {
      return { success: true, data: serializeBigInt(persona) };
    }
    return { success: false };
  } catch (error) {
    return { success: false };
  }
}

// 4. Vender Pasaje (Transacción)
export async function venderPasaje(data: {
  viaje_id: string | number;
  asiento_id: string | number;
  precio: number;
  pasajero: {
    nombres: string;
    apellidos: string;
    dni: string;
    telefono?: string;
  }
}) {
  try {
    await requireAdminOrVendedor();
    const vId = BigInt(data.viaje_id);
    const aId = BigInt(data.asiento_id);

    // Ejecutamos todo dentro de una transacción para mantener integridad
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Obtener datos del asiento y ruta para validaciones
      const asientoData = await tx.asientoViaje.findUnique({
        where: { id: aId },
        include: { viaje: { include: { ruta: true } } }
      });

      if (!asientoData) throw new Error("Asiento no encontrado en el sistema.");
      
      // 2. Validación estricta de Precio (Evitar fraude)
      // Mínimo 50% del precio base permitido por si hacen descuento manual, sino rechaza.
      const precioBase = Number(asientoData.viaje.ruta.precio_base);
      if (data.precio < (precioBase * 0.5)) {
         throw new Error(`El precio (S/ ${data.precio}) es inválido o sospechosamente bajo. Mínimo permitido: S/ ${(precioBase * 0.5).toFixed(2)}.`);
      }

      // 3. Bloqueo Optimista / Actualización Atómica (Evita Doble Venta)
      // Si el asiento web o presencial lo compra al mismo tiempo, solo 1 logrará el count === 1
      const updateAsiento = await tx.asientoViaje.updateMany({
        where: { id: aId, estado: "disponible" },
        data: { estado: "ocupado" }
      });

      if (updateAsiento.count === 0) {
        throw new Error("Ups, el asiento acaba de ser ocupado por otro canal u otra ventanilla. Intenta con otro asiento.");
      }

      // 4. Buscar a la persona por DNI y crearla si no existe (upsert)
      const persona = await tx.persona.upsert({
        where: { dni: data.pasajero.dni },
        create: {
          nombres: data.pasajero.nombres.toUpperCase(),
          apellidos: data.pasajero.apellidos.toUpperCase(),
          dni: data.pasajero.dni,
          telefono: data.pasajero.telefono || null,
        },
        update: {
          // Si ya existe, podríamos actualizar el teléfono
          telefono: data.pasajero.telefono || undefined,
        }
      });

      // 5. Crear el pasaje vinculándolo a la Persona
      const nuevoPasaje = await tx.pasaje.create({
        data: {
          asiento_viaje_id: aId,
          persona_id: persona.id,
          // Al ser venta presencial (admin), el comprador (web) es null
          comprador_id: null,
          precio: data.precio,
          codigo_qr: `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        }
      });

      return nuevoPasaje;
    });

    revalidatePath("/admin/pasajes");
    return { success: true, data: serializeBigInt(resultado) };
  } catch (error: any) {
    console.error("Error al vender pasaje:", error);
    return { success: false, error: error.message || "Error interno al vender el pasaje." };
  }
}

// 5. Buscar Pasajes Vendidos (Filtros)
export async function buscarPasajesVendidos(filtros: { origenId?: string, destinoId?: string, fecha?: string, dni?: string }) {
  try {
    await requireAdminOrVendedor();
    const whereClause: any = {};

    // Filtro por fecha (fecha de salida del viaje)
    if (filtros.fecha) {
      const fechaInicio = new Date(`${filtros.fecha}T00:00:00.000Z`);
      const fechaFin = new Date(`${filtros.fecha}T23:59:59.999Z`);
      whereClause.asiento_viaje = {
        viaje: {
          fecha_salida: {
            gte: fechaInicio,
            lte: fechaFin
          }
        }
      };
    }

    // Filtro por origen / destino
    if (filtros.origenId || filtros.destinoId) {
      if (!whereClause.asiento_viaje) whereClause.asiento_viaje = { viaje: {} };
      if (!whereClause.asiento_viaje.viaje) whereClause.asiento_viaje.viaje = {};
      
      const rutaFilter: any = {};
      if (filtros.origenId) rutaFilter.origen_id = BigInt(filtros.origenId);
      if (filtros.destinoId) rutaFilter.destino_id = BigInt(filtros.destinoId);
      
      whereClause.asiento_viaje.viaje.ruta = rutaFilter;
    }

    // Filtro por DNI del pasajero
    if (filtros.dni && filtros.dni.trim() !== "") {
      whereClause.pasajero = {
        dni: { contains: filtros.dni }
      };
    }

    const pasajes = await prisma.pasaje.findMany({
      where: whereClause,
      include: {
        pasajero: true,
        comprador: true,
        asiento_viaje: {
          include: {
            viaje: {
              include: {
                ruta: {
                  include: {
                    origen: true,
                    destino: true
                  }
                },
                bus: true
              }
            }
          }
        }
      },
      orderBy: {
        fecha_compra: 'desc'
      },
      take: 100 // Limitar resultados
    });

    return { success: true, data: serializeBigInt(pasajes) };
  } catch (error) {
    console.error("Error al buscar pasajes vendidos:", error);
    return { success: false, error: "Error al buscar pasajes vendidos." };
  }
}

// 6. Editar Pasaje y Regenerar Código QR
export async function editarPasaje(data: {
  pasaje_id: string | number;
  nombres: string;
  apellidos: string;
  dni: string;
  telefono?: string;
  precio: number;
}) {
  try {
    await requireAdminOrVendedor();
    const pId = BigInt(data.pasaje_id);

    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Obtener pasaje actual
      const pasaje = await tx.pasaje.findUnique({
        where: { id: pId },
        include: { pasajero: true }
      });

      if (!pasaje) throw new Error("Pasaje no encontrado.");

      // 2. Vincular o crear la persona con el nuevo DNI (si cambió)
      let personaId = pasaje.persona_id;
      if (pasaje.pasajero.dni !== data.dni) {
        const persona = await tx.persona.upsert({
          where: { dni: data.dni },
          create: {
            nombres: data.nombres.toUpperCase(),
            apellidos: data.apellidos.toUpperCase(),
            dni: data.dni,
            telefono: data.telefono || null,
          },
          update: {
            nombres: data.nombres.toUpperCase(),
            apellidos: data.apellidos.toUpperCase(),
            telefono: data.telefono || undefined,
          }
        });
        personaId = persona.id;
      } else {
        // Si el DNI es el mismo, solo actualizamos los datos de la persona asociada
        await tx.persona.update({
          where: { id: pasaje.persona_id },
          data: {
            nombres: data.nombres.toUpperCase(),
            apellidos: data.apellidos.toUpperCase(),
            telefono: data.telefono || null,
          }
        });
      }

      // 3. Generar un nuevo código QR único y actualizar el pasaje
      const nuevoQr = `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const pasajeActualizado = await tx.pasaje.update({
        where: { id: pId },
        data: {
          persona_id: personaId,
          precio: data.precio,
          codigo_qr: nuevoQr
        },
        include: {
          pasajero: true,
          comprador: true,
          asiento_viaje: {
            include: {
              viaje: {
                include: {
                  ruta: {
                    include: {
                      origen: true,
                      destino: true
                    }
                  },
                  bus: true
                }
              }
            }
          }
        }
      });

      return pasajeActualizado;
    });

    revalidatePath("/admin/pasajes");
    return { success: true, data: serializeBigInt(resultado) };
  } catch (error: any) {
    console.error("Error al editar pasaje:", error);
    return { success: false, error: error.message || "Error al editar pasaje." };
  }
}
