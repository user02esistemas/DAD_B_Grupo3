import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { obtenerViajesOperario } from "@/app/(admin)/actions/operario";
import { MapPin, Calendar, Bus as BusIcon, ArrowRight, UserCheck, Users, ClipboardList } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OperarioDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "operario") {
    redirect("/login");
  }

  const res = await obtenerViajesOperario();
  const viajes = res.success ? res.data : [];

  // Calcular métricas
  const totalViajes = viajes.length;
  const totalPasajeros = viajes.reduce((acc: number, curr: any) => acc + curr.total_pasajeros, 0);
  const totalAbordados = viajes.reduce((acc: number, curr: any) => acc + curr.total_abordados, 0);
  const totalPendientes = totalPasajeros - totalAbordados;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Saludo y Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Panel de Control de Abordaje</h1>
          <p className="text-slate-500 font-medium mt-1">Bienvenido, {session.user.name}. Controla y valida el embarque de pasajeros.</p>
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#f07639] flex items-center justify-center">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Viajes Programados</p>
            <h3 className="text-2xl font-black text-slate-800 mt-0.5">{totalViajes}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pasajeros a Bordo</p>
            <h3 className="text-2xl font-black text-slate-800 mt-0.5">{totalAbordados} <span className="text-slate-400 font-semibold text-sm">/ {totalPasajeros}</span></h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pendientes de Embarque</p>
            <h3 className="text-2xl font-black text-slate-800 mt-0.5">{totalPendientes}</h3>
          </div>
        </div>
      </div>

      {/* Listado de Viajes del Día */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Próximas Salidas (Hoy y Mañana)</h2>
        </div>

        {viajes.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto mb-4">
              <BusIcon className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-slate-700">No hay viajes programados</h3>
            <p className="text-slate-400 text-sm mt-1">No hay salidas programadas para hoy ni mañana en el sistema.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {viajes.map((viaje: any) => {
              const porcentaje = viaje.total_pasajeros > 0 
                ? Math.round((viaje.total_abordados / viaje.total_pasajeros) * 100)
                : 0;

              return (
                <div key={viaje.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="p-6 space-y-5">
                    {/* Ruta Cabecera */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-slate-500 text-xs font-semibold bg-slate-50 px-2.5 py-1 rounded-lg">
                        <BusIcon className="w-3.5 h-3.5 mr-1.5" />
                        <span>Bus: {viaje.bus.placa}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">ID Viaje: #{viaje.id}</span>
                    </div>

                    {/* Origen y Destino */}
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full border-2 border-[#f07639] bg-white z-10" />
                        <div className="w-px h-8 bg-slate-200 my-1" />
                        <div className="w-3 h-3 rounded-full border-2 border-slate-300 bg-white z-10" />
                      </div>
                      <div className="flex flex-col justify-between h-[60px] text-sm">
                        <p className="font-extrabold text-slate-800 leading-none">{viaje.ruta.origen.nombre}</p>
                        <p className="font-bold text-slate-500 leading-none">{viaje.ruta.destino.nombre}</p>
                      </div>
                    </div>

                    {/* Fecha de Salida */}
                    <div className="flex items-center text-slate-600 text-xs font-semibold">
                      <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                      <span suppressHydrationWarning>
                        Salida: {new Date(viaje.fecha_salida).toLocaleString('es-PE', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {/* Progreso de Abordaje */}
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between text-xs font-bold text-slate-600">
                        <span>Progreso de Abordaje</span>
                        <span>{viaje.total_abordados} / {viaje.total_pasajeros} pasajeros ({porcentaje}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-500" 
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-semibold uppercase">
                      {viaje.bus.capacidad - viaje.total_pasajeros} Asientos Libres
                    </span>
                    <Link
                      href={`/staff/operario/viajes/${viaje.id}`}
                      className="bg-white border border-slate-200 hover:border-[#f07639] hover:text-[#f07639] text-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all hover:bg-orange-50/20"
                    >
                      Controlar Abordaje
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
