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

export async function obtenerEncomiendas() {
  try {
    const encomiendas = await prisma.encomienda.findMany({
      include: {
        origen: { select: { nombre: true } },
        destino: { select: { nombre: true } },
        viaje: {
          select: {
            id: true,
            bus: { select: { placa: true } }
          }
        }
      },
      orderBy: { created_at: "desc" },
    });
    
    return { success: true, data: serializeBigInt(encomiendas) };
  } catch (error) {
    console.error("Error al obtener encomiendas:", error);
    return { success: false, error: "Error al obtener encomiendas" };
  }
}

export async function actualizarEstadoEncomienda(
  id: string | number, 
  nuevoEstado: string, 
  viaje_id?: string | number | null
) {
  try {
    const encomiendaId = parseId(id);
    
    let updateData: any = { estado: nuevoEstado };
    
    if (nuevoEstado === 'en_transito' && viaje_id) {
      updateData.viaje_id = parseId(viaje_id);
    } else if (nuevoEstado === 'recepcionado') {
      // Si vuelve a recepcionado, quitamos el viaje
      updateData.viaje_id = null;
    }

    const encomienda = await prisma.encomienda.update({
      where: { id: encomiendaId },
      data: updateData,
    });

    revalidatePath("/admin/encomiendas");
    return { success: true, data: serializeBigInt(encomienda) };
  } catch (error) {
    console.error("Error al actualizar encomienda:", error);
    return { success: false, error: "Error al actualizar el estado de la encomienda" };
  }
}
