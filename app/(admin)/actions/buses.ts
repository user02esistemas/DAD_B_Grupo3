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

export async function obtenerBuses() {
  try {
    const buses = await prisma.bus.findMany({
      orderBy: { created_at: "desc" },
    });
    
    return { success: true, data: serializeBigInt(buses) };
  } catch (error) {
    console.error("Error al obtener buses:", error);
    return { success: false, error: "Error al obtener buses" };
  }
}

export async function crearBus(data: { 
  placa: string; 
  marca: string; 
  capacidad: number; 
  pisos: number;
  asientos_piso_1?: number;
  asientos_restringidos?: string;
}) {
  try {
    const nuevoBus = await prisma.bus.create({
      data: {
        placa: data.placa,
        marca: data.marca,
        capacidad: data.capacidad,
        pisos: data.pisos,
        asientos_piso_1: data.asientos_piso_1,
        asientos_restringidos: data.asientos_restringidos,
      },
    });

    revalidatePath("/admin/buses");
    return { success: true, data: serializeBigInt(nuevoBus) };
  } catch (error) {
    console.error("Error al crear bus:", error);
    return { success: false, error: "Error al crear el bus. La placa podría estar duplicada." };
  }
}

export async function actualizarBus(
  id: string | number, 
  data: { 
    placa: string; 
    marca: string; 
    capacidad: number; 
    pisos: number;
    asientos_piso_1?: number;
    asientos_restringidos?: string;
  }
) {
  try {
    const busActualizado = await prisma.bus.update({
      where: { id: parseId(id) },
      data: {
        placa: data.placa,
        marca: data.marca,
        capacidad: data.capacidad,
        pisos: data.pisos,
        asientos_piso_1: data.asientos_piso_1,
        asientos_restringidos: data.asientos_restringidos,
      },
    });

    revalidatePath("/admin/buses");
    return { success: true, data: serializeBigInt(busActualizado) };
  } catch (error: any) {
    console.error("Error al actualizar bus:", error);
    if (error.code === 'P2002') {
      return { success: false, error: "Ya existe un bus con esta placa" };
    }
    return { success: false, error: "Error al actualizar bus" };
  }
}

export async function eliminarBus(id: string | number) {
  try {
    await prisma.bus.delete({
      where: { id: parseId(id) },
    });

    revalidatePath("/admin/buses");
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar bus:", error);
    return { success: false, error: "Error al eliminar bus. Puede que tenga viajes asociados." };
  }
}
