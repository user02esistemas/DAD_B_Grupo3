import { Ticket, Package, Bus, TrendingUp, AlertCircle, MapPin, Building, ArrowUpRight, Calendar, CircleDollarSign, Activity, ArrowRight } from "lucide-react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardGerente from "./components/DashboardGerente";
import {
  getDashboardStats,
  getDemandaAlertas,
  getEncomiendasPorDestino,
  getViajesPorDestino,
} from "../actions/dashboard";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  const [statsRes, alertasRes, encomiendasRes, viajesRes, sucursalesRaw] = await Promise.all([
    getDashboardStats(),
    getDemandaAlertas(),
    getEncomiendasPorDestino(),
    getViajesPorDestino(),
    prisma.sucursal.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } })
  ]);

  const sucursales = sucursalesRaw.map(s => ({
    id: s.id.toString(),
    nombre: s.nombre
  }));

  const statsData = statsRes.data || {
    pasajesVendidosHoy: 0,
    viajesActivosHoy: 0,
    totalBuses: 0,
    totalSucursales: 0,
    ingresosHoy: 0,
    flota: { disponibles: 0, enRuta: 0, taller: 0 },
    proximasSalidas: []
  };

  const alertas = alertasRes.data || [];
  const encomiendasTop = encomiendasRes.data || [];
  const viajesTop = viajesRes.data || [];

  const today = new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const stats = [
    {
      name: "Ingresos del Día",
      subtitle: "Hoy",
      value: `S/. ${Number(statsData.ingresosHoy || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: CircleDollarSign,
      gradient: "from-emerald-500 to-teal-600",
      bgLight: "bg-emerald-50",
      textColor: "text-emerald-600",
      borderColor: "border-emerald-100",
    },
    {
      name: "Pasajes Vendidos",
      subtitle: "Hoy",
      value: statsData.pasajesVendidosHoy.toString(),
      icon: Ticket,
      gradient: "from-blue-500 to-indigo-600",
      bgLight: "bg-blue-50",
      textColor: "text-blue-600",
      borderColor: "border-blue-100",
    },
    {
      name: "Viajes Activos",
      subtitle: "Hoy",
      value: statsData.viajesActivosHoy.toString(),
      icon: Bus,
      gradient: "from-[#f07639] to-[#d45a1f]",
      bgLight: "bg-orange-50",
      textColor: "text-[#f07639]",
      borderColor: "border-orange-100",
    },
    {
      name: "Total Buses",
      subtitle: "Flota registrada",
      value: statsData.totalBuses.toString(),
      icon: Bus,
      gradient: "from-teal-500 to-cyan-600",
      bgLight: "bg-teal-50",
      textColor: "text-teal-600",
      borderColor: "border-teal-100",
    },
    {
      name: "Sucursales",
      subtitle: "Puntos de operación",
      value: statsData.totalSucursales.toString(),
      icon: Building,
      gradient: "from-violet-500 to-purple-600",
      bgLight: "bg-violet-50",
      textColor: "text-violet-600",
      borderColor: "border-violet-100",
    },
  ];

  const flota = statsData.flota || { disponibles: 0, enRuta: 0, taller: 0 };
  const totalFlota = flota.disponibles + flota.enRuta + flota.taller || 1;
  const pctDisponibles = Math.round((flota.disponibles / totalFlota) * 100);
  const pctEnRuta = Math.round((flota.enRuta / totalFlota) * 100);
  const pctTaller = Math.round((flota.taller / totalFlota) * 100);

  const proximasSalidas = statsData.proximasSalidas || [];

  return (
    <div>
      {/* Welcome Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-[26px] font-extrabold text-slate-800 tracking-tight">
            Hola, {session?.user?.name?.split(' ')[0] || "Administrador"} 👋
          </h2>
          <div className="flex items-center gap-2 mt-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-sm text-slate-400 font-medium capitalize">{today}</p>
          </div>
        </div>
      </div>

      {/* ===== DASHBOARD GERENCIAL ===== */}
      {(session?.user?.role === "admin" || session?.user?.role === "gerente") && (
        <div className="mb-8">
          <DashboardGerente sucursales={sucursales} />
        </div>
      )}

      {/* ===== STAT CARDS ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-8 stagger-children">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="animate-fade-in-up bg-white rounded-2xl p-5 border border-slate-100 card-hover group relative overflow-hidden"
          >
            {/* Decorative gradient corner */}
            <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${stat.gradient} opacity-[0.06] group-hover:opacity-[0.12] group-hover:scale-125 transition-all duration-500`} />
            
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-white shadow-lg shadow-${stat.textColor}/20`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className={`${stat.bgLight} ${stat.textColor} ${stat.borderColor} border rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1`}>
                  <ArrowUpRight className="w-3 h-3" />
                  {stat.subtitle}
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-800 tracking-tight">{stat.value}</p>
                <p className="text-[13px] text-slate-400 font-semibold mt-0.5">{stat.name}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== ALERTAS ===== */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </div>
              <h3 className="text-[15px] font-bold text-slate-800">Alertas del Sistema</h3>
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hoy</span>
          </div>
          <div className="p-5 space-y-3">
            {alertas.length > 0 ? (
              alertas.map((alerta, i) => (
                <div
                  key={i}
                  className={`flex items-start p-4 rounded-xl border-l-[3px] ${
                    alerta.tipo === "pasajes"
                      ? "bg-orange-50/60 border-l-[#f07639] border border-orange-100/50"
                      : "bg-red-50/60 border-l-red-500 border border-red-100/50"
                  }`}
                >
                  <TrendingUp
                    className={`w-4 h-4 mr-3 mt-0.5 flex-shrink-0 ${
                      alerta.tipo === "pasajes" ? "text-[#f07639]" : "text-red-500"
                    }`}
                  />
                  <div>
                    <p className={`text-[13px] font-bold ${alerta.tipo === "pasajes" ? "text-orange-900" : "text-red-900"}`}>
                      {alerta.tipo === "pasajes" ? "Pico de demanda en Pasajes" : "Pico de demanda en Encomiendas"}
                    </p>
                    <p className="text-xs mt-0.5 text-slate-500 font-medium">{alerta.mensaje}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center p-4 bg-emerald-50/60 rounded-xl border border-emerald-100/50 border-l-[3px] border-l-emerald-500">
                <AlertCircle className="w-4 h-4 mr-3 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-[13px] font-bold text-emerald-900">Todo en orden</p>
                  <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                    No se han detectado variaciones importantes en la demanda.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== MONITOREO DE FLOTA Y PRÓXIMAS SALIDAS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        {/* Gráfico Donut de Flota */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col justify-between card-hover">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-teal-500" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-slate-800">Estado de la Flota</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Distribución operativa de buses hoy</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
              {/* Círculo de Dona */}
              <div 
                className="relative w-36 h-36 rounded-full flex items-center justify-center shadow-inner"
                style={{
                  background: (flota.disponibles + flota.enRuta + flota.taller) > 0
                    ? `conic-gradient(#06b6d4 0% ${pctEnRuta}%, #10b981 ${pctEnRuta}% ${pctEnRuta + pctDisponibles}%, #f97316 ${pctEnRuta + pctDisponibles}% 100%)`
                    : '#cbd5e1'
                }}
              >
                {/* Agujero de la dona (efecto glassmorphism / fondo blanco) */}
                <div className="w-24 h-24 rounded-full bg-white flex flex-col items-center justify-center shadow-md">
                  <span className="text-2xl font-black text-slate-800">
                    {flota.disponibles + flota.enRuta + flota.taller}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Buses</span>
                </div>
              </div>

              {/* Leyenda */}
              <div className="space-y-3 w-full sm:w-auto">
                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#06b6d4]" />
                    <span className="text-xs font-bold text-slate-600">En Ruta</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-800">{flota.enRuta}</span>
                    <span className="text-[10px] text-slate-400 font-semibold ml-1">({pctEnRuta}%)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#10b981]" />
                    <span className="text-xs font-bold text-slate-600">Disponible</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-800">{flota.disponibles}</span>
                    <span className="text-[10px] text-slate-400 font-semibold ml-1">({pctDisponibles}%)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#f97316]" />
                    <span className="text-xs font-bold text-slate-600">En Taller</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-800">{flota.taller}</span>
                    <span className="text-[10px] text-slate-400 font-semibold ml-1">({pctTaller}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de Próximas Salidas */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col justify-between card-hover">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-slate-800">Próximas Salidas</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Viajes programados a continuación hoy</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {proximasSalidas.length > 0 ? (
                proximasSalidas.map((viaje: any) => (
                  <div key={viaje.id} className="p-3 rounded-xl border border-slate-50 bg-slate-50/40 hover:bg-slate-50 transition-colors duration-200">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <span>{viaje.origen}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span>{viaje.destino}</span>
                      </div>
                      <span className="text-[11px] font-extrabold text-[#f07639] bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                        {viaje.hora}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                      <span>Placa: <strong className="text-slate-600">{viaje.placa}</strong></span>
                      <span>{viaje.asientosOcupados} / {viaje.totalAsientos} Asientos ({viaje.porcentajeOcupacion}%)</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                        style={{ width: `${viaje.porcentajeOcupacion}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs text-slate-400 font-semibold">No hay salidas programadas para el resto del día.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== TOP DESTINOS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Encomiendas */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden card-hover">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                <Package className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-slate-800">Top Destinos</h3>
                <p className="text-[11px] text-slate-400 font-medium">Encomiendas</p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-2.5 stagger-children">
            {encomiendasTop.length > 0 ? (
              encomiendasTop.map((item, i) => (
                <div
                  key={i}
                  className="animate-fade-in-up flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all duration-200 group"
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 ${
                    i === 0 ? "bg-amber-100 text-amber-700" :
                    i === 1 ? "bg-slate-200 text-slate-600" :
                    i === 2 ? "bg-orange-100 text-orange-700" :
                    "bg-slate-100 text-slate-500"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[13px] font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                      {item.destino}
                    </span>
                  </div>
                  <span className="text-[13px] font-black text-[#f07639] bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100/50">
                    {item.cantidad}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-6 font-medium">No hay datos disponibles.</p>
            )}
          </div>
        </div>

        {/* Viajes */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden card-hover">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <Bus className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-slate-800">Top Destinos</h3>
                <p className="text-[11px] text-slate-400 font-medium">Viajes</p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-2.5 stagger-children">
            {viajesTop.length > 0 ? (
              viajesTop.map((item, i) => (
                <div
                  key={i}
                  className="animate-fade-in-up flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all duration-200 group"
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 ${
                    i === 0 ? "bg-amber-100 text-amber-700" :
                    i === 1 ? "bg-slate-200 text-slate-600" :
                    i === 2 ? "bg-orange-100 text-orange-700" :
                    "bg-slate-100 text-slate-500"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[13px] font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                      {item.destino}
                    </span>
                  </div>
                  <span className="text-[13px] font-black text-[#f07639] bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100/50">
                    {item.cantidad}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-6 font-medium">No hay datos disponibles.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
