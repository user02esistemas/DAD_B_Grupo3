import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateMobileRequest } from "@/lib/mobileAuth";
import { serializeBigInt } from "@/lib/utils";

export async function GET(req: Request) {
  const auth = await authenticateMobileRequest(req, ["operario", "admin"]);
  if (!auth.valid) return auth.response;
  try {
    const viajeId = new URL(req.url).searchParams.get("viajeId");
    if (!viajeId) return NextResponse.json({ error: "Falta el parámetro viajeId." }, { status: 400 });
    const pasajes = await prisma.pasaje.findMany({
      where: { asiento_viaje: { viaje_id: BigInt(viajeId) } },
      include: {
        pasajero: { select: { nombres: true, apellidos: true, dni: true, telefono: true } },
        asiento_viaje: { select: { numero_asiento: true, piso: true, estado: true } }
      },
      orderBy: { asiento_viaje: { numero_asiento: "asc" } }
    });
    return NextResponse.json(serializeBigInt({ success: true, pasajes }));
  } catch (error) {
    console.error("Error en GET /api/movil/operario/pasajeros:", error);
    return NextResponse.json({ error: "No se pudieron obtener los pasajeros." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await authenticateMobileRequest(req, ["operario", "admin"]);
  if (!auth.valid) return auth.response;
  try {
    const { pasajeId, abordado } = await req.json();
    if (!pasajeId || typeof abordado !== "boolean") {
      return NextResponse.json({ error: "pasajeId y abordado son obligatorios." }, { status: 400 });
    }
    const pasaje = await prisma.pasaje.update({
      where: { id: BigInt(pasajeId) }, data: { abordado }, include: { pasajero: true, asiento_viaje: true }
    });
    return NextResponse.json(serializeBigInt({ success: true, pasaje }));
  } catch (error) {
    console.error("Error en PUT /api/movil/operario/pasajeros:", error);
    return NextResponse.json({ error: "No se pudo actualizar el abordaje." }, { status: 500 });
  }
}