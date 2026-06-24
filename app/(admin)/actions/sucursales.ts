"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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

export async function obtenerSucursales() {
  try {
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
    const nuevaSucursal = await prisma.sucursal.create({
      data: {
        nombre: data.nombre,
        direccion: data.direccion || null,
      },
    });

    revalidatePath("/admin/sucursales");
    return { success: true, data: serializeBigInt(nuevaSucursal) };
  } catch (error) {
    console.error("Error al crear sucursal:", error);
    return { success: false, error: "Error al crear sucursal" };
  }
}

export async function actualizarSucursal(id: string | number, data: { nombre: string; direccion?: string }) {
  try {
    const sucursalActualizada = await prisma.sucursal.update({
      where: { id: parseId(id) },
      data: {
        nombre: data.nombre,
        direccion: data.direccion || null,
      },
    });

    revalidatePath("/admin/sucursales");
    return { success: true, data: serializeBigInt(sucursalActualizada) };
  } catch (error) {
    console.error("Error al actualizar sucursal:", error);
    return { success: false, error: "Error al actualizar sucursal" };
  }
}

export async function eliminarSucursal(id: string | number) {
  try {
    await prisma.sucursal.delete({
      where: { id: parseId(id) },
    });

    revalidatePath("/admin/sucursales");
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar sucursal:", error);
    return { success: false, error: "Error al eliminar sucursal" };
  }
}
