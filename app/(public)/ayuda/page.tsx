"use client";

import Image from "next/image";
import { useState } from "react";
import {
  AlertCircle,
  BookOpen,
  BriefcaseBusiness,
  CalendarClock,
  ChevronDown,
  HelpCircle,
  MessageCircle,
  UserRoundCheck,
} from "lucide-react";
import { ComplaintBookModalTrigger } from "@/components/ComplaintBook";

type FAQItem = {
  question: string;
  answer: React.ReactNode;
};

type FAQSection = {
  id: string;
  title: string;
  shortTitle: string;
  icon: typeof HelpCircle;
  items: FAQItem[];
};

const faqData: FAQSection[] = [
  {
    id: "cambios",
    title: "Reprogramaciones y cambios",
    shortTitle: "Cambios de viaje",
    icon: CalendarClock,
    items: [
      {
        question: "¿Cómo puedo reprogramar la fecha de mi pasaje?",
        answer: (
          <div className="space-y-3">
            <p>La solicitud debe gestionarse con un mínimo de <strong>24 horas de anticipación</strong> a la salida programada.</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>La nueva fecha está sujeta a disponibilidad y al pago de cualquier diferencia tarifaria.</li>
              <li>Si el nuevo pasaje cuesta menos, no se devuelve el saldo restante.</li>
              <li>Cada pasaje puede reprogramarse una sola vez.</li>
              <li>Si no te presentas y no gestionaste el cambio dentro del plazo, el boleto pierde validez.</li>
            </ul>
          </div>
        ),
      },
      {
        question: "¿Puedo cambiar la ruta de viaje?",
        answer: (
          <div className="space-y-3">
            <p><strong>No se permiten cambios de ruta.</strong> El boleto solo es válido para el origen y destino seleccionados durante la compra.</p>
            <p>Para viajar a otro destino debes gestionar la postergación correspondiente y adquirir un nuevo boleto para la ruta requerida.</p>
          </div>
        ),
      },
    ],
  },
  {
    id: "titularidad",
    title: "Cambios de titularidad",
    shortTitle: "Transferencias",
    icon: UserRoundCheck,
    items: [
      {
        question: "¿Cuáles son las condiciones para transferir mi boleto?",
        answer: (
          <div className="space-y-3">
            <p>El cambio debe solicitarse con al menos <strong>24 horas de anticipación</strong> a la salida.</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Presenta el documento de identidad del titular original.</li>
              <li>Entrega nombres, apellidos, documento y teléfono del nuevo pasajero.</li>
              <li>La transferencia se permite una sola vez por boleto.</li>
            </ul>
          </div>
        ),
      },
    ],
  },
  {
    id: "equipaje",
    title: "Equipajes y menores de edad",
    shortTitle: "Equipaje y menores",
    icon: BriefcaseBusiness,
    items: [
      {
        question: "¿Cuál es el límite de equipaje permitido?",
        answer: (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border-l-2 border-[var(--primary)] pl-4">
              <h4 className="font-bold text-[var(--foreground)]">Equipaje en bodega</h4>
              <p className="mt-1">Hasta <strong>20 kg sin costo</strong>. El exceso cuesta S/ 5.00 por kilogramo.</p>
            </div>
            <div className="border-l-2 border-[var(--secondary)] pl-4">
              <h4 className="font-bold text-[var(--foreground)]">Equipaje de mano</h4>
              <p className="mt-1">Hasta <strong>7 kg sin costo</strong>. El exceso cuesta S/ 3.00 por kilogramo.</p>
            </div>
          </div>
        ),
      },
      {
        question: "¿Qué requisitos necesita un menor de edad para viajar?",
        answer: (
          <ul className="list-disc space-y-2 pl-5">
            <li>Debe viajar acompañado por un adulto responsable.</li>
            <li>Es obligatorio presentar el DNI físico original del menor.</li>
            <li>Si el acompañante no es uno de sus padres, se requiere autorización con firma legalizada y copia del DNI del adulto autorizante.</li>
          </ul>
        ),
      },
    ],
  },
];

export default function AyudaPage() {
  const [openItem, setOpenItem] = useState<string | null>("0-0");

  return (
    <div className="min-h-screen bg-transparent">
      <section className="relative flex min-h-[320px] items-end overflow-hidden md:min-h-[380px]">
        <Image
          src="/imagen-centro-ayuda.webp"
          alt="Bus de El Cumbe en una ruta interprovincial"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/65" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-10 pt-24 sm:px-6 md:pb-14 lg:px-8">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-orange-200">
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
            Información para tu viaje
          </div>
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl">Centro de ayuda</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/85 sm:text-lg">
            Revisa políticas de cambios, equipaje, transferencias y viajes con menores.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[230px_1fr] lg:px-8 lg:py-14">
        <aside>
          <nav aria-label="Temas de ayuda" className="sticky top-24 border-l border-[var(--card-border)] pl-4">
            <p className="mb-3 text-xs font-bold uppercase text-[var(--muted)]">Temas</p>
            <ul className="space-y-1">
              {faqData.map((section) => {
                const Icon = section.icon;
                return (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="flex min-h-10 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden="true" />
                      {section.shortTitle}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0">
          <header className="mb-8">
            <p className="text-xs font-bold uppercase text-[var(--primary-text)]">Preguntas frecuentes</p>
            <h2 className="mt-2 text-2xl font-extrabold text-[var(--foreground)] sm:text-3xl">Respuestas antes de viajar</h2>
          </header>

          <div className="space-y-10">
            {faqData.map((section, sectionIndex) => {
              const SectionIcon = section.icon;
              return (
                <section key={section.id} id={section.id} className="scroll-mt-28">
                  <div className="mb-3 flex items-center gap-3 border-b border-[var(--card-border)] pb-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--primary-soft)] text-[var(--primary-text)]">
                      <SectionIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="text-lg font-extrabold text-[var(--foreground)] sm:text-xl">{section.title}</h3>
                  </div>

                  <div className="divide-y divide-[var(--card-border)]">
                    {section.items.map((item, itemIndex) => {
                      const key = `${sectionIndex}-${itemIndex}`;
                      const isOpen = openItem === key;
                      const panelId = `answer-${sectionIndex}-${itemIndex}`;
                      return (
                        <article key={item.question}>
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-controls={panelId}
                            onClick={() => setOpenItem(isOpen ? null : key)}
                            className="flex min-h-16 w-full items-center justify-between gap-5 py-4 text-left text-sm font-bold text-[var(--foreground)] transition-colors hover:text-[var(--primary-text)] sm:text-base"
                          >
                            <span>{item.question}</span>
                            <ChevronDown
                              className={`h-5 w-5 shrink-0 text-[var(--muted)] transition-transform ${isOpen ? "rotate-180 text-[var(--primary)]" : ""}`}
                              aria-hidden="true"
                            />
                          </button>
                          <div
                            id={panelId}
                            className={`grid transition-[grid-template-rows,opacity] duration-300 ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                          >
                            <div className="overflow-hidden">
                              <div className="mb-5 rounded-md border border-[var(--card-border)] bg-[var(--surface-secondary)] p-4 text-sm leading-6 text-[var(--muted)] sm:p-5">
                                {item.answer}
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <section className="mt-12 rounded-lg bg-[#244c45] p-5 text-white dark:bg-[#182a25] sm:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-orange-300" aria-hidden="true" />
                <div>
                  <h3 className="font-extrabold">¿Necesitas atención adicional?</h3>
                  <p className="mt-1 text-sm leading-6 text-white/70">Conversa con soporte o registra formalmente una incidencia.</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href="https://wa.me/51976202295"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/25 px-4 text-sm font-bold text-white transition-colors hover:bg-white/10"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  WhatsApp
                </a>
                <ComplaintBookModalTrigger
                  label="Libro de reclamaciones"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-bold text-white transition-colors hover:bg-[var(--primary-dark)]"
                  icon={<BookOpen className="h-4 w-4" aria-hidden="true" />}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
