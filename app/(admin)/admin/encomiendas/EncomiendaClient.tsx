"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Package, Search, Edit2, MapPin, Truck, CheckCircle, PackageOpen, FileText, PlusCircle, Filter, X, ChevronDown } from "lucide-react";
import { actualizarEstadoEncomienda, obtenerEncomiendas } from "../../actions/encomiendas";
import RegistroEncomienda from "./RegistroEncomienda";

type Viaje = {
  id: string;
  ruta: { origen: { nombre: string }; destino: { nombre: string } };
  fecha_salida: string;
  bus: { placa: string };
};

type Encomienda = {
  id: string;
  codigo_seguimiento: string;
  remitente_nombre: string;
  remitente_dni: string;
  destinatario_nombre: string;
  destinatario_dni: string;
  origen_id: string;
  destino_id: string;
  origen: { nombre: string };
  destino: { nombre: string };
  viaje?: { 
    id: string; 
    bus: { placa: string }; 
    conductor?: { nombres: string; apellidos: string } | null;
  } | null;
  peso_kg: string | number;
  estado: string;
  created_at: string;
};

export default function EncomiendaClient({ 
  initialEncomiendas,
  viajesActivos,
  sucursales,
  userRole
}: { 
  initialEncomiendas: Encomienda[],
  viajesActivos: Viaje[],
  sucursales: { id: string; nombre: string }[],
  userRole?: string
}) {
  const [encomiendas, setEncomiendas] = useState<Encomienda[]>(initialEncomiendas);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  // Vista actual
  const [view, setView] = useState<"lista" | "registro">("lista");
  const [editingEncomienda, setEditingEncomienda] = useState<Encomienda | null>(null);
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterOrigen, setFilterOrigen] = useState("todos");
  const [filterDestino, setFilterDestino] = useState("todos");
  const [filterFecha, setFilterFecha] = useState("");
  const [filterViajeAsignado, setFilterViajeAsignado] = useState("todos");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [selectedViajeId, setSelectedViajeId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Filtrado
  const filteredEncomiendas = useMemo(() => {
    return encomiendas.filter((enc) => {
      const query = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || 
        enc.codigo_seguimiento.toLowerCase().includes(query) ||
        enc.remitente_dni.includes(searchTerm) ||
        enc.destinatario_dni.includes(searchTerm) ||
        enc.remitente_nombre.toLowerCase().includes(query) ||
        enc.destinatario_nombre.toLowerCase().includes(query);
      
      const matchEstado = filterEstado === "todos" || enc.estado === filterEstado;
      const matchOrigen = filterOrigen === "todos" || enc.origen_id?.toString() === filterOrigen;
      const matchDestino = filterDestino === "todos" || enc.destino_id?.toString() === filterDestino;
      
      let matchFecha = true;
      if (filterFecha) {
        const fEnc = new Date(enc.created_at).toISOString().split("T")[0];
        matchFecha = fEnc === filterFecha;
      }

      let matchViaje = true;
      if (filterViajeAsignado === "sin_viaje") {
        matchViaje = !enc.viaje;
      } else if (filterViajeAsignado === "con_viaje") {
        matchViaje = !!enc.viaje;
      }

      return matchSearch && matchEstado && matchOrigen && matchDestino && matchFecha && matchViaje;
    });
  }, [encomiendas, searchTerm, filterEstado, filterOrigen, filterDestino, filterFecha, filterViajeAsignado]);

  const hayFiltrosActivos = searchTerm || filterEstado !== "todos" || filterOrigen !== "todos" || filterDestino !== "todos" || filterFecha || filterViajeAsignado !== "todos";

  const limpiarFiltros = () => {
    setSearchTerm("");
    setFilterEstado("todos");
    setFilterOrigen("todos");
    setFilterDestino("todos");
    setFilterFecha("");
    setFilterViajeAsignado("todos");
  };

  const handleOpenModal = (enc: Encomienda) => {
    setEditingId(enc.id);
    setNuevoEstado(enc.estado);
    setSelectedViajeId(enc.viaje?.id || "");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    setIsLoading(true);

    try {
      const res = await actualizarEstadoEncomienda(
        editingId, 
        nuevoEstado, 
        nuevoEstado === 'en_transito' ? selectedViajeId : null
      );

      if (res.success) {
        // Obtenemos info del viaje para UI optimista si aplica
        let viajeObj = null;
        if (nuevoEstado === 'en_transito' && selectedViajeId) {
          const v = viajesActivos.find(v => v.id === selectedViajeId);
          if (v) viajeObj = { id: v.id, bus: { placa: v.bus.placa } };
        }

        setEncomiendas(prev => prev.map(enc => 
          enc.id === editingId 
            ? { ...enc, estado: nuevoEstado, viaje: viajeObj }
            : enc
        ));
        handleCloseModal();
      } else {
        alert(res.error || "Error al actualizar");
      }
    } catch (err) {
      alert("Error de red inesperado");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'recepcionado':
        return <span className="flex items-center px-2.5 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-bold"><PackageOpen className="w-3 h-3 mr-1"/> Recepcionado</span>;
      case 'en_transito':
        return <span className="flex items-center px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold"><Truck className="w-3 h-3 mr-1"/> En Tránsito</span>;
      case 'listo_para_recojo':
        return <span className="flex items-center px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold"><MapPin className="w-3 h-3 mr-1"/> Listo para Recojo</span>;
      case 'entregado':
        return <span className="flex items-center px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold"><CheckCircle className="w-3 h-3 mr-1"/> Entregado</span>;
      default:
        return <span className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-bold">{estado}</span>;
    }
  };

  const refreshList = async () => {
    const res = await obtenerEncomiendas();
    if (res.success && res.data) {
      setEncomiendas(res.data);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#f07639] to-[#d45a1f] flex items-center justify-center text-white shadow-lg shadow-[#f07639]/20">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Gestión de Encomiendas</h2>
            <p className="text-[12px] text-slate-400 font-medium">Registra envíos, rastrea paquetes y actualiza estados.</p>
          </div>
        </div>
      </div>

      {/* Selector de Vista */}
      {userRole === "vendedor" && (
        <div className="bg-white p-1.5 rounded-2xl border border-slate-100 mb-6 flex space-x-1.5">
          <button
            onClick={() => {
              setEditingEncomienda(null);
              setView("lista");
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-[13px] transition-all flex items-center justify-center ${
              view === "lista" ? "bg-gradient-to-r from-[#f07639] to-[#d45a1f] text-white shadow-lg shadow-[#f07639]/15" : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            }`}
          >
            <Package className="w-4 h-4 mr-2" /> Lista de Encomiendas
          </button>
          <button
            onClick={() => {
              setEditingEncomienda(null);
              setView("registro");
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-[13px] transition-all flex items-center justify-center ${
              view === "registro" && !editingEncomienda ? "bg-gradient-to-r from-[#f07639] to-[#d45a1f] text-white shadow-lg shadow-[#f07639]/15" : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            }`}
          >
            <PlusCircle className="w-4 h-4 mr-2" /> Registrar Encomienda
          </button>
        </div>
      )}

      {view === "registro" ? (
        <RegistroEncomienda 
          sucursales={sucursales} 
          viajesActivos={viajesActivos}
          editingEncomienda={editingEncomienda}
          onCancel={() => {
            setView("lista");
            setEditingEncomienda(null);
          }}
          onSuccess={() => {
            refreshList();
            setView("lista");
            setEditingEncomienda(null);
          }} 
        />
      ) : (
        <>
          {/* Filtros */}
          <div className="bg-white rounded-2xl border border-slate-100 mb-5 overflow-hidden shadow-sm">
            <div className="p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2.5 bg-[#f8f9fc] border border-slate-200/60 rounded-xl focus:border-[#f07639]/30 focus:bg-white text-[13px] font-semibold text-slate-700 placeholder-slate-400 outline-none transition-all"
                  placeholder="Buscar por DNI, Nombre o Código de Seguimiento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-64">
                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  className="block w-full px-4 py-2.5 bg-[#f8f9fc] border border-slate-200/60 rounded-xl focus:border-[#f07639]/30 focus:bg-white text-[13px] font-semibold text-slate-700 outline-none transition-all cursor-pointer"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="recepcionado">Recepcionados</option>
                  <option value="en_transito">En Tránsito</option>
                  <option value="listo_para_recojo">Listos para Recojo</option>
                  <option value="entregado">Entregados</option>
                </select>
              </div>
              <button
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-bold transition-all ${
                  mostrarFiltros || hayFiltrosActivos
                    ? "bg-[#f07639] text-white border-[#f07639]"
                    : "border-slate-200 text-slate-600 hover:border-[#f07639] hover:text-[#f07639] bg-[#f8f9fc]"
                }`}
              >
                <Filter className="w-4 h-4" />
                Filtros
                {hayFiltrosActivos && (
                  <span className="bg-white text-[#f07639] rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black">
                    {[searchTerm, filterEstado !== "todos", filterOrigen !== "todos", filterDestino !== "todos", filterFecha, filterViajeAsignado !== "todos"].filter(Boolean).length}
                  </span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mostrarFiltros ? "rotate-180" : ""}`} />
              </button>
              {hayFiltrosActivos && (
                <button
                  onClick={limpiarFiltros}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-red-200 text-red-500 text-[13px] font-bold hover:bg-red-50 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  Limpiar
                </button>
              )}
            </div>

            {/* Filtros expandidos */}
            {mostrarFiltros && (
              <div className="px-4 pb-4 pt-0 border-t border-slate-50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#f8f9fc]/40">
                {/* Filtro Origen */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Sucursal Origen</label>
                  <select
                    value={filterOrigen}
                    onChange={(e) => setFilterOrigen(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer"
                  >
                    <option value="todos">Todas las sucursales</option>
                    {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>

                {/* Filtro Destino */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Sucursal Destino</label>
                  <select
                    value={filterDestino}
                    onChange={(e) => setFilterDestino(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer"
                  >
                    <option value="todos">Todas las sucursales</option>
                    {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>

                {/* Filtro Fecha */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Fecha de Envío</label>
                  <input
                    type="date"
                    value={filterFecha}
                    onChange={(e) => setFilterFecha(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-700 outline-none transition-all"
                  />
                </div>

                {/* Filtro Viaje Asignado */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Asignación de Viaje</label>
                  <select
                    value={filterViajeAsignado}
                    onChange={(e) => setFilterViajeAsignado(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer"
                  >
                    <option value="todos">Todos</option>
                    <option value="sin_viaje">Sin viaje asignado</option>
                    <option value="con_viaje">Con viaje asignado</option>
                  </select>
                </div>
              </div>
            )}
          </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8f9fc] border-b border-slate-100">
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Código / Fecha</th>
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Ruta</th>
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Remitente / Destinatario</th>
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">Bus</th>
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Conductor</th>
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">Estado</th>
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredEncomiendas.length > 0 ? (
                filteredEncomiendas.map((enc) => (
                  <tr key={enc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-orange-100 text-[#f07639] flex items-center justify-center mr-3 flex-shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{enc.codigo_seguimiento}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(enc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-900">{enc.origen.nombre}</p>
                      <p className="text-sm text-gray-500">hacia {enc.destino.nombre}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-900"><span className="text-gray-500 text-xs">De:</span> {enc.remitente_nombre} ({enc.remitente_dni})</p>
                        <p className="text-gray-900"><span className="text-gray-500 text-xs">Para:</span> {enc.destinatario_nombre} ({enc.destinatario_dni})</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {enc.viaje ? (
                        <span className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 text-xs font-bold text-slate-600">
                          <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {enc.viaje.bus.placa}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {enc.viaje?.conductor ? (
                        <div>
                          <p className="text-sm font-bold text-gray-900 leading-tight">
                            {enc.viaje.conductor.nombres}
                          </p>
                          <p className="text-xs text-slate-400 leading-none mt-0.5">
                            {enc.viaje.conductor.apellidos}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center justify-center space-y-1">
                        {getStatusBadge(enc.estado)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          disabled={enc.estado !== 'recepcionado'}
                          onClick={() => {
                            setEditingEncomienda(enc);
                            setView("registro");
                          }}
                          className={`inline-flex items-center px-3 py-1.5 text-sm font-bold rounded-lg transition-colors border ${
                            enc.estado === 'recepcionado'
                              ? "bg-orange-50 hover:bg-orange-100 text-[#f07639] border-orange-200/40 cursor-pointer"
                              : "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed opacity-50"
                          }`}
                        >
                          <Edit2 className="w-4 h-4 mr-1.5" />
                          Editar
                        </button>
                        {enc.estado !== 'entregado' && (
                          <button
                            onClick={() => handleOpenModal(enc)}
                            className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4 mr-1.5" />
                            Actualizar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron encomiendas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Actualizar Estado */}
      {mounted && isModalOpen && createPortal(
        <div 
          onClick={handleCloseModal}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Actualizar Estado</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nuevo Estado
                  </label>
                  <select
                    required
                    value={nuevoEstado}
                    onChange={(e) => setNuevoEstado(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all bg-white"
                  >
                    <option value="recepcionado">Recepcionado</option>
                    <option value="en_transito">En Tránsito</option>
                    <option value="listo_para_recojo">Listo para Recojo</option>
                    <option value="entregado">Entregado</option>
                  </select>
                </div>

                {nuevoEstado === 'en_transito' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Asignar a Viaje (Bus) <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={selectedViajeId}
                      onChange={(e) => setSelectedViajeId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all bg-white"
                    >
                      <option value="" disabled>Seleccione un viaje</option>
                      {viajesActivos.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.ruta.origen.nombre} a {v.ruta.destino.nombre} | Bus: {v.bus.placa} ({new Date(v.fecha_salida).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                    {viajesActivos.length === 0 && (
                      <p className="text-xs text-red-500 mt-1">No hay viajes programados disponibles.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || (nuevoEstado === 'en_transito' && !selectedViajeId)}
                  className="bg-[#f07639] hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Actualizando..." : "Confirmar"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
      </>
      )}
    </div>
  );
}
