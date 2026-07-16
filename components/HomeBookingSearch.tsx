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
    <div className="relative z-20 mx-auto -mt-14 w-full max-w-6xl px-4 sm:-mt-20">
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-[var(--shadow-lg)] transition-colors duration-300 md:p-6">
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-2 md:px-3">
            <h3 className="flex items-center text-lg font-extrabold tracking-tight text-[var(--foreground)] transition-colors md:text-xl">
              <span className="mr-3 h-5 w-1.5 rounded-full bg-[var(--primary)]"></span>
              ¿A dónde quieres viajar hoy?
            </h3>
            
            <div className="flex items-center gap-3">
              {error && (
                <span className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition-colors dark:border-red-900/80 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </span>
              )}
              {showClear && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--surface-secondary)] px-3 py-2 text-xs font-bold text-[var(--primary-text)] transition-all duration-200 hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpiar búsqueda
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 rounded-xl border border-[var(--card-border)] bg-[var(--surface-secondary)] p-2 shadow-sm transition-shadow duration-300 hover:shadow-md md:flex-row md:divide-x md:divide-[var(--card-border)]">
            
            {/* ORIGEN */}
            <div 
              className="group relative w-full flex-1 cursor-pointer rounded-lg px-4 py-3 transition-colors hover:bg-[var(--primary-soft)] md:px-5"
              ref={originRef}
              onClick={() => {
                setIsOriginOpen(!isOriginOpen);
                setIsDestinationOpen(false);
              }}
            >
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)] transition-colors">Origen</label>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center w-full min-w-0">
                  <MapPin className="h-5 w-5 text-[#f07639] mr-2 md:mr-3 flex-shrink-0" />
                  <span className={`truncate text-sm font-bold transition-colors md:text-base ${originId ? "text-[var(--foreground)]" : "text-[var(--input-placeholder)]"}`}>
                    {selectedOrigin}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 text-[var(--muted)] transition-transform duration-200 ${isOriginOpen ? "rotate-180 !text-[var(--primary-text)]" : ""}`} />
              </div>

              {/* Lista Desplegable Personalizada */}
              {isOriginOpen && (
                <div className="absolute left-0 right-0 z-50 mt-3 max-h-60 overflow-y-auto rounded-xl border border-[var(--dropdown-border)] bg-[var(--dropdown-bg)] py-2 shadow-[var(--shadow-lg)] transition-colors animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-1 text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-widest border-b border-gray-50 dark:border-slate-700 mb-1 transition-colors">
                    Selecciona Ciudad de Origen
                  </div>
                  {locations.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      className={`w-full text-left px-4 py-3 text-sm font-semibold flex items-center gap-2.5 transition-colors ${
                        loc.id.toString() === originId
                          ? "bg-orange-50 dark:bg-orange-950/30 text-[#f07639] dark:text-orange-400"
                          : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
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
              className="group relative w-full flex-1 cursor-pointer rounded-lg px-4 py-3 transition-colors hover:bg-[var(--primary-soft)] md:px-5"
              ref={destinationRef}
              onClick={() => {
                setIsDestinationOpen(!isDestinationOpen);
                setIsOriginOpen(false);
              }}
            >
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)] transition-colors">Destino</label>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center w-full min-w-0">
                  <MapPin className="h-5 w-5 text-[#f07639] mr-2 md:mr-3 flex-shrink-0" />
                  <span className={`truncate text-sm font-bold transition-colors md:text-base ${destinationId ? "text-[var(--foreground)]" : "text-[var(--input-placeholder)]"}`}>
                    {selectedDestination}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 text-[var(--muted)] transition-transform duration-200 ${isDestinationOpen ? "rotate-180 !text-[var(--primary-text)]" : ""}`} />
              </div>

              {/* Lista Desplegable Personalizada */}
              {isDestinationOpen && (
                <div className="absolute left-0 right-0 z-50 mt-3 max-h-60 overflow-y-auto rounded-xl border border-[var(--dropdown-border)] bg-[var(--dropdown-bg)] py-2 shadow-[var(--shadow-lg)] transition-colors animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-1 text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-widest border-b border-gray-50 dark:border-slate-700 mb-1 transition-colors">
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
                            ? "bg-orange-50 dark:bg-orange-950/30 text-[#f07639] dark:text-orange-400"
                            : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
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
            <div className="group relative w-full flex-1 cursor-pointer rounded-lg px-4 py-3 transition-colors hover:bg-[var(--primary-soft)] md:px-5">
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)] transition-colors">Fecha de Viaje</label>
              <div className="flex items-center justify-between">
                <div className="flex items-center w-full">
                  <CalendarIcon className="h-5 w-5 text-[#f07639] mr-3 flex-shrink-0" />
                  <input
                    type="date"
                    min={peruDate}
                    className="w-full cursor-pointer bg-transparent text-sm font-bold text-[var(--foreground)] transition-colors focus:outline-none md:text-base"
                    value={date}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && val < peruDate) {
                        setDate(peruDate);
                      } else {
                        setDate(val);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* BOTON DE BUSQUEDA */}
            <div className="w-full md:w-auto px-2 pb-2 md:pb-0 shrink-0">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-lg bg-[var(--primary)] px-7 py-4 text-sm font-extrabold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--primary-dark)] hover:shadow-md disabled:cursor-not-allowed disabled:transform-none disabled:opacity-50 disabled:hover:shadow-none md:w-auto"
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
