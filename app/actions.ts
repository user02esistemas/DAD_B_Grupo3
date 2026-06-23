"use server";

import { prisma } from "@/lib/prisma";

// Utility to serialize BigInt
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return obj.toString();
  if (typeof obj === "object") {
    if (obj instanceof Date) return obj.toISOString();
    if (Array.isArray(obj)) return obj.map(serializeBigInt);
    
    if (obj && typeof obj.toNumber === "function" && obj.d !== undefined) {
      return obj.toString();
    }

    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = serializeBigInt(obj[key]);
    }
    return newObj;
  }
  return obj;
}

// 1. buscarEncomiendasPorDNI
export async function buscarEncomiendasPorDNI(dni: string) {
  try {
    const encomiendas = await prisma.encomienda.findMany({
      where: {
        remitente_dni: dni,
      },
      include: {
        origen: true,
        destino: true,
        viaje: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return serializeBigInt(encomiendas);
  } catch (error) {
    console.error("Error buscando encomiendas:", error);
    return [];
  }
}

// 2. getLocations
export async function getLocations() {
  try {
    const locs = await prisma.sucursal.findMany({
      orderBy: {
        nombre: "asc",
      },
    });
    return serializeBigInt(locs);
  } catch (error) {
    console.error("Error getting locations:", error);
    return [];
  }
}

// 3. searchTrips
export async function searchTrips(originId: string, destinationId: string, date: string) {
  try {
    const startDate = new Date(date);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setUTCHours(23, 59, 59, 999);

    const trips = await prisma.viaje.findMany({
      where: {
        ruta: {
          origen_id: BigInt(originId),
          destino_id: BigInt(destinationId),
        },
        fecha_salida: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        ruta: true,
        bus: true,
        asientos_viaje: true,
      },
      orderBy: {
        fecha_salida: "asc",
      },
    });

    const serialized = serializeBigInt(trips);
    return serialized.map((trip: any) => {
      let timeStr = "";
      if (trip.fecha_salida) {
        const d = new Date(trip.fecha_salida);
        timeStr = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
      }

      let available = 0;
      if (trip.asientos_viaje && trip.asientos_viaje.length > 0) {
        available = trip.asientos_viaje.filter((s: any) => s.estado === "disponible").length;
      } else {
        available = trip.bus?.capacidad || 40;
      }

      return {
        ...trip,
        departure_time_formatted: timeStr,
        available_seats: available
      };
    });

  } catch (error) {
    console.error("Error searching trips:", error);
    return [];
  }
}

// 4. getTripSeats
export async function getTripSeats(tripId: string) {
  try {
    let seats = await prisma.asientoViaje.findMany({
      where: {
        viaje_id: BigInt(tripId),
      },
      orderBy: {
        numero_asiento: "asc",
      },
    });

    if (seats.length === 0) {
      const trip = await prisma.viaje.findUnique({
        where: { id: BigInt(tripId) },
        include: { bus: true }
      });
      const capacity = trip?.bus?.capacidad || 40;
      const pisos = trip?.bus?.pisos || 1;
      
      const newSeatsData = Array.from({ length: capacity }).map((_, i) => ({
        viaje_id: BigInt(tripId),
        numero_asiento: i + 1,
        piso: pisos === 2 && i >= capacity / 2 ? 2 : 1,
        estado: "disponible" as const
      }));

      await prisma.asientoViaje.createMany({ data: newSeatsData });

      seats = await prisma.asientoViaje.findMany({
        where: { viaje_id: BigInt(tripId) },
        orderBy: { numero_asiento: "asc" },
      });
    }

    return serializeBigInt(seats);
  } catch (error) {
    console.error("Error getting trip seats:", error);
    return [];
  }
}

// 5. simularPagoYCrearTicket
export async function simularPagoYCrearTicket(tripSeatId: string, email: string, price: string) {
  try {
    const user = await prisma.usuario.findUnique({ where: { correo: email } });
    if (!user) throw new Error("Usuario no encontrado");
    const userId = user.id;

    const result = await prisma.$transaction(async (tx) => {
      const seat = await tx.asientoViaje.findUnique({
        where: { id: BigInt(tripSeatId) },
      });

      if (!seat || seat.estado !== "disponible") {
        throw new Error("Asiento ya no disponible.");
      }

      await tx.asientoViaje.update({
        where: { id: BigInt(tripSeatId) },
        data: { estado: "vendido", bloqueado_por_usuario_id: userId },
      });

      const ticket = await tx.pasaje.create({
        data: {
          asiento_viaje_id: BigInt(tripSeatId),
          usuario_id: userId,
          precio: parseFloat(price),
          codigo_qr: `QR-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now()}`,
        },
      });

      return ticket;
    });

    return serializeBigInt(result);
  } catch (error: any) {
    console.error("Error procesando pago:", error);
    throw new Error(error.message || "Error al procesar el pago");
  }
}
