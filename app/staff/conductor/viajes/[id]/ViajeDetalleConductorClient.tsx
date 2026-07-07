"use client";

import { useState } from "react";
import { updateEstadoViaje, registrarGasto, reportarNovedad } from "@/app/(admin)/actions/conductor";
import { ArrowLeft, MapPin, Bus, Clock, Box, Play, CheckCircle, Receipt, Wrench, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ViajeDetalleConductorClient({ viaje, conductorId }: { viaje: any, conductorId: number }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("ruta");
  const [isUpdating, setIsUpdating] = useState(false);
  const [gastoForm, setGastoForm] = useState({ concepto: "", monto: "" });
  const [novedadForm, setNovedadForm] = useState({ categoria: "Motor", descripcion: "" });

  const formatDuracion = (minutos: number) => {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${h}h ${m}m`;
  };

  const handleEstadoChange = async (nuevoEstado: string) => {
    if (!confirm(`¿Estás seguro de marcar el viaje como ${nuevoEstado.replace('_', ' ')}?`)) return;
    setIsUpdating(true);
    const res = await updateEstadoViaje(viaje.id, nuevoEstado);
    if (res.success) {
      router.refresh();
    } else {
      alert("Error al actualizar estado");
    }
    setIsUpdating(false);
  };

  const handleGuardarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gastoForm.concepto || !gastoForm.monto) return;
    setIsUpdating(true);
    await registrarGasto({
      viaje_id: viaje.id,
      conductor_id: conductorId,
      concepto: gastoForm.concepto,
      monto: Number(gastoForm.monto)
    });
    setGastoForm({ concepto: "", monto: "" });
    router.refresh();
    setIsUpdating(false);
    alert("Gasto registrado");
  };

  const handleGuardarNovedad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novedadForm.descripcion) return;
    setIsUpdating(true);
    await reportarNovedad({
      viaje_id: viaje.id,
      bus_id: viaje.bus.id,
      conductor_id: conductorId,
      categoria: novedadForm.categoria,
      descripcion: novedadForm.descripcion
    });
    setNovedadForm({ categoria: "Motor", descripcion: "" });
    router.refresh();
    setIsUpdating(false);
    alert("Novedad reportada. Mantenimiento ha sido notificado.");
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex items-center mb-6">
        <Link href="/staff/conductor/viajes" className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 hover:text-[#f07639] mr-4 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Detalle del Viaje</h1>
          <p className="text-slate-500 text-sm" suppressHydrationWarning>
            {new Date(viaje.fecha_salida).toLocaleString('es-PE')}
          </p>
        </div>
      </div>

      {/* Tarjeta de Resumen */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6 relative overflow-hidden">
        {viaje.estado === "en_ruta" && (
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 animate-pulse" />
        )}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#f07639]/10 text-[#f07639] flex items-center justify-center">
              <Bus className="w-7 h-7" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-800">
                {viaje.ruta.origen.nombre} <span className="text-slate-300 mx-2">→</span> {viaje.ruta.destino.nombre}
              </p>
              <p className="text-slate-500 font-medium">Bus Placa: <span className="text-slate-700 font-bold">{viaje.bus.placa}</span></p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {viaje.estado === "programado" && (
              <button 
                disabled={isUpdating}
                onClick={() => handleEstadoChange("en_ruta")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30 flex items-center justify-center disabled:opacity-50"
              >
                <Play className="w-4 h-4 mr-2" />
                INICIAR VIAJE
              </button>
            )}
            {viaje.estado === "en_ruta" && (
              <button 
                disabled={isUpdating}
                onClick={() => handleEstadoChange("completado")}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-green-500/30 flex items-center justify-center disabled:opacity-50 animate-pulse"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                FINALIZAR VIAJE
              </button>
            )}
            {viaje.estado === "completado" && (
              <div className="bg-green-100 text-green-700 px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center border border-green-200">
                <CheckCircle className="w-4 h-4 mr-2" />
                VIAJE COMPLETADO
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 hide-scrollbar">
        {[
          { id: "ruta", label: "Hoja de Ruta", icon: MapPin },
          { id: "encomiendas", label: "Encomiendas", icon: Box },
          { id: "gastos", label: "Gastos (Peajes)", icon: Receipt },
          { id: "novedades", label: "Fallas Mecánicas", icon: Wrench },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`whitespace-nowrap flex items-center px-5 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === t.id 
                ? "bg-slate-800 text-white shadow-md" 
                : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <t.icon className="w-4 h-4 mr-2" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido Tabs */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        
        {activeTab === "ruta" && (
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Datos Estáticos de la Ruta</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
                <p className="text-[11px] text-slate-400 font-bold uppercase mb-1">Distancia</p>
                <p className="text-xl font-extrabold text-slate-700">~250 km</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
                <p className="text-[11px] text-slate-400 font-bold uppercase mb-1">Tiempo Estimado</p>
                <p className="text-xl font-extrabold text-slate-700">{formatDuracion(viaje.ruta.duracion_estimada_minutos)}</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
                <p className="text-[11px] text-slate-400 font-bold uppercase mb-1">Pasajeros</p>
                <p className="text-xl font-extrabold text-slate-700">{viaje.bus.capacidad}</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
                <p className="text-[11px] text-slate-400 font-bold uppercase mb-1">Bultos Bodega</p>
                <p className="text-xl font-extrabold text-slate-700">{viaje.encomiendas.length}</p>
              </div>
            </div>
            
            <div className="aspect-video bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center flex-col text-slate-400">
              <MapPin className="w-10 h-10 mb-2 opacity-50" />
              <p className="font-medium text-sm">Croquis estático de ruta disponible en próxima actualización</p>
            </div>
          </div>
        )}

        {activeTab === "encomiendas" && (
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Manifiesto de Bodega</h2>
            {viaje.encomiendas.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No hay encomiendas para este viaje.</p>
            ) : (
              <div className="space-y-3">
                {viaje.encomiendas.map((enc: any) => (
                  <div key={enc.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50">
                    <div className="flex items-center">
                      <Box className="w-6 h-6 text-[#f07639] mr-3" />
                      <div>
                        <p className="font-bold text-slate-700 text-sm">{enc.codigo_seguimiento}</p>
                        <p className="text-xs text-slate-500">Peso: {enc.peso_kg}kg</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Descargar en</p>
                      <p className="font-extrabold text-slate-800 text-sm">{enc.destino.nombre}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "gastos" && (
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Reporte de Peajes y Gastos</h2>
            
            <form onSubmit={handleGuardarGasto} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-6 flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1">Concepto</label>
                <input 
                  type="text" 
                  placeholder="Ej. Peaje Chicama"
                  required
                  value={gastoForm.concepto}
                  onChange={(e) => setGastoForm({...gastoForm, concepto: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#f07639]"
                />
              </div>
              <div className="w-32">
                <label className="block text-xs font-bold text-slate-500 mb-1">Monto (S/)</label>
                <input 
                  type="number" 
                  step="0.1"
                  required
                  placeholder="15.50"
                  value={gastoForm.monto}
                  onChange={(e) => setGastoForm({...gastoForm, monto: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#f07639]"
                />
              </div>
              <button disabled={isUpdating} type="submit" className="bg-[#f07639] text-white px-6 py-2 rounded-xl font-bold h-[42px]">
                Agregar
              </button>
            </form>

            <div className="space-y-2">
              {viaje.gastos.map((g: any) => (
                <div key={g.id} className="flex justify-between items-center p-3 border-b border-slate-100 text-sm">
                  <span className="font-medium text-slate-700">{g.concepto}</span>
                  <span className="font-bold text-slate-900">S/ {Number(g.monto).toFixed(2)}</span>
                </div>
              ))}
              {viaje.gastos.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">No has registrado gastos aún.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "novedades" && (
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Reportar Novedad Mecánica</h2>
            
            <form onSubmit={handleGuardarNovedad} className="bg-red-50/50 p-5 rounded-2xl border border-red-100 mb-6">
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 mb-1">Categoría</label>
                <select 
                  value={novedadForm.categoria}
                  onChange={(e) => setNovedadForm({...novedadForm, categoria: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-red-400 bg-white"
                >
                  <option>Motor</option>
                  <option>Llantas</option>
                  <option>Frenos</option>
                  <option>Interiores / Asientos</option>
                  <option>Aire Acondicionado</option>
                  <option>Otro</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 mb-1">Descripción del problema</label>
                <textarea 
                  required
                  rows={3}
                  value={novedadForm.descripcion}
                  onChange={(e) => setNovedadForm({...novedadForm, descripcion: e.target.value})}
                  placeholder="Describe brevemente el ruido o problema que notaste..."
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-red-400 bg-white"
                />
              </div>
              <button disabled={isUpdating} type="submit" className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold flex justify-center items-center">
                <AlertCircle className="w-5 h-5 mr-2" /> Enviar Reporte a Mantenimiento
              </button>
            </form>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-500">Historial de Reportes</h3>
              {viaje.novedades.map((n: any) => (
                <div key={n.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-start">
                  <div>
                    <span className="inline-block px-2 py-1 rounded bg-slate-200 text-[10px] font-bold text-slate-600 mb-2">{n.categoria}</span>
                    <p className="text-sm text-slate-700">{n.descripcion}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${n.estado === 'pendiente' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                    {n.estado}
                  </span>
                </div>
              ))}
              {viaje.novedades.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">Sin reportes registrados en este viaje.</p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
