"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, MapPin, Navigation, Clock, DollarSign, Pencil, Search } from "lucide-react";
import { crearRuta, eliminarRuta, actualizarRuta } from "../../actions/rutas";

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
  const [mounted, setMounted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [origenFilter, setOrigenFilter] = useState("");
  const [destinoFilter, setDestinoFilter] = useState("");
  const [sortBy, setSortBy] = useState("default");

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  const [formData, setFormData] = useState({
    origen_id: "",
    destino_id: "",
    duracion_estimada_minutos: 120 as number | string,
    precio_base: 50.00 as number | string,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lógica de filtrado y ordenación
  const filteredAndSortedRutas = rutas
    .filter((ruta) => {
      // 1. Filtro por búsqueda de texto
      const searchStr = `${ruta.origen.nombre} ${ruta.destino.nombre}`.toLowerCase();
      if (searchTerm && !searchStr.includes(searchTerm.toLowerCase())) {
        return false;
      }
      // 2. Filtro por origen
      if (origenFilter && ruta.origen_id.toString() !== origenFilter.toString()) {
        return false;
      }
      // 3. Filtro por destino
      if (destinoFilter && ruta.destino_id.toString() !== destinoFilter.toString()) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "price_asc") {
        return Number(a.precio_base) - Number(b.precio_base);
      }
      if (sortBy === "price_desc") {
        return Number(b.precio_base) - Number(a.precio_base);
      }
      if (sortBy === "duration_asc") {
        return a.duracion_estimada_minutos - b.duracion_estimada_minutos;
      }
      if (sortBy === "duration_desc") {
        return b.duracion_estimada_minutos - a.duracion_estimada_minutos;
      }
      if (sortBy === "alphabetical") {
        const nameA = `${a.origen.nombre} a ${a.destino.nombre}`.toLowerCase();
        const nameB = `${b.origen.nombre} a ${b.destino.nombre}`.toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return 0; // default
    });

  const handleOpenModal = (ruta?: Ruta) => {
    setError(null);
    if (ruta) {
      setEditingId(ruta.id);
      setFormData({
        origen_id: ruta.origen_id,
        destino_id: ruta.destino_id,
        duracion_estimada_minutos: ruta.duracion_estimada_minutos,
        precio_base: Number(ruta.precio_base),
      });
    } else {
      setEditingId(null);
      setFormData({
        origen_id: sucursales.length > 0 ? sucursales[0].id : "",
        destino_id: sucursales.length > 1 ? sucursales[1].id : "",
        duracion_estimada_minutos: 120,
        precio_base: 50.00,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const submitData = {
      ...formData,
      duracion_estimada_minutos: Number(formData.duracion_estimada_minutos) || 0,
      precio_base: Number(formData.precio_base) || 0,
    };

    if (submitData.origen_id === submitData.destino_id) {
      setError("El origen y el destino no pueden ser la misma sucursal.");
      setIsLoading(false);
      return;
    }

    if (submitData.duracion_estimada_minutos < 10 || submitData.duracion_estimada_minutos > 1440) {
      setError("La duración estimada debe estar entre 10 y 1440 minutos (24 horas).");
      setIsLoading(false);
      return;
    }

    if (submitData.precio_base < 10 || submitData.precio_base > 200) {
      setError("El precio base debe estar entre S/ 10.00 y S/ 200.00.");
      setIsLoading(false);
      return;
    }

    try {
      if (editingId) {
        const res = await actualizarRuta(editingId, submitData);
        if (res.success) {
          const origen = sucursales.find(s => s.id === submitData.origen_id)?.nombre || "";
          const destino = sucursales.find(s => s.id === submitData.destino_id)?.nombre || "";
          const rutaActualizada = {
            ...res.data,
            origen: { nombre: origen },
            destino: { nombre: destino }
          };
          setRutas((prev) => prev.map((r) => (r.id === editingId ? rutaActualizada : r)));
          handleCloseModal();
        } else {
          setError(res.error || "Error al actualizar ruta");
        }
      } else {
        const res = await crearRuta(submitData);
        if (res.success) {
          const origen = sucursales.find(s => s.id === submitData.origen_id)?.nombre || "";
          const destino = sucursales.find(s => s.id === submitData.destino_id)?.nombre || "";
          
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
          onClick={() => handleOpenModal()}
          className="bg-gradient-to-r from-[#f07639] to-[#d45a1f] hover:from-[#e06528] hover:to-[#c7551d] text-white px-5 py-2.5 rounded-xl font-bold text-[13px] flex items-center shadow-lg shadow-[#f07639]/15 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#f07639]/25"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Ruta
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-100 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Buscador de Texto */}
          <div className="relative flex-1 max-w-xs min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por trayecto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#f8f9fc] border border-slate-200/60 focus:border-[#f07639]/30 rounded-xl focus:bg-white text-[13px] font-semibold text-slate-700 placeholder-slate-400 outline-none transition-all"
            />
          </div>

          {/* Filtro por Origen */}
          <div className="min-w-[155px]">
            <select
              value={origenFilter}
              onChange={(e) => setOrigenFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#f8f9fc] border border-slate-200/60 focus:border-[#f07639]/30 rounded-xl focus:bg-white text-[13px] font-semibold text-slate-700 cursor-pointer outline-none transition-all appearance-none"
            >
              <option value="">Cualquier origen</option>
              {sucursales.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Destino */}
          <div className="min-w-[155px]">
            <select
              value={destinoFilter}
              onChange={(e) => setDestinoFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#f8f9fc] border border-slate-200/60 focus:border-[#f07639]/30 rounded-xl focus:bg-white text-[13px] font-semibold text-slate-700 cursor-pointer outline-none transition-all appearance-none"
            >
              <option value="">Cualquier destino</option>
              {sucursales.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          {/* Ordenar por */}
          <div className="min-w-[180px]">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#f8f9fc] border border-slate-200/60 focus:border-[#f07639]/30 rounded-xl focus:bg-white text-[13px] font-semibold text-slate-700 cursor-pointer outline-none transition-all appearance-none"
            >
              <option value="default">Orden por defecto</option>
              <option value="price_asc">Precio: Menor a Mayor</option>
              <option value="price_desc">Precio: Mayor a Menor</option>
              <option value="duration_asc">Duración: Más Corta</option>
              <option value="duration_desc">Duración: Más Larga</option>
              <option value="alphabetical">Alfabético (A-Z)</option>
            </select>
          </div>
        </div>
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
              {filteredAndSortedRutas.length > 0 ? (
                filteredAndSortedRutas.map((ruta) => (
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(ruta)}
                          className="text-gray-400 hover:text-blue-500 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-5 h-5 inline-block" />
                        </button>
                        <button
                          onClick={() => handleDelete(ruta.id)}
                          className="text-gray-400 hover:text-red-650 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5 inline-block" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron rutas con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Formulario */}
      {mounted && isModalOpen && createPortal(
        <div 
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{editingId ? "Editar Ruta" : "Nueva Ruta"}</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                
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
                      min={10}
                      max={1440}
                      value={formData.duracion_estimada_minutos}
                      onChange={(e) => setFormData({ ...formData, duracion_estimada_minutos: e.target.value === "" ? "" : (parseInt(e.target.value) || 0) })}
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
                      min={10}
                      max={200}
                      step="0.01"
                      value={formData.precio_base}
                      onChange={(e) => setFormData({ ...formData, precio_base: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0) })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3 flex-shrink-0">
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
                  {isLoading ? "Guardando..." : (editingId ? "Guardar Cambios" : "Guardar")}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
