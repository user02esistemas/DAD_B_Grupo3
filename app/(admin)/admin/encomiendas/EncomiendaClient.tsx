"use client";

import { useState, useMemo } from "react";
import { Package, Search, Edit2, MapPin, Truck, CheckCircle, PackageOpen, FileText, PlusCircle } from "lucide-react";
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
  origen: { nombre: string };
  destino: { nombre: string };
  viaje?: { id: string, bus: { placa: string } } | null;
  peso_kg: string | number;
  estado: string;
  created_at: string;
};

export default function EncomiendaClient({ 
  initialEncomiendas,
  viajesActivos,
  sucursales
}: { 
  initialEncomiendas: Encomienda[],
  viajesActivos: Viaje[],
  sucursales: { id: string; nombre: string }[]
}) {
  const [encomiendas, setEncomiendas] = useState<Encomienda[]>(initialEncomiendas);
  
  // Vista actual
  const [view, setView] = useState<"lista" | "registro">("lista");
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [selectedViajeId, setSelectedViajeId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Filtrado
  const filteredEncomiendas = useMemo(() => {
    return encomiendas.filter((enc) => {
      const matchSearch = 
        enc.codigo_seguimiento.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enc.remitente_dni.includes(searchTerm) ||
        enc.destinatario_dni.includes(searchTerm);
      
      const matchEstado = filterEstado === "todos" || enc.estado === filterEstado;

      return matchSearch && matchEstado;
    });
  }, [encomiendas, searchTerm, filterEstado]);

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
      <div className="bg-white p-1.5 rounded-2xl border border-slate-100 mb-6 flex space-x-1.5">
        <button
          onClick={() => setView("lista")}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-[13px] transition-all flex items-center justify-center ${
            view === "lista" ? "bg-gradient-to-r from-[#f07639] to-[#d45a1f] text-white shadow-lg shadow-[#f07639]/15" : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          }`}
        >
          <Package className="w-4 h-4 mr-2" /> Lista de Encomiendas
        </button>
        <button
          onClick={() => setView("registro")}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-[13px] transition-all flex items-center justify-center ${
            view === "registro" ? "bg-gradient-to-r from-[#f07639] to-[#d45a1f] text-white shadow-lg shadow-[#f07639]/15" : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          }`}
        >
          <PlusCircle className="w-4 h-4 mr-2" /> Registrar Encomienda
        </button>
      </div>

      {view === "registro" ? (
        <RegistroEncomienda 
          sucursales={sucursales} 
          onSuccess={() => {
            refreshList();
            setView("lista");
          }} 
        />
      ) : (
        <>
          {/* Filtros */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 mb-5 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2.5 bg-[#f8f9fc] border border-slate-200/60 rounded-xl focus:border-[#f07639]/30 focus:bg-white text-[13px] font-semibold text-slate-700 placeholder-slate-400 outline-none transition-all"
                placeholder="Buscar por DNI o Código de Seguimiento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-64">
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="block w-full px-4 py-2.5 bg-[#f8f9fc] border border-slate-200/60 rounded-xl focus:border-[#f07639]/30 focus:bg-white text-[13px] font-semibold text-slate-700 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="todos">Todos los estados</option>
                <option value="recepcionado">Recepcionados</option>
                <option value="en_transito">En Tránsito</option>
                <option value="listo_para_recojo">Listos para Recojo</option>
                <option value="entregado">Entregados</option>
              </select>
            </div>
          </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8f9fc] border-b border-slate-100">
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Código / Fecha</th>
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Ruta</th>
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Remitente / Destinatario</th>
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
                      <div className="flex flex-col items-center justify-center space-y-1">
                        {getStatusBadge(enc.estado)}
                        {enc.viaje && (
                          <span className="text-[10px] text-gray-500">Bus: {enc.viaje.bus.placa}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {enc.estado !== 'entregado' && (
                        <button
                          onClick={() => handleOpenModal(enc)}
                          className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 mr-1.5" />
                          Actualizar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron encomiendas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Actualizar Estado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
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
        </div>
      )}
      </>
      )}
    </div>
  );
}
