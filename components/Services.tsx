import Link from "next/link";
import { Bus, Package } from "lucide-react";

export default function Services() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
            Nuestros <span className="text-[#f07639]">Servicios</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Soluciones integrales de transporte y logística diseñadas para conectar personas y negocios con seguridad y rapidez.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Tarjeta de Transporte */}
          <div className="group bg-white rounded-2xl shadow-md border border-gray-100 p-8 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col items-start">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#f07639] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Bus size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Transporte</h3>
            <p className="text-gray-600 leading-relaxed mb-8 flex-1">
              Conectamos destinos con la seguridad y puntualidad que mereces. Ofrecemos una experiencia de viaje cómoda y confiable en nuestras rutas principales. Planifica tu viaje con anticipación a través de nuestra plataforma y disfruta de un servicio de transporte de primera clase.
            </p>
            <Link 
              href="/compra" 
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-[#f07639] hover:bg-orange-600 transition-colors w-full sm:w-auto"
            >
              Comprar pasaje
            </Link>
          </div>

          {/* Tarjeta de Encomiendas */}
          <div className="group bg-white rounded-2xl shadow-md border border-gray-100 p-8 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col items-start">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#f07639] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Package size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Encomiendas</h3>
            <p className="text-gray-600 leading-relaxed mb-8 flex-1">
              Tus envíos, en las mejores manos. Garantizamos el traslado seguro de tus encomiendas con un monitoreo constante desde la recepción hasta la entrega final. Confía en nuestra logística eficiente para que tus paquetes lleguen a tiempo y en perfectas condiciones.
            </p>
            <Link 
              href="/seguimiento" 
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-[#f07639] hover:bg-orange-600 transition-colors w-full sm:w-auto"
            >
              Rastrear encomienda
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
