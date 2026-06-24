"use client";

import { useState, useEffect } from "react";
import { Search, MapPin, Calendar, Clock, CreditCard, User, Tag, ChevronRight, CheckCircle2, Ticket } from "lucide-react";
import { buscarViajes, obtenerAsientosPorViaje, buscarPasajeroPorDni, venderPasaje } from "../../actions/pasajes";

type Sucursal = { id: string; nombre: string };
type Ruta = { id: string; precio_base: string };
type Viaje = { 
  id: string; 
  fecha_salida: string; 
  ruta: Ruta & { origen: Sucursal, destino: Sucursal }; 
  bus: { id: string; placa: string; capacidad: number; pisos: number; asientos_piso_1: number; asientos_restringidos: string };
  asientos_viaje: { estado: string }[];
};
type Asiento = { id: string; numero_asiento: number; piso: number; estado: string };

export default function PasajesClient({ initialSucursales }: { initialSucursales: Sucursal[] }) {
  // Buscador
  const [origenId, setOrigenId] = useState<string>("");
  const [destinoId, setDestinoId] = useState<string>("");
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Resultados Viajes
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [isLoadingViajes, setIsLoadingViajes] = useState(false);
  const [selectedViaje, setSelectedViaje] = useState<Viaje | null>(null);

  // Asientos del Viaje seleccionado
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [isLoadingAsientos, setIsLoadingAsientos] = useState(false);
  const [selectedAsiento, setSelectedAsiento] = useState<Asiento | null>(null);

  // Panel de Venta
  const [pasajero, setPasajero] = useState({ dni: "", nombres: "", apellidos: "", telefono: "" });
  const [precio, setPrecio] = useState<string>("0");
  const [isSearchingDni, setIsSearchingDni] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState(false);

  // === PASO 1: BUSCAR VIAJES ===
  const handleBuscarViajes = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!origenId || !destinoId || !fecha) return;
    
    setIsLoadingViajes(true);
    setSelectedViaje(null);
    setSelectedAsiento(null);
    const res = await buscarViajes(origenId, destinoId, fecha);
    if (res.success) {
      setViajes(res.data);
    }
    setIsLoadingViajes(false);
  };

  // === PASO 2: SELECCIONAR VIAJE Y CARGAR ASIENTOS ===
  const handleSelectViaje = async (viaje: Viaje) => {
    setSelectedViaje(viaje);
    setSelectedAsiento(null);
    setSaleSuccess(false);
    setIsLoadingAsientos(true);
    
    const res = await obtenerAsientosPorViaje(viaje.id);
    if (res.success) {
      setAsientos(res.data);
    }
    setIsLoadingAsientos(false);
  };

  // === PASO 3: SELECCIONAR ASIENTO Y PREPARAR VENTA ===
  const handleSelectAsiento = (asiento: Asiento) => {
    if (asiento.estado !== "disponible") return; // Solo permitir seleccionar disponibles
    
    setSelectedAsiento(asiento);
    setSaleSuccess(false);
    
    // Setear precio base por defecto
    if (selectedViaje) {
      setPrecio(selectedViaje.ruta.precio_base.toString());
    }
    // No reseteamos los datos del pasajero por si quiere comprar varios pasajes seguidos
  };

  // Autocompletado de DNI
  const handleDniBlur = async () => {
    if (pasajero.dni.length >= 8) {
      setIsSearchingDni(true);
      const res = await buscarPasajeroPorDni(pasajero.dni);
      if (res.success && res.data) {
        // Separar nombre asumiendo que el primer espacio divide nombres de apellidos (mejor esfuerzo)
        const partes = res.data.nombre.split(" ");
        const nombresStr = partes.slice(0, Math.ceil(partes.length / 2)).join(" ");
        const apellidosStr = partes.slice(Math.ceil(partes.length / 2)).join(" ");
        
        setPasajero(prev => ({
          ...prev,
          nombres: nombresStr,
          apellidos: apellidosStr,
          telefono: res.data.telefono || ""
        }));
      }
      setIsSearchingDni(false);
    }
  };

  // Confirmar Venta
  const handleVender = async () => {
    if (!selectedViaje || !selectedAsiento) return;
    if (!pasajero.dni || !pasajero.nombres || !pasajero.apellidos) return alert("DNI, Nombres y Apellidos son obligatorios");
    if (parseFloat(precio) < 0) return alert("El precio no puede ser negativo");

    setIsSelling(true);
    const res = await venderPasaje({
      viaje_id: selectedViaje.id,
      asiento_id: selectedAsiento.id,
      precio: parseFloat(precio),
      pasajero: pasajero
    });

    setIsSelling(false);

    if (res.success) {
      setSaleSuccess(true);
      // Refrescar los asientos para mostrar este como ocupado
      handleSelectViaje(selectedViaje);
    } else {
      alert(res.error || "Hubo un error al procesar la venta.");
    }
  };

  // UI Helpers
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      
      {/* Top Bar: Buscador */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4 flex-shrink-0">
        <form onSubmit={handleBuscarViajes} className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Origen</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select 
                required
                value={origenId} onChange={(e) => setOrigenId(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] outline-none"
              >
                <option value="">Seleccione Origen</option>
                {initialSucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Destino</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select 
                required
                value={destinoId} onChange={(e) => setDestinoId(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] outline-none"
              >
                <option value="">Seleccione Destino</option>
                {initialSucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Fecha</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="date" required
                value={fecha} onChange={(e) => setFecha(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] outline-none"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoadingViajes}
            className="bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-xl font-medium transition-colors flex items-center h-[42px]"
          >
            <Search className="w-4 h-4 mr-2" />
            {isLoadingViajes ? "Buscando..." : "Buscar"}
          </button>
        </form>
      </div>

      {/* Main Grid: Viajes -> Asientos -> Venta */}
      <div className="flex-1 flex gap-4 min-h-0">
        
        {/* COL 1: Lista de Viajes */}
        <div className="w-1/3 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
            <h3 className="font-bold text-gray-900 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-[#f07639]" /> Viajes Disponibles
            </h3>
          </div>
          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            {viajes.length === 0 && !isLoadingViajes && (
              <div className="text-center text-gray-400 text-sm mt-10">
                Realiza una búsqueda para ver los viajes programados.
              </div>
            )}
            {viajes.map((viaje) => {
              const libres = viaje.asientos_viaje.filter(a => a.estado === "disponible").length;
              const isSelected = selectedViaje?.id === viaje.id;
              
              return (
                <div 
                  key={viaje.id} 
                  onClick={() => handleSelectViaje(viaje)}
                  className={`
                    p-4 rounded-xl border-2 cursor-pointer transition-all
                    ${isSelected ? 'border-[#f07639] bg-orange-50/50' : 'border-gray-100 hover:border-gray-300'}
                  `}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-2xl font-black text-gray-900 tracking-tighter">
                      {formatTime(viaje.fecha_salida)}
                    </div>
                    <div className="bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded-md">
                      S/ {viaje.ruta.precio_base}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 font-medium mb-3">
                    Bus {viaje.bus.placa} • {viaje.bus.pisos} Piso(s)
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className={`px-2 py-1 rounded-full ${libres > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {libres} asientos libres
                    </span>
                    <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-[#f07639]' : 'text-gray-300'}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COL 2: Mapa de Asientos */}
        <div className="w-1/3 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex-shrink-0 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 flex items-center">
              <Ticket className="w-4 h-4 mr-2 text-[#f07639]" /> Selección de Asiento
            </h3>
            {selectedViaje && <span className="text-xs font-bold bg-gray-200 text-gray-700 px-2 py-1 rounded-md">Bus {selectedViaje.bus.placa}</span>}
          </div>
          
          <div className="p-4 overflow-y-auto flex-1 flex justify-center items-start bg-gray-100/50">
            {!selectedViaje && (
              <div className="text-center text-gray-400 text-sm mt-20">Selecciona un viaje primero</div>
            )}
            
            {isLoadingAsientos && (
              <div className="text-center text-gray-400 text-sm mt-20 animate-pulse">Cargando asientos...</div>
            )}

            {selectedViaje && !isLoadingAsientos && asientos.length > 0 && (
              <div className="flex flex-col gap-8 pb-10">
                {/* Agrupar por pisos */}
                {[1, 2].map(piso => {
                  const asientosPiso = asientos.filter(a => a.piso === piso);
                  if (asientosPiso.length === 0) return null;

                  return (
                    <div key={piso} className="bg-white p-6 rounded-[2rem] shadow-inner border border-gray-200">
                      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                        <div className="font-black text-gray-300 text-2xl uppercase tracking-widest">
                          Piso {piso}
                        </div>
                        {piso === 1 && (
                          <div className="text-gray-300 flex flex-col items-center" title="Cabina del Conductor">
                            <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              {/* Volante de Bus */}
                              <circle cx="12" cy="12" r="10" />
                              <circle cx="12" cy="12" r="3" />
                              <path d="M12 15l-3.5 6" />
                              <path d="M12 15l3.5 6" />
                              <path d="M12 9V2" />
                              <path d="M4 10l5.5 2" />
                              <path d="M20 10l-5.5 2" />
                            </svg>
                          </div>
                        )}
                        {piso === 2 && (
                          <div className="text-gray-300">
                            {/* Escaleras */}
                            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 21h18M3 17h14M3 13h10M3 9h6M3 5h2" strokeLinecap="round" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        {asientosPiso.map(asiento => {
                          let bgColor = "bg-white border-green-500 border-b-[6px] text-green-700 hover:bg-green-50";
                          let iconColor = "text-green-500";
                          
                          if (asiento.estado === "ocupado") {
                            bgColor = "bg-gray-100 border-gray-300 border-b-[6px] text-gray-400 cursor-not-allowed opacity-80";
                            iconColor = "text-gray-300";
                          }
                          if (asiento.estado === "inactivo") {
                            bgColor = "bg-red-50 border-red-300 border-b-[6px] text-red-400 cursor-not-allowed";
                            iconColor = "text-red-300";
                          }

                          const isSelected = selectedAsiento?.id === asiento.id;
                          if (isSelected) {
                            bgColor = "bg-gray-900 border-gray-900 border-b-[6px] text-white shadow-xl scale-110";
                            iconColor = "text-white";
                          }

                          return (
                            <button
                              key={asiento.id}
                              onClick={() => handleSelectAsiento(asiento)}
                              disabled={asiento.estado !== "disponible"}
                              className={`
                                relative w-full h-16 rounded-t-3xl rounded-b-lg flex flex-col items-center justify-center transition-all
                                ${bgColor}
                              `}
                            >
                              <svg className={`w-6 h-6 mb-1 ${iconColor}`} viewBox="0 0 24 24" fill="currentColor">
                                <path d="M4 18v3h2v-3h12v3h2v-3H4zm15-8h-1V6c0-2.21-1.79-4-4-4H10c-2.21 0-4 1.79-4 4v4H5c-1.1 0-2 .9-2 2v4h18v-4c0-1.1-.9-2-2-2zm-3 0H8V6c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v4z"/>
                              </svg>
                              <span className="text-sm font-black leading-none">{asiento.numero_asiento}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COL 3: Formulario Venta */}
        <div className="w-1/3 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
            <h3 className="font-bold text-gray-900 flex items-center">
              <CreditCard className="w-4 h-4 mr-2 text-[#f07639]" /> Datos y Pago
            </h3>
          </div>
          
          <div className="p-6 overflow-y-auto flex-1">
            {!selectedAsiento ? (
              <div className="text-center text-gray-400 text-sm mt-20 flex flex-col items-center">
                <Ticket className="w-12 h-12 text-gray-200 mb-4" />
                Selecciona un asiento disponible (verde) para proceder.
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                
                {/* Resumen Selección */}
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6 flex justify-between items-center">
                  <div>
                    <div className="text-xs text-orange-600 font-bold uppercase tracking-wider mb-1">Asiento Seleccionado</div>
                    <div className="text-3xl font-black text-gray-900">#{selectedAsiento.numero_asiento}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-orange-600 font-bold uppercase tracking-wider mb-1">Piso</div>
                    <div className="text-xl font-bold text-gray-800">{selectedAsiento.piso}</div>
                  </div>
                </div>

                {saleSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl mb-6 flex flex-col items-center text-center">
                    <CheckCircle2 className="w-10 h-10 text-green-500 mb-2" />
                    <span className="font-bold">¡Venta Registrada Exitosamente!</span>
                    <span className="text-sm mt-1">El asiento {selectedAsiento.numero_asiento} ahora está ocupado.</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* DNI */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">DNI del Pasajero</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text" maxLength={15}
                        value={pasajero.dni} 
                        onChange={(e) => setPasajero({...pasajero, dni: e.target.value})}
                        onBlur={handleDniBlur}
                        className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] outline-none font-medium"
                        placeholder="Ingrese DNI"
                      />
                      {isSearchingDni && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-500 animate-pulse">Buscando...</span>}
                    </div>
                  </div>

                  {/* Nombres y Apellidos en dos columnas */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nombres</label>
                      <input 
                        type="text" 
                        value={pasajero.nombres} 
                        onChange={(e) => setPasajero({...pasajero, nombres: e.target.value.toUpperCase()})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] outline-none font-medium uppercase"
                        placeholder="Nombres"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Apellidos</label>
                      <input 
                        type="text" 
                        value={pasajero.apellidos} 
                        onChange={(e) => setPasajero({...pasajero, apellidos: e.target.value.toUpperCase()})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] outline-none font-medium uppercase"
                        placeholder="Apellidos"
                      />
                    </div>
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Teléfono (Opcional)</label>
                    <input 
                      type="text" 
                      value={pasajero.telefono} 
                      onChange={(e) => setPasajero({...pasajero, telefono: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] outline-none font-medium"
                      placeholder="Celular"
                    />
                  </div>

                  {/* Precio Editable */}
                  <div className="pt-4 border-t border-gray-100">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Precio Final (S/)</label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#f07639]" />
                      <input 
                        type="number" step="0.10"
                        value={precio} 
                        onChange={(e) => setPrecio(e.target.value)}
                        className="w-full pl-9 pr-4 py-3 border border-[#f07639] bg-orange-50/30 rounded-xl focus:ring-2 focus:ring-[#f07639] outline-none font-black text-xl text-gray-900"
                      />
                    </div>
                  </div>

                  {/* Botón de Venta */}
                  <button
                    onClick={handleVender}
                    disabled={isSelling || saleSuccess}
                    className={`
                      w-full py-4 rounded-xl font-bold text-white text-lg transition-all mt-6 shadow-md
                      ${saleSuccess 
                        ? 'bg-green-500 cursor-not-allowed' 
                        : isSelling 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-[#f07639] hover:bg-orange-600 hover:-translate-y-1 hover:shadow-xl'
                      }
                    `}
                  >
                    {saleSuccess ? "Completado" : isSelling ? "Procesando..." : "Confirmar Venta"}
                  </button>
                  
                  {saleSuccess && (
                    <button
                      onClick={() => {
                        setSelectedAsiento(null);
                        setSaleSuccess(false);
                      }}
                      className="w-full py-2 text-sm text-blue-600 font-bold hover:underline"
                    >
                      Realizar otra venta
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
