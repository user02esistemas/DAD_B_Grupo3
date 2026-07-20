"use client";

import { useState, useMemo } from "react";
import {
  MapPin, Calendar, Bus as BusIcon, ArrowRight,
  UserCheck, Users, ClipboardList, Search,
  ChevronRight, CheckCircle2, Clock, XCircle,
  AlertCircle, Filter, X
} from "lucide-react";
import Link from "next/link";

interface Ruta {
  id: string;
  origen: { nombre: string };
  destino: { nombre: string };
}

interface Bus {
  id: string;
  placa: string;
  marca?: string;
}

interface Viaje {
  id: string;
  ruta_id: string;
  bus_id: string;
  estado: string;
  fecha_salida: string;
  ruta: {
    origen: { nombre: string };
    destino: { nombre: string };
  };
  bus: { placa: string; capacidad: number; pisos: number };
  total_pasajeros: number;
  total_abordados: number;
}

interface Props {
  viajes: Viaje[];
  rutas: Ruta[];
  buses: Bus[];
  userName: string;
}

type TabDia = "hoy" | "manana" | "todos";

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "programado", label: "Programado" },
  { value: "en_curso", label: "En Curso" },
  { value: "completado", label: "Completado" },
  { value: "cancelado", label: "Cancelado" },
];

function getEstadoConfig(estado: string) {
  switch (estado) {
    case "programado":
      return { label: "Programado", icon: Clock, cls: "bg-blue-50 text-blue-700 border-blue-200" };
    case "en_curso":
      return { label: "En Curso", icon: AlertCircle, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "completado":
      return { label: "Completado", icon: CheckCircle2, cls: "bg-slate-100 text-slate-500 border-slate-200" };
    case "cancelado":
      return { label: "Cancelado", icon: XCircle, cls: "bg-red-50 text-red-600 border-red-200" };
    default:
      return { label: estado, icon: Clock, cls: "bg-slate-50 text-slate-500 border-slate-200" };
  }
}

function isHoy(fecha: string) {
  const hoy = new Date();
  const f = new Date(fecha);
  return f.getDate() === hoy.getDate() &&
    f.getMonth() === hoy.getMonth() &&
    f.getFullYear() === hoy.getFullYear();
}

function isManana(fecha: string) {
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  const f = new Date(fecha);
  return f.getDate() === manana.getDate() &&
    f.getMonth() === manana.getMonth() &&
    f.getFullYear() === manana.getFullYear();
}

export default function OperarioDashboardClient({ viajes, rutas, buses, userName }: Props) {
  const [tabDia, setTabDia] = useState<TabDia>("hoy");
  const [busqueda, setBusqueda] = useState("");
  const [filtroRuta, setFiltroRuta] = useState("");
  const [filtroBus, setFiltroBus] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const viajesHoy = useMemo(() => viajes.filter(v => isHoy(v.fecha_salida)), [viajes]);
  const viajesManana = useMemo(() => viajes.filter(v => isManana(v.fecha_salida)), [viajes]);
  const viajesOtros = useMemo(() => viajes.filter(v => !isHoy(v.fecha_salida) && !isManana(v.fecha_salida)), [viajes]);

  const viajePorTab = useMemo(() => {
    if (tabDia === "hoy") return viajesHoy;
    if (tabDia === "manana") return viajesManana;
    return viajes;
  }, [tabDia, viajesHoy, viajesManana, viajes]);

  // Si hay fecha específica, filtrar todos los viajes (ignora tab); si no, usar tab
  const baseViajes = filtroFecha ? viajes : viajePorTab;

  const viajesFiltrados = useMemo(() => {
    return baseViajes.filter(v => {
      if (filtroRuta && v.ruta_id !== filtroRuta) return false;
      if (filtroBus && v.bus_id !== filtroBus) return false;
      if (filtroEstado && v.estado !== filtroEstado) return false;
      if (filtroFecha) {
        const fechaViaje = new Date(v.fecha_salida).toISOString().split("T")[0];
        if (fechaViaje !== filtroFecha) return false;
      }
      if (busqueda) {
        const q = busqueda.toLowerCase();
        const ok = v.ruta.origen.nombre.toLowerCase().includes(q) ||
          v.ruta.destino.nombre.toLowerCase().includes(q) ||
          v.bus.placa.toLowerCase().includes(q) ||
          String(v.id).includes(q);
        if (!ok) return false;
      }
      return true;
    });
  }, [baseViajes, filtroRuta, filtroBus, filtroFecha, filtroEstado, busqueda]);

  const totalAbordados = viajesFiltrados.reduce((a, v) => a + v.total_abordados, 0);
  const totalPasajeros = viajesFiltrados.reduce((a, v) => a + v.total_pasajeros, 0);
  const pendientes = totalPasajeros - totalAbordados;
  const hayFiltros = filtroRuta || filtroBus || filtroFecha || filtroEstado || busqueda;

  const limpiar = () => {
    setFiltroRuta(""); setFiltroBus(""); setFiltroFecha(""); setFiltroEstado(""); setBusqueda("");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ── Encabezado ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Panel de Abordaje</h1>
          <p className="text-slate-400 text-sm mt-0.5">Bienvenido, <span className="font-semibold text-slate-600">{userName}</span>. Gestiona el embarque de pasajeros.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-100 shadow-sm rounded-xl px-4 py-2.5 self-start">
          <Calendar className="w-4 h-4 text-[#f07639] shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Fecha actual</p>
            <p className="text-sm font-black text-slate-700 mt-0.5 leading-none" suppressHydrationWarning>
              {new Date().toLocaleDateString("es-PE", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* ── Métricas ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#f07639] flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Viajes</p>
            <p className="text-xl font-black text-slate-800">{viajesFiltrados.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">A Bordo</p>
            <p className="text-xl font-black text-slate-800">
              {totalAbordados} <span className="text-sm font-semibold text-slate-400">/ {totalPasajeros}</span>
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Pendientes</p>
            <p className="text-xl font-black text-slate-800">{pendientes}</p>
          </div>
        </div>
      </div>

      {/* ── Panel principal ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Tabs por día */}
        <div className="flex items-center border-b border-slate-100 px-4 pt-1 gap-1">
          {[
            { key: "hoy", label: "Hoy", count: viajesHoy.length },
            { key: "manana", label: "Mañana", count: viajesManana.length },
            { key: "todos", label: "Todos", count: viajes.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setTabDia(tab.key as TabDia)}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-bold transition-colors rounded-t-xl ${
                tabDia === tab.key
                  ? "text-[#f07639] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#f07639] after:rounded-t"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab.label}
              <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${
                tabDia === tab.key ? "bg-orange-50 text-[#f07639]" : "bg-slate-100 text-slate-400"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}

          {/* Buscador + Filtros inline */}
          <div className="ml-auto flex items-center gap-2 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#f07639]/20 focus:border-[#f07639] w-44 transition-all placeholder:text-slate-400"
              />
            </div>
            <button
              onClick={() => setMostrarFiltros(f => !f)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                mostrarFiltros || hayFiltros
                  ? "bg-[#f07639] text-white border-[#f07639]"
                  : "border-slate-200 text-slate-600 hover:border-[#f07639] hover:text-[#f07639] bg-slate-50"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filtros
              {hayFiltros && (
                <span className="bg-white text-[#f07639] rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-black">
                  {[filtroRuta, filtroBus, filtroFecha, filtroEstado].filter(Boolean).length}
                </span>
              )}
            </button>
            {hayFiltros && (
              <button
                onClick={limpiar}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl border border-red-200 text-red-400 text-xs font-bold hover:bg-red-50 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Fila de filtros expandibles */}
        {mostrarFiltros && (
          <div className="flex flex-wrap gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Ruta:
              </label>
              <select
                value={filtroRuta}
                onChange={e => setFiltroRuta(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#f07639]/20 focus:border-[#f07639]"
              >
                <option value="">Todas</option>
                {rutas.map(r => (
                  <option key={r.id} value={r.id}>{r.origen.nombre} → {r.destino.nombre}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <BusIcon className="w-3.5 h-3.5" /> Bus:
              </label>
              <select
                value={filtroBus}
                onChange={e => setFiltroBus(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#f07639]/20 focus:border-[#f07639]"
              >
                <option value="">Todos</option>
                {buses.map(b => (
                  <option key={b.id} value={b.id}>{b.placa}{b.marca ? ` — ${b.marca}` : ""}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Fecha:
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={filtroFecha}
                  onChange={e => setFiltroFecha(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#f07639]/20 focus:border-[#f07639] transition-all"
                />
                {filtroFecha && (
                  <button
                    onClick={() => setFiltroFecha("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500">Estado:</label>
              <div className="flex gap-1">
                {ESTADOS.map(e => (
                  <button
                    key={e.value}
                    onClick={() => setFiltroEstado(e.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      filtroEstado === e.value
                        ? "bg-[#f07639] text-white border-[#f07639]"
                        : "border-slate-200 text-slate-500 hover:border-slate-300 bg-white"
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tabla de viajes */}
        {viajesFiltrados.length === 0 ? (
          <div className="py-16 text-center">
            <BusIcon className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="font-bold text-slate-400 text-sm">Sin viajes</p>
            <p className="text-slate-300 text-xs mt-1">
              {hayFiltros ? "Prueba cambiando los filtros." : "No hay salidas para este período."}
            </p>
            {hayFiltros && (
              <button onClick={limpiar} className="mt-3 text-xs font-bold text-[#f07639] hover:underline">
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {/* Cabecera de columnas */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-2.5 bg-slate-50/80">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-28">ID</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ruta</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-28">Bus</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-28">Salida</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-52">Abordaje</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-28 text-right">Acción</span>
            </div>

            {viajesFiltrados.map((viaje) => {
              const pct = viaje.total_pasajeros > 0
                ? Math.round((viaje.total_abordados / viaje.total_pasajeros) * 100)
                : 0;
              const estadoCfg = getEstadoConfig(viaje.estado);
              const EstadoIcon = estadoCfg.icon;
              const horaStr = new Date(viaje.fecha_salida).toLocaleString("es-PE", {
                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
              });
              const pctColor = pct === 100 ? "bg-green-500" : pct > 60 ? "bg-emerald-400" : pct > 30 ? "bg-amber-400" : "bg-slate-300";

              return (
                <div
                  key={viaje.id}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-4 hover:bg-orange-50/30 transition-colors group"
                >
                  {/* ID + estado badge */}
                  <div className="w-28">
                    <p className="text-xs font-black text-slate-600">#{viaje.id}</p>
                    <span className={`mt-1 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${estadoCfg.cls}`}>
                      <EstadoIcon className="w-2.5 h-2.5" />
                      {estadoCfg.label}
                    </span>
                  </div>

                  {/* Ruta origen → destino */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-2 h-2 rounded-full border-2 border-[#f07639]" />
                      <div className="w-px h-4 bg-slate-200 my-0.5" />
                      <div className="w-2 h-2 rounded-full border-2 border-slate-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-slate-800 truncate leading-tight">
                        {viaje.ruta.origen.nombre}
                      </p>
                      <p className="text-xs font-semibold text-slate-400 truncate leading-tight mt-0.5">
                        {viaje.ruta.destino.nombre}
                      </p>
                    </div>
                  </div>

                  {/* Bus */}
                  <div className="w-28">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      <BusIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-600 truncate">{viaje.bus.placa}</span>
                    </div>
                  </div>

                  {/* Salida */}
                  <div className="w-28">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-xs font-semibold" suppressHydrationWarning>{horaStr}</span>
                    </div>
                  </div>

                  {/* Progreso de abordaje */}
                  <div className="w-52 space-y-2">
                    {/* Chips libres / ocupados */}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-xs font-black px-2 py-0.5 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                        {Math.max(0, viaje.bus.capacidad - viaje.total_pasajeros)}
                        <span className="font-semibold text-[10px] text-green-600">libres</span>
                      </span>
                      <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 text-xs font-black px-2 py-0.5 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                        {viaje.total_pasajeros}
                        <span className="font-semibold text-[10px] text-red-600">ocupados</span>
                      </span>
                    </div>
                    {/* Barra + % de abordaje */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Abordaje</span>
                        <span className={`text-xs font-black ${
                          pct === 100 ? "text-green-600" : pct > 60 ? "text-emerald-500" : pct > 30 ? "text-amber-500" : "text-slate-400"
                        }`}>{pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${pctColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {viaje.total_abordados} de {viaje.total_pasajeros} pasajeros abordaron
                      </p>
                    </div>
                  </div>

                  {/* Acción */}
                  <div className="w-28 flex justify-end">
                    <Link
                      href={`/staff/operario/viajes/${viaje.id}`}
                      className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-[#f07639] hover:border-[#f07639] hover:text-white text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm group-hover:border-[#f07639]"
                    >
                      Abordaje
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer del panel */}
        {viajesFiltrados.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">
              Mostrando <span className="font-bold text-slate-600">{viajesFiltrados.length}</span> viaje{viajesFiltrados.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> 100% abordado
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> En progreso
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" /> Sin pasajeros
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
