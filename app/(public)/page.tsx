import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import AdsCarousel from "@/components/AdsCarousel";
import ServicesList from "@/components/ServicesList";
import HomeBookingSearch from "@/components/HomeBookingSearch";
import { FaFacebook, FaInstagram, FaWhatsapp } from "react-icons/fa";
import Image from "next/image";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex flex-col flex-1 bg-transparent relative overflow-hidden">
      {/* Círculos decorativos de fondo con desenfoque (Glow Effect) */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* SECTION 1: BANNER PRINCIPAL Y SALUDO */}
      <section className="relative h-[340px] w-full sm:h-[420px] lg:h-[470px]">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/banner.webp"
            alt="Banner El Cumbe"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/* Overlay gradient to ensure text readability */}
          <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(7,12,10,0.92)_0%,rgba(7,12,10,0.68)_46%,rgba(7,12,10,0.08)_78%)]"></div>
        </div>

        {/* Dynamic Greeting */}
        <div className="relative z-20 mx-auto flex h-full w-full max-w-7xl flex-col justify-center px-4 pb-8 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-[#ffb088]">
            <span className="h-px w-10 bg-[#f07639]" />
            Pasajes y encomiendas
          </div>
          {session ? (
            <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight text-white drop-shadow-md md:text-6xl">
              Hola, <span className="text-[#f07639]">{session.user?.name}</span>
            </h1>
          ) : (
            <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight text-white drop-shadow-md md:text-6xl">
              Hola <span className="text-[#f07639]">viajero</span>
            </h1>
          )}
          <p className="mt-4 max-w-xl text-base leading-7 text-[#eef2ef] drop-shadow sm:text-lg">
            Bienvenido a tu plataforma de transporte y encomiendas. Compra tus pasajes y rastrea tus envíos de manera rápida y segura.
          </p>
        </div>
      </section>

      {/* BUSCADOR DE PASAJES (Superpuesto en el banner) */}
      <HomeBookingSearch />

      {/* SECTION 2: SPLIT LAYOUT (CARRUSEL + TARJETAS DE SERVICIOS) */}
      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">

          {/* COLUMNA IZQUIERDA: Carrusel Vertical y Redes Sociales */}
          <div className="w-full order-1 flex flex-col">
            <div className="mb-7">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Conoce nuestra ruta</p>
              <h2 className="text-3xl font-extrabold text-[var(--foreground)]">
                Empresa <span className="text-[var(--primary-text)]">Peruana</span>
              </h2>
              <div className="mt-4 h-1 w-16 rounded-full bg-[var(--primary)]"></div>
            </div>

            <AdsCarousel />

            {/* Redes Sociales */}
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
              <span className="text-base font-semibold text-[var(--muted)]">Contáctanos:</span>
              <div className="flex space-x-4">
                <a 
                  href="https://facebook.com/TransportesELCUMBE" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  aria-label="Facebook de El Cumbe"
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-[#315f8f] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#315f8f] hover:bg-[#315f8f] hover:text-white hover:shadow-md"
                >
                  <FaFacebook size={24} />
                </a>
                <a 
                  href="https://www.instagram.com/elcumbesac/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  aria-label="Instagram de El Cumbe"
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-[#b4466c] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#b4466c] hover:bg-[#b4466c] hover:text-white hover:shadow-md"
                >
                  <FaInstagram size={24} />
                </a>
                <a 
                  href="https://wa.me/51976202295" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  aria-label="WhatsApp de El Cumbe"
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-[#247a5a] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#247a5a] hover:bg-[#247a5a] hover:text-white hover:shadow-md"
                >
                  <FaWhatsapp size={24} />
                </a>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: Tarjetas de Servicios */}
          <div className="w-full order-2 flex flex-col">
            <div className="mb-7">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Lo que hacemos</p>
              <h2 className="text-3xl font-extrabold text-[var(--foreground)]">
                Nuestros <span className="text-[var(--primary-text)]">Servicios</span>
              </h2>
              <div className="mt-4 h-1 w-16 rounded-full bg-[var(--primary)]"></div>
            </div>

            <ServicesList />
          </div>

        </div>
      </section>
      </div>
    </div>
  );
}
