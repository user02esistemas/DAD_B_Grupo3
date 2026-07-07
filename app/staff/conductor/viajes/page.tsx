import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getViajesConductor } from "@/app/(admin)/actions/conductor";
import ViajesConductorClient from "./ViajesConductorClient";

export const dynamic = "force-dynamic";

export default async function ConductorViajesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "conductor") {
    redirect("/login");
  }

  const viajes = await getViajesConductor(Number((session.user as any).persona_id));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800">Mis Viajes Asignados</h1>
        <p className="text-slate-500 font-medium mt-1">Selecciona un viaje para ver la hoja de ruta y comenzar.</p>
      </div>
      
      <ViajesConductorClient initialViajes={viajes} />
    </div>
  );
}
