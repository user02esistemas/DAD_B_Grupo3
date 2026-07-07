"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getViajesConductor(personaId: number) {
  try {
    const viajes = await prisma.viaje.findMany({
      where: {
        conductor_id: personaId,
      },
      include: {
        ruta: {
          include: {
            origen: true,
            destino: true,
          }
        },
        bus: true,
        encomiendas: {
          include: {
            destino: true
          }
        },
        gastos: true,
        novedades: true,
      },
      orderBy: {
        fecha_salida: "asc"
      }
    });

    return JSON.parse(JSON.stringify(viajes, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));
  } catch (error) {
    console.error("Error getting driver trips:", error);
    return [];
  }
}

export async function updateEstadoViaje(viajeId: number, estado: string) {
  try {
    await prisma.viaje.update({
      where: { id: viajeId },
      data: { estado }
    });
    revalidatePath("/admin/conductor/viajes");
    return { success: true };
  } catch (error) {
    console.error("Error updating trip status:", error);
    return { success: false, error: "No se pudo actualizar el estado" };
  }
}

export async function registrarGasto(data: { viaje_id: number, conductor_id: number, concepto: string, monto: number }) {
  try {
    await prisma.gastoRuta.create({
      data: {
        viaje_id: data.viaje_id,
        conductor_id: data.conductor_id,
        concepto: data.concepto,
        monto: data.monto
      }
    });
    revalidatePath("/admin/conductor/viajes");
    return { success: true };
  } catch (error) {
    console.error("Error registering expense:", error);
    return { success: false, error: "No se pudo registrar el gasto" };
  }
}

export async function reportarNovedad(data: { viaje_id: number, bus_id: number, conductor_id: number, categoria: string, descripcion: string }) {
  try {
    await prisma.novedadMecanica.create({
      data: {
        viaje_id: data.viaje_id,
        bus_id: data.bus_id,
        conductor_id: data.conductor_id,
        categoria: data.categoria,
        descripcion: data.descripcion
      }
    });
    revalidatePath("/admin/conductor/viajes");
    return { success: true };
  } catch (error) {
    console.error("Error reporting novelty:", error);
    return { success: false, error: "No se pudo reportar la falla" };
  }
}

export async function getAlertasCentral(viajeIds: number[]) {
  try {
    const alertas = await prisma.alertaCentral.findMany({
      where: {
        viaje_id: { in: viajeIds },
        leido: false
      },
      orderBy: { created_at: "desc" }
    });
    return JSON.parse(JSON.stringify(alertas, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));
  } catch (error) {
    console.error("Error getting alerts:", error);
    return [];
  }
}

export async function marcarAlertaLeida(alertaId: number) {
    try {
        await prisma.alertaCentral.update({
            where: { id: alertaId },
            data: { leido: true }
        });
        revalidatePath("/admin/conductor");
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}
