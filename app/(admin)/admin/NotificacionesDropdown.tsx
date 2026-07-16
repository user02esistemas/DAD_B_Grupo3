"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, Ticket, Package, Bus, AlertTriangle, Clock, X, ExternalLink } from "lucide-react";
import { obtenerNotificaciones, type Notificacion } from "../actions/notificaciones";

export default function NotificacionesDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [leidas, setLeidas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cargar notificaciones al abrir
  const cargarNotificaciones = async () => {
    setLoading(true);
    try {
      const res = await obtenerNotificaciones();
      if (res.success) {
        setNotificaciones(res.data);
      }
    } catch (err) {
      console.error("Error cargando notificaciones:", err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar al montar y cada 60 segundos
  useEffect(() => {
    cargarNotificaciones();
    const interval = setInterval(cargarNotificaciones, 60000);
    return () => clearInterval(interval);
  }, []);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const noLeidas = notificaciones.filter(n => !leidas.has(n.id)).length;

  const marcarTodasLeidas = () => {
    const todas = new Set(notificaciones.map(n => n.id));
    setLeidas(todas);
  };

  const marcarLeida = (id: string) => {
    setLeidas(prev => new Set(prev).add(id));
  };

  const getIcon = (tipo: Notificacion["tipo"]) => {
    switch (tipo) {
      case "pasaje":
        return <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0"><Ticket className="w-4 h-4 text-blue-500" /></div>;
      case "encomienda":
        return <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0"><Package className="w-4 h-4 text-[#f07639]" /></div>;
      case "viaje":
        return <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0"><Bus className="w-4 h-4 text-emerald-500" /></div>;
      case "reclamo":
        return <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0"><AlertTriangle className="w-4 h-4 text-red-500" /></div>;
    }
  };

  const formatTiempoRelativo = (fechaStr: string) => {
    const fecha = new Date(fechaStr);
    const ahora = new Date();
    const diffMs = ahora.getTime() - fecha.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);

    if (diffMin < 0) return `En ${Math.abs(diffMin)} min`;
    if (diffMin < 1) return "Justo ahora";
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHoras < 24) return `Hace ${diffHoras}h`;
    return fecha.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) cargarNotificaciones();
        }}
        className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--surface-secondary)] text-[var(--muted)] transition-all hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-text)]"
      >
        <Bell className="w-5 h-5" />
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#f07639] rounded-full text-[9px] font-black text-white flex items-center justify-center ring-2 ring-white animate-pulse">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-[var(--dropdown-border)] bg-[var(--dropdown-bg)] shadow-[var(--shadow-lg)] animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--dropdown-border)] bg-[var(--surface-secondary)] px-5 py-3.5">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-extrabold text-[var(--foreground)]">Notificaciones</h3>
              {noLeidas > 0 && (
                <span className="bg-[#f07639] text-white text-[10px] font-black px-1.5 py-0.5 rounded-md">
                  {noLeidas}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {noLeidas > 0 && (
                <button
                  onClick={marcarTodasLeidas}
                  className="text-[11px] font-bold text-[#f07639] hover:text-orange-700 transition-colors"
                >
                  Marcar todas leídas
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-[400px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {loading && notificaciones.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-slate-400 text-sm font-medium">
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Cargando...
              </div>
            ) : notificaciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Bell className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-semibold">Sin notificaciones</p>
                <p className="text-xs mt-1 opacity-70">Todo está al día.</p>
              </div>
            ) : (
              <div>
                {notificaciones.map((notif) => {
                  const esLeida = leidas.has(notif.id);
                  return (
                    <div
                      key={notif.id}
                      onClick={() => {
                        marcarLeida(notif.id);
                        setIsOpen(false);
                        router.push(notif.link);
                      }}
                      className={`
                        flex items-start gap-3 px-5 py-3.5 border-b border-slate-50 cursor-pointer transition-all duration-200 group
                        ${esLeida ? "bg-[var(--card-bg)] opacity-70" : "bg-[var(--card-bg)] hover:bg-[var(--primary-soft)]"}
                      `}
                    >
                      {getIcon(notif.tipo)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-[12px] font-bold truncate ${esLeida ? "text-slate-500" : "text-slate-800"}`}>
                            {notif.titulo}
                          </p>
                          <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap shrink-0">
                            {formatTiempoRelativo(notif.fecha)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.mensaje}
                        </p>
                        {/* Link indicator */}
                        <span className="text-[10px] font-bold text-[#f07639] mt-1 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="w-3 h-3" />
                          Ir a {notif.tipo === "pasaje" ? "Pasajes" : notif.tipo === "encomienda" ? "Encomiendas" : notif.tipo === "viaje" ? "Viajes" : "Detalle"}
                        </span>
                      </div>
                      {!esLeida && (
                        <div className="w-2 h-2 rounded-full bg-[#f07639] shrink-0 mt-1.5" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notificaciones.length > 0 && (
            <div className="border-t border-[var(--dropdown-border)] bg-[var(--surface-secondary)] px-5 py-3">
              <button
                onClick={cargarNotificaciones}
                className="text-[12px] font-bold text-[#f07639] hover:text-orange-700 transition-colors w-full text-center"
              >
                {loading ? "Actualizando..." : "Actualizar notificaciones"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
