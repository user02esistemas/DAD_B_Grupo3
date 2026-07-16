import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Iniciando seed inicial en Supabase con los campos correctos...");

  try {
    // 1. Limpieza de datos en cascada manual para evitar violaciones de clave foránea
    console.log("Limpiando datos existentes de usuarios, personas, buses, encomiendas y pasajes...");
    await prisma.bitacoraViaje.deleteMany();
    await prisma.novedadMecanica.deleteMany();
    await prisma.gastoRuta.deleteMany();
    await prisma.alertaCentral.deleteMany();
    await prisma.pago.deleteMany();
    await prisma.pasaje.deleteMany();
    await prisma.asientoViaje.deleteMany();
    await prisma.encomienda.deleteMany();
    await prisma.viaje.deleteMany();
    await prisma.usuario.deleteMany();
    await prisma.persona.deleteMany();
    await prisma.bus.deleteMany();
    await prisma.ruta.deleteMany();
    await prisma.sucursal.deleteMany();

    // 2. Crear Sucursales
    console.log("Creando sucursales...");
    const sTrujillo = await prisma.sucursal.create({
      data: {
        nombre: "Terminal Trujillo El Cumbe",
        direccion: "Av. Nicolas de Pierola 1234"
      }
    });

    const sChiclayo = await prisma.sucursal.create({
      data: {
        nombre: "Terminal Chiclayo El Cumbe",
        direccion: "Av. Bolognesi 567"
      }
    });

    const sCajamarca = await prisma.sucursal.create({
      data: {
        nombre: "Terminal Cajamarca El Cumbe",
        direccion: "Av. Atahualpa 890"
      }
    });

    console.log("✅ Sucursales creadas.");

    // 3. Crear Rutas
    console.log("Creando rutas...");
    const rTrujilloChiclayo = await prisma.ruta.create({
      data: {
        origen_id: sTrujillo.id,
        destino_id: sChiclayo.id,
        precio_base: 45.00,
        duracion_estimada_minutos: 180 // 3 horas
      }
    });

    const rChiclayoTrujillo = await prisma.ruta.create({
      data: {
        origen_id: sChiclayo.id,
        destino_id: sTrujillo.id,
        precio_base: 45.00,
        duracion_estimada_minutos: 180
      }
    });

    const rTrujilloCajamarca = await prisma.ruta.create({
      data: {
        origen_id: sTrujillo.id,
        destino_id: sCajamarca.id,
        precio_base: 65.00,
        duracion_estimada_minutos: 420 // 7 horas
      }
    });

    console.log("✅ Rutas creadas.");

    // 4. Crear Buses
    console.log("Creando buses de prueba...");
    const bus1 = await prisma.bus.create({
      data: {
        placa: "CUM-789",
        capacidad: 40,
        pisos: 1,
        asientos_piso_1: 40,
        marca: "Marcopolo"
      }
    });

    const bus2 = await prisma.bus.create({
      data: {
        placa: "CUM-123",
        capacidad: 52,
        pisos: 2,
        asientos_piso_1: 12,
        marca: "Marcopolo"
      }
    });

    console.log("✅ Buses creados.");

    // 5. Crear Personas y Usuarios (Bcrypt contrasenas)
    console.log("Creando personal (Admins, Conductores y Operarios)...");
    const passwordHashConductor = await bcrypt.hash("123456", 10);
    const passwordHashAdmin = await bcrypt.hash("admin123", 10);
    const passwordHashOperario = await bcrypt.hash("123456", 10);

    // Conductor 1: Carlos Mendoza
    const pConductor1 = await prisma.persona.create({
      data: {
        nombres: "Carlos",
        apellidos: "Mendoza",
        dni: "12345678",
        telefono: "987654321"
      }
    });
    await prisma.usuario.create({
      data: {
        persona_id: pConductor1.id,
        correo: "conductor@cumbe.com",
        contrasena: passwordHashConductor,
        rol: "conductor"
      }
    });

    // Conductor 2: Juan Quispe
    const pConductor2 = await prisma.persona.create({
      data: {
        nombres: "Juan",
        apellidos: "Quispe",
        dni: "87654321",
        telefono: "999888777"
      }
    });
    await prisma.usuario.create({
      data: {
        persona_id: pConductor2.id,
        correo: "conductor2@cumbe.com",
        contrasena: passwordHashConductor,
        rol: "conductor"
      }
    });

    // Operario: Maria Castro
    const pOperario = await prisma.persona.create({
      data: {
        nombres: "Maria",
        apellidos: "Castro",
        dni: "55554444",
        telefono: "911222333"
      }
    });
    await prisma.usuario.create({
      data: {
        persona_id: pOperario.id,
        correo: "operario@cumbe.com",
        contrasena: passwordHashOperario,
        rol: "operario"
      }
    });

    // Administrador
    const pAdmin = await prisma.persona.create({
      data: {
        nombres: "Admin",
        apellidos: "General",
        dni: "00000000",
        telefono: "900000000"
      }
    });
    await prisma.usuario.create({
      data: {
        persona_id: pAdmin.id,
        correo: "admin@cumbe.com",
        contrasena: passwordHashAdmin,
        rol: "admin"
      }
    });

    console.log("✅ Personal y usuarios creados.");
    console.log("🎉 Seed inicial completado con éxito.");

  } catch (error) {
    console.error("❌ Error en seeding:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
