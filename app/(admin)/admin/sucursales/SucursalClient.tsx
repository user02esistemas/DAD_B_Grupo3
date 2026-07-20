"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Edit2, Trash2, MapPin, Building } from "lucide-react";
import { crearSucursal, actualizarSucursal, eliminarSucursal } from "../../actions/sucursales";

type Sucursal = {
  id: string;
  nombre: string;
  direccion: string | null;
  created_at?: string;
  updated_at?: string;
};

export default function SucursalClient({ initialData }: { initialData: Sucursal[] }) {
  const [sucursales, setSucursales] = useState<Sucursal[]>(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nombre: "", direccion: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenModal = (sucursal?: Sucursal) => {
    setError(null);
    if (sucursal) {
      setEditingId(sucursal.id);
      setFormData({
        nombre: sucursal.nombre,
        direccion: sucursal.direccion || "",
      });
    } else {
      setEditingId(null);
      setFormData({ nombre: "", direccion: "" });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ nombre: "", direccion: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (formData.nombre.trim().length < 3 || formData.nombre.trim().length > 100) {
      setError("El nombre de la sucursal debe tener entre 3 y 100 caracteres.");
      setIsLoading(false);
      return;
    }

    if (!/^[A-Za-z0-9ÁÉÍÓÚáéíóúÑñ\s\-\.\,\#\°]+$/.test(formData.nombre)) {
      setError("El nombre contiene caracteres no permitidos (solo letras, números, espacios y signos básicos).");
      setIsLoading(false);
      return;
    }

    if (formData.nombre.split(/[\s\-]+/).some(word => word.length > 30)) {
      setError("El nombre contiene palabras demasiado largas (máximo 30 caracteres).");
      setIsLoading(false);
      return;
    }

    if (formData.direccion) {
      if (formData.direccion.trim().length > 200) {
        setError("La dirección no puede superar los 200 caracteres.");
        setIsLoading(false);
        return;
      }
      if (!/^[A-Za-z0-9ÁÉÍÓÚáéíóúÑñ\s\-\.\,\#\°\'\/]*$/.test(formData.direccion)) {
        setError("La dirección contiene caracteres no permitidos.");
        setIsLoading(false);
        return;
      }
      if (formData.direccion.split(/[\s\-]+/).some(word => word.length > 30)) {
        setError("La dirección contiene palabras demasiado largas (máximo 30 caracteres).");
        setIsLoading(false);
        return;
      }
    }

    try {
      if (editingId) {
        const res = await actualizarSucursal(editingId, formData);
        if (res.success) {
          // Actualizamos estado local optimísticamente
          setSucursales((prev) =>
            prev.map((s) => (s.id === editingId ? { ...s, ...res.data } : s))
          );
          handleCloseModal();
        } else {
          setError(res.error || "Error al actualizar sucursal");
        }
      } else {
        const res = await crearSucursal(formData);
        if (res.success) {
          setSucursales([res.data, ...sucursales]);
          handleCloseModal();
        } else {
          setError(res.error || "Error al crear sucursal");
        }
      }
    } catch (err) {
      setError("Error inesperado de red.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta sucursal?")) return;

    try {
      const res = await eliminarSucursal(id);
      if (res.success) {
        setSucursales((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert(res.error || "Error al eliminar sucursal");
      }
    } catch (err) {
      alert("Error inesperado al intentar eliminar.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#f07639] to-[#d45a1f] flex items-center justify-center text-white shadow-lg shadow-[#f07639]/20">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Gestión de Sucursales</h2>
            <p className="text-[12px] text-slate-400 font-medium">Sedes y puntos de venta de la empresa.</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-gradient-to-r from-[#f07639] to-[#d45a1f] hover:from-[#e06528] hover:to-[#c7551d] text-white px-5 py-2.5 rounded-xl font-bold text-[13px] flex items-center shadow-lg shadow-[#f07639]/15 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#f07639]/25"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Sucursal
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8f9fc] border-b border-slate-100">
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Dirección</th>
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sucursales.length > 0 ? (
                sucursales.map((sucursal) => (
                  <tr key={sucursal.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-orange-100 text-[#f07639] flex items-center justify-center mr-4">
                          <Building className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-gray-900">{sucursal.nombre}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        {sucursal.direccion || <span className="text-gray-400 italic">No especificada</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button
                        onClick={() => handleOpenModal(sucursal)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-5 h-5 inline-block" />
                      </button>
                      <button
                        onClick={() => handleDelete(sucursal.id)}
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
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    No hay sucursales registradas.
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
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? "Editar Sucursal" : "Nueva Sucursal"}
              </h3>
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
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all"
                    placeholder="Ej. Sede Trujillo Centro"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all"
                    placeholder="Ej. Av. España 123"
                  />
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
                  {isLoading ? "Guardando..." : "Guardar"}
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
