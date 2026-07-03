"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, Hash, Box, Settings, Bus as BusIcon } from "lucide-react";
import { crearBus, actualizarBus, eliminarBus } from "../../actions/buses";

type Bus = {
  id: string;
  placa: string;
  marca: string | null;
  capacidad: number;
  pisos: number;
  asientos_piso_1?: number | null;
  asientos_restringidos?: string | null;
  imagenes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export default function BusClient({ initialData }: { initialData: Bus[] }) {
  const [buses, setBuses] = useState<Bus[]>(initialData);
  
  // Estados Modal CRUD
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    placa: "",
    marca: "",
    capacidad: 40,
    pisos: 1,
    asientos_piso_1: 40,
    imagenes: "",
  });

  // Estados Modal Configuración Asientos
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [restrictedSeats, setRestrictedSeats] = useState<number[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // === HANDLERS CRUD ===
  const handleOpenModal = (bus?: Bus) => {
    setError(null);
    if (bus) {
      setEditingId(bus.id);
      setFormData({
        placa: bus.placa,
        marca: bus.marca || "",
        capacidad: bus.capacidad,
        pisos: bus.pisos,
        asientos_piso_1: bus.asientos_piso_1 || bus.capacidad,
        imagenes: bus.imagenes || "",
      });
    } else {
      setEditingId(null);
      setFormData({ placa: "", marca: "", capacidad: 40, pisos: 1, asientos_piso_1: 40, imagenes: "" });
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

    // Ajustar asientos piso 1 si es de 1 piso
    const submitData = {
      ...formData,
      asientos_piso_1: formData.pisos === 1 ? formData.capacidad : formData.asientos_piso_1
    };

    if (submitData.asientos_piso_1 > submitData.capacidad) {
      setError("Los asientos del piso 1 no pueden ser mayores a la capacidad total.");
      setIsLoading(false);
      return;
    }

    try {
      if (editingId) {
        const res = await actualizarBus(editingId, submitData);
        if (res.success) {
          setBuses((prev) =>
            prev.map((b) => (b.id === editingId ? { ...b, ...res.data } : b))
          );
          handleCloseModal();
        } else {
          setError(res.error || "Error al actualizar bus");
        }
      } else {
        const res = await crearBus(submitData);
        if (res.success) {
          setBuses([res.data, ...buses]);
          handleCloseModal();
        } else {
          setError(res.error || "Error al crear bus");
        }
      }
    } catch (err) {
      setError("Error inesperado de red.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este bus?")) return;

    try {
      const res = await eliminarBus(id);
      if (res.success) {
        setBuses((prev) => prev.filter((b) => b.id !== id));
      } else {
        alert(res.error || "Error al eliminar bus");
      }
    } catch (err) {
      alert("Error inesperado al intentar eliminar.");
    }
  };

  // === HANDLERS CONFIGURACIÓN ASIENTOS ===
  const handleOpenConfig = (bus: Bus) => {
    setSelectedBus(bus);
    if (bus.asientos_restringidos) {
      try {
        setRestrictedSeats(JSON.parse(bus.asientos_restringidos));
      } catch {
        setRestrictedSeats([]);
      }
    } else {
      setRestrictedSeats([]);
    }
    setIsConfigModalOpen(true);
  };

  const handleCloseConfig = () => {
    setIsConfigModalOpen(false);
    setSelectedBus(null);
  };

  const toggleSeat = (seatNum: number) => {
    setRestrictedSeats(prev => 
      prev.includes(seatNum) 
        ? prev.filter(s => s !== seatNum)
        : [...prev, seatNum]
    );
  };

  const handleSaveConfig = async () => {
    if (!selectedBus) return;
    setIsLoading(true);

    try {
      const res = await actualizarBus(selectedBus.id, {
        placa: selectedBus.placa,
        marca: selectedBus.marca || "",
        capacidad: selectedBus.capacidad,
        pisos: selectedBus.pisos,
        asientos_piso_1: selectedBus.asientos_piso_1 || selectedBus.capacidad,
        asientos_restringidos: JSON.stringify(restrictedSeats)
      });

      if (res.success) {
        setBuses((prev) =>
          prev.map((b) => (b.id === selectedBus.id ? { ...b, ...res.data } : b))
        );
        handleCloseConfig();
      } else {
        alert(res.error || "Error al guardar configuración");
      }
    } catch (err) {
      alert("Error de red inesperado.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#f07639] to-[#d45a1f] flex items-center justify-center text-white shadow-lg shadow-[#f07639]/20">
            <BusIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Gestión de Buses</h2>
            <p className="text-[12px] text-slate-400 font-medium">Flota de vehículos, capacidades y configuración de asientos.</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-gradient-to-r from-[#f07639] to-[#d45a1f] hover:from-[#e06528] hover:to-[#c7551d] text-white px-5 py-2.5 rounded-xl font-bold text-[13px] flex items-center shadow-lg shadow-[#f07639]/15 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#f07639]/25"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Bus
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8f9fc] border-b border-slate-100">
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Placa</th>
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Marca</th>
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">Capacidad</th>
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">Pisos</th>
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {buses.length > 0 ? (
                buses.map((bus) => (
                  <tr key={bus.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-4">
                          <Hash className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-gray-900">{bus.placa.toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">
                      {bus.marca || "-"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {bus.capacidad} Asientos
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600 font-medium">
                      <div className="flex flex-col items-center justify-center">
                        <div className="flex items-center">
                          <Box className="w-4 h-4 mr-1 text-gray-400" />
                          {bus.pisos}
                        </div>
                        {bus.pisos === 2 && (
                          <span className="text-[10px] text-gray-400 mt-1">
                            P1: {bus.asientos_piso_1} / P2: {bus.capacidad - (bus.asientos_piso_1 || 0)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenConfig(bus)}
                        className="inline-flex items-center px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors mr-2"
                        title="Configurar Asientos"
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Configurar
                      </button>
                      <button
                        onClick={() => handleOpenModal(bus)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-5 h-5 inline-block" />
                      </button>
                      <button
                        onClick={() => handleDelete(bus.id)}
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
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No hay buses registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Formulario Bus */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? "Editar Bus" : "Nuevo Bus"}
              </h3>
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
                    Placa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={formData.placa}
                    onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all uppercase"
                    placeholder="Ej. ABC-123"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all"
                    placeholder="Ej. Mercedes-Benz"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capacidad Total <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={formData.capacidad}
                      onChange={(e) => {
                        const cap = parseInt(e.target.value) || 0;
                        setFormData({ 
                          ...formData, 
                          capacidad: cap,
                          asientos_piso_1: formData.pisos === 1 ? cap : formData.asientos_piso_1
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pisos <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.pisos}
                      onChange={(e) => setFormData({ ...formData, pisos: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all bg-white"
                    >
                      <option value={1}>1 Piso</option>
                      <option value={2}>2 Pisos</option>
                    </select>
                  </div>
                </div>

                {formData.pisos === 2 && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Asientos en el Piso 1 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={formData.capacidad - 1}
                      value={formData.asientos_piso_1}
                      onChange={(e) => setFormData({ ...formData, asientos_piso_1: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      El Piso 2 tendrá automáticamente {Math.max(0, formData.capacidad - formData.asientos_piso_1)} asientos.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Imágenes del Bus (Rutas o URLs)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.imagenes || ""}
                    onChange={(e) => setFormData({ ...formData, imagenes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all"
                    placeholder="Ej. /images/buses/bus1.jpg, /images/buses/bus2.jpg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Separa múltiples rutas con comas.
                  </p>
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

      {/* Modal Configuración de Asientos (Cuadrícula) */}
      {isConfigModalOpen && selectedBus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Configurar Asientos - Bus {selectedBus.placa}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Selecciona los asientos dañados o restringidos (en rojo) para evitar su venta.</p>
              </div>
              <button
                onClick={handleCloseConfig}
                className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex gap-8 justify-center">
                {/* Piso 1 */}
                <div className="flex flex-col items-center">
                  <h4 className="font-bold text-gray-700 mb-4 border-b-2 border-[#f07639] pb-1">Piso 1</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: selectedBus.asientos_piso_1 || selectedBus.capacidad }).map((_, i) => {
                      const num = i + 1;
                      const isRestricted = restrictedSeats.includes(num);
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => toggleSeat(num)}
                          className={`w-10 h-10 rounded-lg text-sm font-bold flex items-center justify-center transition-all border-2
                            ${isRestricted 
                              ? 'bg-red-100 border-red-500 text-red-700' 
                              : 'bg-white border-gray-300 text-gray-700 hover:border-[#f07639] hover:text-[#f07639]'
                            }
                          `}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Piso 2 */}
                {selectedBus.pisos === 2 && (
                  <div className="flex flex-col items-center">
                    <h4 className="font-bold text-gray-700 mb-4 border-b-2 border-[#f07639] pb-1">Piso 2</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from({ length: selectedBus.capacidad - (selectedBus.asientos_piso_1 || 0) }).map((_, i) => {
                        const num = (selectedBus.asientos_piso_1 || 0) + i + 1;
                        const isRestricted = restrictedSeats.includes(num);
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => toggleSeat(num)}
                            className={`w-10 h-10 rounded-lg text-sm font-bold flex items-center justify-center transition-all border-2
                              ${isRestricted 
                                ? 'bg-red-100 border-red-500 text-red-700' 
                                : 'bg-white border-gray-300 text-gray-700 hover:border-[#f07639] hover:text-[#f07639]'
                              }
                            `}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-xs text-gray-600">
                  <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded mr-2"></div>
                  Disponible
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <div className="w-4 h-4 bg-red-100 border-2 border-red-500 rounded mr-2"></div>
                  Restringido/Dañado
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleCloseConfig}
                  className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={isLoading}
                  className="bg-[#f07639] hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {isLoading ? "Guardando..." : "Guardar Configuración"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
