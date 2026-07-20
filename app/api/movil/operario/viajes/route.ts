import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateMobileRequest } from "@/lib/mobileAuth";
import { serializeBigInt } from "@/lib/utils";

export async function GET(req: Request) {
  const auth = await authenticateMobileRequest(req, ["operario", "admin"]);
  if (!auth.valid) return auth.response;
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + 3);
    const viajes = await prisma.viaje.findMany({
      where: { fecha_salida: { gte: hoy, lt: limite }, estado: { not: "cancelado" } },
      include: {
        ruta: { include: { origen: { select: { nombre: true } }, destino: { select: { nombre: true } } } },
        bus: { select: { placa: true, capacidad: true, pisos: true } },
        asientos_viaje: { select: { pasaje: { select: { abordado: true } } } }
      },
      orderBy: { fecha_salida: "asc" }
    });
    const viajesConPasajes = viajes.map(({ asientos_viaje, ...viaje }) => {
      const pasajes = asientos_viaje.flatMap((asiento) => asiento.pasaje ? [asiento.pasaje] : []);
      return { ...viaje, total_pasajeros: pasajes.length, total_abordados: pasajes.filter((pasaje) => pasaje.abordado).length };
    });
    const totalPasajeros = viajesConPasajes.reduce((total, viaje) => total + viaje.total_pasajeros, 0);
    const totalAbordados = viajesConPasajes.reduce((total, viaje) => total + viaje.total_abordados, 0);
    return NextResponse.json(serializeBigInt({
      success: true,
      metrics: { totalViajes: viajesConPasajes.length, totalPasajeros, totalAbordados, totalPendientes: Math.max(0, totalPasajeros - totalAbordados) },
      viajes: viajesConPasajes
    }));
  } catch (error) {
    console.error("Error en GET /api/movil/operario/viajes:", error);
    return NextResponse.json({ error: "No se pudieron obtener los viajes." }, { status: 500 });
  }
}