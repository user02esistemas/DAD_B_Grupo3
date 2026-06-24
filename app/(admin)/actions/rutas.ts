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

export async function obtenerRutas() {
  try {
    const rutas = await prisma.ruta.findMany({
      include: {
        origen: { select: { nombre: true } },
        destino: { select: { nombre: true } },
      },
      orderBy: { created_at: "desc" },
    });
    
    return { success: true, data: serializeBigInt(rutas) };
  } catch (error) {
    console.error("Error al obtener rutas:", error);
    return { success: false, error: "Error al obtener rutas" };
  }
}

export async function crearRuta(data: { origen_id: string | number; destino_id: string | number; duracion_estimada_minutos: number; precio_base: number }) {
  try {
    const origenId = parseId(data.origen_id);
    const destinoId = parseId(data.destino_id);

    if (origenId === destinoId) {
      return { success: false, error: "El origen y el destino no pueden ser la misma sucursal." };
    }

    if (data.precio_base <= 0) {
      return { success: false, error: "El precio base debe ser mayor a 0." };
    }

    // Opcional: Validar si la ruta ya existe
    const rutaExistente = await prisma.ruta.findFirst({
      where: { origen_id: origenId, destino_id: destinoId }
    });

    if (rutaExistente) {
      return { success: false, error: "Ya existe una ruta con ese origen y destino." };
    }

    const nuevaRuta = await prisma.ruta.create({
      data: {
        origen_id: origenId,
        destino_id: destinoId,
        duracion_estimada_minutos: data.duracion_estimada_minutos,
        precio_base: data.precio_base,
      },
    });

    revalidatePath("/admin/rutas");
    return { success: true, data: serializeBigInt(nuevaRuta) };
  } catch (error) {
    console.error("Error al crear ruta:", error);
    return { success: false, error: "Error al crear ruta" };
  }
}

export async function eliminarRuta(id: string | number) {
  try {
    await prisma.ruta.delete({
      where: { id: parseId(id) },
    });

    revalidatePath("/admin/rutas");
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar ruta:", error);
    return { success: false, error: "Error al eliminar ruta. Puede que tenga viajes asociados." };
  }
}
