"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Función auxiliar para verificar si el usuario tiene rol de administrador o vendedor
async function checkAdminOrVendedor() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "admin" && session.user.role !== "vendedor")) {
    throw new Error("Acceso no autorizado. Debe ser administrador o vendedor.");
  }
}
// Función auxiliar para parsear y validar ID numéricos / BigInt
function parseId(id: string | number | bigint): bigint {
  return typeof id === "bigint" ? id : BigInt(id);
}

// Función auxiliar para convertir BigInt y Decimal de forma segura para el Cliente
function serializeBigInt<T>(obj: T): any {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function obtenerViajes() {
  try {
    await checkAdminOrVendedor();
    const viajes = await prisma.viaje.findMany({
      include: {
        ruta: {
          include: {
            origen: { select: { nombre: true } },
            destino: { select: { nombre: true } },
          }
        },
        bus: { select: { placa: true, capacidad: true, pisos: true } },
        conductor: { select: { nombres: true, apellidos: true } },
      },
      orderBy: { fecha_salida: "desc" },
    });
    
    return { success: true, data: serializeBigInt(viajes) };
  } catch (error) {
    console.error("Error al obtener viajes:", error);
    return { success: false, error: "Error al obtener viajes" };
  }
}

export async function obtenerConductores() {
  try {
    await checkAdminOrVendedor();
    const conductores = await prisma.persona.findMany({
      where: {
        usuario: {
          rol: "conductor"
        }
      }
    });
    return { success: true, data: serializeBigInt(conductores) };
  } catch (error) {
    console.error("Error al obtener conductores:", error);
    return { success: false, error: "Error al obtener conductores" };
  }
}

export async function crearViajeConAsientos(data: { 
  ruta_id: string | number; 
  bus_id: string | number; 
  conductor_id?: string | number;
  fecha_salida: string; 
  fecha_llegada?: string 
}) {
  try {
    await checkAdminOrVendedor();
    const rutaId = parseId(data.ruta_id);
    const busId = parseId(data.bus_id);
    const conductorId = data.conductor_id ? parseId(data.conductor_id) : undefined;
    const fechaSalida = new Date(data.fecha_salida);
    const fechaLlegada = data.fecha_llegada ? new Date(data.fecha_llegada) : undefined;

    if (isNaN(fechaSalida.getTime())) {
      return { success: false, error: "Fecha de salida inválida." };
    }

    if (fechaLlegada && isNaN(fechaLlegada.getTime())) {
      return { success: false, error: "Fecha de llegada inválida." };
    }

    if (fechaLlegada && fechaLlegada <= fechaSalida) {
      return { success: false, error: "La fecha de llegada debe ser posterior a la fecha de salida." };
    }

    // Obtener detalles del bus para saber capacidad y pisos
    const bus = await prisma.bus.findUnique({
      where: { id: busId }
    });

    if (!bus) {
      return { success: false, error: "El bus seleccionado no existe." };
    }

    // Validar solapamientos de horario para el bus y el conductor
    const estimacionLlegada = fechaLlegada || new Date(fechaSalida.getTime() + 4 * 60 * 60 * 1000);

    const busTrips = await prisma.viaje.findMany({
      where: {
        bus_id: busId,
        estado: { in: ["programado", "en_ruta"] }
      }
    });

    const busConflict = busTrips.find(v => {
      const vLlegada = v.fecha_llegada || new Date(v.fecha_salida.getTime() + 4 * 60 * 60 * 1000);
      return v.fecha_salida < estimacionLlegada && vLlegada > fechaSalida;
    });

    if (busConflict) {
      return { success: false, error: `El bus ${bus.placa} ya tiene otro viaje programado en ese rango de horario.` };
    }

    if (conductorId) {
      const condTrips = await prisma.viaje.findMany({
        where: {
          conductor_id: conductorId,
          estado: { in: ["programado", "en_ruta"] }
        }
      });

      const condConflict = condTrips.find(v => {
        const vLlegada = v.fecha_llegada || new Date(v.fecha_salida.getTime() + 4 * 60 * 60 * 1000);
        return v.fecha_salida < estimacionLlegada && vLlegada > fechaSalida;
      });

      if (condConflict) {
        return { success: false, error: "El conductor seleccionado ya tiene otro viaje asignado en ese rango de horario." };
      }
    }

    // Parsear asientos restringidos
    let restringidos: number[] = [];
    if (bus.asientos_restringidos) {
      try {
        restringidos = JSON.parse(bus.asientos_restringidos);
      } catch (e) {}
    }

    // Ejecutar transacción para crear viaje y sus asientos
    const nuevoViaje = await prisma.$transaction(async (tx) => {
      // 1. Crear el viaje
      const viaje = await tx.viaje.create({
        data: {
          ruta_id: rutaId,
          bus_id: busId,
          conductor_id: conductorId,
          fecha_salida: fechaSalida,
          fecha_llegada: fechaLlegada,
          estado: "programado",
        },
        include: {
          ruta: {
            include: {
              origen: { select: { nombre: true } },
              destino: { select: { nombre: true } }
            }
          },
          bus: { select: { placa: true, capacidad: true, pisos: true } },
          conductor: { select: { nombres: true, apellidos: true } }
        }
      });

      // 2. Generar el array de asientos basado en la lógica de pisos
      const asientosData: any[] = [];
      const totalAsientos = bus.capacidad;
      
      let asientosPiso1 = totalAsientos;
      let asientosPiso2 = 0;

      if (bus.pisos === 2) {
        if (bus.asientos_piso_1) {
          asientosPiso1 = bus.asientos_piso_1;
        } else {
          // El diseño UI del frontend exige exactamente 12 asientos en el primer piso para Buscama
          asientosPiso1 = 12;
        }
        asientosPiso2 = totalAsientos - asientosPiso1;
      }

      // Asientos Piso 1
      for (let i = 1; i <= asientosPiso1; i++) {
        asientosData.push({
          viaje_id: viaje.id,
          numero_asiento: i,
          piso: 1,
          estado: restringidos.includes(i) ? "inactivo" : "disponible"
        });
      }

      // Asientos Piso 2
      if (bus.pisos === 2) {
        for (let i = 1; i <= asientosPiso2; i++) {
          const numAsiento = asientosPiso1 + i;
          asientosData.push({
            viaje_id: viaje.id,
            numero_asiento: numAsiento,
            piso: 2,
            estado: restringidos.includes(numAsiento) ? "inactivo" : "disponible"
          });
        }
      }

      // 3. Crear los asientos
      await tx.asientoViaje.createMany({
        data: asientosData,
      });

      return viaje;
    });

    revalidatePath("/admin/viajes");
    return { success: true, data: serializeBigInt(nuevoViaje) };
  } catch (error) {
    console.error("Error al crear viaje:", error);
    return { success: false, error: "Error al crear viaje y asignar asientos" };
  }
}

export async function cancelarViaje(id: string | number) {
  try {
    await checkAdminOrVendedor();
    const viajeId = parseId(id);
    
    await prisma.viaje.update({
      where: { id: viajeId },
      data: { estado: "cancelado" }
    });

    revalidatePath("/admin/viajes");
    return { success: true };
  } catch (error) {
    console.error("Error al cancelar viaje:", error);
    return { success: false, error: "Error al cancelar viaje." };
  }
}

export async function actualizarViaje(id: string | number, data: {
  ruta_id: string | number;
  bus_id: string | number;
  conductor_id?: string | number;
  fecha_salida: string;
  fecha_llegada?: string;
}) {
  try {
    await checkAdminOrVendedor();
    const viajeId = parseId(id);
    const rutaId = parseId(data.ruta_id);
    const busId = parseId(data.bus_id);
    const conductorId = data.conductor_id ? parseId(data.conductor_id) : null;
    const fechaSalida = new Date(data.fecha_salida);
    const fechaLlegada = data.fecha_llegada ? new Date(data.fecha_llegada) : null;

    if (isNaN(fechaSalida.getTime())) {
      return { success: false, error: "Fecha de salida inválida." };
    }

    if (fechaLlegada && isNaN(fechaLlegada.getTime())) {
      return { success: false, error: "Fecha de llegada inválida." };
    }

    // Obtener viaje actual para ver si cambió el bus
    const viajeActual = await prisma.viaje.findUnique({
      where: { id: viajeId },
      select: { bus_id: true }
    });

    if (!viajeActual) {
      return { success: false, error: "El viaje no existe." };
    }

    // Validar solapamientos de horario al actualizar
    const estimacionLlegada = fechaLlegada || new Date(fechaSalida.getTime() + 4 * 60 * 60 * 1000);

    const busTrips = await prisma.viaje.findMany({
      where: {
        id: { not: viajeId },
        bus_id: busId,
        estado: { in: ["programado", "en_ruta"] }
      }
    });

    const busConflict = busTrips.find(v => {
      const vLlegada = v.fecha_llegada || new Date(v.fecha_salida.getTime() + 4 * 60 * 60 * 1000);
      return v.fecha_salida < estimacionLlegada && vLlegada > fechaSalida;
    });

    if (busConflict) {
      return { success: false, error: "El bus seleccionado ya tiene otro viaje asignado a esa misma hora." };
    }

    if (conductorId) {
      const condTrips = await prisma.viaje.findMany({
        where: {
          id: { not: viajeId },
          conductor_id: conductorId,
          estado: { in: ["programado", "en_ruta"] }
        }
      });

      const condConflict = condTrips.find(v => {
        const vLlegada = v.fecha_llegada || new Date(v.fecha_salida.getTime() + 4 * 60 * 60 * 1000);
        return v.fecha_salida < estimacionLlegada && vLlegada > fechaSalida;
      });

      if (condConflict) {
        return { success: false, error: "El conductor seleccionado ya tiene otro viaje asignado a esa misma hora." };
      }
    }

    const busCambio = viajeActual.bus_id !== busId;

    const viajeActualizado = await prisma.$transaction(async (tx) => {
      // Si cambia el bus, debemos regenerar asientos, pero verificar que no haya pasajes vendidos
      if (busCambio) {
        // Verificar si hay pasajes vendidos o asientos ocupados
        const ocupados = await tx.asientoViaje.findFirst({
          where: { viaje_id: viajeId, estado: { not: "disponible" } }
        });
        if (ocupados) {
          throw new Error("No se puede cambiar el bus porque ya cuenta con asientos ocupados o reservados.");
        }

        // Obtener detalles del nuevo bus
        const bus = await tx.bus.findUnique({
          where: { id: busId }
        });
        if (!bus) {
          throw new Error("El bus seleccionado no existe.");
        }

        // Eliminar asientos viejos
        await tx.asientoViaje.deleteMany({
          where: { viaje_id: viajeId }
        });

        // Crear nuevos asientos
        let restringidos: number[] = [];
        if (bus.asientos_restringidos) {
          try {
            restringidos = JSON.parse(bus.asientos_restringidos);
          } catch (e) {}
        }

        const asientosData: any[] = [];
        const totalAsientos = bus.capacidad;
        let asientosPiso1 = totalAsientos;
        let asientosPiso2 = 0;

        if (bus.pisos === 2) {
          asientosPiso1 = bus.asientos_piso_1 || 12;
          asientosPiso2 = totalAsientos - asientosPiso1;
        }

        for (let i = 1; i <= asientosPiso1; i++) {
          asientosData.push({
            viaje_id: viajeId,
            numero_asiento: i,
            piso: 1,
            estado: restringidos.includes(i) ? "inactivo" : "disponible"
          });
        }

        if (bus.pisos === 2) {
          for (let i = 1; i <= asientosPiso2; i++) {
            const numAsiento = asientosPiso1 + i;
            asientosData.push({
              viaje_id: viajeId,
              numero_asiento: numAsiento,
              piso: 2,
              estado: restringidos.includes(numAsiento) ? "inactivo" : "disponible"
            });
          }
        }

        await tx.asientoViaje.createMany({
          data: asientosData
        });
      }

      return await tx.viaje.update({
        where: { id: viajeId },
        data: {
          ruta_id: rutaId,
          bus_id: busId,
          conductor_id: conductorId,
          fecha_salida: fechaSalida,
          fecha_llegada: fechaLlegada,
        },
        include: {
          ruta: {
            include: {
              origen: { select: { nombre: true } },
              destino: { select: { nombre: true } }
            }
          },
          bus: { select: { placa: true, capacidad: true, pisos: true } },
          conductor: { select: { nombres: true, apellidos: true } }
        }
      });
    });

    try {
      revalidatePath("/admin/viajes");
    } catch (e) {}
    return { success: true, data: serializeBigInt(viajeActualizado) };
  } catch (error: any) {
    console.error("Error al actualizar viaje:", error);
    return { success: false, error: error.message || "Error al actualizar viaje" };
  }
}

export async function enviarAlertaCentral(viajeId: string | number, mensaje: string) {
  try {
    await checkAdminOrVendedor();
    const vId = parseId(viajeId);
    if (!mensaje.trim()) {
      return { success: false, error: "El mensaje no puede estar vacío." };
    }

    const alerta = await prisma.alertaCentral.create({
      data: {
        viaje_id: vId,
        mensaje: mensaje.trim(),
        leido: false
      }
    });

    return { success: true, data: serializeBigInt(alerta) };
  } catch (error) {
    console.error("Error al enviar alerta de central:", error);
    return { success: false, error: "Error al enviar la alerta." };
  }
}
