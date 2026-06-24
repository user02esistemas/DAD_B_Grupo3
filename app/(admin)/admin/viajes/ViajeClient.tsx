"use client";

import { useState } from "react";
import { Plus, XCircle, Calendar, Hash, MapPin, Bus as BusIcon } from "lucide-react";
import { crearViajeConAsientos, cancelarViaje } from "../../actions/viajes";

type Ruta = {
  id: string;
  origen: { nombre: string };
  destino: { nombre: string };
};

type Bus = {
  id: string;
  placa: string;
  capacidad: number;
  pisos: number;
};

type Viaje = {
  id: string;
  ruta_id: string;
  bus_id: string;
  fecha_salida: string;
  fecha_llegada: string | null;
  estado: string;
  ruta: Ruta;
  bus: Bus;
};

export default function ViajeClient({ 
  initialViajes, 
  rutas, 
  buses 
}: { 
  initialViajes: Viaje[], 
  rutas: Ruta[], 
  buses: Bus[] 
}) {
  const [viajes, setViajes] = useState<Viaje[]>(initialViajes);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    ruta_id: "",
    bus_id: "",
    fecha_salida: "",
    fecha_llegada: "",
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenModal = () => {
    setError(null);
    setFormData({
      ruta_id: rutas.length > 0 ? rutas[0].id : "",
      bus_id: buses.length > 0 ? buses[0].id : "",
      fecha_salida: "",
      fecha_llegada: "",
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
      const res = await crearViajeConAsientos(formData);
      if (res.success) {
        // Obtenemos relaciones para UI
        const rutaSel = rutas.find(r => r.id === formData.ruta_id)!;
        const busSel = buses.find(b => b.id === formData.bus_id)!;
        
        const nuevoViaje = {
          ...res.data,
          ruta: rutaSel,
          bus: busSel
        };

        setViajes([nuevoViaje, ...viajes]);
        handleCloseModal();
      } else {
        setError(res.error || "Error al programar viaje");
      }
    } catch (err) {
      setError("Error inesperado de red.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas cancelar este viaje?")) return;

    try {
      const res = await cancelarViaje(id);
      if (res.success) {
        setViajes((prev) => 
          prev.map((v) => v.id === id ? { ...v, estado: "cancelado" } : v)
        );
      } else {
        alert(res.error || "Error al cancelar viaje");
      }
    } catch (err) {
      alert("Error inesperado al intentar cancelar.");
    }
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'programado':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold uppercase tracking-wider">Programado</span>;
      case 'en_ruta':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold uppercase tracking-wider">En Ruta</span>;
      case 'completado':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold uppercase tracking-wider">Completado</span>;
      case 'cancelado':
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold uppercase tracking-wider">Cancelado</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-bold uppercase tracking-wider">{estado}</span>;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Programación de Viajes</h2>
          <p className="mt-1 text-sm text-gray-500">
            Crea viajes, asigna buses y genera automáticamente el mapa de asientos.
          </p>
        </div>
        <button
          onClick={handleOpenModal}
          className="bg-[#f07639] hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-medium flex items-center shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Programar Viaje
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Ruta</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Salida</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Bus Asignado</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900 text-center">Estado</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {viajes.length > 0 ? (
                viajes.map((viaje) => (
                  <tr key={viaje.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <p className="font-bold text-gray-900">
                            {viaje.ruta.origen.nombre} a {viaje.ruta.destino.nombre}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span className="font-medium">
                          {new Date(viaje.fecha_salida).toLocaleString('es-PE', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center font-bold text-gray-900">
                          <BusIcon className="w-4 h-4 mr-2 text-gray-500" />
                          {viaje.bus.placa}
                        </div>
                        <span className="text-xs text-gray-500 ml-6">
                          Capacidad: {viaje.bus.capacidad} | Pisos: {viaje.bus.pisos}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(viaje.estado)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {viaje.estado === 'programado' && (
                        <button
                          onClick={() => handleCancel(viaje.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Cancelar Viaje"
                        >
                          <XCircle className="w-6 h-6 inline-block" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No hay viajes programados.
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Programar Nuevo Viaje</h3>
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
                    Ruta <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.ruta_id}
                    onChange={(e) => setFormData({ ...formData, ruta_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all bg-white"
                  >
                    <option value="" disabled>Seleccione ruta</option>
                    {rutas.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.origen.nombre} → {r.destino.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bus Asignado <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.bus_id}
                    onChange={(e) => setFormData({ ...formData, bus_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all bg-white"
                  >
                    <option value="" disabled>Seleccione bus</option>
                    {buses.map(b => (
                      <option key={b.id} value={b.id}>
                        Placa: {b.placa} | Asientos: {b.capacidad} | Pisos: {b.pisos}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha y Hora de Salida <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.fecha_salida}
                      onChange={(e) => setFormData({ ...formData, fecha_salida: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha y Hora de Llegada
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.fecha_llegada}
                      onChange={(e) => setFormData({ ...formData, fecha_llegada: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-2">
                  <p className="text-xs text-blue-800">
                    <strong>Nota:</strong> Al crear este viaje, se generará automáticamente el mapa de asientos en base a la capacidad y pisos del bus seleccionado. Esta acción es irreversible mediante UI.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
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
                  {isLoading ? "Programando..." : "Programar Viaje"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
