import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.usuario.count();
    console.log("=== DIAGNÓSTICO DE BASE DE DATOS LOCAL ===");
    console.log("Total de usuarios encontrados:", count);
    
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        correo: true,
        rol: true,
        persona: {
          select: {
            nombres: true,
            apellidos: true
          }
        }
      }
    });

    console.log("\nLista de correos en la base de datos:");
    usuarios.forEach((u) => {
      console.log(`- Correo: "${u.correo}" | Rol: ${u.rol} | Nombre: ${u.persona?.nombres} ${u.persona?.apellidos}`);
    });
  } catch (error) {
    console.error("Error al conectar o consultar la base de datos:", error);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
