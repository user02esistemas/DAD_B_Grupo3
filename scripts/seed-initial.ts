import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const seedPassword = process.env.SEED_DEFAULT_PASSWORD;
  if (!seedPassword || seedPassword.length < 12) {
    throw new Error("SEED_DEFAULT_PASSWORD debe configurarse con al menos 12 caracteres.");
  }
  console.log("🚀 Iniciando seed inicial con los campos correctos...");

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
    console.log("Creando sucursales (Cajamarca, Chiclayo, Trujillo, Jaén)...");
    const sCajamarca = await prisma.sucursal.create({
      data: {
        nombre: "Cajamarca",
        direccion: "Av. San Martín de Porres 140"
      }
    });

    const sChiclayo = await prisma.sucursal.create({
      data: {
        nombre: "Chiclayo",
        direccion: "Av. José Quiñones 425"
      }
    });

    const sTrujillo = await prisma.sucursal.create({
      data: {
        nombre: "Trujillo",
        direccion: "Av. Nicolás de Piérola 1300"
      }
    });

    const sJaen = await prisma.sucursal.create({
      data: {
        nombre: "Jaén",
        direccion: "Av. Mesones Muro, esquina con La Marina - TETSUR"
      }
    });

    console.log("✅ Sucursales creadas.");

    // 3. Crear Rutas completas (Todas las combinaciones ida y vuelta)
    console.log("Creando red completa de rutas...");
    await prisma.ruta.createMany({
      data: [
        // Trujillo <-> Chiclayo
        { origen_id: sTrujillo.id, destino_id: sChiclayo.id, precio_base: 45.00, duracion_estimada_minutos: 180 },
        { origen_id: sChiclayo.id, destino_id: sTrujillo.id, precio_base: 45.00, duracion_estimada_minutos: 180 },

        // Trujillo <-> Cajamarca
        { origen_id: sTrujillo.id, destino_id: sCajamarca.id, precio_base: 65.00, duracion_estimada_minutos: 420 },
        { origen_id: sCajamarca.id, destino_id: sTrujillo.id, precio_base: 65.00, duracion_estimada_minutos: 420 },

        // Chiclayo <-> Jaén
        { origen_id: sChiclayo.id, destino_id: sJaen.id, precio_base: 55.00, duracion_estimada_minutos: 360 },
        { origen_id: sJaen.id, destino_id: sChiclayo.id, precio_base: 55.00, duracion_estimada_minutos: 360 },

        // Chiclayo <-> Cajamarca
        { origen_id: sChiclayo.id, destino_id: sCajamarca.id, precio_base: 50.00, duracion_estimada_minutos: 300 },
        { origen_id: sCajamarca.id, destino_id: sChiclayo.id, precio_base: 50.00, duracion_estimada_minutos: 300 },

        // Trujillo <-> Jaén
        { origen_id: sTrujillo.id, destino_id: sJaen.id, precio_base: 75.00, duracion_estimada_minutos: 540 },
        { origen_id: sJaen.id, destino_id: sTrujillo.id, precio_base: 75.00, duracion_estimada_minutos: 540 },

        // Cajamarca <-> Jaén
        { origen_id: sCajamarca.id, destino_id: sJaen.id, precio_base: 60.00, duracion_estimada_minutos: 420 },
        { origen_id: sJaen.id, destino_id: sCajamarca.id, precio_base: 60.00, duracion_estimada_minutos: 420 }
      ]
    });

    console.log("✅ Red completa de 12 rutas creada.");

    // 4. Crear Buses
    console.log("Creando buses de prueba...");
    await prisma.bus.create({
      data: {
        placa: "CUM-789",
        capacidad: 40,
        pisos: 1,
        asientos_piso_1: 40,
        marca: "Marcopolo"
      }
    });

    await prisma.bus.create({
      data: {
        placa: "CUM-123",
        capacidad: 52,
        pisos: 2,
        asientos_piso_1: 12,
        marca: "Marcopolo"
      }
    });

    console.log("✅ Buses creados.");

    // 5. Crear Personas y Usuarios (Bcrypt contraseñas)
    console.log("Creando personal (Admins, Gerente, Vendedor, Conductores, Operarios y Cliente)...");
    const defaultPasswordHash = await bcrypt.hash(seedPassword, 12);

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
        contrasena: defaultPasswordHash,
        rol: "admin"
      }
    });

    // Gerente
    const pGerente = await prisma.persona.create({
      data: {
        nombres: "Gerente",
        apellidos: "General",
        dni: "11111111",
        telefono: "911111111"
      }
    });
    await prisma.usuario.create({
      data: {
        persona_id: pGerente.id,
        correo: "gerente@cumbe.com",
        contrasena: defaultPasswordHash,
        rol: "gerente"
      }
    });

    // Vendedor
    const pVendedor = await prisma.persona.create({
      data: {
        nombres: "Vendedor",
        apellidos: "Prueba",
        dni: "22222222",
        telefono: "922222222"
      }
    });
    await prisma.usuario.create({
      data: {
        persona_id: pVendedor.id,
        correo: "vendedor@cumbe.com",
        contrasena: defaultPasswordHash,
        rol: "vendedor"
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
        contrasena: defaultPasswordHash,
        rol: "operario"
      }
    });

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
        contrasena: defaultPasswordHash,
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
        contrasena: defaultPasswordHash,
        rol: "conductor"
      }
    });

    // Cliente de prueba
    const pCliente = await prisma.persona.create({
      data: {
        nombres: "Cliente",
        apellidos: "Prueba",
        dni: "33333333",
        telefono: "933333333"
      }
    });
    await prisma.usuario.create({
      data: {
        persona_id: pCliente.id,
        correo: "cliente@cumbe.com",
        contrasena: defaultPasswordHash,
        rol: "cliente"
      }
    });

    console.log("✅ Personal y usuarios de todos los roles creados.");
    console.log("🎉 Seed inicial completado con éxito.");

  } catch (error) {
    console.error("❌ Error en seeding:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
