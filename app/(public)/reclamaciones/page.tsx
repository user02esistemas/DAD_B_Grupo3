"use client";

import { useState } from "react";
import { Book, Send, CheckCircle2, ArrowLeft, Printer, ShieldAlert } from "lucide-react";
import { registrarReclamo } from "@/app/actions";
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
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    codigo: string;
    tipo: string;
    persona: { nombres: string; apellidos: string; dni: string };
  } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/15 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[30%] -left-36 w-[400px] h-[400px] bg-orange-200/10 rounded-full filter blur-3xl pointer-events-none z-0"></div>
      <div className="absolute bottom-[30%] -right-36 w-[400px] h-[400px] bg-amber-100/10 rounded-full filter blur-3xl pointer-events-none z-0"></div>

      <div className="relative z-10 flex flex-col flex-1">
        {/* Cabecera / Hero */}
        <section className="w-full bg-gradient-to-tr from-[#f07639] via-[#e66c2f] to-[#c8561d] py-16 md:py-20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="none" />
            </svg>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20">
              <Book className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-sm">
              Libro de Reclamaciones
            </h1>
            <p className="mt-3 text-orange-50/90 text-sm md:text-base max-w-xl mx-auto font-medium">
              Conforme a las leyes vigentes, ponemos a tu disposición nuestro Libro de Reclamaciones Virtual para registrar tus quejas o reclamos.
            </p>
          </div>
        </section>

        {/* Formulario */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-1">
          <form 
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl p-6 md:p-10 shadow-xl shadow-gray-100/50 border border-gray-100/80 space-y-8"
          >
            {error && (
              <div className="p-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-sm flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Bloque 1: Consumidor */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">1. Identificación del Consumidor</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">DNI <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="dni"
                    required
                    maxLength={8}
                    pattern="\d{8}"
                    placeholder="8 dígitos"
                    value={formData.dni}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Correo Electrónico <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    name="correo"
                    required
                    placeholder="ejemplo@correo.com"
                    value={formData.correo}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nombres <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="nombres"
                    required
                    placeholder="Tus nombres"
                    value={formData.nombres}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Apellidos <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="apellidos"
                    required
                    placeholder="Tus apellidos"
                    value={formData.apellidos}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono o Celular</label>
                <input
                  type="text"
                  name="telefono"
                  placeholder="Opcional"
                  value={formData.telefono}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all text-sm max-w-xs"
                />
              </div>
            </div>

            {/* Bloque 2: Detalle del Reclamo */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">2. Detalle del Bien o Servicio Contratado</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de Incidencia <span className="text-red-500">*</span></label>
                  <select
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all text-sm bg-white"
                  >
                    <option value="reclamo">Reclamo (Disconformidad con el servicio)</option>
                    <option value="queja">Queja (Disconformidad con la atención o trato)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha del Incidente <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    name="fecha_incidente"
                    required
                    value={formData.fecha_incidente}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all text-sm bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Detalle del Incidente <span className="text-red-500">*</span></label>
                <textarea
                  name="detalle_incidente"
                  required
                  rows={4}
                  placeholder="Describe detalladamente lo que ocurrió..."
                  value={formData.detalle_incidente}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>

            {/* Bloque 3: Pedido */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">3. Pedido del Consumidor</h2>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">¿Qué es lo que solicitas como solución? <span className="text-red-500">*</span></label>
                <textarea
                  name="pedido_cliente"
                  required
                  rows={3}
                  placeholder="Indica qué solución o acción esperas de parte de la empresa..."
                  value={formData.pedido_cliente}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639] focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>

            {/* Botón enviar */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-[#f07639] hover:bg-orange-600 text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span>Registrando...</span>
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
