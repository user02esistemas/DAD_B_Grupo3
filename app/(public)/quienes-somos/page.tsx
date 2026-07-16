import Image from "next/image";
import { Compass, MapPin, Phone, Target } from "lucide-react";

const offices = [
  {
    city: "Chiclayo",
    image: "/chiclayo.webp",
    address: "Av. José Quiñones 425",
    phone: "(074) 231 454 / 964 435 513",
  },
  {
    city: "Jaén",
    image: "/jaen.webp",
    address: "Av. Mesones Muro, esquina con La Marina - TETSUR",
    phone: "(083) 312 789",
  },
  {
    city: "Cajamarca",
    image: "/cajamarca.webp",
    address: "Av. San Martín de Porres 140",
    phone: "(084) 234 567",
  },
  {
    city: "Trujillo",
    image: "/trujillo.webp",
    address: "Av. Nicolás de Piérola 1300, a una cuadra del Óvalo Mochica",
    phone: "(044) 123 456",
  },
];

export default function QuienesSomos() {
  return (
    <div className="min-h-screen bg-transparent">
      <section className="relative flex min-h-[390px] items-end overflow-hidden md:min-h-[460px]">
        <Image
          src="/imagen-centro-ayuda.webp"
          alt="Bus de Transportes El Cumbe recorriendo una ruta del norte del Perú"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-12 pt-28 sm:px-6 md:pb-16 lg:px-8">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-orange-200">
            <span className="h-px w-8 bg-orange-300" aria-hidden="true" />
            Quiénes somos
          </p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight text-white sm:text-5xl md:text-6xl">
            Transportes El Cumbe
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/85 sm:text-lg">
            Una empresa peruana que conecta ciudades, familias y oportunidades con un servicio terrestre seguro y puntual.
          </p>
        </div>
      </section>

      <section className="border-b border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="mx-auto grid max-w-6xl md:grid-cols-2">
          <article className="px-4 py-10 sm:px-6 md:border-r md:border-[var(--card-border)] md:px-10 md:py-14 lg:px-14">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[var(--primary-soft)] text-[var(--primary-text)]">
                <Target className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase text-[var(--primary-text)]">Nuestro propósito</p>
                <h2 className="mt-1 text-2xl font-extrabold text-[var(--foreground)]">Misión</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)] sm:text-base">
                  Brindar un servicio de transporte interprovincial seguro, puntual y de calidad, conectando a las familias peruanas.
                </p>
              </div>
            </div>
          </article>

          <article className="border-t border-[var(--card-border)] px-4 py-10 sm:px-6 md:border-t-0 md:px-10 md:py-14 lg:px-14">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Compass className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase text-[var(--secondary)]">Hacia dónde avanzamos</p>
                <h2 className="mt-1 text-2xl font-extrabold text-[var(--foreground)]">Visión</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)] sm:text-base">
                  Ser la empresa líder en transporte terrestre en el norte del país, reconocida por nuestra innovación y compromiso con el cliente.
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <header className="mb-8 max-w-2xl">
          <p className="text-xs font-bold uppercase text-[var(--primary-text)]">Atención presencial</p>
          <h2 className="mt-2 text-3xl font-extrabold text-[var(--foreground)] sm:text-4xl">Nuestras sucursales</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)] sm:text-base">
            Encuentra la oficina más cercana para comprar pasajes, enviar encomiendas o recibir atención.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {offices.map((office) => (
            <article
              key={office.city}
              className="group overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--shadow-sm)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface)]">
                <Image
                  src={office.image}
                  alt={`Sucursal de El Cumbe en ${office.city}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-black/65 px-4 py-3">
                  <h3 className="text-lg font-extrabold text-white">{office.city}</h3>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start gap-2.5 text-sm leading-5 text-[var(--muted)]">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden="true" />
                  <span>{office.address}</span>
                </div>
                <div className="flex items-start gap-2.5 text-sm leading-5 text-[var(--muted)]">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[var(--secondary)]" aria-hidden="true" />
                  <span>{office.phone}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
