import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateMobileRequest } from "@/lib/mobileAuth";
import { serializeBigInt } from "@/lib/utils";

export async function POST(req: Request) {
  const auth = await authenticateMobileRequest(req, ["conductor", "admin"]);
  if (!auth.valid) return auth.response;
  try {
    const { viajeId, tipo, gravedad, descripcion, retraso_minutos } = await req.json();
    const retrasoMin = Number(retraso_minutos ?? 0);
    if (!viajeId || typeof tipo !== "string" || typeof descripcion !== "string" || !descripcion.trim() || !Number.isInteger(retrasoMin) || retrasoMin < 0) {
      return NextResponse.json({ error: "Los datos de la ocurrencia no son válidos." }, { status: 400 });
    }
    const viaje = await prisma.viaje.findUnique({ where: { id: BigInt(viajeId) } });
    if (!viaje) return NextResponse.json({ error: "Viaje no encontrado." }, { status: 404 });
    if (auth.user.role !== "admin" && viaje.conductor_id?.toString() !== auth.user.persona_id) {
      return NextResponse.json({ error: "No puede registrar ocurrencias en este viaje." }, { status: 403 });
    }
    const conductorId = viaje.conductor_id ?? BigInt(auth.user.persona_id);
    const bitacora = await prisma.$transaction(async (tx) => {
      const registro = await tx.bitacoraViaje.create({
        data: { viaje_id: viaje.id, conductor_id: conductorId, tipo, gravedad: gravedad || "Baja", descripcion: descripcion.trim(), retraso_minutos: retrasoMin }
      });
      if (retrasoMin > 0 && viaje.fecha_llegada) {
        await tx.viaje.update({
          where: { id: viaje.id },
          data: { fecha_llegada: new Date(viaje.fecha_llegada.getTime() + retrasoMin * 60_000) }
        });
      }
      return registro;
    });
    return NextResponse.json({ success: true, bitacora: serializeBigInt(bitacora) });
  } catch (error) {
    console.error("Error en POST /api/movil/conductor/bitacora:", error);
    return NextResponse.json({ error: "No se pudo registrar la ocurrencia." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await authenticateMobileRequest(req, ["conductor", "admin"]);
  if (!auth.valid) return auth.response;
  try {
    const { bitacoraId } = await req.json();
    if (!bitacoraId) return NextResponse.json({ error: "Falta el parámetro bitacoraId." }, { status: 400 });
    const bitacora = await prisma.bitacoraViaje.findUnique({ where: { id: BigInt(bitacoraId) } });
    if (!bitacora) return NextResponse.json({ error: "Incidente no encontrado." }, { status: 404 });
    if (auth.user.role !== "admin" && bitacora.conductor_id.toString() !== auth.user.persona_id) {
      return NextResponse.json({ error: "No puede modificar este incidente." }, { status: 403 });
    }
    const fechaSolucion = new Date();
    const minTranscurridos = Math.max(1, Math.round((fechaSolucion.getTime() - (bitacora.created_at?.getTime() ?? fechaSolucion.getTime())) / 60_000));
    await prisma.bitacoraViaje.update({
      where: { id: bitacora.id },
      data: { solucionado: true, fecha_solucion: fechaSolucion, retraso_minutos: minTranscurridos }
    });
    return NextResponse.json({ success: true, message: "Incidente resuelto correctamente." });
  } catch (error) {
    console.error("Error en PUT /api/movil/conductor/bitacora:", error);
    return NextResponse.json({ error: "No se pudo actualizar el incidente." }, { status: 500 });
  }
}