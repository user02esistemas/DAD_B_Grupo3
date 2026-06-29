"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getLocations } from "@/app/actions";
import { MapPin, Calendar as CalendarIcon, Search, Loader2, ChevronDown, Trash2 } from "lucide-react";

export default function HomeBookingSearch() {
  const router = useRouter();
  const [locations, setLocations] = useState<any[]>([]);
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  
  const [peruDate] = useState(() => {
    const options = { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" } as const;
    const formatter = new Intl.DateTimeFormat("en-US", options);
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === "year")?.value;
    const month = parts.find(p => p.type === "month")?.value;
    const day = parts.find(p => p.type === "day")?.value;
    return `${year}-${month}-${day}`;
  });

  const [date, setDate] = useState(peruDate);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Estados para dropdowns interactivos
  const [isOriginOpen, setIsOriginOpen] = useState(false);
  const [isDestinationOpen, setIsDestinationOpen] = useState(false);

  const originRef = useRef<HTMLDivElement>(null);
  const destinationRef = useRef<HTMLDivElement>(null);

  const handleOriginChange = (val: string) => {
    if (val && val === destinationId) {
      setDestinationId(originId);
    }
    setOriginId(val);
    setIsOriginOpen(false);
  };

  const handleDestinationChange = (val: string) => {
    if (val && val === originId) {
      setOriginId(destinationId);
    }
    setDestinationId(val);
    setIsDestinationOpen(false);
  };

  // Función para limpiar campos del buscador
  const handleClear = () => {
    setOriginId("");
    setDestinationId("");
    setDate(peruDate);
    setError("");
  };

  const showClear = originId || destinationId || date !== peruDate;

  // Cargar sucursales
  useEffect(() => {
    async function loadLocations() {
      try {
        const locs = await getLocations();
        setLocations(locs);
      } catch (err) {
        console.error("Error al cargar sucursales:", err);
      }
    }
    loadLocations();
  }, []);

  // Detectar clics afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (originRef.current && !originRef.current.contains(event.target as Node)) {
        setIsOriginOpen(false);
      }
      if (destinationRef.current && !destinationRef.current.contains(event.target as Node)) {
        setIsDestinationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!originId || !destinationId || !date) {
      setError("Por favor, completa todos los campos para buscar viajes.");
      return;
    }

    setError("");
    setLoading(true);
    router.push(`/compra?origin=${originId}&destination=${destinationId}&date=${date}`);
  };

  const selectedOrigin = locations.find(loc => loc.id.toString() === originId)?.nombre || "Seleccionar Origen";
  const selectedDestination = locations.find(loc => loc.id.toString() === destinationId)?.nombre || "Seleccionar Destino";

  return (
    <div className="w-full max-w-5xl mx-auto px-4 -mt-16 sm:-mt-24 relative z-20">
      <div className="bg-white rounded-[2rem] shadow-2xl shadow-black/5 p-4 md:p-6 backdrop-blur-md border border-white/50">
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-lg md:text-xl font-extrabold text-gray-800 tracking-tight flex items-center">
              <span className="w-2 h-6 bg-[#f07639] rounded-full mr-3 shadow-sm"></span>
              ¿A dónde quieres viajar hoy?
            </h3>
            
            <div className="flex items-center gap-3">
              {error && (
                <span className="text-xs font-bold text-red-600 bg-red-50 px-4 py-2 rounded-full border border-red-100 shadow-sm animate-pulse">
                  {error}
                </span>
              )}
              {showClear && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs font-bold text-[#f07639] hover:text-[#d8662d] transition-all duration-200 flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 px-3.5 py-2 rounded-full border border-orange-100 hover:border-orange-200 shadow-sm animate-in fade-in zoom-in duration-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpiar búsqueda
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center border border-gray-100 rounded-3xl bg-white shadow-sm hover:shadow-md transition-shadow duration-300 divide-y md:divide-y-0 md:divide-x divide-gray-100 p-2 gap-2 md:gap-0">
            
            {/* ORIGEN */}
            <div 
              className="flex-1 w-full px-4 md:px-6 py-3 relative group rounded-2xl hover:bg-orange-50/50 transition-colors cursor-pointer" 
              ref={originRef}
              onClick={() => {
                setIsOriginOpen(!isOriginOpen);
                setIsDestinationOpen(false);
              }}
            >
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1 block">Origen</label>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center w-full min-w-0">
                  <MapPin className="h-5 w-5 text-[#f07639] mr-2 md:mr-3 flex-shrink-0" />
                  <span className={`text-sm md:text-base font-bold truncate ${originId ? "text-gray-900" : "text-gray-400"}`}>
                    {selectedOrigin}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOriginOpen ? "rotate-180 text-[#f07639]" : ""}`} />
              </div>

              {/* Lista Desplegable Personalizada */}
              {isOriginOpen && (
                <div className="absolute left-0 right-0 mt-3 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-1 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">
                    Selecciona Ciudad de Origen
                  </div>
                  {locations.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      className={`w-full text-left px-4 py-3 text-sm font-semibold flex items-center gap-2.5 transition-colors ${
                        loc.id.toString() === originId
                          ? "bg-orange-50 text-[#f07639]"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                      onClick={() => handleOriginChange(loc.id.toString())}
                    >
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      {loc.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* DESTINO */}
            <div 
              className="flex-1 w-full px-4 md:px-6 py-3 relative group rounded-2xl hover:bg-orange-50/50 transition-colors cursor-pointer" 
              ref={destinationRef}
              onClick={() => {
                setIsDestinationOpen(!isDestinationOpen);
                setIsOriginOpen(false);
              }}
            >
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1 block">Destino</label>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center w-full min-w-0">
                  <MapPin className="h-5 w-5 text-[#f07639] mr-2 md:mr-3 flex-shrink-0" />
                  <span className={`text-sm md:text-base font-bold truncate ${destinationId ? "text-gray-900" : "text-gray-400"}`}>
                    {selectedDestination}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isDestinationOpen ? "rotate-180 text-[#f07639]" : ""}`} />
              </div>

              {/* Lista Desplegable Personalizada */}
              {isDestinationOpen && (
                <div className="absolute left-0 right-0 mt-3 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-1 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">
                    Selecciona Ciudad Destino
                  </div>
                  {locations
                    .filter((loc) => loc.id.toString() !== originId.toString())
                    .map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        className={`w-full text-left px-4 py-3 text-sm font-semibold flex items-center gap-2.5 transition-colors ${
                          loc.id.toString() === destinationId
                            ? "bg-orange-50 text-[#f07639]"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                        onClick={() => handleDestinationChange(loc.id.toString())}
                      >
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        {loc.nombre}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* FECHA */}
            <div className="flex-1 w-full px-4 md:px-6 py-3 relative group rounded-2xl hover:bg-orange-50/50 transition-colors cursor-pointer">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1 block">Fecha de Viaje</label>
              <div className="flex items-center justify-between">
                <div className="flex items-center w-full">
                  <CalendarIcon className="h-5 w-5 text-[#f07639] mr-3 flex-shrink-0" />
                  <input
                    type="date"
                    min={peruDate}
                    className="w-full bg-transparent text-gray-900 text-sm md:text-base font-bold focus:outline-none cursor-pointer tracking-wide"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* BOTON DE BUSQUEDA */}
            <div className="w-full md:w-auto px-2 pb-2 md:pb-0 shrink-0">
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto bg-[#f07639] hover:bg-[#d8662d] text-white text-sm font-extrabold rounded-2xl md:rounded-full px-8 py-4 flex items-center justify-center transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Buscar Viajes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
