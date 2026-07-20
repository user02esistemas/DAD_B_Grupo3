import { NextResponse } from "next/server";
import { searchTrips, getLocations } from "@/app/actions";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    // Si se solicita las sucursales/localidades
    if (type === "locations") {
      const locations = await getLocations();
      return NextResponse.json({ success: true, locations }, { status: 200 });
    }

    const originId = searchParams.get("originId");
    const destinationId = searchParams.get("destinationId");
    const date = searchParams.get("date");

    if (!originId || !destinationId || !date) {
      return NextResponse.json(
        { error: "Faltan parámetros de búsqueda (originId, destinationId, date)" },
        { status: 400 }
      );
    }

    const trips = await searchTrips(originId, destinationId, date);
    return NextResponse.json({ success: true, trips }, { status: 200 });

  } catch (error: any) {
    console.error("Error en API de viajes móvil:", error);
    return NextResponse.json(
      { error: "Error interno al buscar viajes" },
      { status: 500 }
    );
  }
}
