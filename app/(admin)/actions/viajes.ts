"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
    const viajes = await prisma.viaje.findMany({
      include: {
        ruta: {
          include: {
            origen: { select: { nombre: true } },
            destino: { select: { nombre: true } },
          }
        },
        bus: { select: { placa: true, capacidad: true, pisos: true } },
      },
      orderBy: { fecha_salida: "desc" },
    });
    
    return { success: true, data: serializeBigInt(viajes) };
  } catch (error) {
    console.error("Error al obtener viajes:", error);
    return { success: false, error: "Error al obtener viajes" };
  }
}

export async function crearViajeConAsientos(data: { 
  ruta_id: string | number; 
  bus_id: string | number; 
  fecha_salida: string; 
  fecha_llegada?: string 
}) {
  try {
    const rutaId = parseId(data.ruta_id);
    const busId = parseId(data.bus_id);
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
          fecha_salida: fechaSalida,
          fecha_llegada: fechaLlegada,
          estado: "programado",
        },
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
          // Fallback por si acaso
          asientosPiso1 = Math.floor(totalAsientos * 0.3);
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
