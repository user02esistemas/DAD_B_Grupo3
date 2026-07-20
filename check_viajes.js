const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const viajes = await prisma.viaje.findMany({ select: { id: true, bus_id: true, fecha_salida: true, fecha_llegada: true, estado: true }});
  console.log(viajes);
}
main().catch(console.error);
