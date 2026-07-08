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
        bitacoras: true,
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
    revalidatePath("/staff/conductor/alertas");
    revalidatePath("/staff/conductor");
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function obtenerNovedadesConductor(conductorId: number) {
  try {
    const novedades = await prisma.novedadMecanica.findMany({
      where: {
        conductor_id: conductorId,
      },
      include: {
        bus: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });
    return JSON.parse(JSON.stringify(novedades, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));
  } catch (error) {
    console.error("Error getting conductor mechanical issues:", error);
    return [];
  }
}

export async function obtenerBusesAsignados(conductorId: number) {
  try {
    // Buscar los viajes del conductor (activos o futuros)
    const viajes = await prisma.viaje.findMany({
      where: {
        conductor_id: conductorId,
        estado: { in: ["programado", "en_ruta"] },
      },
      include: {
        bus: {
          include: {
            novedades: {
              orderBy: { created_at: "desc" },
            },
          },
        },
      },
      orderBy: {
        fecha_salida: "asc",
      },
    });

    // Mapear los buses únicos asignados
    const busesMap = new Map();
    viajes.forEach((v) => {
      if (v.bus && !busesMap.has(v.bus.id.toString())) {
        busesMap.set(v.bus.id.toString(), v.bus);
      }
    });

    return JSON.parse(JSON.stringify(Array.from(busesMap.values()), (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));
  } catch (error) {
    console.error("Error getting assigned buses:", error);
    return [];
  }
}

export async function reportarFallaMecanicaDirecta(data: { conductor_id: number, bus_id: number, categoria: string, descripcion: string }) {
  try {
    // Buscar el último viaje de este conductor en este bus para cumplir con la restricción del viaje_id requerido
    const ultimoViaje = await prisma.viaje.findFirst({
      where: {
        conductor_id: data.conductor_id,
        bus_id: data.bus_id
      },
      orderBy: { fecha_salida: "desc" }
    });

    if (!ultimoViaje) {
      return { success: false, error: "No tienes viajes previos registrados con este bus para asociar el reporte." };
    }

    await prisma.novedadMecanica.create({
      data: {
        viaje_id: ultimoViaje.id,
        bus_id: data.bus_id,
        conductor_id: data.conductor_id,
        categoria: data.categoria,
        descripcion: data.descripcion
      }
    });

    revalidatePath("/staff/conductor/novedades");
    return { success: true };
  } catch (error) {
    console.error("Error reporting direct mechanical issue:", error);
    return { success: false, error: "No se pudo registrar la falla mecánica." };
  }
}

export async function registrarOcurrenciaRuta(data: { viaje_id: number, conductor_id: number, tipo: string, gravedad: string, descripcion: string, retraso_minutos: number }) {
  try {
    // 1. Crear registro de BitacoraViaje
    await prisma.bitacoraViaje.create({
      data: {
        viaje_id: data.viaje_id,
        conductor_id: data.conductor_id,
        tipo: data.tipo,
        gravedad: data.gravedad,
        descripcion: data.descripcion,
        retraso_minutos: data.retraso_minutos
      }
    });

    // 2. Si hay retraso, actualizar la fecha_llegada estimada del viaje sumando los minutos correspondientes
    if (data.retraso_minutos > 0) {
      const viaje = await prisma.viaje.findUnique({
        where: { id: data.viaje_id }
      });
      if (viaje && viaje.fecha_llegada) {
        const nuevaLlegada = new Date(viaje.fecha_llegada.getTime() + data.retraso_minutos * 60 * 1000);
        await prisma.viaje.update({
          where: { id: data.viaje_id },
          data: { fecha_llegada: nuevaLlegada }
        });
      }
    }

    revalidatePath(`/staff/conductor/viajes/${data.viaje_id}`);
    revalidatePath("/admin/viajes");
    return { success: true };
  } catch (error) {
    console.error("Error registering trip log incident:", error);
    return { success: false, error: "No se pudo registrar el incidente en la bitácora." };
  }
}

export async function getBitacorasViaje(viajeId: number) {
  try {
    const bitacoras = await prisma.bitacoraViaje.findMany({
      where: { viaje_id: viajeId },
      orderBy: { created_at: "desc" }
    });
    return JSON.parse(JSON.stringify(bitacoras, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));
  } catch (error) {
    console.error("Error getting trip logs:", error);
    return [];
  }
}

export async function getAlertasConductor(conductorId: number) {
  try {
    const alertas = await prisma.alertaCentral.findMany({
      where: {
        viaje: {
          conductor_id: conductorId
        }
      },
      include: {
        viaje: {
          include: {
            ruta: {
              include: {
                origen: true,
                destino: true
              }
            }
          }
        }
      },
      orderBy: { created_at: "desc" }
    });
    return JSON.parse(JSON.stringify(alertas, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));
  } catch (error) {
    console.error("Error getting driver alerts:", error);
    return [];
  }
}

