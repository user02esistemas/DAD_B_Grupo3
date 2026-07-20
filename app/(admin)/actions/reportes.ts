"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Helper para verificar rol de administrador o gerente
async function checkAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "admin" && session.user.role !== "gerente")) {
    throw new Error("Acceso denegado. Debe ser administrador o gerente.");
  }
}

// Helper para serializar BigInt de forma segura
function serializeBigInt<T>(obj: T): any {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function obtenerDatosReporte(desdeStr: string, hastaStr: string) {
  try {
    await checkAdmin();

    // Las fechas vienen en formato YYYY-MM-DD
    // Las tratamos como naive UTC al igual que en las demás partes de la app
    const fechaInicio = new Date(`${desdeStr}T00:00:00.000Z`);
    const fechaFin = new Date(`${hastaStr}T23:59:59.999Z`);

    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
      return { success: false, error: "Fechas inválidas." };
    }

    // 1. Consultar Pasajes vendidos en el rango
    const pasajes = await prisma.pasaje.findMany({
      where: {
        fecha_compra: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      include: {
        pasajero: {
          select: {
            nombres: true,
            apellidos: true,
            dni: true,
          },
        },
        asiento_viaje: {
          include: {
            viaje: {
              include: {
                ruta: {
                  include: {
                    origen: { select: { nombre: true } },
                    destino: { select: { nombre: true } },
                  },
                },
                bus: {
                  select: { placa: true }
                },
                conductor: {
                  select: { nombres: true, apellidos: true }
                }
              },
            },
          },
        },
      },
      orderBy: {
        fecha_compra: "desc",
      },
    });

    // 2. Consultar Encomiendas recibidas en el rango
    const encomiendas = await prisma.encomienda.findMany({
      where: {
        created_at: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      include: {
        remitente: {
          select: {
            nombres: true,
            apellidos: true,
            dni: true,
          },
        },
        destinatario: {
          select: {
            nombres: true,
            apellidos: true,
            dni: true,
          },
        },
        origen: { select: { nombre: true } },
        destino: { select: { nombre: true } },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    // 3. Consultar Gastos de Ruta (Conductor)
    const gastos = await prisma.gastoRuta.findMany({
      where: {
        created_at: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      include: {
        conductor: {
          select: { nombres: true, apellidos: true, dni: true, telefono: true }
        },
        viaje: {
          include: {
            ruta: {
              include: {
                origen: { select: { nombre: true } },
                destino: { select: { nombre: true } },
              },
            },
            bus: { select: { placa: true } }
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    // 4. Consultar Incidentes de Bitácora (Conductor)
    const incidentes = await prisma.bitacoraViaje.findMany({
      where: {
        created_at: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      include: {
        conductor: {
          select: { nombres: true, apellidos: true, dni: true, telefono: true }
        },
        viaje: {
          include: {
            ruta: {
              include: {
                origen: { select: { nombre: true } },
                destino: { select: { nombre: true } },
              },
            },
            bus: { select: { placa: true } }
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    // 5. Consultar Viajes para estadísticas de Embarque (Operario)
    const viajesEmbarque = await prisma.viaje.findMany({
      where: {
        fecha_salida: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      include: {
        ruta: {
          include: {
            origen: { select: { nombre: true } },
            destino: { select: { nombre: true } },
          },
        },
        bus: { select: { placa: true } },
        conductor: { select: { nombres: true, apellidos: true, dni: true, telefono: true } },
        asientos_viaje: {
          include: {
            pasaje: true
          }
        }
      },
      orderBy: {
        fecha_salida: "desc"
      }
    });

    // 6. Procesar estadísticas
    const totalPasajesVendidos = pasajes.length;
    const totalEncomiendasRegistradas = encomiendas.length;

    const ingresosPasajes = pasajes.reduce((acc, p) => acc + Number(p.precio), 0);
    const ingresosEncomiendas = encomiendas.reduce((acc, e) => acc + Number(e.precio), 0);
    const ingresosTotales = ingresosPasajes + ingresosEncomiendas;

    const reporteData = {
      rango: { desde: desdeStr, hasta: hastaStr },
      resumen: {
        totalPasajesVendidos,
        totalEncomiendasRegistradas,
        ingresosPasajes,
        ingresosEncomiendas,
        ingresosTotales,
        totalGastosRuta: gastos.reduce((acc, g) => acc + Number(g.monto), 0),
        totalIncidentes: incidentes.length,
      },
      pasajes: pasajes.map(p => ({
        id: p.id.toString(),
        pasajero: `${p.pasajero.nombres} ${p.pasajero.apellidos}`,
        dni: p.pasajero.dni,
        origen: p.asiento_viaje.viaje.ruta.origen.nombre,
        destino: p.asiento_viaje.viaje.ruta.destino.nombre,
        precio: Number(p.precio),
        fecha: p.fecha_compra ? p.fecha_compra.toISOString() : null,
        codigo_qr: p.codigo_qr,
        asiento: p.asiento_viaje.numero_asiento,
        bus: p.asiento_viaje.viaje.bus?.placa || "N/A",
        conductor: p.asiento_viaje.viaje.conductor 
          ? `${p.asiento_viaje.viaje.conductor.nombres} ${p.asiento_viaje.viaje.conductor.apellidos}`
          : "No asignado",
      })),
      encomiendas: encomiendas.map(e => ({
        id: e.id.toString(),
        codigo: e.codigo_seguimiento,
        remitente: `${e.remitente.nombres} ${e.remitente.apellidos}`,
        remitenteDni: e.remitente.dni,
        destinatario: `${e.destinatario.nombres} ${e.destinatario.apellidos}`,
        destinatarioDni: e.destinatario.dni,
        origen: e.origen.nombre,
        destino: e.destino.nombre,
        peso: Number(e.peso_kg),
        precio: Number(e.precio),
        fecha: e.created_at ? e.created_at.toISOString() : null,
        estado: e.estado,
      })),
      gastos: gastos.map(g => ({
        id: g.id.toString(),
        concepto: g.concepto,
        monto: Number(g.monto),
        conductor: `${g.conductor.nombres} ${g.conductor.apellidos}`,
        conductorDni: g.conductor.dni,
        conductorTelefono: g.conductor.telefono || "N/A",
        bus: g.viaje.bus.placa,
        ruta: `${g.viaje.ruta.origen.nombre} a ${g.viaje.ruta.destino.nombre}`,
        horaSalida: g.viaje.fecha_salida ? g.viaje.fecha_salida.toISOString() : null,
        fecha: g.created_at ? g.created_at.toISOString() : null,
        foto_url: g.foto_url,
      })),
      incidentes: incidentes.map(i => ({
        id: i.id.toString(),
        tipo: i.tipo,
        gravedad: i.gravedad,
        descripcion: i.descripcion,
        retraso: i.retraso_minutos,
        solucionado: i.solucionado,
        fechaSolucion: i.fecha_solucion ? i.fecha_solucion.toISOString() : null,
        conductor: `${i.conductor.nombres} ${i.conductor.apellidos}`,
        conductorDni: i.conductor.dni,
        conductorTelefono: i.conductor.telefono || "N/A",
        bus: i.viaje.bus.placa,
        ruta: `${i.viaje.ruta.origen.nombre} a ${i.viaje.ruta.destino.nombre}`,
        horaSalida: i.viaje.fecha_salida ? i.viaje.fecha_salida.toISOString() : null,
        fecha: i.created_at ? i.created_at.toISOString() : null,
        foto_url: (i as any).foto_url || null,
      })),
      embarques: viajesEmbarque.map(v => {
        const pasajesDelViaje = v.asientos_viaje
          .map(av => av.pasaje)
          .filter((p): p is NonNullable<typeof p> => p !== null);
        const vendidos = pasajesDelViaje.length;
        const abordaron = pasajesDelViaje.filter(p => p.abordado).length;
        const pendientes = vendidos - abordaron;
        const porcentajeAbordaje = vendidos > 0 ? Math.round((abordaron / vendidos) * 100) : 0;
        
        return {
          id: v.id.toString(),
          fecha: v.fecha_salida.toISOString(),
          origen: v.ruta.origen.nombre,
          destino: v.ruta.destino.nombre,
          bus: v.bus.placa,
          conductor: v.conductor ? `${v.conductor.nombres} ${v.conductor.apellidos}` : "No asignado",
          conductorDni: v.conductor?.dni || "",
          conductorTelefono: v.conductor?.telefono || "N/A",
          vendidos,
          abordaron,
          pendientes,
          porcentajeAbordaje
        };
      })
    };

    return { success: true, data: serializeBigInt(reporteData) };
  } catch (error: any) {
    console.error("Error al obtener datos de reporte:", error);
    return { success: false, error: error.message || "Error al obtener reporte." };
  }
}
