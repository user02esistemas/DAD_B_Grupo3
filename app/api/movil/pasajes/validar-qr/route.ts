import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateMobileRequest } from "@/lib/mobileAuth";

export async function POST(req: Request) {
  const auth = await authenticateMobileRequest(req, ["operario", "admin"]);
  if (!auth.valid) return auth.response;
  try {
    const { codigo_qr } = await req.json();
    if (typeof codigo_qr !== "string" || !codigo_qr.trim()) {
      return NextResponse.json({ error: "El código QR es obligatorio." }, { status: 400 });
    }
    const pasaje = await prisma.pasaje.findUnique({
      where: { codigo_qr: codigo_qr.trim() },
      include: {
        pasajero: true,
        asiento_viaje: { include: { viaje: { include: { ruta: { include: { origen: true, destino: true } } } } } }
      }
    });
    if (!pasaje) return NextResponse.json({ error: "Código QR inválido." }, { status: 404 });

    const actualizado = await prisma.pasaje.updateMany({
      where: { id: pasaje.id, abordado: false }, data: { abordado: true }
    });
    if (actualizado.count !== 1) {
      return NextResponse.json({ error: "El pasaje ya fue registrado como abordado." }, { status: 409 });
    }
    return NextResponse.json({
      success: true,
      message: "Pasaje válido y abordaje registrado.",
      data: {
        pasajero: `${pasaje.pasajero.nombres} ${pasaje.pasajero.apellidos}`,
        dni: pasaje.pasajero.dni,
        asiento: pasaje.asiento_viaje.numero_asiento,
        ruta: `${pasaje.asiento_viaje.viaje.ruta.origen.nombre} - ${pasaje.asiento_viaje.viaje.ruta.destino.nombre}`
      }
    });
  } catch (error) {
    console.error("Error al validar QR:", error);
    return NextResponse.json({ error: "No se pudo validar el pasaje." }, { status: 500 });
  }
}