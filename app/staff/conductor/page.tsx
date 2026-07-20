import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Bus, MapPin, Wrench, AlertTriangle, ChevronRight, Calendar, Clock, Route, Shield } from "lucide-react";
import Link from "next/link";
import { getViajesConductor } from "@/app/(admin)/actions/conductor";

export const dynamic = "force-dynamic";

export default async function ConductorDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "conductor") {
    redirect("/login");
  }

  const getPeruDateStr = (dateInput: Date | string) => {
    return new Date(dateInput).toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  };
  const hoyPeruStr = getPeruDateStr(new Date());

  const viajes = await getViajesConductor(Number((session.user as any).persona_id));
  const viajesHoy = viajes.filter((v: any) => v.estado !== "cancelado" && getPeruDateStr(v.fecha_salida) === hoyPeruStr);
  const viajesCompletados = viajes.filter((v: any) => v.estado === "completado" || v.estado === "finalizado");
  const viajesEnCurso = viajes.filter((v: any) => v.estado === "en_ruta" || v.estado === "en curso");

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Banner de Bienvenida Corporativo y Sobrio */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800/20 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider bg-orange-600/20 text-[#f07639] px-2.5 py-1 rounded-md border border-orange-500/10">
                Panel Conductor
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-slate-400 font-semibold">En servicio</span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              {saludo}, <span className="text-[#f07639]">{session.user.name}</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Gestiona tus rutas, novedades y alertas de servicio desde tu panel de control.
            </p>
          </div>

          {/* Fecha Actual */}
          <div className="flex items-center gap-3 bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/50 self-start md:self-auto">
            <Calendar className="w-5 h-5 text-[#f07639] shrink-0" />
            <div>
              <p className="text-white font-bold text-xs capitalize">{new Date().toLocaleDateString("es-PE", { weekday: "long" })}</p>
              <p className="text-slate-400 text-[11px] font-medium">{new Date().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
          </div>
        </div>

        {/* Resumen de Estadísticas del Conductor */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-800 text-center">
            <p className="text-2xl font-bold text-white">{viajesHoy.length}</p>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">Viajes de Hoy</p>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-800 text-center">
            <p className="text-2xl font-bold text-[#f07639]">{viajesEnCurso.length}</p>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">En Ruta</p>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-800 text-center">
            <p className="text-2xl font-bold text-slate-300">{viajesCompletados.length}</p>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">Completados</p>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-800 text-center">
            <p className="text-2xl font-bold text-slate-300">{viajes.length}</p>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">Historial Total</p>
          </div>
        </div>
      </div>

      {/* Tarjetas de Navegación Limpias y Corporativas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Mis Viajes */}
        <Link href="/staff/conductor/viajes" className="group block">
          <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#f07639] flex items-center justify-center group-hover:scale-105 transition-transform">
                <MapPin className="w-6 h-6" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#f07639] group-hover:translate-x-0.5 transition-all mt-1" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Mis Viajes</h3>
            <p className="text-slate-500 text-xs leading-relaxed">Consulta tus viajes asignados, pasajeros y estados de ruta.</p>
            {viajesHoy.length > 0 && (
              <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 rounded-lg w-fit">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f07639] animate-pulse" />
                <span className="text-[#f07639] text-[10px] font-bold">{viajesHoy.length} hoy</span>
              </div>
            )}
          </div>
        </Link>

        {/* Novedades */}
        <Link href="/staff/conductor/novedades" className="group block">
          <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#f07639] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Wrench className="w-6 h-6" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#f07639] group-hover:translate-x-0.5 transition-all mt-1" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Novedades</h3>
            <p className="text-slate-500 text-xs leading-relaxed">Informa y revisa novedades mecánicas o reportes de tu bus.</p>
          </div>
        </Link>

        {/* Alertas */}
        <Link href="/staff/conductor/alertas" className="group block">
          <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#f07639] flex items-center justify-center group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#f07639] group-hover:translate-x-0.5 transition-all mt-1" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Alertas</h3>
            <p className="text-slate-500 text-xs leading-relaxed">Bandeja de comunicaciones y avisos importantes de la central.</p>
          </div>
        </Link>
      </div>

      {/* Información del Servicio */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-[#f07639]" />
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Información de Servicio</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <Route className="w-5 h-5 text-[#f07639] shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rol de Usuario</p>
              <p className="text-xs font-extrabold text-slate-700">Conductor</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <Clock className="w-5 h-5 text-[#f07639] shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Correo Electrónico</p>
              <p className="text-xs font-extrabold text-slate-700">{session.user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <Bus className="w-5 h-5 text-[#f07639] shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Compañía</p>
              <p className="text-xs font-extrabold text-slate-700">Transportes El Cumbe S.A.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
