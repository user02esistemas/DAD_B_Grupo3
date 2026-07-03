import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import AdsCarousel from "@/components/AdsCarousel";
import ServicesList from "@/components/ServicesList";
import HomeBookingSearch from "@/components/HomeBookingSearch";
import { FaFacebook, FaInstagram, FaWhatsapp } from "react-icons/fa";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex flex-col flex-1 bg-gradient-to-br from-gray-50 via-white to-orange-50/15 relative overflow-hidden">
      {/* Círculos decorativos de fondo con desenfoque (Glow Effect) */}
      <div className="absolute top-[50%] -left-36 w-[450px] h-[450px] bg-orange-200/20 rounded-full filter blur-3xl pointer-events-none z-0"></div>
      <div className="absolute top-[70%] -right-36 w-[450px] h-[450px] bg-amber-100/25 rounded-full filter blur-3xl pointer-events-none z-0"></div>

      <div className="relative z-10 flex flex-col flex-1">
        {/* SECTION 1: BANNER PRINCIPAL Y SALUDO */}
      <section className="relative w-full h-[300px] sm:h-[400px] lg:h-[450px]">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="/banner.png"
            alt="Banner El Cumbe"
            className="w-full h-full object-cover"
          />
          {/* Overlay gradient to ensure text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>
        </div>

        {/* Dynamic Greeting */}
        <div className="relative h-full flex flex-col justify-center px-4 sm:px-6 lg:px-16 max-w-7xl mx-auto">
          {session ? (
            <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight drop-shadow-md">
              Hola, <span className="text-[#f07639]">{session.user?.name}</span>
            </h1>
          ) : (
            <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight drop-shadow-md">
              Hola <span className="text-[#f07639]">viajero</span>
            </h1>
          )}
          <p className="mt-4 text-lg sm:text-xl text-gray-200 max-w-xl drop-shadow">
            Bienvenido a tu plataforma de transporte y encomiendas. Compra tus pasajes y rastrea tus envíos de manera rápida y segura.
          </p>
        </div>
      </section>

      {/* BUSCADOR DE PASAJES (Superpuesto en el banner) */}
      <HomeBookingSearch />

      {/* SECTION 2: SPLIT LAYOUT (CARRUSEL + TARJETAS DE SERVICIOS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">

          {/* COLUMNA IZQUIERDA: Carrusel Vertical y Redes Sociales */}
          <div className="w-full order-1 flex flex-col">
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900">
                Empresa <span className="text-[#f07639]">Peruana</span>
              </h2>
              <div className="h-1.5 w-20 bg-[#f07639] rounded-full mt-4"></div>
            </div>

            <AdsCarousel />

            {/* Redes Sociales */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <span className="text-gray-700 font-medium text-lg">Contáctanos:</span>
              <div className="flex space-x-4">
                <a 
                  href="https://facebook.com/TransportesELCUMBE" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors shadow-sm hover:shadow-md hover:-translate-y-1"
                >
                  <FaFacebook size={24} />
                </a>
                <a 
                  href="https://www.instagram.com/elcumbesac/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-12 h-12 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center hover:bg-gradient-to-tr hover:from-yellow-400 hover:via-pink-500 hover:to-purple-500 hover:text-white transition-colors shadow-sm hover:shadow-md hover:-translate-y-1"
                >
                  <FaInstagram size={24} />
                </a>
                <a 
                  href="https://wa.me/51976202295" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors shadow-sm hover:shadow-md hover:-translate-y-1"
                >
                  <FaWhatsapp size={24} />
                </a>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: Tarjetas de Servicios */}
          <div className="w-full order-2 flex flex-col">
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900">
                Nuestros <span className="text-[#f07639]">Servicios</span>
              </h2>
              <div className="h-1.5 w-20 bg-[#f07639] rounded-full mt-4"></div>
            </div>

            <ServicesList />
          </div>

        </div>
      </section>
      </div>
    </div>
  );
}
