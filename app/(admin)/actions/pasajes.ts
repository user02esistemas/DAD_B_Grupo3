"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcrypt";

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
    const asientos = await prisma.asientoViaje.findMany({
      where: { viaje_id: BigInt(viajeId) },
      orderBy: { numero_asiento: "asc" },
      include: {
        pasaje: {
          include: { usuario: true }
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
    const usuario = await prisma.usuario.findUnique({
      where: { dni: dni }
    });

    if (usuario) {
      return { success: true, data: serializeBigInt(usuario) };
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
    const vId = BigInt(data.viaje_id);
    const aId = BigInt(data.asiento_id);

    // Ejecutamos todo dentro de una transacción para mantener integridad
    const resultado = await prisma.$transaction(async (tx) => {
      // a) Verificar que el asiento sigue disponible
      const asiento = await tx.asientoViaje.findUnique({
        where: { id: aId }
      });

      if (!asiento) throw new Error("Asiento no encontrado.");
      if (asiento.estado !== "disponible") throw new Error("El asiento ya no está disponible.");

      // b) Buscar el usuario por DNI si existe, pero ya no forzamos creación de cuenta fantasma
      let usuarioId: bigint | null = null;
      const usuario = await tx.usuario.findUnique({
        where: { dni: data.pasajero.dni }
      });

      if (usuario) {
        usuarioId = usuario.id;
      }

      // c) Crear el pasaje con los campos embebidos
      const nuevoPasaje = await tx.pasaje.create({
        data: {
          asiento_viaje_id: aId,
          nombres: data.pasajero.nombres.toUpperCase(),
          apellidos: data.pasajero.apellidos.toUpperCase(),
          dni: data.pasajero.dni,
          telefono: data.pasajero.telefono || null,
          usuario_id: usuarioId, // Puede ser null si es una venta rápida a alguien que no está registrado
          precio: data.precio,
          codigo_qr: `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        }
      });

      // d) Actualizar el estado del asiento a ocupado
      await tx.asientoViaje.update({
        where: { id: aId },
        data: { estado: "ocupado" }
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
