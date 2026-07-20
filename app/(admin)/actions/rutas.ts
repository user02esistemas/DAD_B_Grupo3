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

const RutaSchema = z.object({
  origen_id: z.union([z.string(), z.number()]),
  destino_id: z.union([z.string(), z.number()]),
  duracion_estimada_minutos: z.coerce.number()
    .min(10, "La duración estimada debe estar entre 10 y 1440 minutos (24 horas)")
    .max(1440, "La duración estimada debe estar entre 10 y 1440 minutos (24 horas)"),
  precio_base: z.coerce.number()
    .min(10, "El precio base debe estar entre S/ 10.00 y S/ 200.00")
    .max(200, "El precio base debe estar entre S/ 10.00 y S/ 200.00")
});

async function verifyAdminRole() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    throw new Error("No autorizado. Solo los administradores pueden realizar esta acción.");
  }
}

export async function obtenerRutas() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["admin", "gerente", "vendedor"].includes(session.user.role || "")) throw new Error("No autorizado.");
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

export async function crearRuta(data: any) {
  try {
    await verifyAdminRole();
    const validData = RutaSchema.parse(data);

    const origenId = parseId(validData.origen_id);
    const destinoId = parseId(validData.destino_id);

    if (origenId === destinoId) {
      return { success: false, error: "El origen y el destino no pueden ser la misma sucursal." };
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
        duracion_estimada_minutos: validData.duracion_estimada_minutos,
        precio_base: validData.precio_base,
      },
    });

    revalidatePath("/admin/rutas");
    return { success: true, data: serializeBigInt(nuevaRuta) };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return { success: false, error: "Ya existe un registro con estos datos únicos" };
      }
    }
    return { success: false, error: error.message || "Error al crear ruta" };
  }
}

export async function eliminarRuta(id: string | number) {
  try {
    await verifyAdminRole();
    const rutaId = parseId(id);
    // Solo bloqueamos si hay viajes ACTIVOS (programados o en ruta)
    const viajesActivos = await prisma.viaje.count({ 
      where: { 
        ruta_id: rutaId,
        estado: { in: ["programado", "en_ruta"] }
      } 
    });
    if (viajesActivos > 0) {
      return { success: false, error: "No se puede eliminar la ruta porque tiene viajes activos (programados o en ruta). Cancélalos primero." };
    }

    // Si solo hay viajes cancelados o completados, los eliminamos junto con la ruta
    // La mayoría de modelos tienen onDelete: Cascade en su relación con Viaje
    // Solo Pasaje requiere borrado manual porque AsientoViaje (con Cascade) es intermediario
    await prisma.$transaction(async (tx) => {
      const viajesRuta = await tx.viaje.findMany({
        where: { ruta_id: rutaId },
        select: { id: true }
      });
      const viajeIds = viajesRuta.map(v => v.id);
      
      if (viajeIds.length > 0) {
        // Obtener los IDs de asientos para borrar los pasajes asociados
        const asientos = await tx.asientoViaje.findMany({
          where: { viaje_id: { in: viajeIds } },
          select: { id: true }
        });
        const asientoIds = asientos.map(a => a.id);
        
        // Borrar pasajes manualmente (no tienen cascade directo al viaje)
        if (asientoIds.length > 0) {
          await tx.pasaje.deleteMany({ where: { asiento_viaje_id: { in: asientoIds } } });
        }

        // Eliminar los viajes (el resto de modelos hijos tienen onDelete: Cascade)
        await tx.viaje.deleteMany({ where: { id: { in: viajeIds } } });
      }

      // Finalmente eliminar la ruta
      await tx.ruta.delete({ where: { id: rutaId } });
    });

    revalidatePath("/admin/rutas");
    return { success: true };
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return { success: false, error: "No se puede eliminar la ruta porque tiene registros asociados." };
      }
    }
    return { success: false, error: error.message || "Error al eliminar ruta" };
  }
}

export async function actualizarRuta(id: string | number, data: any) {
  try {
    await verifyAdminRole();
    const validData = RutaSchema.parse(data);

    const origenId = parseId(validData.origen_id);
    const destinoId = parseId(validData.destino_id);

    if (origenId === destinoId) {
      return { success: false, error: "El origen y el destino no pueden ser la misma sucursal." };
    }

    // Validar si al cambiar origen/destino coincide con otra ruta existente (excluyendo la ruta actual)
    const rutaExistente = await prisma.ruta.findFirst({
      where: { 
        origen_id: origenId, 
        destino_id: destinoId,
        NOT: { id: parseId(id) }
      }
    });

    if (rutaExistente) {
      return { success: false, error: "Ya existe otra ruta con ese origen y destino." };
    }

    const rutaActualizada = await prisma.ruta.update({
      where: { id: parseId(id) },
      data: {
        origen_id: origenId,
        destino_id: destinoId,
        duracion_estimada_minutos: validData.duracion_estimada_minutos,
        precio_base: validData.precio_base,
      },
    });

    revalidatePath("/admin/rutas");
    return { success: true, data: serializeBigInt(rutaActualizada) };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: error.message || "Error al actualizar ruta" };
  }
}

