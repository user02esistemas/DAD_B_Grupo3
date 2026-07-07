"use client";

import { useState } from "react";
import { MapPin, Calendar, Bus, ArrowRight, Clock, Box } from "lucide-react";
import Link from "next/link";

type Viaje = {
  id: string;
  fecha_salida: string;
  estado: string;
  ruta: {
    origen: { nombre: string };
    destino: { nombre: string };
    duracion_estimada_minutos: number;
  };
  bus: {
    placa: string;
  };
  encomiendas: any[];
};

export default function ViajesConductorClient({ initialViajes }: { initialViajes: Viaje[] }) {
  const [filter, setFilter] = useState("pendientes"); // pendientes, todos

  const viajes = initialViajes.filter((v) => {
    if (filter === "pendientes") {
      return v.estado === "programado" || v.estado === "en_ruta";
    }
    return true;
  });

  const formatDuracion = (minutos: number) => {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${h}h ${m}m`;
  };

  const getStatusColor = (estado: string) => {
    if (estado === "programado") return "bg-blue-100 text-blue-700 border-blue-200";
    if (estado === "en_ruta") return "bg-yellow-100 text-yellow-700 border-yellow-200 animate-pulse";
    if (estado === "completado") return "bg-green-100 text-green-700 border-green-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button 
          onClick={() => setFilter("pendientes")}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${filter === "pendientes" ? "bg-[#f07639] text-white shadow-md shadow-[#f07639]/30" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}
        >
          Pendientes / En Curso
        </button>
        <button 
          onClick={() => setFilter("todos")}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${filter === "todos" ? "bg-[#f07639] text-white shadow-md shadow-[#f07639]/30" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}
        >
          Historial Completo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {viajes.length === 0 ? (
          <div className="col-span-1 md:col-span-2 bg-white rounded-3xl p-10 text-center border border-slate-100">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bus className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">No hay viajes</h3>
            <p className="text-slate-500">No tienes viajes que coincidan con este filtro.</p>
          </div>
        ) : (
          viajes.map((viaje) => (
            <Link key={viaje.id} href={`/staff/conductor/viajes/${viaje.id}`} className="block group">
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 relative overflow-hidden h-full flex flex-col justify-between">
                {viaje.estado === "en_ruta" && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-orange-500" />
                )}
                
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${getStatusColor(viaje.estado)}`}>
                    {viaje.estado.replace('_', ' ')}
                  </span>
                  <div className="flex items-center text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">
                    <Bus className="w-3.5 h-3.5 mr-1.5" />
                    <span className="text-xs font-bold">{viaje.bus.placa}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-5">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full border-2 border-[#f07639] bg-white z-10" />
                    <div className="w-px h-8 bg-slate-200 my-1" />
                    <div className="w-3 h-3 rounded-full border-2 border-slate-300 bg-white z-10" />
                  </div>
                  <div className="flex flex-col justify-between h-[60px]">
                    <p className="font-extrabold text-slate-800 leading-none">{viaje.ruta.origen.nombre}</p>
                    <p className="font-bold text-slate-500 leading-none">{viaje.ruta.destino.nombre}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-auto pt-4 border-t border-slate-50">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center mb-1">
                      <Calendar className="w-3 h-3 mr-1" /> Salida
                    </span>
                    <span className="text-sm font-bold text-slate-700" suppressHydrationWarning>
                      {new Date(viaje.fecha_salida).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center mb-1">
                      <Clock className="w-3 h-3 mr-1" /> Duración
                    </span>
                    <span className="text-sm font-bold text-slate-700">
                      ~{formatDuracion(viaje.ruta.duracion_estimada_minutos)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center text-slate-500 text-xs font-semibold">
                    <Box className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                    Bodega: {viaje.encomiendas.length} bultos
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-[#f07639] group-hover:text-white flex items-center justify-center transition-colors text-slate-400">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
