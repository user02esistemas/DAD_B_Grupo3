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
    const novedades = await prisma.novedadMecanica.findMany({
      where: { conductor_id: conductorId }, include: { bus: true }, orderBy: { created_at: "desc" }
    });
    return NextResponse.json({ success: true, novedades: serializeBigInt(novedades) });
  } catch (error) {
    console.error("Error en GET /api/movil/conductor/novedades:", error);
    return NextResponse.json({ error: "No se pudieron obtener las novedades." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await authenticateMobileRequest(req, ["conductor", "admin"]);
  if (!auth.valid) return auth.response;
  try {
    const { conductorId, categoria, descripcion } = await req.json();
    if (typeof categoria !== "string" || !categoria.trim() || typeof descripcion !== "string" || !descripcion.trim()) {
      return NextResponse.json({ error: "Categoría y descripción son obligatorias." }, { status: 400 });
    }
    const personaId = auth.user.role === "admin" && conductorId ? BigInt(conductorId) : BigInt(auth.user.persona_id);
    const ultimoViaje = await prisma.viaje.findFirst({ where: { conductor_id: personaId }, orderBy: { fecha_salida: "desc" } });
    if (!ultimoViaje) return NextResponse.json({ error: "No hay viajes asignados para asociar el reporte." }, { status: 400 });
    const novedad = await prisma.novedadMecanica.create({
      data: { viaje_id: ultimoViaje.id, bus_id: ultimoViaje.bus_id, conductor_id: personaId, categoria: categoria.trim(), descripcion: descripcion.trim() }
    });
    return NextResponse.json({ success: true, novedad: serializeBigInt(novedad) });
  } catch (error) {
    console.error("Error en POST /api/movil/conductor/novedades:", error);
    return NextResponse.json({ error: "No se pudo registrar la novedad." }, { status: 500 });
  }
}