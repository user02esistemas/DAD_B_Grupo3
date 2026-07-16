import Link from "next/link";
import { Bus, Package } from "lucide-react";

export default function Services() {
  return (
    <section className="py-20 bg-white dark:bg-[#0f1219] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight transition-colors">
            Nuestros <span className="text-[#f07639]">Servicios</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-slate-400 max-w-2xl mx-auto transition-colors">
            Soluciones integrales de transporte y logística diseñadas para conectar personas y negocios con seguridad y rapidez.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Tarjeta de Transporte */}
          <div className="group bg-white dark:bg-[#111827] rounded-2xl shadow-md dark:shadow-xl border border-gray-100 dark:border-slate-700 p-8 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col items-start">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-950/30 text-[#f07639] dark:text-orange-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Bus size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4 transition-colors">Transporte</h3>
            <p className="text-gray-600 dark:text-slate-400 leading-relaxed mb-8 flex-1 transition-colors">
              Conectamos destinos con la seguridad y puntualidad que mereces. Ofrecemos una experiencia de viaje cómoda y confiable en nuestras rutas principales. Planifica tu viaje con anticipación a través de nuestra plataforma y disfruta de un servicio de transporte de primera clase.
            </p>
            <Link 
              href="/compra" 
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-[#f07639] hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 transition-colors w-full sm:w-auto"
            >
              Comprar pasaje
            </Link>
          </div>

          {/* Tarjeta de Encomiendas */}
          <div className="group bg-white dark:bg-[#111827] rounded-2xl shadow-md dark:shadow-xl border border-gray-100 dark:border-slate-700 p-8 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col items-start">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-950/30 text-[#f07639] dark:text-orange-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Package size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4 transition-colors">Encomiendas</h3>
            <p className="text-gray-600 dark:text-slate-400 leading-relaxed mb-8 flex-1 transition-colors">
              Tus envíos, en las mejores manos. Garantizamos el traslado seguro de tus encomiendas con un monitoreo constante desde la recepción hasta la entrega final. Confía en nuestra logística eficiente para que tus paquetes lleguen a tiempo y en perfectas condiciones.
            </p>
            <Link 
              href="/seguimiento" 
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-[#f07639] hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 transition-colors w-full sm:w-auto"
            >
              Rastrear encomienda
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
