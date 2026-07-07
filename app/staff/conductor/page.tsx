import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Bus, MapPin, Wrench, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { getViajesConductor } from "@/app/(admin)/actions/conductor";

export const dynamic = "force-dynamic";

export default async function ConductorDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "conductor") {
    redirect("/login");
  }

  const viajes = await getViajesConductor(Number((session.user as any).persona_id));
  const viajesHoy = viajes.filter((v: any) => new Date(v.fecha_salida).toDateString() === new Date().toDateString());

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-gradient-to-br from-[#1a233a] to-[#0f1628] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold mb-2">¡Hola, {session.user.name}! 🚛</h1>
          <p className="text-slate-300 font-medium text-lg">Tienes {viajesHoy.length} viaje(s) asignado(s) para hoy.</p>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Bus className="w-48 h-48" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/staff/conductor/viajes" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.08)] transition-all group hover:-translate-y-1 block">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-inner">
            <MapPin className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-1">Mis Viajes</h3>
          <p className="text-slate-500 text-sm font-medium">Gestiona tus rutas, estado de viaje y más.</p>
        </Link>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] opacity-60">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mb-5 shadow-inner">
            <Wrench className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-1">Novedades</h3>
          <p className="text-slate-500 text-sm font-medium">Reporta fallas mecánicas en ruta. (Proximamente)</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] opacity-60">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-5 shadow-inner">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-1">Alertas</h3>
          <p className="text-slate-500 text-sm font-medium">Mensajes directos de la central. (Proximamente)</p>
        </div>
      </div>
    </div>
  );
}
