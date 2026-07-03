import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#1B211A] text-white py-5 border-t border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center md:items-start text-center md:text-left">

          {/* Columna 1: Enlaces */}
          <div className="flex flex-col space-y-1.5">
            <h4 className="text-lg font-semibold text-gray-100 mb-2">Enlaces Rápidos</h4>
            <Link href="/" className="text-gray-400 hover:text-[#f07639] transition-colors">Inicio</Link>
            <Link href="/quienes-somos" className="text-gray-400 hover:text-[#f07639] transition-colors">Sucursales</Link>
            <Link href="/quienes-somos" className="text-gray-400 hover:text-[#f07639] transition-colors">¿Quiénes Somos?</Link>
            <Link href="/ayuda" className="text-gray-400 hover:text-[#f07639] transition-colors">Ayuda</Link>
          </div>

          {/* Columna 2: Logo */}
          <div className="flex justify-center items-center">
            <Link href="/">
              <img
                src="/logocumbe.png"
                alt="El Cumbe Logo"
                className="h-12 md:h-14 w-auto object-contain hover:opacity-90 transition-opacity"
              />
            </Link>
          </div>

          {/* Columna 3: Libro de Reclamaciones */}
          <div className="flex flex-col md:items-end space-y-4">
            <h4 className="text-lg font-semibold text-gray-100">Atención al Cliente</h4>
            <Link
              href="/reclamaciones"
              className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-lg text-white text-sm font-medium transition-all group"
            >
              <BookOpen size={20} className="text-[#f07639] group-hover:scale-110 transition-transform" />
              <span>Libro de Reclamaciones</span>
            </Link>
          </div>

        </div>

        <div className="mt-6 pt-4 border-t border-gray-800 text-center md:flex md:justify-between md:items-center">
          <p className="text-gray-500 text-sm">
            &copy; 2026 El Cumbe. Todos los derechos reservados.
          </p>
          <div className="mt-4 md:mt-0 flex justify-center space-x-6 text-gray-500">
            <Link href="#" className="hover:text-white transition-colors text-sm">Términos y Condiciones</Link>
            <Link href="#" className="hover:text-white transition-colors text-sm">Privacidad</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
