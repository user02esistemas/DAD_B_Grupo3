const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const buses = await prisma.bus.findMany();
  console.log(buses.map(b => b.imagenes));
}
main().catch(console.error).finally(() => prisma.$disconnect());
