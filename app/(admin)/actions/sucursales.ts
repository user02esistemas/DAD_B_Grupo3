"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

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
const SucursalSchema = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  direccion: z.string().optional().nullable(),
});

// Función de validación de rol
async function verifyAdminRole() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    throw new Error("No autorizado. Solo los administradores pueden realizar esta acción.");
  }
}

export async function obtenerSucursales() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["admin", "gerente"].includes(session.user.role || "")) throw new Error("No autorizado.");
    const sucursales = await prisma.sucursal.findMany({
      orderBy: { created_at: "desc" },
    });
    
    return { success: true, data: serializeBigInt(sucursales) };
  } catch (error) {
    console.error("Error al obtener sucursales:", error);
    return { success: false, error: "Error al obtener sucursales" };
  }
}

export async function crearSucursal(data: { nombre: string; direccion?: string }) {
  try {
    await verifyAdminRole();
    const validData = SucursalSchema.parse(data);

    const nuevaSucursal = await prisma.sucursal.create({
      data: {
        nombre: validData.nombre,
        direccion: validData.direccion || null,
      },
    });

    revalidatePath("/admin/sucursales");
    return { success: true, data: serializeBigInt(nuevaSucursal) };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return { success: false, error: "Ya existe un registro con estos datos únicos" };
      }
    }
    return { success: false, error: error.message || "Error al crear sucursal" };
  }
}

export async function actualizarSucursal(id: string | number, data: { nombre: string; direccion?: string }) {
  try {
    await verifyAdminRole();
    const validData = SucursalSchema.parse(data);

    const sucursalActualizada = await prisma.sucursal.update({
      where: { id: parseId(id) },
      data: {
        nombre: validData.nombre,
        direccion: validData.direccion || null,
      },
    });

    revalidatePath("/admin/sucursales");
    return { success: true, data: serializeBigInt(sucursalActualizada) };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return { success: false, error: "Ya existe un registro con estos datos únicos" };
      }
    }
    return { success: false, error: error.message || "Error al actualizar sucursal" };
  }
}

export async function eliminarSucursal(id: string | number) {
  try {
    await verifyAdminRole();
    
    await prisma.sucursal.delete({
      where: { id: parseId(id) },
    });

    revalidatePath("/admin/sucursales");
    return { success: true };
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return { success: false, error: "No se puede eliminar la sucursal porque tiene registros asociados" };
      }
    }
    return { success: false, error: error.message || "Error al eliminar sucursal" };
  }
}
