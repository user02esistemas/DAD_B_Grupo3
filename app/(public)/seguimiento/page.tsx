"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { buscarEncomiendasPorDNI } from "@/app/actions";
import { Search, Package, MapPin, Calendar, CheckCircle, Clock, Truck, Loader2, ArrowRight } from "lucide-react";

export default function SeguimientoPage() {
  const { data: session } = useSession();
  const [dni, setDni] = useState("");
  const [useRegisteredDni, setUseRegisteredDni] = useState(false);
  const [loading, setLoading] = useState(false);
  const [encomiendas, setEncomiendas] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<"en_curso" | "historial">("en_curso");

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setUseRegisteredDni(isChecked);
    
    // Type cast to any to avoid TS errors if next-auth type is not extended
    const userDni = (session?.user as any)?.dni;
    if (isChecked && userDni) {
      setDni(userDni);
    } else {
      setDni("");
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dni || dni.length < 8) return;
    
    setLoading(true);
    setHasSearched(true);
    try {
      const resultados = await buscarEncomiendasPorDNI(dni);
      setEncomiendas(resultados);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Filter encomiendas
  const enCurso = encomiendas.filter((enc) => ["recepcionado", "en_transito", "listo_para_recojo"].includes(enc.estado));
  const historial = encomiendas.filter((enc) => enc.estado === "entregado");
  const currentList = activeTab === "en_curso" ? enCurso : historial;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "recepcionado":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><CheckCircle className="w-3 h-3 mr-1" /> Recepcionado</span>;
      case "en_transito":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"><Truck className="w-3 h-3 mr-1" /> En Tránsito</span>;
      case "listo_para_recojo":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><MapPin className="w-3 h-3 mr-1" /> Listo para recojo</span>;
      case "entregado":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Entregado</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">Rastrear Encomienda</h1>
          <p className="text-lg text-gray-600">
            Ingresa el DNI del remitente para consultar el estado actualizado de los envíos.
          </p>
        </div>

        {/* Search Box */}
        <div className="bg-white shadow-xl rounded-2xl p-6 md:p-8 mb-8 border border-gray-100">
          <form onSubmit={handleSearch}>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-6 w-6 text-gray-400" />
                </div>
                <input
                  type="text"
                  maxLength={8}
                  className="focus:ring-[#f07639] focus:border-[#f07639] block w-full pl-12 sm:text-lg border-gray-300 rounded-xl py-4 border bg-gray-50 text-gray-900 transition-colors"
                  placeholder="Número de DNI..."
                  value={dni}
                  onChange={(e) => {
                     setDni(e.target.value.replace(/\D/g, ""));
                     if (useRegisteredDni) setUseRegisteredDni(false);
                  }}
                  disabled={loading}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || dni.length < 8}
                className="inline-flex justify-center items-center py-4 px-10 border border-transparent rounded-xl shadow-sm text-lg font-bold text-white bg-[#f07639] hover:bg-[#d8662d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f07639] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Buscar"}
              </button>
            </div>
            
            {(session?.user as any)?.dni && (
              <div className="mt-5 flex items-center bg-orange-50 p-3 rounded-lg border border-orange-100 w-fit">
                <input
                  id="use-dni"
                  name="use-dni"
                  type="checkbox"
                  className="h-5 w-5 text-[#f07639] focus:ring-[#f07639] border-gray-300 rounded cursor-pointer"
                  checked={useRegisteredDni}
                  onChange={handleCheckboxChange}
                />
                <label htmlFor="use-dni" className="ml-3 block text-sm font-medium text-gray-800 cursor-pointer select-none">
                  Usar mi DNI registrado ({(session?.user as any)?.dni})
                </label>
              </div>
            )}
          </form>
        </div>

        {/* Results Area */}
        {hasSearched && !loading && (
          <div>
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab("en_curso")}
                  className={`${
                    activeTab === "en_curso"
                      ? "border-[#f07639] text-[#f07639]"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg flex items-center transition-colors`}
                >
                  <Package className="w-5 h-5 mr-2" />
                  En Curso ({enCurso.length})
                </button>
                <button
                  onClick={() => setActiveTab("historial")}
                  className={`${
                    activeTab === "historial"
                      ? "border-[#f07639] text-[#f07639]"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg flex items-center transition-colors`}
                >
                  <Clock className="w-5 h-5 mr-2" />
                  Historial ({historial.length})
                </button>
              </nav>
            </div>

            {currentList.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                <Package className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No hay encomiendas</h3>
                <p className="mt-2 text-md text-gray-500">
                  {activeTab === "en_curso"
                    ? "No hemos encontrado encomiendas activas asociadas a este DNI."
                    : "No hay registros de encomiendas entregadas en tu historial."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentList.map((enc) => (
                  <div key={enc.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                    <div className="p-6 md:p-8">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Tracking</span>
                          <span className="text-lg font-extrabold text-[#f07639]">#{enc.codigo_seguimiento}</span>
                        </div>
                        <div>{getStatusBadge(enc.estado)}</div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 rounded-xl p-5 border border-gray-100">
                        <div>
                          <p className="text-sm text-gray-500 mb-2 font-medium">Ruta del Envío</p>
                          <div className="flex items-center text-gray-900 font-bold text-lg">
                            <span>{enc.origen?.nombre}</span>
                            <ArrowRight className="w-5 h-5 mx-3 text-gray-400" />
                            <span>{enc.destino?.nombre}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-2 font-medium">Detalles del Paquete</p>
                          <p className="text-gray-900 font-semibold text-lg">{enc.peso_kg} kg <span className="mx-2 text-gray-300">|</span> S/ {enc.precio}</p>
                        </div>
                      </div>
                      
                      <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center text-sm text-gray-500 font-medium bg-gray-50 px-3 py-1.5 rounded-md">
                          <Calendar className="flex-shrink-0 mr-2 h-4 w-4 text-gray-400" />
                          <p>Registrado el {new Date(enc.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-sm text-gray-700 bg-orange-50 text-[#d8662d] px-3 py-1.5 rounded-md font-semibold border border-orange-100">
                          Receptor: {enc.destinatario_nombre}
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
