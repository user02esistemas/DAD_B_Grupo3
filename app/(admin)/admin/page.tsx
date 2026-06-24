import { Ticket, Package, Bus, TrendingUp, AlertCircle, MapPin, Building } from "lucide-react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
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

  const stats = [
    {
      name: "Pasajes Vendidos Hoy",
      value: statsData.pasajesVendidosHoy.toString(),
      icon: Ticket,
      color: "bg-blue-500",
    },
    {
      name: "Viajes Activos Hoy",
      value: statsData.viajesActivosHoy.toString(),
      icon: Bus,
      color: "bg-[#f07639]",
    },
    {
      name: "Total Buses",
      value: statsData.totalBuses.toString(),
      icon: Bus,
      color: "bg-green-500",
    },
    {
      name: "Total Sucursales",
      value: statsData.totalSucursales.toString(),
      icon: Building,
      color: "bg-purple-500",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Bienvenido de vuelta, {session?.user?.name || "Administrador"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Aquí tienes un resumen del estado de las operaciones de hoy.
        </p>
      </div>

      {/* Fila 1: Estadísticas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center"
          >
            <div
              className={`p-4 rounded-xl ${stat.color} text-white mr-4 shadow-sm`}
            >
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.name}</p>
              <div className="flex items-baseline space-x-2">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fila 2: Alertas */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Alertas del Sistema</h3>
          </div>
          <div className="space-y-4">
            {alertas.length > 0 ? (
              alertas.map((alerta, i) => (
                <div
                  key={i}
                  className={`flex p-4 rounded-xl border ${
                    alerta.tipo === "pasajes"
                      ? "bg-orange-50 border-orange-200 text-orange-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  <TrendingUp
                    className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${
                      alerta.tipo === "pasajes" ? "text-orange-500" : "text-red-500"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-bold">
                      {alerta.tipo === "pasajes"
                        ? "Pico de demanda en Pasajes"
                        : "Pico de demanda en Encomiendas"}
                    </p>
                    <p className="text-xs mt-1 font-medium">{alerta.mensaje}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex p-4 bg-green-50 text-green-800 rounded-xl border border-green-100">
                <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-bold">Todo normal</p>
                  <p className="text-xs mt-1 opacity-80">
                    No se han detectado variaciones importantes en la demanda de pasajes ni encomiendas.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fila 3: Top Destinos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Destinos Encomiendas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Top Destinos: Encomiendas</h3>
            <Package className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {encomiendasTop.length > 0 ? (
              encomiendasTop.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {item.destino}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-[#f07639]">
                    {item.cantidad}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No hay datos disponibles.</p>
            )}
          </div>
        </div>

        {/* Top Destinos Viajes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Top Destinos: Viajes</h3>
            <Bus className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {viajesTop.length > 0 ? (
              viajesTop.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {item.destino}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-[#f07639]">
                    {item.cantidad}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No hay datos disponibles.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
