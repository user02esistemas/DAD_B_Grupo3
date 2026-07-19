import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { codigo_qr } = body;

    if (!codigo_qr) {
      return NextResponse.json(
        { error: "El código QR es obligatorio." },
        { status: 400 }
      );
    }

    // Buscar el pasaje por su código QR
    const pasaje = await prisma.pasaje.findUnique({
      where: { codigo_qr },
      include: {
        pasajero: true,
        asiento_viaje: {
          include: {
            viaje: {
              include: {
                ruta: {
                  include: {
                    origen: true,
                    destino: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!pasaje) {
      return NextResponse.json(
        { error: "Código inválido. No se encontró ningún pasaje con este QR." },
        { status: 404 }
      );
    }

    // Verificar si ya abordó
    if (pasaje.abordado) {
      return NextResponse.json(
        { error: `El pasajero ${pasaje.pasajero.nombres} ya abordó previamente.` },
        { status: 400 }
      );
    }

    // Marcar como abordado
    const pasajeActualizado = await prisma.pasaje.update({
      where: { id: pasaje.id },
      data: { abordado: true },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Pasaje válido y abordaje registrado.",
        data: {
          pasajero: `${pasaje.pasajero.nombres} ${pasaje.pasajero.apellidos}`,
          dni: pasaje.pasajero.dni,
          asiento: pasaje.asiento_viaje.numero_asiento,
          ruta: `${pasaje.asiento_viaje.viaje.ruta.origen.nombre} - ${pasaje.asiento_viaje.viaje.ruta.destino.nombre}`
        }
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Error al validar QR:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: error.message },
      { status: 500 }
    );
  }
}
