const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log("=== INICIANDO BACKUP DE LA BASE DE DATOS ===");

  // Obtener todos los registros de cada tabla
  const backup = {
    sucursal: await prisma.sucursal.findMany(),
    bus: await prisma.bus.findMany(),
    ruta: await prisma.ruta.findMany(),
    persona: await prisma.persona.findMany(),
    usuario: await prisma.usuario.findMany(),
    viaje: await prisma.viaje.findMany(),
    asientoViaje: await prisma.asientoViaje.findMany(),
    pasaje: await prisma.pasaje.findMany(),
    encomienda: await prisma.encomienda.findMany(),
    reclamo: await prisma.reclamo.findMany(),
    codigoDescuento: await prisma.codigoDescuento.findMany(),
    verificationCode: await prisma.verificationCode.findMany(),
    pago: await prisma.pago.findMany(),
    gastoRuta: await prisma.gastoRuta.findMany(),
    novedadMecanica: await prisma.novedadMecanica.findMany(),
    bitacoraViaje: await prisma.bitacoraViaje.findMany(),
    alertaCentral: await prisma.alertaCentral.findMany(),
  };

  // Serializar BigInt convirtiéndolo a string para evitar errores en JSON.stringify
  const jsonString = JSON.stringify(backup, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  }, 2);

  const backupPath = path.join(__dirname, '../init_data.json');
  fs.writeFileSync(backupPath, jsonString, 'utf-8');
  console.log(`\n✅ ¡Backup guardado con éxito en: ${backupPath}!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
