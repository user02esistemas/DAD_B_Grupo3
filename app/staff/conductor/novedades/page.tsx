"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  Wrench, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowLeft, 
  Plus,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { 
  obtenerNovedadesConductor, 
  obtenerBusesAsignados, 
  reportarFallaMecanicaDirecta 
} from "@/app/(admin)/actions/conductor";

export default function NovedadesConductorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [buses, setBuses] = useState<any[]>([]);
  const [novedades, setNovedades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [form, setForm] = useState({
    bus_id: "",
    categoria: "Motor",
    descripcion: "",
  });

  const conductorId = session?.user ? Number((session.user as any).persona_id) : null;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const loadData = async () => {
    if (!conductorId) return;
    try {
      setLoading(true);
      const [assignedBuses, histNovedades] = await Promise.all([
        obtenerBusesAsignados(conductorId),
        obtenerNovedadesConductor(conductorId)
      ]);
      setBuses(assignedBuses);
      setNovedades(histNovedades);
      if (assignedBuses.length > 0) {
        setForm(prev => ({ ...prev, bus_id: assignedBuses[0].id }));
      }
    } catch (error) {
      console.error("Error loading novelty data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (conductorId) {
      loadData();
    }
  }, [conductorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conductorId || !form.bus_id || !form.descripcion) return;
    try {
      setSubmitting(true);
      const res = await reportarFallaMecanicaDirecta({
        conductor_id: conductorId,
        bus_id: Number(form.bus_id),
        categoria: form.categoria,
        descripcion: form.descripcion
      });

      if (res.success) {
        alert("✔️ Reporte de falla mecánica registrado con éxito y enviado al área de taller.");
        setForm(prev => ({ ...prev, descripcion: "" }));
        setShowModal(false);
        await loadData();
      } else {
        alert(res.error || "Ocurrió un error al registrar el reporte.");
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("Error de conexión al enviar reporte.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
        <Loader2 className="w-10 h-10 animate-spin text-[#f07639]" />
        <p className="text-slate-500 text-sm font-bold">Cargando información del taller...</p>
      </div>
    );
  }

  // Verificar si hay fallas pendientes críticas en el bus asignado
  const assignedBus = buses[0]; // Tomar el primer bus asignado para la jornada
  const hasPendingFailure = assignedBus?.novedades?.some((n: any) => n.estado === "pendiente");

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link 
            href="/staff/conductor" 
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Novedades del Vehículo</h1>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Reportes mecánicos de buses asignados</p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4.5 h-4.5" />
          Reportar Falla
        </button>
      </div>

      {/* Bus Asignado Estado */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Bus Asignado para tu Jornada</h2>
        {assignedBus ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Placa y Detalle */}
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-[#f07639]/10 text-[#f07639] flex items-center justify-center">
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">Bus Placa</p>
                <p className="text-xl font-extrabold text-slate-800">{assignedBus.placa}</p>
                <p className="text-xs text-slate-500 font-semibold">{assignedBus.marca || "Bus El Cumbe"}</p>
              </div>
            </div>

            {/* Diagnóstico */}
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-slate-200/50 flex items-center justify-center">
                <Clock className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">Capacidad</p>
                <p className="text-lg font-extrabold text-slate-800">{assignedBus.capacidad} Pasajeros</p>
                <p className="text-xs text-slate-500 font-semibold">{assignedBus.pisos} piso(s)</p>
              </div>
            </div>

            {/* Operatividad */}
            <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
              hasPendingFailure 
                ? "bg-red-50 text-red-700 border-red-100" 
                : "bg-green-50 text-green-700 border-green-100"
            }`}>
              {hasPendingFailure ? (
                <>
                  <ShieldAlert className="w-8 h-8 shrink-0 text-red-650" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide">Estado: Falla Pendiente</p>
                    <p className="text-xs opacity-90 font-medium">El vehículo registra incidentes pendientes de reparación en taller.</p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-8 h-8 shrink-0 text-green-650" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide">Estado: Apto para Operar</p>
                    <p className="text-xs opacity-90 font-medium">Sin fallas mecánicas activas. El bus está autorizado para la ruta.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 text-slate-500 p-6 rounded-2xl border border-dashed border-slate-250 text-center font-bold text-sm">
            No tienes buses asignados para viajes programados hoy.
          </div>
        )}
      </div>

      {/* Historial de Reportes */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Tus Reportes de Fallas Históricos</h2>
        {novedades.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Bus (Placa)</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Descripción</th>
                  <th className="py-3 px-4 text-center">Estado Taller</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                {novedades.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-black">{n.bus?.placa}</td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded uppercase font-bold text-[10px]">
                        {n.categoria}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate font-medium text-slate-500">{n.descripcion}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-block ${
                        n.estado === "solucionado" || n.estado === "reparado"
                          ? "bg-green-50 text-green-700 border border-green-100"
                          : n.estado === "en_taller"
                          ? "bg-blue-50 text-blue-700 border border-blue-100"
                          : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}>
                        {n.estado === "solucionado" || n.estado === "reparado" ? "Reparado" : n.estado === "en_taller" ? "En taller" : "Pendiente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center p-8 text-slate-450 font-bold text-sm bg-slate-50 rounded-2xl border border-slate-100">
            No has registrado fallas mecánicas en el sistema.
          </div>
        )}
      </div>

      {/* Modal de Reporte */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-scaleUp border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Reportar Falla Mecánica</h3>
            <p className="text-xs text-slate-500 mb-4 font-semibold">Informa de desperfectos en el vehículo para su revisión técnica.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Seleccionar Bus */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wide">Seleccionar Bus</label>
                {buses.length > 0 ? (
                  <select
                    value={form.bus_id}
                    onChange={(e) => setForm(prev => ({ ...prev, bus_id: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#f07639] transition-colors"
                  >
                    {buses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.placa} ({b.marca || "Bus"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-red-650 font-bold bg-red-50 p-2.5 rounded-xl border border-red-100/50">
                    No tienes ningún bus asignado para hoy.
                  </p>
                )}
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wide">Categoría del Fallo</label>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm(prev => ({ ...prev, categoria: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#f07639] transition-colors"
                >
                  <option value="Motor">Motor / Transmisión</option>
                  <option value="Frenos">Frenos / Suspensión</option>
                  <option value="Neumáticos">Neumáticos / Llantas</option>
                  <option value="Luces">Sistema Eléctrico / Luces</option>
                  <option value="Carrocería">Puertas / Carrocería / Asientos</option>
                  <option value="Aire Acondicionado">Climatización / Aire Acondicionado</option>
                  <option value="Otro">Otro Incidente</option>
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wide">Descripción del Problema</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  required
                  placeholder="Detalla de forma clara el desperfecto mecánico observado..."
                  className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#f07639] transition-colors resize-none"
                />
              </div>

              {/* Acciones */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || buses.length === 0}
                  className="flex-1 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Enviar Reporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
