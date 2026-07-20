import { NextResponse } from "next/server";
import { crearCargoCulqi, procesarPagoMultiplesAsientosCulqi } from "@/app/actions";
import { authenticateMobileRequest } from "@/lib/mobileAuth";
import { getCustomerProfileByUserId } from "@/lib/customer-profile";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const auth = await authenticateMobileRequest(req);
  if (!auth.valid) return auth.response;
  try {
    const { tokenId, viajeId, asientosPasajeros, amount, guestToken } = await req.json();
    if (
      typeof tokenId !== "string" ||
      !viajeId ||
      !Array.isArray(asientosPasajeros) ||
      asientosPasajeros.length === 0 ||
      asientosPasajeros.length > 6 ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0 ||
      typeof guestToken !== "string" ||
      guestToken.length < 16
    ) {
      return NextResponse.json({ error: "Los datos de la compra no son válidos." }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: BigInt(auth.user.id) } });
    if (!usuario) return NextResponse.json({ error: "La sesión ya no es válida." }, { status: 401 });
    const seatIds = asientosPasajeros.map((item) => item?.seatId).filter(Boolean);
    if (seatIds.length !== asientosPasajeros.length) {
      return NextResponse.json({ error: "La selección de asientos no es válida." }, { status: 400 });
    }

    const cargoResult = await crearCargoCulqi(tokenId, usuario.correo, Number(amount), seatIds);
    if (!cargoResult.success || !cargoResult.chargeId) {
      return NextResponse.json({ error: cargoResult.error || "El pago fue rechazado." }, { status: 400 });
    }

    const compraResult = await procesarPagoMultiplesAsientosCulqi(
      String(viajeId), asientosPasajeros, Number(amount), cargoResult.chargeId, usuario.correo, guestToken
    );
    if (!compraResult.success) {
      console.error("Cargo aprobado sin emisión de boletos:", cargoResult.chargeId, compraResult.error);
      return NextResponse.json(
        { error: "El cargo fue aprobado, pero no se emitieron los boletos. Contacte a soporte con el identificador de la operación.", operationId: cargoResult.chargeId },
        { status: 502 }
      );
    }
    const ticketIds = Array.isArray(compraResult.tickets)
      ? compraResult.tickets.map((ticket) => BigInt(ticket.id))
      : [];
    if (ticketIds.length) {
      await prisma.pasaje.updateMany({
        where: { id: { in: ticketIds }, comprador_id: null },
        data: { comprador_id: usuario.id },
      });
    }
    return NextResponse.json({ success: true, message: "Compra procesada exitosamente.", tickets: compraResult.tickets });
  } catch (error) {
    console.error("Error en API de compras móvil:", error);
    return NextResponse.json({ error: "Error interno al procesar la compra." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const auth = await authenticateMobileRequest(req);
  if (!auth.valid) return auth.response;
  try {
    const profile = await getCustomerProfileByUserId(BigInt(auth.user.id));
    if (!profile) return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
    return NextResponse.json({ success: true, tickets: profile.pasajes || [], encomiendas: profile.encomiendas || [] });
  } catch (error) {
    console.error("Error en GET compras/boletos móvil:", error);
    return NextResponse.json({ error: "No se pudieron obtener los boletos." }, { status: 500 });
  }
}