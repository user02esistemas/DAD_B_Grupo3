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

const BusSchema = z.object({
  placa: z.string().min(3, "La placa es obligatoria"),
  marca: z.string().min(1, "La marca es obligatoria"),
  capacidad: z.coerce.number().min(1, "Capacidad inválida"),
  pisos: z.coerce.number().min(1).max(2, "Pisos inválidos"),
  asientos_piso_1: z.coerce.number().optional().nullable(),
  asientos_restringidos: z.string().optional().nullable(),
  imagenes: z.string().optional().nullable(),
});

async function verifyAdminRole() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    throw new Error("No autorizado. Solo los administradores pueden realizar esta acción.");
  }
}

export async function obtenerBuses() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["admin", "gerente"].includes(session.user.role || "")) throw new Error("No autorizado.");
    const buses = await prisma.bus.findMany({
      orderBy: { created_at: "desc" },
    });
    
    return { success: true, data: serializeBigInt(buses) };
  } catch (error) {
    console.error("Error al obtener buses:", error);
    return { success: false, error: "Error al obtener buses" };
  }
}

export async function crearBus(data: any) {
  try {
    await verifyAdminRole();
    const validData = BusSchema.parse(data);

    const nuevoBus = await prisma.bus.create({
      data: {
        placa: validData.placa,
        marca: validData.marca,
        capacidad: validData.capacidad,
        pisos: validData.pisos,
        asientos_piso_1: validData.asientos_piso_1 || null,
        asientos_restringidos: validData.asientos_restringidos || null,
        imagenes: validData.imagenes || null,
      },
    });

    revalidatePath("/admin/buses");
    return { success: true, data: serializeBigInt(nuevoBus) };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return { success: false, error: "Ya existe un bus con esta placa" };
      }
    }
    return { success: false, error: error.message || "Error al crear el bus" };
  }
}

export async function actualizarBus(id: string | number, data: any) {
  try {
    await verifyAdminRole();
    const validData = BusSchema.parse(data);
    const busId = parseId(id);

    const busActualizado = await prisma.bus.update({
      where: { id: busId },
      data: {
        placa: validData.placa,
        marca: validData.marca,
        capacidad: validData.capacidad,
        pisos: validData.pisos,
        asientos_piso_1: validData.asientos_piso_1 || null,
        asientos_restringidos: validData.asientos_restringidos || null,
        imagenes: validData.imagenes || null,
      },
    });

    revalidatePath("/admin/buses");
    return { success: true, data: serializeBigInt(busActualizado) };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return { success: false, error: "Ya existe un bus con esta placa" };
      }
    }
    return { success: false, error: error.message || "Error al actualizar bus" };
  }
}

export async function eliminarBus(id: string | number) {
  try {
    await verifyAdminRole();
    await prisma.bus.delete({
      where: { id: parseId(id) },
    });

    revalidatePath("/admin/buses");
    return { success: true };
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return { success: false, error: "No se puede eliminar el bus porque tiene viajes asociados" };
      }
    }
    return { success: false, error: error.message || "Error al eliminar bus" };
  }
}
