import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ViajeDetalleConductorClient from "./ViajeDetalleConductorClient";

export const dynamic = "force-dynamic";

export default async function DetalleViajeConductorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "conductor") {
    redirect("/login");
  }

  const viaje = await prisma.viaje.findUnique({
    where: { id: BigInt(resolvedParams.id), conductor_id: Number((session.user as any).persona_id) },
    include: {
      ruta: { include: { origen: true, destino: true } },
      bus: true,
      encomiendas: { include: { destino: true } },
      gastos: true,
      novedades: true,
    }
  });

  if (!viaje) {
    return (
      <div className="p-8 text-center text-slate-500">
        <h1>Viaje no encontrado o no tienes permiso para verlo.</h1>
      </div>
    );
  }

  const viajeSerializado = JSON.parse(JSON.stringify(viaje, (key, value) => typeof value === 'bigint' ? value.toString() : value));

  return <ViajeDetalleConductorClient viaje={viajeSerializado} conductorId={Number((session.user as any).persona_id)} />;
}
