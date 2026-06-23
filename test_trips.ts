import { PrismaClient } from '@prisma/client';
import { serializeBigInt } from './app/actions';

const prisma = new PrismaClient();

async function main() {
  const trips = await prisma.trips.findMany({
    include: {
      routes: true,
      trip_seats: {
        where: {
          status: "disponible",
        },
      },
    },
  });
  
  console.log("RAW TRIPS:", JSON.stringify(trips, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  const serialized = serializeBigInt(trips);
  
  const mapped = serialized.map((trip: any) => ({
    ...trip,
    departure_time_formatted: new Date(trip.departure_time).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' }),
    available_seats: trip.trip_seats ? trip.trip_seats.length : 0
  }));

  console.log("MAPPED:", JSON.stringify(mapped, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
