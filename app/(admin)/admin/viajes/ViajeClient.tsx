"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, XCircle, Pencil, Calendar, Hash, MapPin, Bus as BusIcon, Search } from "lucide-react";
import { crearViajeConAsientos, cancelarViaje, actualizarViaje } from "../../actions/viajes";

type Ruta = {
  id: string;
  origen: { nombre: string };
  destino: { nombre: string };
  duracion_estimada_minutos: number;
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
  conductor_id?: string | null;
  fecha_salida: string;
  fecha_llegada: string | null;
  estado: string;
  ruta: Ruta;
  bus: Bus;
};

type Conductor = {
  id: string;
  nombres: string;
  apellidos: string;
};

export default function ViajeClient({ 
  initialViajes, 
  rutas, 
  buses,
  conductores
}: { 
  initialViajes: Viaje[], 
  rutas: Ruta[], 
  buses: Bus[],
  conductores: Conductor[]
}) {
  const [viajes, setViajes] = useState<Viaje[]>(initialViajes);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [periodo, setPeriodo] = useState("actuales"); // "actuales" | "todos"
  const [estadoFiltro, setEstadoFiltro] = useState("todos"); // "todos" | "programado" | "en_ruta" | ...
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [editingViajeId, setEditingViajeId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const [formData, setFormData] = useState({
    ruta_id: "",
    bus_id: "",
    conductor_id: "",
  });
  
  const [fechaSalidaDate, setFechaSalidaDate] = useState("");
  const [fechaSalidaTime, setFechaSalidaTime] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenForm = () => {
    setError(null);
    setFormData({
      ruta_id: rutas.length > 0 ? rutas[0].id : "",
      bus_id: buses.length > 0 ? buses[0].id : "",
      conductor_id: "",
    });
    setFechaSalidaDate("");
    setFechaSalidaTime("");
    setEditingViajeId(null);
    setIsFormOpen(true);
  };

  const handleEditForm = (viaje: Viaje) => {
    setError(null);
    setFormData({
      ruta_id: viaje.ruta_id,
      bus_id: viaje.bus_id,
      conductor_id: viaje.conductor_id || "",
    });
    
    // Convertir la fecha UTC del servidor a local para los inputs de tipo date y time
    const departure = new Date(viaje.fecha_salida);
    const year = departure.getFullYear();
    const month = String(departure.getMonth() + 1).padStart(2, '0');
    const day = String(departure.getDate()).padStart(2, '0');
    const hours = String(departure.getHours()).padStart(2, '0');
    const minutes = String(departure.getMinutes()).padStart(2, '0');

    setFechaSalidaDate(`${year}-${month}-${day}`);
    setFechaSalidaTime(`${hours}:${minutes}`);
    
    setEditingViajeId(viaje.id);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!fechaSalidaDate || !fechaSalidaTime) {
        setError("Debe especificar la fecha y hora de salida.");
        setIsLoading(false);
        return;
      }

      // Calcular automáticamente la hora de llegada en base a la duración de la ruta
      const rutaSel = rutas.find(r => r.id.toString() === formData.ruta_id.toString());
      const duration = rutaSel ? rutaSel.duracion_estimada_minutos : 0;
      const departureDateTime = new Date(`${fechaSalidaDate}T${fechaSalidaTime}`);
      const arrivalDateTime = new Date(departureDateTime.getTime() + duration * 60 * 1000);

      const payload = {
        ...formData,
        fecha_salida: `${fechaSalidaDate}T${fechaSalidaTime}`,
        fecha_llegada: arrivalDateTime.toISOString(),
      };

      if (editingViajeId) {
        const res = await actualizarViaje(editingViajeId, payload);
        if (res.success) {
          setViajes((prev) =>
            prev.map((v) => (v.id === editingViajeId ? res.data : v))
          );
          handleCloseForm();
        } else {
          setError(res.error || "Error al actualizar viaje");
        }
      } else {
        const res = await crearViajeConAsientos(payload);
        if (res.success) {
          // Obtenemos relaciones para UI
          const rutaSel = rutas.find(r => r.id.toString() === formData.ruta_id.toString())!;
          const busSel = buses.find(b => b.id.toString() === formData.bus_id.toString())!;
          
          const nuevoViaje = {
            ...res.data,
            ruta: rutaSel,
            bus: busSel
          };

          setViajes([nuevoViaje, ...viajes]);
          handleCloseForm();
        } else {
          setError(res.error || "Error al programar viaje");
        }
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
        return <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-bold uppercase tracking-wider">Programado</span>;
      case 'en_ruta':
        return <span className="px-3 py-1 bg-yellow-50 text-yellow-700 border border-yellow-100 rounded-full text-xs font-bold uppercase tracking-wider">En Ruta</span>;
      case 'completado':
        return <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-xs font-bold uppercase tracking-wider">Completado</span>;
      case 'cancelado':
        return <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-100 rounded-full text-xs font-bold uppercase tracking-wider">Cancelado</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase tracking-wider">{estado}</span>;
    }
  };

  // Lógica de filtrado de viajes
  const filteredViajes = viajes.filter((viaje) => {
    const fechaSalida = new Date(viaje.fecha_salida);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Inicio de hoy
    
    // 1. Filtro de período temporal (solo aplica si no hay un día seleccionado en el calendario)
    if (!selectedDate && periodo === "actuales") {
      if (fechaSalida < hoy) {
        return false;
      }
    }

    // 2. Filtro de día seleccionado (Calendario)
    if (selectedDate) {
      const viajeDateStr = new Date(viaje.fecha_salida).toLocaleDateString('sv-SE');
      if (viajeDateStr !== selectedDate) {
        return false;
      }
    }

    // 3. Filtro por Estado
    if (estadoFiltro !== "todos" && viaje.estado !== estadoFiltro) {
      return false;
    }

    // 4. Filtro de texto (ruta, placa)
    const searchString = `${viaje.ruta.origen.nombre} ${viaje.ruta.destino.nombre} ${viaje.bus.placa}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#f07639] to-[#d45a1f] flex items-center justify-center text-white shadow-lg shadow-[#f07639]/20">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Programación de Viajes</h2>
            <p className="text-[12px] text-slate-400 font-medium">Crea viajes, asigna buses y genera el mapa de asientos.</p>
          </div>
        </div>
        <button
          onClick={handleOpenForm}
          className="bg-gradient-to-r from-[#f07639] to-[#d45a1f] hover:from-[#e06528] hover:to-[#c7551d] text-white px-5 py-2.5 rounded-xl font-bold text-[13px] flex items-center shadow-lg shadow-[#f07639]/15 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#f07639]/25"
        >
          <Plus className="w-4 h-4 mr-2" />
          Programar Viaje
        </button>
      </div>
      
      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Buscador de Texto */}
          <div className="relative flex-1 max-w-xs min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar por ruta o bus..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#f8f9fc] border border-slate-200/60 focus:border-[#f07639]/30 rounded-xl focus:bg-white text-[13px] font-semibold text-slate-700 placeholder-slate-400 outline-none transition-all"
            />
          </div>

          {/* Filtro por Calendario */}
          <div className="relative min-w-[170px]">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-[#f8f9fc] border border-slate-200/60 focus:border-[#f07639]/30 rounded-xl focus:bg-white text-[13px] font-semibold text-slate-700 cursor-pointer outline-none transition-all"
            />
            {selectedDate && (
              <button 
                onClick={() => setSelectedDate("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 font-bold text-sm leading-none bg-slate-200 hover:bg-slate-300 w-5 h-5 rounded-full flex items-center justify-center transition-colors"
                title="Mostrar todos los días"
              >
                &times;
              </button>
            )}
          </div>

          {/* Filtro por Período */}
          <div className="min-w-[160px]">
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#f8f9fc] border border-slate-200/60 focus:border-[#f07639]/30 rounded-xl focus:bg-white text-[13px] font-semibold text-slate-700 cursor-pointer outline-none transition-all appearance-none"
            >
              <option value="actuales">Actuales y futuros</option>
              <option value="todos">Todos los viajes</option>
            </select>
          </div>

          {/* Filtro por Estado */}
          <div className="min-w-[150px]">
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#f8f9fc] border border-slate-200/60 focus:border-[#f07639]/30 rounded-xl focus:bg-white text-[13px] font-semibold text-slate-700 cursor-pointer outline-none transition-all appearance-none"
            >
              <option value="todos">Todos los estados</option>
              <option value="programado">Programados</option>
              <option value="en_ruta">En Ruta</option>
              <option value="completado">Completados</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8f9fc] border-b border-slate-100">
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Ruta</th>
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Salida</th>
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Llegada</th>
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Bus Asignado</th>
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">Estado</th>
                <th className="px-6 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredViajes.length > 0 ? (
                filteredViajes.map((viaje) => (
                  <tr key={viaje.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <MapPin className="w-5 h-5 text-slate-400 mr-3" />
                        <div>
                          <p className="font-bold text-slate-800">
                            {viaje.ruta.origen.nombre} a {viaje.ruta.destino.nombre}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-slate-600">
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
                      <div className="flex items-center text-slate-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span className="font-medium">
                          {viaje.fecha_llegada ? new Date(viaje.fecha_llegada).toLocaleString('es-PE', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          }) : "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center font-bold text-slate-800">
                          <BusIcon className="w-4 h-4 mr-2 text-slate-400" />
                          {viaje.bus.placa}
                        </div>
                        <span className="text-xs text-slate-500 ml-6">
                          Capacidad: {viaje.bus.capacidad} | Pisos: {viaje.bus.pisos}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(viaje.estado)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {viaje.estado === 'programado' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditForm(viaje)}
                            className="text-slate-400 hover:text-blue-500 transition-colors"
                            title="Editar Viaje"
                          >
                            <Pencil className="w-5 h-5 inline-block" />
                          </button>
                          <button
                            onClick={() => handleCancel(viaje.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                            title="Cancelar Viaje"
                          >
                            <XCircle className="w-5 h-5 inline-block" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No hay viajes programados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Formulario */}
      {mounted && isFormOpen && createPortal(
        <div 
          onClick={handleCloseForm}
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/40 backdrop-blur-sm flex justify-center items-start py-8 px-4 sm:px-6"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden relative my-auto p-8"
          >
            <button
              onClick={handleCloseForm}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
            >
              &times;
            </button>

            <h3 className="text-xl font-bold text-slate-800 mb-6">
              {editingViajeId ? "Editar Viaje" : "Programar Nuevo Viaje"}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-155 rounded-xl text-sm">
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
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 text-gray-800 focus:border-[#f07639] focus:ring-1 focus:ring-[#f07639] rounded-xl outline-none transition-all text-sm"
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
                  <label className="block text-sm font-medium text-gray-755 mb-1">
                    Bus Asignado <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.bus_id}
                    onChange={(e) => setFormData({ ...formData, bus_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 text-gray-800 focus:border-[#f07639] focus:ring-1 focus:ring-[#f07639] rounded-xl outline-none transition-all text-sm"
                  >
                    <option value="" disabled>Seleccione bus</option>
                    {buses.map(b => (
                      <option key={b.id} value={b.id}>
                        Placa: {b.placa} | Asientos: {b.capacidad} | Pisos: {b.pisos}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-755 mb-1">
                    Conductor Asignado
                  </label>
                  <select
                    value={formData.conductor_id}
                    onChange={(e) => setFormData({ ...formData, conductor_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 text-gray-800 focus:border-[#f07639] focus:ring-1 focus:ring-[#f07639] rounded-xl outline-none transition-all text-sm"
                  >
                    <option value="">Seleccionar conductor (opcional)</option>
                    {conductores.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombres} {c.apellidos}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100/80">
                  <label className="block text-[13px] font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                      <Calendar className="w-3 h-3" />
                    </div>
                    Salida <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
                      <input
                        type="date"
                        required
                        value={fechaSalidaDate}
                        onChange={(e) => setFechaSalidaDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 text-gray-800 focus:border-[#f07639] focus:ring-1 focus:ring-[#f07639] rounded-xl outline-none transition-all cursor-pointer shadow-sm text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Hora</label>
                      <input
                        type="time"
                        required
                        value={fechaSalidaTime}
                        onChange={(e) => setFechaSalidaTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 text-gray-800 focus:border-[#f07639] focus:ring-1 focus:ring-[#f07639] rounded-xl outline-none transition-all cursor-pointer shadow-sm text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end items-center gap-3">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-5 py-2.5 text-gray-500 hover:text-gray-700 transition-colors font-semibold text-sm rounded-xl hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#f07639] hover:bg-[#e06528] text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-[#f07639]/15 hover:shadow-lg hover:shadow-[#f07639]/25 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
                >
                  {isLoading ? "Guardando..." : (editingViajeId ? "Guardar Cambios" : "Programar Viaje")}
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
