"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminOrVendedor } from "./_auth";

function serializeBigInt<T>(obj: T): any {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export type Notificacion = {
  id: string;
  tipo: "pasaje" | "encomienda" | "viaje" | "reclamo";
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  link: string;
};

export async function obtenerNotificaciones(): Promise<{ success: boolean; data: Notificacion[] }> {
  try {
    await requireAdminOrVendedor();
    const ahora = new Date();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    // En paralelo: obtenemos datos recientes de varias fuentes
    const [pasajesRecientes, encomiendasRecientes, viajesProximos, reclamosPendientes] = await Promise.all([
      // 1. Últimos 5 pasajes vendidos hoy
      prisma.pasaje.findMany({
        where: {
          fecha_compra: { gte: hoy, lt: manana },
        },
        include: {
          pasajero: { select: { nombres: true, apellidos: true } },
          asiento_viaje: {
            select: {
              numero_asiento: true,
              viaje: {
                select: {
                  ruta: {
                    select: {
                      origen: { select: { nombre: true } },
                      destino: { select: { nombre: true } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { fecha_compra: "desc" },
        take: 5,
      }),

      // 2. Últimas 5 encomiendas registradas hoy
      prisma.encomienda.findMany({
        where: {
          created_at: { gte: hoy, lt: manana },
        },
        include: {
          origen: { select: { nombre: true } },
          destino: { select: { nombre: true } },
        },
        orderBy: { created_at: "desc" },
        take: 5,
      }),

      // 3. Viajes que salen en las próximas 2 horas
      prisma.viaje.findMany({
        where: {
          estado: "programado",
          fecha_salida: {
            gte: ahora,
            lte: new Date(ahora.getTime() + 2 * 60 * 60 * 1000),
          },
        },
        include: {
          ruta: {
            select: {
              origen: { select: { nombre: true } },
              destino: { select: { nombre: true } },
            },
          },
          bus: { select: { placa: true } },
        },
        orderBy: { fecha_salida: "asc" },
        take: 5,
      }),

      // 4. Reclamos pendientes
      prisma.reclamo.findMany({
        where: {
          estado: "pendiente",
        },
        include: {
          persona: { select: { nombres: true, apellidos: true } },
        },
        orderBy: { created_at: "desc" },
        take: 3,
      }),
    ]);

    const notificaciones: Notificacion[] = [];

    // Mapear pasajes
    for (const p of pasajesRecientes) {
      const ruta = p.asiento_viaje?.viaje?.ruta;
      notificaciones.push({
        id: `pasaje-${p.id}`,
        tipo: "pasaje",
        titulo: "Pasaje vendido",
        mensaje: `${p.pasajero.nombres} ${p.pasajero.apellidos} — Asiento #${p.asiento_viaje.numero_asiento} (${ruta?.origen?.nombre || "?"} → ${ruta?.destino?.nombre || "?"})`,
        fecha: p.fecha_compra?.toISOString() || new Date().toISOString(),
        leida: false,
        link: "/admin/pasajes?tab=lista",
      });
    }

    // Mapear encomiendas
    for (const e of encomiendasRecientes) {
      notificaciones.push({
        id: `enc-${e.id}`,
        tipo: "encomienda",
        titulo: "Encomienda registrada",
        mensaje: `${e.codigo_seguimiento} — ${e.origen.nombre} → ${e.destino.nombre}`,
        fecha: e.created_at?.toISOString() || new Date().toISOString(),
        leida: false,
        link: "/admin/encomiendas",
      });
    }

    // Mapear viajes próximos
    for (const v of viajesProximos) {
      const minutosRestantes = Math.round((v.fecha_salida.getTime() - ahora.getTime()) / 60000);
      notificaciones.push({
        id: `viaje-${v.id}`,
        tipo: "viaje",
        titulo: "Viaje próximo a salir",
        mensaje: `${v.ruta.origen.nombre} → ${v.ruta.destino.nombre} (Bus ${v.bus.placa}) — Sale en ${minutosRestantes} min`,
        fecha: v.fecha_salida.toISOString(),
        leida: false,
        link: "/admin/viajes",
      });
    }

    // Mapear reclamos
    for (const r of reclamosPendientes) {
      notificaciones.push({
        id: `reclamo-${r.id}`,
        tipo: "reclamo",
        titulo: "Reclamo pendiente",
        mensaje: `${r.codigo_reclamo} — ${r.persona.nombres} ${r.persona.apellidos}`,
        fecha: r.created_at?.toISOString() || new Date().toISOString(),
        leida: false,
        link: "/admin/reclamaciones",
      });
    }

    // Ordenar todo por fecha descendente
    notificaciones.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return { success: true, data: serializeBigInt(notificaciones) };
  } catch (error) {
    console.error("Error al obtener notificaciones:", error);
    return { success: true, data: [] };
  }
}
