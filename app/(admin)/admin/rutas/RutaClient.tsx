"use client";

import { useState } from "react";
import { Plus, Trash2, MapPin, Navigation, Clock, DollarSign } from "lucide-react";
import { crearRuta, eliminarRuta } from "../../actions/rutas";

type Sucursal = {
  id: string;
  nombre: string;
};

type Ruta = {
  id: string;
  origen_id: string;
  destino_id: string;
  duracion_estimada_minutos: number;
  precio_base: string | number;
  origen: { nombre: string };
  destino: { nombre: string };
};

export default function RutaClient({ 
  initialRutas, 
  sucursales 
}: { 
  initialRutas: Ruta[], 
  sucursales: Sucursal[] 
}) {
  const [rutas, setRutas] = useState<Ruta[]>(initialRutas);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    origen_id: "",
    destino_id: "",
    duracion_estimada_minutos: 120,
    precio_base: 50.00,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenModal = () => {
    setError(null);
    setFormData({
      origen_id: sucursales.length > 0 ? sucursales[0].id : "",
      destino_id: sucursales.length > 1 ? sucursales[1].id : "",
      duracion_estimada_minutos: 120,
      precio_base: 50.00,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await crearRuta(formData);
      if (res.success) {
        // Obtenemos los nombres completos para la tabla optimística
        const origen = sucursales.find(s => s.id === formData.origen_id)?.nombre || "";
        const destino = sucursales.find(s => s.id === formData.destino_id)?.nombre || "";
        
        const nuevaRuta = {
          ...res.data,
          origen: { nombre: origen },
          destino: { nombre: destino }
        };

        setRutas([nuevaRuta, ...rutas]);
        handleCloseModal();
      } else {
        setError(res.error || "Error al crear ruta");
      }
    } catch (err) {
      setError("Error inesperado de red.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta ruta?")) return;

    try {
      const res = await eliminarRuta(id);
      if (res.success) {
        setRutas((prev) => prev.filter((r) => r.id !== id));
      } else {
        alert(res.error || "Error al eliminar ruta");
      }
    } catch (err) {
      alert("Error inesperado al intentar eliminar.");
    }
  };

  // Convertimos minutos a formato legible (ej. 135 -> 2h 15m)
  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m > 0 ? m + 'm' : ''}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#f07639] to-[#d45a1f] flex items-center justify-center text-white shadow-lg shadow-[#f07639]/20">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Gestión de Rutas</h2>
            <p className="text-[12px] text-slate-400 font-medium">Trayectos, duraciones estimadas y precios base.</p>
          </div>
        </div>
        <button
          onClick={handleOpenModal}
          className="bg-gradient-to-r from-[#f07639] to-[#d45a1f] hover:from-[#e06528] hover:to-[#c7551d] text-white px-5 py-2.5 rounded-xl font-bold text-[13px] flex items-center shadow-lg shadow-[#f07639]/15 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#f07639]/25"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Ruta
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8f9fc] border-b border-slate-100">
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Trayecto</th>
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">Duración</th>
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">Precio Base</th>
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rutas.length > 0 ? (
                rutas.map((ruta) => (
                  <tr key={ruta.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-4 flex-shrink-0">
                          <Navigation className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 flex items-center">
                            {ruta.origen.nombre}
                            <span className="mx-2 text-gray-400">→</span>
                            {ruta.destino.nombre}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center text-gray-600 font-medium">
                        <Clock className="w-4 h-4 mr-1 text-gray-400" />
                        {formatDuration(ruta.duracion_estimada_minutos)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-50 text-green-700">
                        S/ {Number(ruta.precio_base).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(ruta.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5 inline-block" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No hay rutas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Formulario */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Nueva Ruta</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Origen <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.origen_id}
                    onChange={(e) => setFormData({ ...formData, origen_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all bg-white"
                  >
                    <option value="" disabled>Seleccione origen</option>
                    {sucursales.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Destino <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.destino_id}
                    onChange={(e) => setFormData({ ...formData, destino_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all bg-white"
                  >
                    <option value="" disabled>Seleccione destino</option>
                    {sucursales.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duración (min) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.duracion_estimada_minutos}
                      onChange={(e) => setFormData({ ...formData, duracion_estimada_minutos: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Precio Base (S/) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={0.1}
                      step="0.01"
                      value={formData.precio_base}
                      onChange={(e) => setFormData({ ...formData, precio_base: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
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
                  disabled={isLoading}
                  className="bg-[#f07639] hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
