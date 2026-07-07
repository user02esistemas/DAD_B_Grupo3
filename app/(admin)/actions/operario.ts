"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Función auxiliar para convertir BigInt y Decimal de forma segura para el Cliente
function serializeBigInt<T>(obj: T): any {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function obtenerViajesOperario() {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 2); // Traer hoy y mañana

    const viajes = await prisma.viaje.findMany({
      where: {
        fecha_salida: {
          gte: hoy,
          lt: mañana,
        },
        estado: { not: "cancelado" },
      },
      include: {
        ruta: {
          include: {
            origen: { select: { nombre: true } },
            destino: { select: { nombre: true } },
          }
        },
        bus: { select: { placa: true, capacidad: true, pisos: true } },
      },
      orderBy: { fecha_salida: "asc" }
    });

    // Contar pasajes vendidos por viaje para mostrar avance
    const viajesConPasajes = await Promise.all(viajes.map(async (v) => {
      const pasajesCount = await prisma.pasaje.count({
        where: {
          asiento_viaje: { viaje_id: v.id }
        }
      });
      const abordadosCount = await prisma.pasaje.count({
        where: {
          asiento_viaje: { viaje_id: v.id },
          abordado: true
        }
      });
      return {
        ...v,
        total_pasajeros: pasajesCount,
        total_abordados: abordadosCount
      };
    }));

    return { success: true, data: serializeBigInt(viajesConPasajes) };
  } catch (error) {
    console.error("Error al obtener viajes de operario:", error);
    return { success: false, error: "Error al obtener viajes" };
  }
}

export async function obtenerPasajerosViaje(viajeId: string | number) {
  try {
    const id = BigInt(viajeId);
    const pasajes = await prisma.pasaje.findMany({
      where: {
        asiento_viaje: { viaje_id: id }
      },
      include: {
        pasajero: {
          select: {
            nombres: true,
            apellidos: true,
            dni: true,
            telefono: true,
          }
        },
        asiento_viaje: {
          select: {
            numero_asiento: true,
            piso: true,
            estado: true,
          }
        },
      },
      orderBy: {
        asiento_viaje: { numero_asiento: "asc" }
      }
    });
    return { success: true, data: serializeBigInt(pasajes) };
  } catch (error) {
    console.error("Error al obtener pasajeros:", error);
    return { success: false, error: "Error al obtener pasajeros" };
  }
}

export async function registrarAbordaje(pasajeId: string | number, abordado: boolean) {
  try {
    const id = BigInt(pasajeId);
    
    // Obtener primero el viaje_id asociado
    const pasajeTemp = await prisma.pasaje.findUnique({
      where: { id },
      select: {
        asiento_viaje: {
          select: { viaje_id: true }
        }
      }
    });

    if (!pasajeTemp) {
      return { success: false, error: "El pasaje no existe." };
    }

    const pasaje = await prisma.pasaje.update({
      where: { id },
      data: { abordado },
      include: {
        asiento_viaje: true
      }
    });

    revalidatePath(`/staff/operario/viajes/${pasaje.asiento_viaje.viaje_id}`);
    return { success: true, data: serializeBigInt(pasaje) };
  } catch (error) {
    console.error("Error al registrar abordaje:", error);
    return { success: false, error: "Error al registrar abordaje" };
  }
}

export async function validarBoletoQR(viajeId: string | number, codigoQr: string) {
  try {
    const vId = BigInt(viajeId);
    const pasaje = await prisma.pasaje.findFirst({
      where: {
        codigo_qr: codigoQr,
        asiento_viaje: { viaje_id: vId }
      },
      include: {
        pasajero: true,
        asiento_viaje: true
      }
    });

    if (!pasaje) {
      return { success: false, error: "Boleto no encontrado para este viaje." };
    }

    if (pasaje.abordado) {
      return { success: false, error: `El pasajero ${pasaje.pasajero.nombres} ya abordó.` };
    }

    // Marcar como abordado
    const pasajeActualizado = await prisma.pasaje.update({
      where: { id: pasaje.id },
      data: { abordado: true },
      include: {
        pasajero: true,
        asiento_viaje: true
      }
    });

    revalidatePath(`/staff/operario/viajes/${vId}`);
    return { success: true, data: serializeBigInt(pasajeActualizado) };
  } catch (error) {
    console.error("Error al validar boleto QR:", error);
    return { success: false, error: "Error al validar boleto." };
  }
}
