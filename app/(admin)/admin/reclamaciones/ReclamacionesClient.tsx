"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { 
  MessageSquareWarning, 
  Search, 
  Eye, 
  X, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Save,
  Loader2
} from "lucide-react";
import { updateReclamoEstado } from "@/app/(admin)/actions/reclamaciones";

export default function ReclamacionesClient({ initialData }: { initialData: any[] }) {
  const { data: session } = useSession();
  const [reclamos, setReclamos] = useState(initialData);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReclamo, setSelectedReclamo] = useState<any>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [estadoEdit, setEstadoEdit] = useState("");
  const [respuestaEdit, setRespuestaEdit] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const filteredReclamos = reclamos.filter(
    (r) =>
      r.codigo_reclamo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.persona?.nombres?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.persona?.apellidos?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.persona?.dni?.includes(searchTerm)
  );

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold border border-yellow-200 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Pendiente</span>;
      case "en_proceso":
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-200 flex items-center gap-1.5"><AlertCircle className="w-3 h-3" /> En Proceso</span>;
      case "resuelto":
        return <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold border border-green-200 flex items-center gap-1.5"><CheckCircle className="w-3 h-3" /> Resuelto</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">{estado}</span>;
    }
  };

  const getTipoBadge = (tipo: string) => {
    return (
      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
        tipo === 'queja' 
          ? 'bg-purple-100 text-purple-700 border-purple-200' 
          : 'bg-orange-100 text-orange-700 border-orange-200'
      }`}>
        {tipo.toUpperCase()}
      </span>
    );
  };

  const handleVerDetalles = (reclamo: any) => {
    setSelectedReclamo(reclamo);
    setEstadoEdit(reclamo.estado);
    setRespuestaEdit(reclamo.respuesta_admin || "");
    setError("");
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    const res = await updateReclamoEstado(selectedReclamo.id, estadoEdit, respuestaEdit);
    setIsSaving(false);

    if (res.success) {
      // Update local state
      setReclamos(prev => prev.map(r => {
        if (r.id === selectedReclamo.id) {
          return { ...r, estado: estadoEdit, respuesta_admin: respuestaEdit };
        }
        return r;
      }));
      setIsModalOpen(false);
    } else {
      setError(res.error || "Ocurrió un error al guardar los cambios.");
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header & Search */}
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div className="relative max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por código, cliente o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 text-sm border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#f07639]/20 focus:border-[#f07639] rounded-xl bg-white text-slate-800 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 font-bold tracking-wider">Código</th>
              <th className="px-6 py-4 font-bold tracking-wider">Cliente</th>
              <th className="px-6 py-4 font-bold tracking-wider">Tipo</th>
              <th className="px-6 py-4 font-bold tracking-wider">Fecha</th>
              <th className="px-6 py-4 font-bold tracking-wider">Estado</th>
              <th className="px-6 py-4 font-bold tracking-wider text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredReclamos.length > 0 ? (
              filteredReclamos.map((reclamo) => (
                <tr key={reclamo.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700">{reclamo.codigo_reclamo}</td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800">{reclamo.persona?.nombres} {reclamo.persona?.apellidos}</p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">DNI: {reclamo.persona?.dni || "N/A"}</p>
                  </td>
                  <td className="px-6 py-4">{getTipoBadge(reclamo.tipo)}</td>
                  <td className="px-6 py-4 font-medium text-slate-600">
                    {new Date(reclamo.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(reclamo.estado)}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleVerDetalles(reclamo)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-[#f07639]/10 hover:text-[#f07639] transition-colors"
                      title="Ver Detalles"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center">
                    <MessageSquareWarning className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="font-medium">No se encontraron reclamaciones.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {mounted && isModalOpen && selectedReclamo && createPortal(
        <div 
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setIsModalOpen(false);
            }
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <MessageSquareWarning className="w-5 h-5 text-[#f07639]" />
                Detalles del {selectedReclamo.tipo === "queja" ? "Queja" : "Reclamo"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm font-medium rounded-xl border border-red-100">
                  {error}
                </div>
              )}

              {/* Info del Cliente */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Información del Cliente</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Nombre Completo</p>
                    <p className="text-sm font-bold text-slate-800">{selectedReclamo.persona?.nombres} {selectedReclamo.persona?.apellidos}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">DNI</p>
                    <p className="text-sm font-bold text-slate-800">{selectedReclamo.persona?.dni || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Teléfono</p>
                    <p className="text-sm font-bold text-slate-800">{selectedReclamo.persona?.telefono || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Código</p>
                    <p className="text-sm font-bold text-slate-800">{selectedReclamo.codigo_reclamo}</p>
                  </div>
                </div>
              </div>

              {/* Detalles del Incidente */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Detalle del Incidente</h4>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 text-sm text-slate-700 whitespace-pre-wrap">
                  {selectedReclamo.detalle_incidente}
                </div>
              </div>

              {/* Pedido del Cliente */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pedido del Cliente</h4>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 text-sm text-slate-700 whitespace-pre-wrap">
                  {selectedReclamo.pedido_cliente}
                </div>
              </div>

              {/* Controles de Admin */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Estado</label>
                  <select
                    value={estadoEdit}
                    onChange={(e) => setEstadoEdit(e.target.value)}
                    className="w-full text-sm border-slate-200 rounded-xl focus:ring-[#f07639]/20 focus:border-[#f07639]"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_proceso">En Proceso</option>
                    <option value="resuelto">Resuelto</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Respuesta Oficial ({session?.user?.name || "Admin"})
                  </label>
                  <textarea
                    value={respuestaEdit}
                    onChange={(e) => setRespuestaEdit(e.target.value)}
                    rows={4}
                    placeholder="Escriba aquí la respuesta o resolución del caso..."
                    className="w-full text-sm border-slate-200 rounded-xl focus:ring-[#f07639]/20 focus:border-[#f07639] resize-none"
                  />
                  <p className="text-xs text-slate-400 mt-1">Esta respuesta podrá ser leída si el cliente consulta su reclamo.</p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 text-sm font-bold text-white bg-[#f07639] rounded-xl hover:bg-orange-600 transition-colors flex items-center"
              >
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Guardar Cambios</>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
