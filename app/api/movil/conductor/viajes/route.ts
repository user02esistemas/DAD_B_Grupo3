import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateMobileRequest } from "@/lib/mobileAuth";
import { serializeBigInt } from "@/lib/utils";

const ESTADOS_PERMITIDOS = new Set(["programado", "abordando", "en_ruta", "completado", "finalizado"]);

export async function GET(req: Request) {
  const auth = await authenticateMobileRequest(req, ["conductor", "admin"]);
  if (!auth.valid) return auth.response;

  try {
    const requestedId = new URL(req.url).searchParams.get("personaId");
    const personaId = auth.user.role === "admin" && requestedId ? BigInt(requestedId) : BigInt(auth.user.persona_id);
    const viajes = await prisma.viaje.findMany({
      where: { conductor_id: personaId },
      include: {
        ruta: { include: { origen: true, destino: true } },
        bus: true,
        encomiendas: {
          include: {
            destino: true,
            destinatario: { select: { nombres: true, apellidos: true, dni: true, telefono: true } },
            remitente: { select: { nombres: true, apellidos: true } }
          }
        },
        gastos: true,
        novedades: true,
        bitacoras: true,
      },
      orderBy: { fecha_salida: "asc" }
    });
    return NextResponse.json({ success: true, viajes: serializeBigInt(viajes) });
  } catch (error) {
    console.error("Error en GET /api/movil/conductor/viajes:", error);
    return NextResponse.json({ error: "No se pudieron obtener los viajes." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await authenticateMobileRequest(req, ["conductor", "admin"]);
  if (!auth.valid) return auth.response;

  try {
    const { viajeId, estado } = await req.json();
    if (!viajeId || typeof estado !== "string" || !ESTADOS_PERMITIDOS.has(estado)) {
      return NextResponse.json({ error: "Viaje o estado inválido." }, { status: 400 });
    }
    const viaje = await prisma.viaje.findUnique({ where: { id: BigInt(viajeId) } });
    if (!viaje) return NextResponse.json({ error: "Viaje no encontrado." }, { status: 404 });
    if (auth.user.role !== "admin" && viaje.conductor_id?.toString() !== auth.user.persona_id) {
      return NextResponse.json({ error: "No puede modificar este viaje." }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.viaje.update({ where: { id: viaje.id }, data: { estado } });
      if (estado === "en_ruta") {
        await tx.encomienda.updateMany({ where: { viaje_id: viaje.id, estado: { not: "entregado" } }, data: { estado: "en_transito" } });
      } else if (estado === "completado" || estado === "finalizado") {
        await tx.encomienda.updateMany({ where: { viaje_id: viaje.id, estado: { not: "entregado" } }, data: { estado: "en_destino" } });
      }
    });
    return NextResponse.json({ success: true, message: "Estado actualizado correctamente." });
  } catch (error) {
    console.error("Error en PUT /api/movil/conductor/viajes:", error);
    return NextResponse.json({ error: "No se pudo actualizar el estado." }, { status: 500 });
  }
}