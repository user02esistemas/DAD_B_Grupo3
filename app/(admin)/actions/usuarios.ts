"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

import bcrypt from "bcrypt";

// Función auxiliar para parsear y validar ID numéricos / BigInt
function parseId(id: string | number | bigint): bigint {
  return typeof id === "bigint" ? id : BigInt(id);
}

// Función auxiliar para convertir BigInt y Decimal de forma segura para el Cliente
function serializeBigInt<T>(obj: T): any {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

// Esquemas de validación Zod
const RolUpdateSchema = z.object({
  rol: z.enum(["admin", "cliente", "vendedor", "gerente", "operario", "conductor"], {
    error: "Rol inválido"
  }),
});

const UsuarioCreateSchema = z.object({
  nombres: z.string().min(2, "Los nombres son obligatorios"),
  apellidos: z.string().min(2, "Los apellidos son obligatorios"),
  dni: z.string().regex(/^\d{8}$/, "El DNI debe tener exactamente 8 dígitos"),
  telefono: z.string().regex(/^\d{9}$/, "El teléfono debe tener exactamente 9 dígitos"),
  correo: z.string().email("Correo inválido"),
  contrasena: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  rol: z.enum(["admin", "cliente", "vendedor", "gerente", "operario", "conductor"], {
    error: "Rol inválido"
  }),
});

// Función de validación de rol para lectura (Admin o Gerente)
async function verifyAdminOrGerenteRole() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin" && session?.user?.role !== "gerente") {
    throw new Error("No autorizado. Debe ser administrador o gerente.");
  }
}

// Función de validación de rol para modificación (Solo Admin)
async function verifyAdminRole() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    throw new Error("No autorizado. Solo los administradores pueden realizar esta acción.");
  }
}

export async function obtenerUsuarios() {
  try {
    await verifyAdminOrGerenteRole();
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        correo: true,
        rol: true,
        created_at: true,
        updated_at: true,
        persona: true,
      },
      orderBy: { created_at: "desc" },
    });
    
    return { success: true, data: serializeBigInt(usuarios) };
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return { success: false, error: "Error al obtener usuarios" };
  }
}

export async function crearUsuario(data: any) {
  try {
    await verifyAdminRole();
    const validData = UsuarioCreateSchema.parse(data);

    // Verificar si el correo ya existe
    const existingUser = await prisma.usuario.findUnique({
      where: { correo: validData.correo },
    });

    if (existingUser) {
      return { success: false, error: "El correo ya está registrado" };
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Upsert Persona
      const persona = await tx.persona.upsert({
        where: { dni: validData.dni },
        update: {
          nombres: validData.nombres.trim().toUpperCase(),
          apellidos: validData.apellidos.trim().toUpperCase(),
          telefono: validData.telefono
        },
        create: {
          nombres: validData.nombres.trim().toUpperCase(),
          apellidos: validData.apellidos.trim().toUpperCase(),
          dni: validData.dni,
          telefono: validData.telefono,
        },
      });

      // 2. Validar si ya tiene usuario
      const usuarioExistente = await tx.usuario.findUnique({
        where: { persona_id: persona.id },
      });

      if (usuarioExistente) {
        throw new Error("DNI_REGISTRADO");
      }

      // 3. Hashear password
      const hashedPassword = await bcrypt.hash(validData.contrasena, 12);

      // 4. Crear usuario
      const newUser = await tx.usuario.create({
        data: {
          persona_id: persona.id,
          correo: validData.correo,
          contrasena: hashedPassword,
          rol: validData.rol,
        },
        include: { persona: true }
      });

      return newUser;
    });

    revalidatePath("/admin/usuarios");
    const { contrasena: _contrasena, ...usuarioSeguro } = result;
    return { success: true, data: serializeBigInt(usuarioSeguro) };

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    if (error.message === "DNI_REGISTRADO") {
      return { success: false, error: "El DNI ya tiene un usuario vinculado" };
    }
    return { success: false, error: error.message || "Error al crear usuario" };
  }
}

export async function actualizarRolUsuario(id: string | number, data: any) {
  try {
    await verifyAdminRole();
    const validData = RolUpdateSchema.parse(data);

    // No permitir quitarse el rol admin a uno mismo
    const session = await getServerSession(authOptions);
    if (session?.user?.id === id.toString()) {
      return { success: false, error: "No puedes modificar tu propio rol" };
    }

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: parseId(id) },
      data: {
        rol: validData.rol,
      },
      include: {
        persona: true
      }
    });

    revalidatePath("/admin/usuarios");
    return { success: true, data: serializeBigInt(usuarioActualizado) };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: error.message || "Error al actualizar usuario" };
  }
}

export async function eliminarUsuario(id: string | number) {
  try {
    await verifyAdminRole();
    
    // No permitir eliminarse a uno mismo
    const session = await getServerSession(authOptions);
    if (session?.user?.id === id.toString()) {
      return { success: false, error: "No puedes eliminar tu propio usuario" };
    }

    await prisma.usuario.delete({
      where: { id: parseId(id) },
    });

    revalidatePath("/admin/usuarios");
    return { success: true };
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return { success: false, error: "No se puede eliminar el usuario porque tiene registros asociados" };
      }
    }
    return { success: false, error: error.message || "Error al eliminar usuario" };
  }
}
