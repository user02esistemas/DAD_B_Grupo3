"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  AlertTriangle, 
  Check, 
  ArrowLeft, 
  Loader2, 
  Calendar,
  MessageSquare,
  Eye
} from "lucide-react";
import Link from "next/link";
import { getAlertasConductor, marcarAlertaLeida } from "@/app/(admin)/actions/conductor";

export default function AlertasConductorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [alertas, setAlertas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const conductorId = session?.user ? Number((session.user as any).persona_id) : null;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const loadAlertas = async () => {
    if (!conductorId) return;
    try {
      setLoading(true);
      const res = await getAlertasConductor(conductorId);
      setAlertas(res);
    } catch (error) {
      console.error("Error loading alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (conductorId) {
      loadAlertas();
    }
  }, [conductorId]);

  const handleMarcarLeido = async (alertaId: number) => {
    try {
      setMarkingId(alertaId.toString());
      const res = await marcarAlertaLeida(alertaId);
      if (res.success) {
        // Actualizar estado local rápido
        setAlertas(prev => 
          prev.map(a => a.id === alertaId.toString() ? { ...a, leido: true } : a)
        );
      } else {
        alert("No se pudo marcar la alerta como leída.");
      }
    } catch (error) {
      console.error("Error marking alert as read:", error);
    } finally {
      setMarkingId(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
        <Loader2 className="w-10 h-10 animate-spin text-[#f07639]" />
        <p className="text-slate-500 text-sm font-bold">Cargando bandeja de alertas...</p>
      </div>
    );
  }

  const unreadCount = alertas.filter(a => !a.leido).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 animate-fadeIn">
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
            <h1 className="text-2xl font-black text-slate-800">Alertas de la Central</h1>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Mensajes críticos enviados por operaciones</p>
          </div>
        </div>

        {unreadCount > 0 && (
          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-black text-xs border border-red-200">
            {unreadCount} Nuevas
          </span>
        )}
      </div>

      {/* List */}
      <div className="space-y-4">
        {alertas.length > 0 ? (
          alertas.map((a) => (
            <div 
              key={a.id} 
              className={`p-5 rounded-3xl border transition-all ${
                a.leido 
                  ? "bg-white border-slate-100 opacity-75 shadow-[0_2px_10px_rgb(0,0,0,0.01)]" 
                  : "bg-red-50/40 border-red-100 shadow-[0_4px_20px_rgb(239,68,68,0.03)]"
              }`}
            >
              <div className="flex gap-4">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  a.leido 
                    ? "bg-slate-100 text-slate-400" 
                    : "bg-red-100 text-red-500 animate-pulse"
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                    <p className="text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded font-extrabold uppercase tracking-wide">
                      Viaje: {a.viaje?.ruta?.origen?.nombre} ➔ {a.viaje?.ruta?.destino?.nombre}
                    </p>
                  </div>

                  <p className={`text-xs font-semibold leading-relaxed ${a.leido ? "text-slate-500" : "text-slate-800 font-bold"}`}>
                    {a.mensaje}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100/50">
                    <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Origen: Central de Despacho
                    </span>

                    {!a.leido && (
                      <button
                        onClick={() => handleMarcarLeido(Number(a.id))}
                        disabled={markingId === a.id}
                        className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-1.5 rounded-xl font-bold text-[10px] shadow-sm flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {markingId === a.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Marcar Leído
                      </button>
                    )}
                    {a.leido && (
                      <span className="text-[10px] text-green-600 font-black uppercase flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        Leído
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white text-center p-12 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
            <AlertTriangle className="w-12 h-12 text-slate-350 mx-auto mb-4" />
            <h3 className="text-base font-extrabold text-slate-700 mb-1">Sin Alertas en la Bandeja</h3>
            <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">No hay notificaciones de incidentes, climas adversos o desvíos de la central en este momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
