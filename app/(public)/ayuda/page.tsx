"use client";

import { useState } from "react";
import { 
  HelpCircle, 
  ChevronDown, 
  CalendarRange, 
  UserCheck, 
  Briefcase, 
  AlertCircle,
  FileText
} from "lucide-react";

type FAQItem = {
  question: string;
  answer: React.ReactNode;
};

type FAQSection = {
  title: string;
  icon: React.ReactNode;
  items: FAQItem[];
};

export default function AyudaPage() {
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  const toggleAccordion = (sectionIndex: number, itemIndex: number) => {
    const key = `${sectionIndex}-${itemIndex}`;
    setOpenIndex(openIndex === key ? null : key);
  };

  const faqData: FAQSection[] = [
    {
      title: "Reprogramaciones y Cambios",
      icon: <CalendarRange className="w-6 h-6 text-[#f07639]" />,
      items: [
        {
          question: "¿Cómo puedo reprogramar la fecha de mi pasaje?",
          answer: (
            <div className="space-y-2">
              <p>Para reprogramar o postergar tu viaje, debes cumplir con las siguientes condiciones comerciales de la empresa:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Tiempo de anticipación:</strong> La solicitud debe gestionarse con un mínimo de <strong>24 horas de anticipación</strong> a la hora original de salida programada del bus.</li>
                <li><strong>Diferencia tarifaria:</strong> La reprogramación está sujeta a disponibilidad. Si el nuevo boleto tiene un precio mayor al original, deberás abonar la diferencia. Si el costo del nuevo boleto es menor, no se realizarán reembolsos ni devoluciones por el saldo a favor.</li>
                <li><strong>Límite de modificaciones:</strong> Un pasaje solo puede ser reprogramado un **máximo de una (1) vez**.</li>
                <li><strong>Ausencia (No Show):</strong> Si no te presentas al embarque a la hora señalada y no gestionaste tu reprogramación dentro del plazo (24 horas antes), el boleto perderá automáticamente toda su validez y no habrá derecho a reprogramación ni reembolso.</li>
              </ul>
            </div>
          )
        },
        {
          question: "¿Puedo realizar un cambio en mi ruta de viaje?",
          answer: (
            <div className="space-y-2">
              <p><strong>No se permiten cambios de ruta de viaje.</strong> Los boletos son válidos única y exclusivamente para el origen y el destino seleccionados al momento de la compra.</p>
              <p>Si requieres viajar a un destino distinto, debes tramitar la anulación o postergación de tu pasaje actual (sujeto a plazos y condiciones) y adquirir un nuevo boleto para la ruta deseada.</p>
            </div>
          )
        }
      ]
    },
    {
      title: "Cambios de Titularidad (Transferencias)",
      icon: <UserCheck className="w-6 h-6 text-[#f07639]" />,
      items: [
        {
          question: "¿Cuáles son las condiciones para transferir mi boleto a otra persona?",
          answer: (
            <div className="space-y-2">
              <p>Si deseas ceder tu pasaje a otro pasajero, ten en cuenta las siguientes reglas:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Plazo límite:</strong> El cambio de nombre y titularidad debe solicitarse con al menos <strong>24 horas de anticipación</strong> a la hora de salida del bus.</li>
                <li><strong>Requisitos:</strong> Debes presentar de manera física o digital el documento de identidad original (DNI/Pasaporte) del titular que compró el boleto y proveer los datos completos del nuevo pasajero (Nombres, Apellidos, DNI/Pasaporte y Teléfono).</li>
                <li><strong>Condición:</strong> Solo se permite realizar este cambio <strong>una sola vez</strong> por boleto.</li>
              </ul>
            </div>
          )
        }
      ]
    },
    {
      title: "Equipajes y Menores de Edad",
      icon: <Briefcase className="w-6 h-6 text-[#f07639]" />,
      items: [
        {
          question: "¿Cuál es el límite de peso de equipaje permitido?",
          answer: (
            <div className="space-y-2">
              <p>El peso de equipaje permitido de forma gratuita y las tarifas de exceso son:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <h4 className="font-bold text-gray-900 text-sm mb-1">Equipaje en Bodega</h4>
                  <p className="text-xs text-gray-600">Permitido: <strong>Hasta 20 kg gratis</strong>.</p>
                  <p className="text-xs text-red-600 mt-1">Costo por exceso: <strong>S/. 5.00 por cada kg adicional</strong>.</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <h4 className="font-bold text-gray-900 text-sm mb-1">Equipaje de Mano</h4>
                  <p className="text-xs text-gray-600">Permitido: <strong>Hasta 7 kg gratis</strong>.</p>
                  <p className="text-xs text-red-600 mt-1">Costo por exceso: <strong>S/. 3.00 por cada kg adicional</strong>.</p>
                </div>
              </div>
            </div>
          )
        },
        {
          question: "¿Qué requisitos se necesitan para el viaje de menores de edad?",
          answer: (
            <div className="space-y-2">
              <p>Por políticas de seguridad del Estado y de la empresa, los menores de edad deben cumplir lo siguiente:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Acompañamiento obligatorio:</strong> Todos los menores deben viajar acompañados por un adulto responsable.</li>
                <li><strong>Documentación:</strong> Es obligatorio presentar el DNI físico original del menor.</li>
                <li><strong>Autorización:</strong> Si viajan con un adulto que no sea uno de sus padres, se requiere presentar la <strong>autorización escrita del titular</strong> de la patria potestad (firma legalizada y fotocopia del DNI del adulto autorizante).</li>
              </ul>
            </div>
          )
        }
      ]
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/15 relative overflow-hidden">
      {/* Glow Effects de fondo */}
      <div className="absolute top-[30%] -left-36 w-[400px] h-[400px] bg-orange-200/10 rounded-full filter blur-3xl pointer-events-none z-0"></div>
      <div className="absolute bottom-[30%] -right-36 w-[400px] h-[400px] bg-amber-100/10 rounded-full filter blur-3xl pointer-events-none z-0"></div>

      <div className="relative z-10 flex flex-col flex-1">
        {/* Cabecera / Hero */}
        <section className="w-full bg-gradient-to-tr from-[#f07639] via-[#e66c2f] to-[#c8561d] py-16 md:py-20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20">
              <HelpCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-sm">
              Centro de Ayuda y Preguntas Frecuentes
            </h1>
            <p className="mt-3 text-orange-50/90 text-sm md:text-base max-w-xl mx-auto font-medium">
              Encuentra información útil sobre reprogramaciones, equipajes, viajes de menores y políticas de Transportes El Cumbe.
            </p>
          </div>
        </section>

        {/* Sección de Acordeones FAQs */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-1">
          <div className="space-y-10">
            {faqData.map((section, sectionIdx) => (
              <div key={sectionIdx} className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-gray-100/50 border border-gray-100/80">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
                  {section.icon}
                  <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
                </div>

                <div className="divide-y divide-gray-100">
                  {section.items.map((item, itemIdx) => {
                    const key = `${sectionIdx}-${itemIdx}`;
                    const isOpen = openIndex === key;

                    return (
                      <div key={itemIdx} className="py-4 first:pt-0 last:pb-0">
                        <button
                          onClick={() => toggleAccordion(sectionIdx, itemIdx)}
                          className="w-full flex items-center justify-between text-left font-bold text-gray-800 hover:text-[#f07639] transition-colors gap-4"
                        >
                          <span className="text-sm md:text-base">{item.question}</span>
                          <ChevronDown 
                            className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-300 ${
                              isOpen ? "transform rotate-180 text-[#f07639]" : ""
                            }`}
                          />
                        </button>

                        <div
                          className={`grid transition-all duration-300 ease-in-out ${
                            isOpen ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"
                          }`}
                        >
                          <div className="overflow-hidden">
                            <div className="text-sm text-gray-600 bg-orange-50/30 border border-orange-50/50 p-4 rounded-2xl leading-relaxed">
                              {item.answer}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Banner de Contacto Extra */}
          <div className="mt-12 p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl border border-orange-100/50 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#f07639] shadow-sm flex-shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">¿Tienes alguna duda adicional?</h3>
                <p className="text-xs text-gray-600">Nuestro equipo de soporte por WhatsApp está listo para ayudarte con tu pasaje.</p>
              </div>
            </div>
            <a
              href="https://wa.me/51976202295"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-[#f07639] hover:bg-orange-600 text-white font-semibold rounded-2xl shadow-sm hover:shadow-md transition-all text-sm flex items-center gap-2"
            >
              Contactar por WhatsApp
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
