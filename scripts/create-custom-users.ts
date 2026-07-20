import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const password = "1234";
  const passwordHash = await bcrypt.hash(password, 12);

  console.log("🚀 Creando/actualizando cuentas para todos los roles...");

  const usersData = [
    {
      email: "gerente@cumbe.com",
      role: "gerente",
      dni: "11111111",
      nombres: "Gerente",
      apellidos: "General",
      telefono: "911111111"
    },
    {
      email: "admin@cumbe.com",
      role: "admin",
      dni: "00000000",
      nombres: "Admin",
      apellidos: "General",
      telefono: "900000000"
    },
    {
      email: "vendedor@cumbe.com",
      role: "vendedor",
      dni: "22222222",
      nombres: "Vendedor",
      apellidos: "Prueba",
      telefono: "922222222"
    },
    {
      email: "operario@cumbe.com",
      role: "operario",
      dni: "55554444",
      nombres: "Maria",
      apellidos: "Castro",
      telefono: "911222333"
    },
    {
      email: "conductor@cumbe.com",
      role: "conductor",
      dni: "12345678",
      nombres: "Carlos",
      apellidos: "Mendoza",
      telefono: "987654321"
    }
  ];

  for (const u of usersData) {
    try {
      // 1. Buscar si el usuario ya existe por correo
      let usuario = await prisma.usuario.findUnique({
        where: { correo: u.email }
      });

      if (usuario) {
        // Actualizar contraseña y rol
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: {
            contrasena: passwordHash,
            rol: u.role
          }
        });
        console.log(`✅ Usuario actualizado: ${u.email} (${u.role})`);
      } else {
        // 2. Buscar si la persona ya existe por DNI
        let persona = await prisma.persona.findUnique({
          where: { dni: u.dni }
        });

        if (!persona) {
          persona = await prisma.persona.create({
            data: {
              nombres: u.nombres,
              apellidos: u.apellidos,
              dni: u.dni,
              telefono: u.telefono
            }
          });
        }

        // 3. Crear el usuario
        await prisma.usuario.create({
          data: {
            persona_id: persona.id,
            correo: u.email,
            contrasena: passwordHash,
            rol: u.role
          }
        });
        console.log(`✅ Usuario creado: ${u.email} (${u.role})`);
      }
    } catch (e) {
      console.error(`❌ Error con usuario ${u.email}:`, e);
    }
  }

  console.log("🎉 Cuentas configuradas correctamente.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
