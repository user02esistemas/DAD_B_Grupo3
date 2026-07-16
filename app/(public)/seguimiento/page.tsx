"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { buscarEncomiendasPorDNI, buscarEncomiendaPorCodigo } from "@/app/actions";
import { Search, Package, MapPin, Calendar, CheckCircle, Clock, Truck, Loader2, ArrowRight } from "lucide-react";

export default function SeguimientoPage() {
  const { data: session } = useSession();
  const [dni, setDni] = useState("");
  const [useRegisteredDni, setUseRegisteredDni] = useState(false);
  const [loading, setLoading] = useState(false);
  const [encomiendas, setEncomiendas] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"en_curso" | "historial">("en_curso");
  useEffect(() => {
    const userDni = (session?.user as any)?.dni;
    if (userDni && !hasSearched) {
      setDni(userDni);
      setUseRegisteredDni(true);
      // Realizar la búsqueda automáticamente
      setLoading(true);
      setHasSearched(true);
      buscarEncomiendasPorDNI(userDni)
        .then(resultados => {
          setEncomiendas(resultados);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [session, hasSearched]);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setUseRegisteredDni(isChecked);
    
    const userDni = (session?.user as any)?.dni;
    if (isChecked && userDni) {
      setDni(userDni);
    } else {
      setDni("");
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      if (!dni || dni.trim().length < 5) return;
      setLoading(true);
      setHasSearched(true);
      setError(null);
      try {
        const res = await buscarEncomiendaPorCodigo(dni);
        if (res.success && res.data) {
          setEncomiendas([res.data]);
        } else {
          setEncomiendas([]);
          setError(res.error || "Encomienda no encontrada.");
        }
      } catch (err) {
        console.error(err);
        setError("Ocurrió un error al buscar la encomienda.");
      } finally {
        setLoading(false);
      }
    } else {
      if (!dni || dni.length < 8) return;
      setLoading(true);
      setHasSearched(true);
      setError(null);
      try {
        const resultados = await buscarEncomiendasPorDNI(dni);
        setEncomiendas(resultados);
      } catch (err) {
        console.error(err);
        setError("Ocurrió un error al buscar las encomiendas.");
      } finally {
        setLoading(false);
      }
    }
  };

  const enCurso = encomiendas.filter((enc) => ["recepcionado", "en_transito", "listo_para_recojo"].includes(enc.estado));
  const historial = encomiendas.filter((enc) => enc.estado === "entregado");
  const currentList = activeTab === "en_curso" ? enCurso : historial;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "recepcionado":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100"><CheckCircle className="w-3.5 h-3.5 mr-1" /> Recepcionado</span>;
      case "en_transito":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-100"><Truck className="w-3.5 h-3.5 mr-1" /> En Tránsito</span>;
      case "listo_para_recojo":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100"><MapPin className="w-3.5 h-3.5 mr-1" /> Listo para Recojo</span>;
      case "entregado":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100"><CheckCircle className="w-3.5 h-3.5 mr-1" /> Entregado</span>;
      default:
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-50 text-gray-700 border border-gray-100">{status}</span>;
    }
  };

  const getProgressStep = (status: string) => {
    switch (status) {
      case "recepcionado": return 1;
      case "en_transito": return 2;
      case "listo_para_recojo": return 3;
      case "entregado": return 4;
      default: return 0;
    }
  };

  const renderProgressBar = (status: string) => {
    const currentStep = getProgressStep(status);
    const steps = [
      { label: "Recepcionado", desc: "En oficina de origen" },
      { label: "En Tránsito", desc: "Viajando al destino" },
      { label: "Listo para Recojo", desc: "En oficina destino" },
      { label: "Entregado", desc: "Paquete entregado" }
    ];

    return (
      <div className="mt-8 mb-4 px-1">
        <div className="relative">
          {/* Línea de fondo */}
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full bg-gray-100 h-1.5 rounded-full"></div>
          </div>
          {/* Línea de progreso activa */}
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div 
              className="bg-gradient-to-r from-[#f07639] to-orange-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${((Math.max(1, currentStep) - 1) / 3) * 100}%` }}
            ></div>
          </div>
          
          <div className="relative flex justify-between">
            {steps.map((step, idx) => {
              const stepNum = idx + 1;
              const isCompleted = stepNum < currentStep;
              const isActive = stepNum === currentStep;
              
              return (
                <div key={idx} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10 ${
                    isCompleted 
                      ? "bg-[#f07639] border-[#f07639] text-white shadow-sm" 
                      : isActive 
                        ? "bg-white border-[#f07639] text-[#f07639] shadow-md scale-110 ring-4 ring-orange-100" 
                        : "bg-white border-gray-200 text-gray-400"
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-extrabold">{stepNum}</span>
                    )}
                  </div>
                  <span className={`text-[10px] sm:text-xs font-bold mt-2 text-center max-w-[80px] sm:max-w-none transition-colors ${
                    isActive ? "text-[#f07639]" : isCompleted ? "text-gray-900" : "text-gray-400"
                  }`}>
                    {step.label}
                  </span>
                  <span className="hidden sm:block text-[9px] text-gray-400 mt-0.5 text-center max-w-[100px] leading-tight">
                    {step.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-transparent py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Círculos decorativos de fondo con desenfoque (Glow Effect) */}
      <div className="absolute top-[10%] -left-36 w-96 h-96 bg-orange-200/30 rounded-full filter blur-3xl pointer-events-none z-0"></div>
      <div className="absolute bottom-[20%] -right-36 w-96 h-96 bg-amber-100/30 rounded-full filter blur-3xl pointer-events-none z-0"></div>

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Encabezado */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-orange-100/50 text-[#d8662d] uppercase tracking-wider mb-3">
            📍 Estado de Envíos
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">Rastrear Encomienda</h1>
          <p className="text-sm sm:text-base text-gray-500 max-w-md mx-auto">
            {session 
              ? "Ingresa tu DNI para consultar el estado de tus envíos asociados en tiempo real."
              : "Ingresa el código único de seguimiento de tu encomienda para ver su estado."}
          </p>
        </div>

        {/* Search Box */}
        <div className="bg-white shadow-xl shadow-gray-100 rounded-3xl p-5 md:p-6 mb-8 border border-gray-100">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  maxLength={session ? 8 : 30}
                  className="focus:ring-2 focus:ring-[#f07639]/20 focus:border-[#f07639] block w-full pl-11 text-base border-gray-200 rounded-2xl py-3.5 border bg-gray-50 text-gray-900 transition-all placeholder-gray-400 outline-none"
                  placeholder={session ? "Número de DNI del remitente..." : "Código de seguimiento (ej. ENC-12345)..."}
                  value={dni}
                  onChange={(e) => {
                     setDni(session ? e.target.value.replace(/\D/g, "") : e.target.value.toUpperCase());
                     if (useRegisteredDni) setUseRegisteredDni(false);
                  }}
                  disabled={loading}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || (session ? dni.length < 8 : dni.length < 5)}
                className="inline-flex justify-center items-center py-3.5 px-8 border border-transparent rounded-2xl shadow-sm text-base font-bold text-white bg-[#f07639] hover:bg-[#d8662d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f07639] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Buscar Encomienda"}
              </button>
            </div>
            
            {(session?.user as any)?.dni && (
              <div className="flex items-center">
                <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                  <input
                    id="use-dni"
                    name="use-dni"
                    type="checkbox"
                    className="h-4 w-4 text-[#f07639] focus:ring-[#f07639] border-gray-300 rounded transition-colors"
                    checked={useRegisteredDni}
                    onChange={handleCheckboxChange}
                  />
                  <span className="text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors">
                    Usar mi DNI registrado ({(session?.user as any)?.dni})
                  </span>
                </label>
              </div>
            )}
          </form>
        </div>

        {/* Error Message */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-100 text-red-700 p-5 rounded-3xl mb-8 text-sm font-bold flex items-center gap-3">
            <span className="text-lg">⚠</span>
            <p>{error}</p>
          </div>
        )}

        {/* Results Area */}
        {hasSearched && !loading && !error && (
          <div className="space-y-6">
            {/* Tabs (Solo si hay sesión, ya que muestra el listado completo del DNI) */}
            {session && (
              <div className="flex justify-center">
                <div className="bg-gray-100 p-1 rounded-2xl inline-flex space-x-1 border border-gray-200/50">
                  <button
                    onClick={() => setActiveTab("en_curso")}
                    className={`whitespace-nowrap py-2 px-5 rounded-xl font-bold text-sm flex items-center transition-all duration-300 cursor-pointer ${
                      activeTab === "en_curso"
                        ? "bg-white text-[#f07639] shadow-sm"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    En Curso ({enCurso.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("historial")}
                    className={`whitespace-nowrap py-2 px-5 rounded-xl font-bold text-sm flex items-center transition-all duration-300 cursor-pointer ${
                      activeTab === "historial"
                        ? "bg-white text-[#f07639] shadow-sm"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Historial ({historial.length})
                  </button>
                </div>
              </div>
            )}

            {currentList.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100/80">
                <Package className="mx-auto h-14 w-14 text-gray-300 mb-3" />
                <h3 className="text-lg font-bold text-gray-800">No hay encomiendas</h3>
                <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
                  {session
                    ? (activeTab === "en_curso"
                        ? "No hemos encontrado encomiendas activas asociadas a este DNI."
                        : "No hay registros de encomiendas entregadas en tu historial.")
                    : "No se encontró ninguna encomienda activa o entregada con el código provisto."}
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {currentList.map((enc) => (
                  <div key={enc.id} className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden hover:shadow-2xl hover:shadow-gray-200/30 transition-all duration-300">
                    <div className="p-6 md:p-8">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 border-b border-gray-100 pb-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2.5 py-1 rounded">Envío</span>
                          <span className="text-lg font-black text-gray-900">#{enc.codigo_seguimiento}</span>
                        </div>
                        <div>{getStatusBadge(enc.estado)}</div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-orange-50/20 to-orange-100/5 rounded-2xl p-4 border border-orange-100/40">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Trayecto</p>
                          <div className="flex items-center text-gray-800 font-extrabold text-sm sm:text-base">
                            <span className="bg-orange-500 text-white w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] mr-2">O</span>
                            <span className="truncate">{enc.origen?.nombre}</span>
                            <ArrowRight className="w-4 h-4 mx-3 text-orange-400 flex-shrink-0" />
                            <span className="bg-green-600 text-white w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] mr-2">D</span>
                            <span className="truncate">{enc.destino?.nombre}</span>
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-gray-50/50 to-gray-100/20 rounded-2xl p-4 border border-gray-100">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Carga y Costo</p>
                          <div className="flex items-center text-gray-800 font-bold text-sm sm:text-base">
                            <Package className="w-4 h-4 text-gray-400 mr-2" />
                            <span>{enc.peso_kg} kg</span>
                            <span className="mx-2 text-gray-300">|</span>
                            <span className="text-[#f07639] font-black">S/ {enc.precio}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Barra de progreso de envío interactiva */}
                      {renderProgressBar(enc.estado)}
                      
                      <div className="mt-8 pt-5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center text-xs text-gray-500 font-semibold bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                          <Calendar className="flex-shrink-0 mr-2 h-4 w-4 text-gray-400" />
                          <span>Registrado: {new Date(enc.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="text-xs text-orange-950 bg-orange-50 px-3 py-1.5 rounded-xl font-bold border border-orange-100 flex items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#f07639] mr-2"></span>
                          Destinatario: {enc.destinatario_nombre}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
