import { Ticket, Package, Bus, TrendingUp, AlertCircle, MapPin, Building, ArrowUpRight, Calendar } from "lucide-react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  getDashboardStats,
  getDemandaAlertas,
  getEncomiendasPorDestino,
  getViajesPorDestino,
} from "../actions/dashboard";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  const [statsRes, alertasRes, encomiendasRes, viajesRes] = await Promise.all([
    getDashboardStats(),
    getDemandaAlertas(),
    getEncomiendasPorDestino(),
    getViajesPorDestino(),
  ]);

  const statsData = statsRes.data || {
    pasajesVendidosHoy: 0,
    viajesActivosHoy: 0,
    totalBuses: 0,
    totalSucursales: 0,
  };

  const alertas = alertasRes.data || [];
  const encomiendasTop = encomiendasRes.data || [];
  const viajesTop = viajesRes.data || [];

  const today = new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const stats = [
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
      gradient: "from-emerald-500 to-teal-600",
      bgLight: "bg-emerald-50",
      textColor: "text-emerald-600",
      borderColor: "border-emerald-100",
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

      {/* ===== STAT CARDS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8 stagger-children">
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
                <p className="text-3xl font-black text-slate-800 tracking-tight">{stat.value}</p>
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
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    No se han detectado variaciones importantes en la demanda.
                  </p>
                </div>
              </div>
            )}
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
