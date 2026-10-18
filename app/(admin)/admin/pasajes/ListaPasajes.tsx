"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, MapPin, Calendar, User, Ticket, Loader2, Eye, X, QrCode, RotateCcw, Edit } from "lucide-react";
import QRCode from "qrcode";
import { buscarPasajesVendidos, editarPasaje } from "../../actions/pasajes";

type Sucursal = { id: string; nombre: string };

export default function ListaPasajes({ sucursales }: { sucursales: Sucursal[] }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  const [origenId, setOrigenId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [fecha, setFecha] = useState("");
  const [dni, setDni] = useState("");
  
  const [pasajes, setPasajes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Modal state
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  // Estados para Modal de Edición
  const [editingTicket, setEditingTicket] = useState<any | null>(null);
  const [editNombres, setEditNombres] = useState("");
  const [editApellidos, setEditApellidos] = useState("");
  const [editDni, setEditDni] = useState("");
  const [editTelefono, setEditTelefono] = useState("");
  const [editPrecio, setEditPrecio] = useState("0");
  const [isEditing, setIsEditing] = useState(false);

  const handleOpenEdit = (ticket: any) => {
    setEditingTicket(ticket);
    setEditNombres(ticket.pasajero.nombres);
    setEditApellidos(ticket.pasajero.apellidos);
    setEditDni(ticket.pasajero.dni);
    setEditTelefono(ticket.pasajero.telefono || "");
    setEditPrecio(ticket.precio.toString());
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket) return;
    if (!editNombres || !editApellidos || !editDni) {
      alert("Nombres, Apellidos y DNI son campos obligatorios.");
      return;
    }

    setIsEditing(true);
    try {
      const res = await editarPasaje({
        pasaje_id: editingTicket.id,
        nombres: editNombres,
        apellidos: editApellidos,
        dni: editDni,
        telefono: editTelefono || undefined,
        precio: parseFloat(editPrecio)
      });

      if (res.success) {
        setEditingTicket(null);
        handleSearch();
      } else {
        alert(res.error || "Ocurrió un error al editar el pasaje.");
      }
    } catch (err) {
      alert("Error de red. Inténtalo de nuevo.");
    } finally {
      setIsEditing(false);
    }
  };

  useEffect(() => {
    if (selectedTicket?.codigo_qr) {
      QRCode.toDataURL(selectedTicket.codigo_qr, { width: 150, margin: 1, color: { dark: '#f07639', light: '#0000' } })
        .then(url => setQrCodeUrl(url))
        .catch(e => console.error(e));
    } else {
      setQrCodeUrl("");
    }
  }, [selectedTicket]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setHasSearched(true);
    
    const filtros = {
      origenId: origenId || undefined,
      destinoId: destinoId || undefined,
      fecha: fecha || undefined,
      dni: dni || undefined
    };

    const res = await buscarPasajesVendidos(filtros);
    if (res.success) {
      setPasajes(res.data);
    } else {
      alert("Error al cargar los pasajes");
    }
    setLoading(false);
  };

  const handleLimpiar = async () => {
    setOrigenId("");
    setDestinoId("");
    setFecha("");
    setDni("");
    setLoading(true);
    setHasSearched(true);
    
    const res = await buscarPasajesVendidos({});
    if (res.success) {
      setPasajes(res.data);
    } else {
      alert("Error al cargar los pasajes");
    }
    setLoading(false);
  };

  // Cargar pasajes recientes al montar
  useEffect(() => {
    handleSearch();
  }, []);

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {/* Barra de Filtros */}
      <div className="p-4 border-b border-slate-100 bg-[#f8f9fc] flex-shrink-0">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5 pl-1">DNI Pasajero</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={dni} onChange={(e) => setDni(e.target.value)}
                placeholder="Buscar DNI..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-xl focus:border-[#f07639]/30 text-[13px] font-semibold text-slate-700 placeholder-slate-400 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5 pl-1">Origen</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select 
                value={origenId} onChange={(e) => setOrigenId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-xl focus:border-[#f07639]/30 text-[13px] font-semibold text-slate-700 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">Todos</option>
                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          </div>
          
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5 pl-1">Destino</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select 
                value={destinoId} onChange={(e) => setDestinoId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-xl focus:border-[#f07639]/30 text-[13px] font-semibold text-slate-700 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">Todos</option>
                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5 pl-1">Fecha de Viaje</label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="date"
                value={fecha} onChange={(e) => setFecha(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-xl focus:border-[#f07639]/30 text-[13px] font-semibold text-slate-700 outline-none transition-all cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-[#f07639] to-[#d45a1f] hover:from-[#e06528] hover:to-[#c7551d] text-white px-6 py-2.5 rounded-xl font-bold text-[13px] transition-all flex items-center shadow-lg shadow-[#f07639]/15 hover:-translate-y-0.5 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              {loading ? "Buscando" : "Buscar"}
            </button>

            <button 
              type="button"
              onClick={handleLimpiar}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-200/60 text-slate-500 px-3 py-2.5 rounded-xl font-bold transition-all hover:-translate-y-0.5 flex items-center justify-center cursor-pointer shadow-sm"
              title="Limpiar filtros y restablecer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Tabla de Resultados */}
      <div className="flex-1 overflow-auto p-4 bg-[#f8f9fc]">
        {loading && pasajes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#f07639] mb-2" />
            <p className="text-sm font-medium">Cargando pasajes...</p>
          </div>
        ) : pasajes.length === 0 && hasSearched ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
            <Ticket className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm font-medium">No se encontraron pasajes con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Pasajero</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">DNI</th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Asiento</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ruta</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha Salida</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Precio</th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {pasajes.map((p) => {
                  const ruta = p.asiento_viaje?.viaje?.ruta;
                  const viaje = p.asiento_viaje?.viaje;
                  
                  return (
                    <tr key={p.id} className="hover:bg-orange-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center text-[#f07639] font-bold text-xs">
                            {p.pasajero.nombres.charAt(0)}{p.pasajero.apellidos.charAt(0)}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-bold text-gray-900">{p.pasajero.nombres}</div>
                            <div className="text-xs text-gray-500">{p.pasajero.apellidos}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                        {p.pasajero.dni}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-black bg-gray-900 text-white">
                          #{p.asiento_viaje?.numero_asiento}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{ruta?.origen?.nombre}</div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <span className="text-[#f07639] mr-1">→</span> {ruta?.destino?.nombre}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">
                          {viaje?.fecha_salida ? new Date(viaje.fecha_salida).toLocaleDateString() : '-'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {viaje?.fecha_salida ? new Date(viaje.fecha_salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-black text-[#f07639]">
                        S/ {Number(p.precio).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedTicket(p)}
                            className="inline-flex items-center p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-[#f07639] hover:text-white hover:border-[#f07639] transition-colors cursor-pointer"
                            title="Ver Detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="inline-flex items-center p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors cursor-pointer"
                            title="Editar Pasaje"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalle del Ticket */}
      {mounted && selectedTicket && createPortal(
        <div 
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedTicket(null);
            }
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header decorativo */}
            <div className="bg-gray-900 p-6 text-white text-center relative">
              <button 
                onClick={() => setSelectedTicket(null)}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <Ticket className="w-10 h-10 mx-auto text-[#f07639] mb-2" />
              <h2 className="text-xl font-black tracking-widest uppercase">Boleto Electrónico</h2>
              <p className="text-gray-400 text-xs mt-1 font-mono">{selectedTicket.codigo_qr}</p>
            </div>
            
            {/* Cuerpo del Ticket */}
            <div className="p-8">
              <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Pasajero</p>
                  <p className="font-bold text-gray-900 text-lg leading-tight">{selectedTicket.pasajero.nombres} {selectedTicket.pasajero.apellidos}</p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">DNI: {selectedTicket.pasajero.dni} {selectedTicket.pasajero.telefono ? `| Cel: ${selectedTicket.pasajero.telefono}` : ''}</p>
                </div>
                <div className="bg-orange-50 text-[#f07639] rounded-xl px-4 py-2 text-center border border-orange-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5">Asiento</p>
                  <p className="text-2xl font-black leading-none">#{selectedTicket.asiento_viaje.numero_asiento}</p>
                  <p className="text-[10px] font-bold mt-1 text-orange-600">Piso {selectedTicket.asiento_viaje.piso}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Ruta</p>
                  <p className="font-bold text-gray-900 text-sm">{selectedTicket.asiento_viaje.viaje.ruta.origen.nombre}</p>
                  <p className="text-xs text-[#f07639] font-black my-0.5">↓</p>
                  <p className="font-bold text-gray-900 text-sm">{selectedTicket.asiento_viaje.viaje.ruta.destino.nombre}</p>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-3">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Fecha y Hora</p>
                    <p className="font-bold text-gray-900 text-sm">
                      {new Date(selectedTicket.asiento_viaje.viaje.fecha_salida).toLocaleDateString()}
                    </p>
                    <p className="text-xs font-bold text-gray-500">
                      {new Date(selectedTicket.asiento_viaje.viaje.fecha_salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Bus</p>
                    <p className="text-xs font-bold text-gray-900">{selectedTicket.asiento_viaje.viaje.bus.placa}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-200 pt-6 flex justify-between items-center">
                <div className="flex items-center justify-center text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-sm">
                   {qrCodeUrl ? (
                     <img src={qrCodeUrl} alt="QR" className="w-24 h-24 sm:w-28 sm:h-28 object-contain mix-blend-multiply" />
                   ) : (
                     <QrCode className="w-16 h-16" />
                   )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Precio Final</p>
                  <p className="text-3xl font-black text-[#f07639]">S/ {Number(selectedTicket.precio).toFixed(2)}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Comprado: {new Date(selectedTicket.fecha_compra).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Edición de Pasaje */}
      {mounted && editingTicket && createPortal(
        <div 
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setEditingTicket(null);
            }
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header del Modal */}
            <div className="bg-blue-600 p-6 text-white text-center relative">
              <button 
                type="button"
                onClick={() => setEditingTicket(null)}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <Edit className="w-10 h-10 mx-auto text-blue-200 mb-2 animate-pulse" />
              <h2 className="text-xl font-black tracking-widest uppercase">Editar Boleto</h2>
              <p className="text-blue-100 text-xs mt-1 font-semibold">
                Asiento #${editingTicket.asiento_viaje.numero_asiento} (Piso {editingTicket.asiento_viaje.piso})
              </p>
            </div>
            
            {/* Formulario */}
            <form onSubmit={handleSaveEdit} className="p-8 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5 pl-1">DNI Pasajero</label>
                <input 
                  type="text" 
                  value={editDni} 
                  onChange={(e) => setEditDni(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100/50 focus:bg-white focus:border-blue-500 rounded-xl outline-none font-bold text-slate-700 transition-all text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5 pl-1">Nombres</label>
                  <input 
                    type="text" 
                    value={editNombres} 
                    onChange={(e) => setEditNombres(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100/50 focus:bg-white focus:border-blue-500 rounded-xl outline-none font-bold text-slate-700 transition-all text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5 pl-1">Apellidos</label>
                  <input 
                    type="text" 
                    value={editApellidos} 
                    onChange={(e) => setEditApellidos(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100/50 focus:bg-white focus:border-blue-500 rounded-xl outline-none font-bold text-slate-700 transition-all text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5 pl-1">Teléfono (Opcional)</label>
                <input 
                  type="text" 
                  value={editTelefono} 
                  onChange={(e) => setEditTelefono(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100/50 focus:bg-white focus:border-blue-500 rounded-xl outline-none font-bold text-slate-700 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5 pl-1">Precio Cobrado (S/)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={editPrecio} 
                  onChange={(e) => setEditPrecio(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100/50 focus:bg-white focus:border-blue-500 rounded-xl outline-none font-black text-slate-700 transition-all text-base text-blue-600"
                  required
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTicket(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl font-bold transition-all text-sm cursor-pointer border border-slate-200/60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all text-sm cursor-pointer shadow-lg shadow-blue-500/15 flex items-center justify-center gap-1.5"
                >
                  {isEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isEditing ? "Guardando" : "Guardar Cambios"}
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
