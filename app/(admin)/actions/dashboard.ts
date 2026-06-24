"use server";

import { prisma } from "@/lib/prisma";

// Helper para convertir BigInt y Decimal de forma segura para el Cliente
function serializeBigInt<T>(obj: T): any {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function getDashboardStats() {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const [totalBuses, totalSucursales, viajesActivosHoy, pasajesVendidosHoy] = await Promise.all([
      prisma.bus.count(),
      prisma.sucursal.count(),
      prisma.viaje.count({
        where: {
          estado: {
            in: ["programado", "en_ruta"],
          },
          fecha_salida: {
            gte: hoy,
            lt: manana,
          },
        },
      }),
      prisma.pasaje.count({
        where: {
          fecha_compra: {
            gte: hoy,
            lt: manana,
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        totalBuses,
        totalSucursales,
        viajesActivosHoy,
        pasajesVendidosHoy,
      },
    };
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return { success: false, error: "Error al obtener estadísticas" };
  }
}

export async function getEncomiendasPorDestino() {
  try {
    const encomiendas = await prisma.encomienda.groupBy({
      by: ["destino_id"],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 5,
    });

    // Obtener nombres de las sucursales destino
    const destinosInfo = await Promise.all(
      encomiendas.map(async (enc) => {
        const sucursal = await prisma.sucursal.findUnique({
          where: { id: enc.destino_id },
          select: { nombre: true },
        });
        return {
          destino: sucursal?.nombre || "Desconocido",
          cantidad: enc._count.id,
        };
      })
    );

    return { success: true, data: destinosInfo };
  } catch (error) {
    console.error("Error al obtener encomiendas por destino:", error);
    return { success: false, error: "Error al obtener datos" };
  }
}

export async function getViajesPorDestino() {
  try {
    // Para obtener viajes por destino, usamos las rutas
    const viajes = await prisma.viaje.findMany({
      select: {
        ruta: {
          select: {
            destino: {
              select: {
                nombre: true,
              },
            },
          },
        },
      },
    });

    const counts: Record<string, number> = {};
    viajes.forEach((v) => {
      const destino = v.ruta.destino.nombre;
      counts[destino] = (counts[destino] || 0) + 1;
    });

    // Convertir a array y ordenar
    const result = Object.entries(counts)
      .map(([destino, cantidad]) => ({ destino, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    return { success: true, data: result };
  } catch (error) {
    console.error("Error al obtener viajes por destino:", error);
    return { success: false, error: "Error al obtener datos" };
  }
}

export async function getDemandaAlertas() {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    // Contar pasajes por destino (viajes de hoy vs viajes de ayer)
    // Para simplificar, compararemos pasajes creados hoy vs ayer
    // Y encomiendas creadas hoy vs ayer

    const [pasajesHoy, pasajesAyer, encomiendasHoy, encomiendasAyer] =
      await Promise.all([
        prisma.pasaje.count({
          where: { fecha_compra: { gte: hoy, lt: manana } },
        }),
        prisma.pasaje.count({
          where: { fecha_compra: { gte: ayer, lt: hoy } },
        }),
        prisma.encomienda.count({
          where: { created_at: { gte: hoy, lt: manana } },
        }),
        prisma.encomienda.count({
          where: { created_at: { gte: ayer, lt: hoy } },
        }),
      ]);

    const alertas = [];

    // Lógica para pasajes
    if (pasajesAyer > 0) {
      const incremento = ((pasajesHoy - pasajesAyer) / pasajesAyer) * 100;
      if (incremento > 20) {
        alertas.push({
          tipo: "pasajes",
          mensaje: `Alta demanda de pasajes hoy (+${incremento.toFixed(1)}%)`,
          incremento,
        });
      }
    } else if (pasajesAyer === 0 && pasajesHoy > 0) {
      alertas.push({
        tipo: "pasajes",
        mensaje: `Nuevas ventas de pasajes registradas hoy (${pasajesHoy} pasajes)`,
        incremento: 100,
      });
    }

    // Lógica para encomiendas
    if (encomiendasAyer > 0) {
      const incremento = ((encomiendasHoy - encomiendasAyer) / encomiendasAyer) * 100;
      if (incremento > 20) {
        alertas.push({
          tipo: "encomiendas",
          mensaje: `Alta demanda de envíos de encomiendas (+${incremento.toFixed(1)}%)`,
          incremento,
        });
      }
    } else if (encomiendasAyer === 0 && encomiendasHoy > 0) {
      alertas.push({
        tipo: "encomiendas",
        mensaje: `Nuevos envíos de encomiendas registrados hoy (${encomiendasHoy} envíos)`,
        incremento: 100,
      });
    }

    return { success: true, data: alertas };
  } catch (error) {
    console.error("Error al generar alertas:", error);
    return { success: false, error: "Error al generar alertas" };
  }
}
