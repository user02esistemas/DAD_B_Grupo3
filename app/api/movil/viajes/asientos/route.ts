import { NextResponse } from "next/server";
import { getTripSeats, marcarAsientosPendientes, liberarAsientos } from "@/app/actions";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId");

    if (!tripId) {
      return NextResponse.json({ error: "Falta el parámetro tripId" }, { status: 400 });
    }

    const seats = await getTripSeats(tripId);
    return NextResponse.json({ success: true, seats }, { status: 200 });

  } catch (error: any) {
    console.error("Error en GET asientos móvil:", error);
    return NextResponse.json(
      { error: "Error interno al obtener asientos", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { seatIds, email, guestToken } = body;

    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return NextResponse.json({ error: "Faltan o son inválidos los seatIds" }, { status: 400 });
    }

    const token = guestToken || "mobile-session-" + Math.random().toString(36).substring(2, 12);
    const result = await marcarAsientosPendientes(seatIds, token, email);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, count: result.count, guestToken: token }, { status: 200 });

  } catch (error: any) {
    console.error("Error en POST bloquear asientos móvil:", error);
    return NextResponse.json(
      { error: "Error al reservar los asientos", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { seatIds } = body;

    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return NextResponse.json({ error: "Faltan o son inválidos los seatIds" }, { status: 400 });
    }

    const result = await liberarAsientos(seatIds);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, count: result.count }, { status: 200 });

  } catch (error: any) {
    console.error("Error en DELETE liberar asientos móvil:", error);
    return NextResponse.json(
      { error: "Error al liberar los asientos", details: error.message },
      { status: 500 }
    );
  }
}
