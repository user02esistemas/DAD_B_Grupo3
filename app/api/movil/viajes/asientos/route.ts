import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getTripSeats, marcarAsientosPendientes, liberarAsientos } from "@/app/actions";
import { authenticateMobileRequest } from "@/lib/mobileAuth";

export async function GET(req: Request) {
  try {
    const tripId = new URL(req.url).searchParams.get("tripId");
    if (!tripId || !/^\d+$/.test(tripId)) return NextResponse.json({ error: "tripId inválido." }, { status: 400 });
    return NextResponse.json({ success: true, seats: await getTripSeats(tripId) });
  } catch (error) {
    console.error("Error en GET asientos móvil:", error);
    return NextResponse.json({ error: "No se pudieron obtener los asientos." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await authenticateMobileRequest(req);
  if (!auth.valid) return auth.response;
  try {
    const { seatIds, guestToken } = await req.json();
    if (!Array.isArray(seatIds) || seatIds.length === 0) return NextResponse.json({ error: "seatIds inválidos." }, { status: 400 });
    const reservationToken = typeof guestToken === "string" && guestToken.length >= 16 ? guestToken : `mobile_${randomUUID()}`;
    const result = await marcarAsientosPendientes(seatIds.map(String), reservationToken);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ success: true, count: result.count, guestToken: reservationToken });
  } catch (error) {
    console.error("Error en POST bloquear asientos móvil:", error);
    return NextResponse.json({ error: "No se pudieron reservar los asientos." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await authenticateMobileRequest(req);
  if (!auth.valid) return auth.response;
  try {
    const { seatIds, guestToken } = await req.json();
    if (!Array.isArray(seatIds) || seatIds.length === 0 || typeof guestToken !== "string") {
      return NextResponse.json({ error: "seatIds y guestToken son obligatorios." }, { status: 400 });
    }
    const result = await liberarAsientos(seatIds.map(String), guestToken);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 403 });
    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error("Error en DELETE liberar asientos móvil:", error);
    return NextResponse.json({ error: "No se pudieron liberar los asientos." }, { status: 500 });
  }
}