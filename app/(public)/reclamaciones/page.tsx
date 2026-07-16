"use client";

import { useState, useEffect } from "react";
import { Book, Send, CheckCircle2, ArrowLeft, Printer, ShieldAlert, Loader2 } from "lucide-react";
import { registrarReclamo, buscarPersonaPorDNI } from "@/app/actions";
import Link from "next/link";

export default function LibroReclamacionesPage() {
  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    dni: "",
    telefono: "",
    correo: "",
    tipo: "reclamo", // "reclamo" o "queja"
    fecha_incidente: "",
    detalle_incidente: "",
    pedido_cliente: ""
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingDni, setIsSearchingDni] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    codigo: string;
    tipo: string;
    persona: { nombres: string; apellidos: string; dni: string };
  } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    const searchDni = async () => {
      if (/^\d{8}$/.test(formData.dni)) {
        setIsSearchingDni(true);
        try {
          const res = await buscarPersonaPorDNI(formData.dni);
          if (res.success && res.data) {
            setFormData(prev => ({
              ...prev,
              nombres: res.data.nombres,
              apellidos: res.data.apellidos,
              telefono: res.data.telefono || prev.telefono,
              correo: res.data.correo || prev.correo
            }));
          }
        } catch (err) {
          console.error("Error al buscar DNI:", err);
        } finally {
          setIsSearchingDni(false);
        }
      }
    };

    searchDni();
  }, [formData.dni]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validar DNI de 8 dígitos
    if (!/^\d{8}$/.test(formData.dni)) {
      setError("El DNI debe tener exactamente 8 dígitos numéricos.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await registrarReclamo(formData);
      if (res.success && res.data) {
        setSuccessData(res.data);
      } else {
        setError(res.error || "Hubo un error al registrar tu reclamo.");
      }
    } catch (err: any) {
      setError("Ocurrió un error inesperado de red.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (successData) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 print:bg-white print:py-0">
        <div className="max-w-2xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100/80 w-full print:shadow-none print:border-none print:p-0">
          <div className="text-center print:text-left">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto print:hidden" />
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-4">
              Hoja de Reclamación Registrada
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Transportes El Cumbe S.A.C. - RUC: 20123456789
            </p>
          </div>

          <div className="mt-8 border-t border-b border-gray-100 py-6 space-y-4">
            <div className="flex justify-between items-center bg-orange-50/50 px-4 py-3 rounded-2xl border border-orange-50 print:bg-gray-50 print:border-gray-200">
              <span className="text-sm font-bold text-gray-700">Código de Reclamación:</span>
              <span className="text-base font-extrabold text-[#f07639] print:text-black">{successData.codigo}</span>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-gray-900 text-sm border-b border-gray-50 pb-1 mt-4">1. Identificación del Consumidor</h3>
              <div className="grid grid-cols-2 gap-y-2 text-xs md:text-sm">
                <span className="text-gray-500">Nombres y Apellidos:</span>
                <span className="font-semibold text-gray-800 text-right">{successData.persona.nombres} {successData.persona.apellidos}</span>
                <span className="text-gray-500">Documento de Identidad (DNI):</span>
                <span className="font-semibold text-gray-800 text-right">{successData.persona.dni}</span>
                <span className="text-gray-500">Correo Electrónico:</span>
                <span className="font-semibold text-gray-800 text-right">{formData.correo || "-"}</span>
                <span className="text-gray-500">Teléfono:</span>
                <span className="font-semibold text-gray-800 text-right">{formData.telefono || "-"}</span>
              </div>

              <h3 className="font-bold text-gray-900 text-sm border-b border-gray-50 pb-1 mt-6">2. Detalle de la Reclamación</h3>
              <div className="grid grid-cols-2 gap-y-2 text-xs md:text-sm">
                <span className="text-gray-500">Tipo de Incidencia:</span>
                <span className="font-bold text-gray-800 text-right uppercase text-[#f07639] print:text-black">{successData.tipo}</span>
                <span className="text-gray-500">Fecha del Incidente:</span>
                <span className="font-semibold text-gray-800 text-right">{formData.fecha_incidente}</span>
              </div>
              
              <div className="mt-3 p-4 bg-gray-50 rounded-2xl text-xs md:text-sm">
                <p className="font-bold text-gray-700 mb-1">Detalle del incidente:</p>
                <p className="text-gray-600 italic">"{formData.detalle_incidente}"</p>
              </div>

              <h3 className="font-bold text-gray-900 text-sm border-b border-gray-50 pb-1 mt-6">3. Pedido del Consumidor</h3>
              <div className="p-4 bg-gray-50 rounded-2xl text-xs md:text-sm">
                <p className="text-gray-600 italic">"{formData.pedido_cliente}"</p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-gray-400 leading-relaxed">
            <p>Conforme a lo establecido en el Código de Protección y Defensa del Consumidor, la empresa brindará respuesta en un plazo no mayor a quince (15) días hábiles.</p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center print:hidden">
            <button
              onClick={handlePrint}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Guardar PDF
            </button>
            <Link
              href="/"
              className="px-6 py-3 bg-[#f07639] hover:bg-orange-600 text-white font-semibold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-transparent relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[30%] -left-36 w-[500px] h-[500px] bg-orange-200/10 rounded-full filter blur-3xl pointer-events-none z-0"></div>
      <div className="absolute bottom-[30%] -right-36 w-[500px] h-[500px] bg-blue-100/10 rounded-full filter blur-3xl pointer-events-none z-0"></div>

      <div className="relative z-10 flex flex-col flex-1">
        {/* Cabecera / Hero */}
        <section className="w-full bg-gradient-to-tr from-[#f07639] via-[#e66c2f] to-[#c8561d] py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="none" />
            </svg>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <span className="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-full text-xs font-black bg-white/10 text-white border border-white/20 backdrop-blur-sm mb-6 uppercase tracking-widest shadow-sm">
              <Book className="w-4 h-4 text-orange-200" />
              Libro de Reclamaciones Virtual
            </span>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight drop-shadow-sm leading-tight">
              ¿Tienes algún inconveniente?
            </h1>
            <p className="mt-4 text-orange-50/90 text-sm md:text-lg max-w-2xl mx-auto font-semibold leading-relaxed">
              Estamos aquí para escucharte y ayudarte. Registra tu queja o reclamo conforme a las disposiciones del Código de Protección y Defensa del Consumidor.
            </p>
          </div>
        </section>

        {/* Formulario */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-1">
          <form 
            onSubmit={handleSubmit}
            className="bg-white rounded-[2rem] p-6 md:p-10 shadow-2xl shadow-gray-100/50 border border-gray-100/80 space-y-10"
          >
            {error && (
              <div className="p-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-sm flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Bloque 1: Consumidor */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <span className="w-8 h-8 rounded-xl bg-orange-100 text-[#f07639] font-black text-xs flex items-center justify-center">1</span>
                <h2 className="text-lg font-extrabold text-gray-900">Identificación del Consumidor</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">DNI <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type="text"
                      name="dni"
                      required
                      maxLength={8}
                      pattern="\d{8}"
                      placeholder="8 dígitos"
                      value={formData.dni}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all text-sm bg-gray-50/50 focus:bg-white"
                    />
                    {isSearchingDni && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Loader2 className="h-4 w-4 text-[#f07639] animate-spin" />
                      </div>
                    )}
                  </div>
                  {isSearchingDni && (
                    <p className="text-[10px] text-[#f07639] font-bold mt-1.5 animate-pulse">
                      Buscando datos del DNI...
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Correo Electrónico <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    name="correo"
                    required
                    placeholder="ejemplo@correo.com"
                    value={formData.correo}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all text-sm bg-gray-50/50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Nombres <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="nombres"
                    required
                    placeholder="Tus nombres"
                    value={formData.nombres}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all text-sm bg-gray-50/50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Apellidos <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="apellidos"
                    required
                    placeholder="Tus apellidos"
                    value={formData.apellidos}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all text-sm bg-gray-50/50 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Teléfono o Celular</label>
                <input
                  type="text"
                  name="telefono"
                  placeholder="Opcional"
                  value={formData.telefono}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all text-sm bg-gray-50/50 focus:bg-white max-w-xs"
                />
              </div>
            </div>

            {/* Bloque 2: Detalle del Reclamo */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <span className="w-8 h-8 rounded-xl bg-orange-100 text-[#f07639] font-black text-xs flex items-center justify-center">2</span>
                <h2 className="text-lg font-extrabold text-gray-900">Detalle del Bien o Servicio</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Tipo de Incidencia <span className="text-red-500">*</span></label>
                  <select
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all text-sm bg-gray-50/50 focus:bg-white cursor-pointer"
                  >
                    <option value="reclamo">Reclamo (Disconformidad con el servicio)</option>
                    <option value="queja">Queja (Disconformidad con la atención o trato)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Fecha del Incidente <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    name="fecha_incidente"
                    required
                    value={formData.fecha_incidente}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all text-sm bg-gray-50/50 focus:bg-white cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Detalle del Incidente <span className="text-red-500">*</span></label>
                <textarea
                  name="detalle_incidente"
                  required
                  rows={5}
                  placeholder="Describe detalladamente lo que ocurrió..."
                  value={formData.detalle_incidente}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all text-sm bg-gray-50/50 focus:bg-white"
                />
              </div>
            </div>

            {/* Bloque 3: Pedido */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <span className="w-8 h-8 rounded-xl bg-orange-100 text-[#f07639] font-black text-xs flex items-center justify-center">3</span>
                <h2 className="text-lg font-extrabold text-gray-900">Pedido del Consumidor</h2>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">¿Qué solicitas como solución? <span className="text-red-500">*</span></label>
                <textarea
                  name="pedido_cliente"
                  required
                  rows={3}
                  placeholder="Indica qué solución o acción concreta esperas de parte de la empresa..."
                  value={formData.pedido_cliente}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all text-sm bg-gray-50/50 focus:bg-white"
                />
              </div>
            </div>

            {/* Botón enviar */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-[#f07639] hover:bg-orange-600 text-white font-extrabold rounded-2xl shadow-lg shadow-orange-500/20 hover:shadow-orange-600/30 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registrando...
                  </span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Reclamación</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
