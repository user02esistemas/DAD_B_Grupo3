"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdminOrVendedor } from "./_auth";

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
    await requireAdminOrVendedor();
    const encomiendas = await prisma.encomienda.findMany({
      include: {
        origen: { select: { nombre: true } },
        destino: { select: { nombre: true } },
        viaje: {
          select: {
            id: true,
            bus: { select: { placa: true } },
            conductor: {
              select: {
                nombres: true,
                apellidos: true
              }
            }
          }
        },
        remitente: true,
        destinatario: true,
      },
      orderBy: { created_at: "desc" },
    });
    
    // Mapear campos para compatibilidad con la vista de cliente
    const encomiendasMapeadas = encomiendas.map(enc => ({
      ...enc,
      remitente_nombre: enc.remitente ? `${enc.remitente.nombres} ${enc.remitente.apellidos}` : "Desconocido",
      remitente_dni: enc.remitente?.dni || "N/A",
      destinatario_nombre: enc.destinatario ? `${enc.destinatario.nombres} ${enc.destinatario.apellidos}` : "Desconocido",
      destinatario_dni: enc.destinatario?.dni || "N/A",
    }));

    return { success: true, data: serializeBigInt(encomiendasMapeadas) };
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
    await requireAdminOrVendedor();
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

export async function registrarEncomienda(data: {
  remitente: { dni: string; nombres: string; apellidos: string; telefono?: string };
  destinatario: { dni: string; nombres: string; apellidos: string; telefono?: string };
  paquete: { origen_id: string; destino_id: string; peso_kg: string; precio: string; descripcion: string };
}) {
  try {
    await requireAdminOrVendedor();
    if (data.remitente.dni.trim() === data.destinatario.dni.trim()) {
      throw new Error("El remitente y el destinatario no pueden tener el mismo DNI.");
    }
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Upsert Remitente
      const remitente = await tx.persona.upsert({
        where: { dni: data.remitente.dni },
        create: {
          dni: data.remitente.dni,
          nombres: data.remitente.nombres.toUpperCase(),
          apellidos: data.remitente.apellidos.toUpperCase(),
          telefono: data.remitente.telefono || null,
        },
        update: {
          telefono: data.remitente.telefono || undefined,
        }
      });

      // 2. Upsert Destinatario
      const destinatario = await tx.persona.upsert({
        where: { dni: data.destinatario.dni },
        create: {
          dni: data.destinatario.dni,
          nombres: data.destinatario.nombres.toUpperCase(),
          apellidos: data.destinatario.apellidos.toUpperCase(),
          telefono: data.destinatario.telefono || null,
        },
        update: {
          telefono: data.destinatario.telefono || undefined,
        }
      });

      // 3. Generar código de seguimiento
      const codigoSeguimiento = `ENC-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

      // 4. Crear Encomienda
      const nuevaEncomienda = await tx.encomienda.create({
        data: {
          codigo_seguimiento: codigoSeguimiento,
          remitente_id: remitente.id,
          destinatario_id: destinatario.id,
          origen_id: parseId(data.paquete.origen_id),
          destino_id: parseId(data.paquete.destino_id),
          peso_kg: parseFloat(data.paquete.peso_kg),
          precio: parseFloat(data.paquete.precio),
          descripcion: data.paquete.descripcion,
          estado: 'recepcionado'
        }
      });

      return nuevaEncomienda;
    });

    revalidatePath("/admin/encomiendas");
    return { success: true, data: serializeBigInt(resultado) };
  } catch (error: any) {
    console.error("Error al registrar encomienda:", error);
    return { success: false, error: error.message || "Error al registrar la encomienda" };
  }
}

export async function editarEncomienda(id: string | number, data: {
  remitente: { dni: string; nombres: string; apellidos: string; telefono?: string };
  destinatario: { dni: string; nombres: string; apellidos: string; telefono?: string };
  paquete: { origen_id: string; destino_id: string; peso_kg: string; precio: string; descripcion: string };
  estado?: string;
}) {
  try {
    await requireAdminOrVendedor();
    if (data.remitente.dni.trim() === data.destinatario.dni.trim()) {
      throw new Error("El remitente y el destinatario no pueden tener el mismo DNI.");
    }
    const encomiendaId = parseId(id);

    // Verificamos que la encomienda exista y esté en estado 'recepcionado'
    const encomiendaExistente = await prisma.encomienda.findUnique({
      where: { id: encomiendaId },
    });

    if (!encomiendaExistente) throw new Error("La encomienda no existe");
    if (encomiendaExistente.estado !== 'recepcionado') {
      throw new Error("Solo se pueden editar encomiendas en estado 'recepcionado'");
    }

    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Upsert Remitente
      const remitente = await tx.persona.upsert({
        where: { dni: data.remitente.dni },
        create: {
          dni: data.remitente.dni,
          nombres: data.remitente.nombres.toUpperCase(),
          apellidos: data.remitente.apellidos.toUpperCase(),
          telefono: data.remitente.telefono || null,
        },
        update: {
          nombres: data.remitente.nombres.toUpperCase(),
          apellidos: data.remitente.apellidos.toUpperCase(),
          telefono: data.remitente.telefono || undefined,
        }
      });

      // 2. Upsert Destinatario
      const destinatario = await tx.persona.upsert({
        where: { dni: data.destinatario.dni },
        create: {
          dni: data.destinatario.dni,
          nombres: data.destinatario.nombres.toUpperCase(),
          apellidos: data.destinatario.apellidos.toUpperCase(),
          telefono: data.destinatario.telefono || null,
        },
        update: {
          nombres: data.destinatario.nombres.toUpperCase(),
          apellidos: data.destinatario.apellidos.toUpperCase(),
          telefono: data.destinatario.telefono || undefined,
        }
      });

      // 3. Actualizar Encomienda
      const encomiendaActualizada = await tx.encomienda.update({
        where: { id: encomiendaId },
        data: {
          remitente_id: remitente.id,
          destinatario_id: destinatario.id,
          origen_id: parseId(data.paquete.origen_id),
          destino_id: parseId(data.paquete.destino_id),
          peso_kg: parseFloat(data.paquete.peso_kg),
          precio: parseFloat(data.paquete.precio),
          descripcion: data.paquete.descripcion,
          estado: data.estado || undefined
        }
      });

      return encomiendaActualizada;
    });

    revalidatePath("/admin/encomiendas");
    return { success: true, data: serializeBigInt(resultado) };
  } catch (error: any) {
    console.error("Error al editar encomienda:", error);
    return { success: false, error: error.message || "Error al editar la encomienda" };
  }
}
