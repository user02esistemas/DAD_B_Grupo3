"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "./_auth";

// Helper for BigInt serialization
function serializeBigInt<T>(obj: T): any {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function getReclamaciones() {
  try {
    await requireAdmin();
    const reclamos = await prisma.reclamo.findMany({
      include: {
        persona: {
          select: {
            nombres: true,
            apellidos: true,
            dni: true,
            telefono: true,
          }
        }
      },
      orderBy: { created_at: "desc" },
    });

    return serializeBigInt(reclamos);
  } catch (error) {
    console.error("Error al obtener reclamaciones:", error);
    return [];
  }
}

export async function updateReclamoEstado(
  id: string,
  estado: string,
  respuestaAdmin: string
) {
  try {
    await requireAdmin();
    await prisma.reclamo.update({
      where: { id: BigInt(id) },
      data: {
        estado: estado,
        respuesta_admin: respuestaAdmin,
      },
    });

    revalidatePath("/admin/reclamaciones");
    revalidatePath("/admin"); // Para la lista de notificaciones dropdown
    return { success: true };
  } catch (error: any) {
    console.error("Error al actualizar estado del reclamo:", error);
    return { success: false, error: error.message };
  }
}
