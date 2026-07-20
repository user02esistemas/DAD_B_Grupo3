import { NextResponse } from "next/server";
import { crearCargoCulqi, procesarPagoMultiplesAsientosCulqi, getClienteProfile } from "@/app/actions";
import { verifyMobileToken } from "@/lib/mobileAuth";

export async function POST(req: Request) {
  try {
    const auth = verifyMobileToken(req);
    if (!auth.valid) return auth.response;

    const body = await req.json();
    const { tokenId, viajeId, asientosPasajeros, amount, email, guestToken } = body;

    if (!tokenId || !viajeId || !asientosPasajeros || !Array.isArray(asientosPasajeros) || asientosPasajeros.length === 0 || !amount) {
      return NextResponse.json(
        { error: "Faltan parámetros obligatorios para procesar la compra." },
        { status: 400 }
      );
    }

    const seatIds = asientosPasajeros.map(ap => ap.seatId);

    // 1. Crear el cargo en Culqi
    const cargoResult = await crearCargoCulqi(tokenId, email || "cliente@elcumbe.com", amount, seatIds);

    if (!cargoResult.success) {
      return NextResponse.json(
        { error: cargoResult.error || "El pago fue rechazado por la pasarela de pagos." },
        { status: 400 }
      );
    }

    const chargeId = cargoResult.chargeId;

    // 2. Procesar el pago en base de datos y emitir boletos
    const compraResult = await procesarPagoMultiplesAsientosCulqi(
      viajeId,
      asientosPasajeros,
      amount,
      chargeId,
      email,
      guestToken
    );

    if (!compraResult.success) {
      return NextResponse.json(
        { error: compraResult.error || "No se pudo registrar la compra de pasajes." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: "Compra procesada exitosamente.", 
        tickets: compraResult.tickets 
      }, 
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Error en API de compras móvil:", error);
    return NextResponse.json(
      { error: "Error interno al procesar la compra", details: error.message },
      { status: 500 }
    );
  }
}

// Obtener pasajes/boletos del cliente
export async function GET(req: Request) {
  try {
    const auth = verifyMobileToken(req);
    if (!auth.valid) return auth.response;

    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Falta el parámetro email" }, { status: 400 });
    }

    const profile = await getClienteProfile(email);
    if (!profile) {
      return NextResponse.json({ error: "No se encontró el perfil de este cliente" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      tickets: profile.pasajes || [],
      encomiendas: profile.encomiendas || []
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error en GET compras/boletos móvil:", error);
    return NextResponse.json(
      { error: "Error interno al obtener boletos", details: error.message },
      { status: 500 }
    );
  }
}
