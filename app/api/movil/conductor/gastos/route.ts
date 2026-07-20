import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateMobileRequest } from "@/lib/mobileAuth";
import { serializeBigInt } from "@/lib/utils";

export async function POST(req: Request) {
  const auth = await authenticateMobileRequest(req, ["conductor", "admin"]);
  if (!auth.valid) return auth.response;

  try {
    const { viajeId, concepto, monto } = await req.json();
    const montoNumero = Number(monto);
    if (!viajeId || typeof concepto !== "string" || !concepto.trim() || !Number.isFinite(montoNumero) || montoNumero <= 0) {
      return NextResponse.json({ error: "Los datos del gasto no son válidos." }, { status: 400 });
    }

    const viaje = await prisma.viaje.findUnique({ where: { id: BigInt(viajeId) } });
    if (!viaje) return NextResponse.json({ error: "Viaje no encontrado." }, { status: 404 });
    if (auth.user.role !== "admin" && viaje.conductor_id?.toString() !== auth.user.persona_id) {
      return NextResponse.json({ error: "No puede registrar gastos en este viaje." }, { status: 403 });
    }

    const conductorId = viaje.conductor_id ?? BigInt(auth.user.persona_id);
    const gasto = await prisma.gastoRuta.create({
      data: { viaje_id: viaje.id, conductor_id: conductorId, concepto: concepto.trim(), monto: montoNumero }
    });
    return NextResponse.json({ success: true, gasto: serializeBigInt(gasto) });
  } catch (error) {
    console.error("Error en POST /api/movil/conductor/gastos:", error);
    return NextResponse.json({ error: "No se pudo registrar el gasto." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await authenticateMobileRequest(req, ["conductor", "admin"]);
  if (!auth.valid) return auth.response;

  try {
    const gastoId = new URL(req.url).searchParams.get("gastoId");
    if (!gastoId) return NextResponse.json({ error: "Falta el parámetro gastoId." }, { status: 400 });
    const gasto = await prisma.gastoRuta.findUnique({ where: { id: BigInt(gastoId) } });
    if (!gasto) return NextResponse.json({ error: "Gasto no encontrado." }, { status: 404 });
    if (auth.user.role !== "admin" && gasto.conductor_id.toString() !== auth.user.persona_id) {
      return NextResponse.json({ error: "No puede eliminar este gasto." }, { status: 403 });
    }
    await prisma.gastoRuta.delete({ where: { id: gasto.id } });
    return NextResponse.json({ success: true, message: "Gasto eliminado correctamente." });
  } catch (error) {
    console.error("Error en DELETE /api/movil/conductor/gastos:", error);
    return NextResponse.json({ error: "No se pudo eliminar el gasto." }, { status: 500 });
  }
}