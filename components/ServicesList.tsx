import Link from "next/link";
import { Bus, Package } from "lucide-react";

export default function ServicesList() {
  return (
    <div className="flex flex-col gap-6">
      {/* Tarjeta de Transporte */}
      <div className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col items-start relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-full -z-10 transition-transform duration-500 group-hover:scale-110 opacity-50"></div>
        
        <div className="w-14 h-14 rounded-xl bg-orange-100 text-[#f07639] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
          <Bus size={28} />
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-3">Transporte</h3>
        <p className="text-gray-600 leading-relaxed mb-6 flex-1 text-sm sm:text-base">
          Conectamos destinos con la seguridad y puntualidad que mereces. Ofrecemos una experiencia de viaje cómoda y confiable en nuestras rutas principales. Planifica tu viaje con anticipación a través de nuestra plataforma y disfruta de un servicio de transporte de primera clase.
        </p>
        
        <Link 
          href="/compra" 
          className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-[#f07639] hover:bg-orange-600 transition-colors shadow-sm hover:shadow-md w-full sm:w-auto"
        >
          Comprar pasaje
        </Link>
      </div>

      {/* Tarjeta de Encomiendas */}
      <div className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col items-start relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-full -z-10 transition-transform duration-500 group-hover:scale-110 opacity-50"></div>
        
        <div className="w-14 h-14 rounded-xl bg-orange-100 text-[#f07639] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
          <Package size={28} />
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-3">Encomiendas</h3>
        <p className="text-gray-600 leading-relaxed mb-6 flex-1 text-sm sm:text-base">
          Tus envíos, en las mejores manos. Garantizamos el traslado seguro de tus encomiendas con un monitoreo constante desde la recepción hasta la entrega final. Confía en nuestra logística eficiente para que tus paquetes lleguen a tiempo y en perfectas condiciones.
        </p>
        
        <Link 
          href="/seguimiento" 
          className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-[#f07639] hover:bg-orange-600 transition-colors shadow-sm hover:shadow-md w-full sm:w-auto"
        >
          Rastrear encomienda
        </Link>
      </div>
    </div>
  );
}
