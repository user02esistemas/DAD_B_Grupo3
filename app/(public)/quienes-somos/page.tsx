import { Target, Lightbulb } from "lucide-react";

export default function QuienesSomos() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* SECCIÓN A: CABECERA (Hero) */}
      <section className="w-full bg-[#f07639] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight drop-shadow-sm">
            ¿Quiénes Somos?
          </h1>
          <p className="mt-4 text-orange-100 text-lg md:text-xl max-w-2xl mx-auto font-medium">
            Conoce más sobre nuestra historia, propósito y a dónde queremos llegar junto a ti.
          </p>
        </div>
      </section>

      {/* SECCIÓN B: MISIÓN Y VISIÓN */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Tarjeta Misión */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-8 flex flex-col items-center text-center transition-all duration-300 hover:shadow-lg">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#f07639] flex items-center justify-center mb-6">
              <Target size={36} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Nuestra Misión</h2>
            <p className="text-gray-600 text-lg leading-relaxed flex-1">
              Brindar un servicio de transporte interprovincial seguro, puntual y de calidad, conectando a las familias peruanas.
            </p>
          </div>

          {/* Tarjeta Visión */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-8 flex flex-col items-center text-center transition-all duration-300 hover:shadow-lg">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#f07639] flex items-center justify-center mb-6">
              <Lightbulb size={36} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Nuestra Visión</h2>
            <p className="text-gray-600 text-lg leading-relaxed flex-1">
              Ser la empresa líder en transporte terrestre en el norte del país, reconocida por nuestra innovación y compromiso con el cliente.
            </p>
          </div>
        </div>
      </section>

      {/* SECCIÓN C: SUCURSALES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mb-16 w-full">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
            Nuestras <span className="text-[#f07639]">Sucursales</span>
          </h2>
          <div className="h-1.5 w-20 bg-[#f07639] rounded-full mt-4 mx-auto"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sucursal Chiclayo */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer">
            <div className="w-full h-48 overflow-hidden">
              <img 
                src="/chiclayo.png" 
                alt="Sucursal Chiclayo" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-6 text-center bg-white relative z-10">
              <h3 className="text-xl font-bold text-gray-900">Chiclayo</h3>
            </div>
          </div>

          {/* Sucursal Jaén */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer">
            <div className="w-full h-48 overflow-hidden">
              <img 
                src="/jaen.png" 
                alt="Sucursal Jaén" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-6 text-center bg-white relative z-10">
              <h3 className="text-xl font-bold text-gray-900">Jaén</h3>
            </div>
          </div>

          {/* Sucursal Cajamarca */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer">
            <div className="w-full h-48 overflow-hidden">
              <img 
                src="/cajamarca.png" 
                alt="Sucursal Cajamarca" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-6 text-center bg-white relative z-10">
              <h3 className="text-xl font-bold text-gray-900">Cajamarca</h3>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
