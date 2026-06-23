import { Ticket, Package, Bus, TrendingUp, Users, AlertCircle } from "lucide-react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  const stats = [
    { name: "Pasajes Vendidos Hoy", value: "142", icon: Ticket, color: "bg-blue-500", trend: "+12.5%" },
    { name: "Encomiendas en Ruta", value: "38", icon: Package, color: "bg-[#f07639]", trend: "+5.2%" },
    { name: "Buses Activos", value: "12", icon: Bus, color: "bg-green-500", trend: "0%" },
    { name: "Nuevos Clientes", value: "24", icon: Users, color: "bg-purple-500", trend: "+18.1%" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Bienvenido de vuelta, {session?.user?.name || "Administrador"}</h2>
        <p className="mt-1 text-sm text-gray-500">Aquí tienes un resumen del estado de las operaciones de hoy.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center">
            <div className={`p-4 rounded-xl ${stat.color} text-white mr-4 shadow-sm`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.name}</p>
              <div className="flex items-baseline space-x-2">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <span className={`text-xs font-bold ${stat.trend.startsWith('+') ? 'text-green-600' : 'text-gray-400'}`}>
                  {stat.trend}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Actividad Reciente</h3>
            <button className="text-sm text-[#f07639] font-medium hover:underline">Ver todo</button>
          </div>
          <div className="space-y-4">
            {/* Mock recent activity items */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-[#f07639] mr-4 flex-shrink-0">
                  <Ticket className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">Venta de Pasaje a Lima</p>
                  <p className="text-xs text-gray-500 truncate">Cliente: Juan Pérez - Bus: CUM-001</p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-sm font-bold text-gray-900">S/ 45.00</p>
                  <p className="text-xs text-gray-400">Hace {i * 15} min</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Alertas</h3>
          </div>
          <div className="space-y-4">
            <div className="flex p-4 bg-red-50 text-red-800 rounded-xl border border-red-100">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-bold">Bus CUM-005 retrasado</p>
                <p className="text-xs mt-1 opacity-80">El viaje de Trujillo a Chiclayo presenta un retraso de 45 minutos.</p>
              </div>
            </div>
            <div className="flex p-4 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-100">
              <TrendingUp className="w-5 h-5 mr-3 flex-shrink-0 text-yellow-500 mt-0.5" />
              <div>
                <p className="text-sm font-bold">Alta demanda de pasajes</p>
                <p className="text-xs mt-1 opacity-80">Ruta Lima - Trujillo al 90% de capacidad para mañana.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
