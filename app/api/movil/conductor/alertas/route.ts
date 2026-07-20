import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateMobileRequest } from "@/lib/mobileAuth";
import { serializeBigInt } from "@/lib/utils";

export async function GET(req: Request) {
  const auth = await authenticateMobileRequest(req, ["conductor", "admin"]);
  if (!auth.valid) return auth.response;
  try {
    const requestedId = new URL(req.url).searchParams.get("conductorId");
    const conductorId = auth.user.role === "admin" && requestedId ? BigInt(requestedId) : BigInt(auth.user.persona_id);
    const alertas = await prisma.alertaCentral.findMany({
      where: { viaje: { conductor_id: conductorId } },
      include: { viaje: { include: { ruta: { include: { origen: true, destino: true } } } } },
      orderBy: { created_at: "desc" }
    });
    return NextResponse.json({ success: true, alertas: serializeBigInt(alertas) });
  } catch (error) {
    console.error("Error en GET /api/movil/conductor/alertas:", error);
    return NextResponse.json({ error: "No se pudieron obtener las alertas." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await authenticateMobileRequest(req, ["conductor", "admin"]);
  if (!auth.valid) return auth.response;
  try {
    const { alertaId } = await req.json();
    if (!alertaId) return NextResponse.json({ error: "Falta el parámetro alertaId." }, { status: 400 });
    const alerta = await prisma.alertaCentral.findUnique({ where: { id: BigInt(alertaId) }, include: { viaje: true } });
    if (!alerta) return NextResponse.json({ error: "Alerta no encontrada." }, { status: 404 });
    if (auth.user.role !== "admin" && alerta.viaje.conductor_id?.toString() !== auth.user.persona_id) {
      return NextResponse.json({ error: "No puede modificar esta alerta." }, { status: 403 });
    }
    await prisma.alertaCentral.update({ where: { id: alerta.id }, data: { leido: true } });
    return NextResponse.json({ success: true, message: "Alerta marcada como leída." });
  } catch (error) {
    console.error("Error en POST /api/movil/conductor/alertas:", error);
    return NextResponse.json({ error: "No se pudo actualizar la alerta." }, { status: 500 });
  }
}