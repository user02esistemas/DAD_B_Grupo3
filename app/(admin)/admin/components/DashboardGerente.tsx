"use client";

import { useState, useEffect } from "react";
import { getDashboardGerencialStats } from "@/app/(admin)/actions/estadisticas";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from "recharts";
import { Ticket, DollarSign, Map, Filter, RefreshCcw } from "lucide-react";

export default function DashboardGerente({ sucursales }: { sucursales: any[] }) {
  const [filtros, setFiltros] = useState({
    mes: (new Date().getMonth() + 1).toString().padStart(2, '0'),
    destino_id: "",
    horario: ""
  });
  
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const meses = [
    { value: "01", label: "Enero" }, { value: "02", label: "Febrero" },
    { value: "03", label: "Marzo" }, { value: "04", label: "Abril" },
    { value: "05", label: "Mayo" }, { value: "06", label: "Junio" },
    { value: "07", label: "Julio" }, { value: "08", label: "Agosto" },
    { value: "09", label: "Septiembre" }, { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" }, { value: "12", label: "Diciembre" }
  ];

  const fetchStats = async () => {
    setIsLoading(true);
    const res = await getDashboardGerencialStats({
      mes: filtros.mes || undefined,
      destino_id: filtros.destino_id || undefined,
      horario: filtros.horario || undefined
    });
    
    if (res.success) {
      setData(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, [filtros]);

  return (
    <div className="space-y-6">
      {/* HEADER DE FILTROS */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="flex items-center gap-2 text-slate-800 font-bold">
          <Filter className="w-5 h-5 text-[#f07639]" />
          <h2>Filtros Analíticos</h2>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <select 
            value={filtros.mes} 
            onChange={e => setFiltros({...filtros, mes: e.target.value})}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#f07639]/50 focus:border-[#f07639] outline-none"
          >
            {meses.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <select 
            value={filtros.destino_id} 
            onChange={e => setFiltros({...filtros, destino_id: e.target.value})}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#f07639]/50 focus:border-[#f07639] outline-none"
          >
            <option value="">Todos los Destinos</option>
            {sucursales.map(s => (
              <option key={s.id.toString()} value={s.id.toString()}>{s.nombre}</option>
            ))}
          </select>

          <select 
            value={filtros.horario} 
            onChange={e => setFiltros({...filtros, horario: e.target.value})}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#f07639]/50 focus:border-[#f07639] outline-none"
          >
            <option value="">Todos los Horarios</option>
            <option value="manana">Mañana (06:00 - 11:59)</option>
            <option value="tarde">Tarde (12:00 - 17:59)</option>
            <option value="noche">Noche (18:00 - 05:59)</option>
          </select>

          <button 
            onClick={fetchStats}
            className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center"
            title="Recargar datos"
          >
            <RefreshCcw className={`w-5 h-5 ${isLoading ? "animate-spin text-[#f07639]" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0"></div>
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Pasajes Vendidos</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">
                {isLoading ? <div className="h-8 w-16 bg-slate-200 rounded animate-pulse"></div> : data?.kpis.totalPasajes}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0"></div>
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200 shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ingresos Totales</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">
                {isLoading ? (
                  <div className="h-8 w-24 bg-slate-200 rounded animate-pulse"></div>
                ) : (
                  `S/ ${data?.kpis.ingresosTotales.toFixed(2)}`
                )}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0"></div>
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#f07639] text-white flex items-center justify-center shadow-lg shadow-orange-200 shrink-0">
              <Map className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ruta Popular</p>
              <h3 className="text-xl font-black text-slate-800 mt-1 truncate max-w-[150px]" title={data?.kpis.rutaMasPopular}>
                {isLoading ? <div className="h-8 w-20 bg-slate-200 rounded animate-pulse"></div> : data?.kpis.rutaMasPopular}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* GRAFICO RECHARTS */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Evolución de Ventas (Diario)</h3>
        <div className="h-80 w-full relative">
          {isLoading && (
            <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-xl">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-[#f07639] rounded-full animate-spin"></div>
            </div>
          )}
          
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.grafico || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
              <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
              <RechartsTooltip 
                cursor={{ fill: 'var(--surface)' }}
                contentStyle={{
                  backgroundColor: 'var(--dropdown-bg)',
                  border: '1px solid var(--dropdown-border)',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-md)',
                  color: 'var(--foreground)'
                }}
                labelStyle={{ fontWeight: 'bold', color: 'var(--foreground)' }}
                itemStyle={{ color: 'var(--foreground)' }}
              />
              <Bar 
                dataKey="ventas" 
                name="Pasajes Vendidos" 
                fill="#f07639" 
                radius={[4, 4, 0, 0]} 
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
