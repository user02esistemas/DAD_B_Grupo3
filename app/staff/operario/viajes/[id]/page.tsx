import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerPasajerosViaje } from "@/app/(admin)/actions/operario";
import ViajeDetalleOperarioClient from "./ViajeDetalleOperarioClient";

export const dynamic = "force-dynamic";

export default async function DetalleViajeOperarioPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "operario") {
    redirect("/login");
  }

  // Validar si el ID es numérico para evitar errores al convertir a BigInt
  if (!resolvedParams.id || !/^\d+$/.test(resolvedParams.id)) {
    return (
      <div className="p-8 text-center text-slate-500">
        <h1 className="text-xl font-bold">Viaje no encontrado.</h1>
        <p className="text-sm mt-2">El identificador de viaje proporcionado no es válido.</p>
      </div>
    );
  }

  const viajeId = BigInt(resolvedParams.id);
  const viaje = await prisma.viaje.findUnique({
    where: { id: viajeId },
    include: {
      ruta: { include: { origen: { select: { nombre: true } }, destino: { select: { nombre: true } } } },
      bus: { select: { placa: true, capacidad: true, pisos: true } },
      conductor: { select: { nombres: true, apellidos: true, dni: true } },
    }
  });

  if (!viaje) {
    return (
      <div className="p-8 text-center text-slate-500">
        <h1 className="text-xl font-bold">Viaje no encontrado.</h1>
      </div>
    );
  }

  const pasajesRes = await obtenerPasajerosViaje(resolvedParams.id);
  const pasajeros = pasajesRes.success ? pasajesRes.data : [];

  const viajeSerializado = JSON.parse(
    JSON.stringify(viaje, (key, value) => (typeof value === "bigint" ? value.toString() : value))
  );

  return (
    <ViajeDetalleOperarioClient 
      viaje={viajeSerializado} 
      initialPasajeros={pasajeros} 
    />
  );
}
