import Link from "next/link";
import { ArrowRight, Bus, Package } from "lucide-react";

const services = [
  {
    title: "Transporte",
    description:
      "Conectamos destinos con la seguridad y puntualidad que mereces. Planifica tu viaje con anticipación y disfruta de un servicio cómodo y confiable en nuestras rutas principales.",
    href: "/compra",
    action: "Comprar pasaje",
    icon: Bus,
    label: "Viajes",
  },
  {
    title: "Encomiendas",
    description:
      "Trasladamos tus paquetes con seguimiento constante desde la recepción hasta la entrega. Nuestra operación cuida cada envío para que llegue a tiempo y en buenas condiciones.",
    href: "/seguimiento",
    action: "Rastrear encomienda",
    icon: Package,
    label: "Logística",
  },
];

export default function ServicesList() {
  return (
    <div className="flex flex-col gap-5">
      {services.map((service) => {
        const Icon = service.icon;

        return (
          <article
            key={service.title}
            className="group relative overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-[var(--shadow-md)] sm:p-7"
          >
            <div className="absolute inset-y-0 left-0 w-1 bg-[var(--primary)]" />
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--primary-soft)] text-[var(--primary-text)] transition-transform duration-300 group-hover:translate-x-0.5">
                <Icon size={24} aria-hidden="true" />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--secondary)]">
                {service.label}
              </span>
            </div>

            <h3 className="mb-3 text-2xl font-bold text-[var(--foreground)]">{service.title}</h3>
            <p className="mb-6 text-sm leading-6 text-[var(--muted)] sm:text-base">
              {service.description}
            </p>

            <Link
              href={service.href}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-bold !text-white shadow-sm transition-all hover:bg-[var(--primary-dark)] hover:shadow-md sm:w-auto"
            >
              {service.action}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </article>
        );
      })}
    </div>
  );
}
