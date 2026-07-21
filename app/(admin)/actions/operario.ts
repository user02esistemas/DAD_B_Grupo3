"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPeruDayRange } from "@/lib/dates";

// Función auxiliar para verificar si el usuario tiene rol de operario o administrador
async function checkOperarioOrAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "operario" && session.user.role !== "admin")) {
    throw new Error("Acceso no autorizado. Debe ser operario o administrador.");
  }
}

// Función auxiliar para convertir BigInt y Decimal de forma segura para el Cliente
function serializeBigInt<T>(obj: T): any {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export interface FiltrosOperario {
  ruta_id?: string;
  bus_id?: string;
  fecha?: string; // "YYYY-MM-DD"
  estado?: string;
}

export async function obtenerViajesOperario(filtros: FiltrosOperario = {}) {
  try {
    await checkOperarioOrAdmin();

    // Construir el where dinámico
    const where: any = {
      estado: filtros.estado
        ? filtros.estado
        : { not: "cancelado" },
    };

    // Filtro por fecha: si se envía una fecha específica usar ese día, sino hoy y mañana
    if (filtros.fecha) {
      const { start: inicio, end } = getPeruDayRange(filtros.fecha);
      const fin = new Date(end.getTime() + 1);
      where.fecha_salida = { gte: inicio, lt: fin };
    } else {
      const { start: hoy } = getPeruDayRange();
      const pasadoMañana = new Date(hoy.getTime() + 2 * 24 * 60 * 60 * 1000);
      where.fecha_salida = { gte: hoy, lt: pasadoMañana };
    }

    // Filtro por ruta
    if (filtros.ruta_id) {
      where.ruta_id = BigInt(filtros.ruta_id);
    }

    // Filtro por bus
    if (filtros.bus_id) {
      where.bus_id = BigInt(filtros.bus_id);
    }

    const viajes = await prisma.viaje.findMany({
      where,
      include: {
        ruta: {
          include: {
            origen: { select: { nombre: true } },
            destino: { select: { nombre: true } },
          },
        },
        bus: { select: { placa: true, capacidad: true, pisos: true } },
      },
      orderBy: { fecha_salida: "asc" },
    });

    // Contar pasajes vendidos/confirmados por viaje (excluir estados inválidos)
    const viajesConPasajes = await Promise.all(
      viajes.map(async (v) => {
        const [pasajesCount, abordadosCount] = await Promise.all([
          prisma.pasaje.count({
            where: {
              asiento_viaje: { viaje_id: v.id },
            },
          }),
          prisma.pasaje.count({
            where: {
              asiento_viaje: { viaje_id: v.id },
              abordado: true,
            },
          }),
        ]);

        return {
          ...v,
          total_pasajeros: pasajesCount,
          total_abordados: abordadosCount,
        };
      })
    );

    return { success: true, data: serializeBigInt(viajesConPasajes) };
  } catch (error) {
    console.error("Error al obtener viajes de operario:", error);
    return { success: false, error: "Error al obtener viajes" };
  }
}

// Obtener listas de rutas y buses para los filtros
export async function obtenerFiltrosOperario() {
  try {
    await checkOperarioOrAdmin();

    const [rutas, buses] = await Promise.all([
      prisma.ruta.findMany({
        include: {
          origen: { select: { nombre: true } },
          destino: { select: { nombre: true } },
        },
        orderBy: [{ origen: { nombre: "asc" } }],
      }),
      prisma.bus.findMany({
        select: { id: true, placa: true, marca: true },
        orderBy: { placa: "asc" },
      }),
    ]);

    return { success: true, data: serializeBigInt({ rutas, buses }) };
  } catch (error) {
    console.error("Error al obtener filtros de operario:", error);
    return { success: false, error: "Error al obtener filtros" };
  }
}

export async function obtenerPasajerosViaje(viajeId: string | number) {
  try {
    await checkOperarioOrAdmin();
    const id = BigInt(viajeId);
    const pasajes = await prisma.pasaje.findMany({
      where: {
        asiento_viaje: { viaje_id: id },
      },
      include: {
        pasajero: {
          select: {
            nombres: true,
            apellidos: true,
            dni: true,
            telefono: true,
          },
        },
        asiento_viaje: {
          select: {
            numero_asiento: true,
            piso: true,
            estado: true,
          },
        },
      },
      orderBy: {
        asiento_viaje: { numero_asiento: "asc" },
      },
    });
    return { success: true, data: serializeBigInt(pasajes) };
  } catch (error) {
    console.error("Error al obtener pasajeros:", error);
    return { success: false, error: "Error al obtener pasajeros" };
  }
}

export async function registrarAbordaje(pasajeId: string | number, abordado: boolean) {
  try {
    await checkOperarioOrAdmin();
    const id = BigInt(pasajeId);

    // Obtener primero el viaje_id asociado
    const pasajeTemp = await prisma.pasaje.findUnique({
      where: { id },
      select: {
        asiento_viaje: {
          select: { viaje_id: true },
        },
      },
    });

    if (!pasajeTemp) {
      return { success: false, error: "El pasaje no existe." };
    }

    const pasaje = await prisma.pasaje.update({
      where: { id },
      data: { abordado },
      include: {
        asiento_viaje: true,
      },
    });

    revalidatePath(`/staff/operario/viajes/${pasaje.asiento_viaje.viaje_id}`);
    return { success: true, data: serializeBigInt(pasaje) };
  } catch (error) {
    console.error("Error al registrar abordaje:", error);
    return { success: false, error: "Error al registrar abordaje" };
  }
}

export async function validarBoletoQR(viajeId: string | number, codigoQr: string) {
  try {
    await checkOperarioOrAdmin();
    const vId = BigInt(viajeId);
    const pasaje = await prisma.pasaje.findFirst({
      where: {
        codigo_qr: codigoQr,
        asiento_viaje: { viaje_id: vId },
      },
      include: {
        pasajero: true,
        asiento_viaje: true,
      },
    });

    if (!pasaje) {
      return { success: false, error: "Boleto no encontrado para este viaje." };
    }

    if (pasaje.abordado) {
      return { success: false, error: `El pasajero ${pasaje.pasajero.nombres} ya abordó.` };
    }

    // Marcar como abordado
    const pasajeActualizado = await prisma.pasaje.update({
      where: { id: pasaje.id },
      data: { abordado: true },
      include: {
        pasajero: true,
        asiento_viaje: true,
      },
    });

    revalidatePath(`/staff/operario/viajes/${vId}`);
    return { success: true, data: serializeBigInt(pasajeActualizado) };
  } catch (error) {
    console.error("Error al validar boleto QR:", error);
    return { success: false, error: "Error al validar boleto." };
  }
}
