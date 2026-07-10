"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const FiltrosSchema = z.object({
  mes: z.string().optional(),
  destino_id: z.string().optional(),
  horario: z.enum(["manana", "tarde", "noche"]).optional(),
});

function serializeBigInt<T>(obj: T): any {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function getDashboardGerencialStats(rawFiltros: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "admin" && session.user.role !== "gerente")) {
      throw new Error("No autorizado");
    }

    const validData = FiltrosSchema.parse(rawFiltros);
    
    // Configuración de fechas (Mes actual por defecto)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = validData.mes ? parseInt(validData.mes) - 1 : now.getMonth(); // 0-indexed
    
    // First and last day of the selected month
    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    // Construir los filtros para Prisma (relation filters)
    const viajeFilters: any = {};
    
    if (validData.destino_id && validData.destino_id !== "") {
      viajeFilters.ruta = {
        destino_id: BigInt(validData.destino_id)
      };
    }

    // Buscamos los pasajes vendidos en el rango de fecha
    const pasajesQuery = await prisma.pasaje.findMany({
      where: {
        fecha_compra: {
          gte: startDate,
          lte: endDate,
        },
        asiento_viaje: {
          viaje: {
            ...viajeFilters
          }
        }
      },
      include: {
        asiento_viaje: {
          include: {
            viaje: {
              include: {
                ruta: {
                  include: {
                    destino: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Filtro en memoria por Horario (dado que Prisma no soporta extract(hour) nativamente)
    const pasajes = pasajesQuery.filter(p => {
      if (!validData.horario) return true;
      const hour = new Date(p.asiento_viaje.viaje.fecha_salida).getHours();
      if (validData.horario === "manana") return hour >= 6 && hour < 12;
      if (validData.horario === "tarde") return hour >= 12 && hour < 18;
      if (validData.horario === "noche") return hour >= 18 || hour < 6;
      return true;
    });

    // 1. KPI: Total Pasajes Vendidos
    const totalPasajes = pasajes.length;

    // 2. KPI: Ingresos Totales
    const ingresosTotales = pasajes.reduce((sum, p) => sum + Number(p.precio), 0);

    // 3. KPI: Ruta Más Popular
    const rutasCount: Record<string, number> = {};
    pasajes.forEach(p => {
      const dest = p.asiento_viaje.viaje.ruta.destino.nombre;
      rutasCount[dest] = (rutasCount[dest] || 0) + 1;
    });
    
    let rutaMasPopular = "N/A";
    let maxRuta = 0;
    for (const [ruta, count] of Object.entries(rutasCount)) {
      if (count > maxRuta) {
        maxRuta = count;
        rutaMasPopular = ruta;
      }
    }

    // 4. Data para el Gráfico (Agrupado por día del mes)
    // Generamos los días del mes
    const daysInMonth = endDate.getDate();
    const ventasPorDiaMap = new Map();
    for(let i=1; i<=daysInMonth; i++) {
      ventasPorDiaMap.set(i.toString().padStart(2, '0'), 0); // "01", "02", etc.
    }

    pasajes.forEach(p => {
      if (p.fecha_compra) {
        const dia = p.fecha_compra.getDate().toString().padStart(2, '0');
        ventasPorDiaMap.set(dia, ventasPorDiaMap.get(dia) + 1);
      }
    });

    const ventasGrafico = Array.from(ventasPorDiaMap.entries()).map(([dia, cantidad]) => ({
      dia,
      ventas: cantidad
    }));

    return {
      success: true,
      data: {
        kpis: {
          totalPasajes,
          ingresosTotales,
          rutaMasPopular,
        },
        grafico: ventasGrafico
      }
    };

  } catch (error: any) {
    console.error("Error obteniendo estadísticas gerenciales:", error);
    return { success: false, error: "Error al cargar estadísticas" };
  }
}
