"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { User, ChevronDown, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  if (["/login", "/registro", "/recuperar-password", "/verificar"].includes(pathname)) {
    return null;
  }

  return (
    <nav className="bg-white shadow-md border-b border-gray-100 relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex flex-shrink-0 items-center gap-2">
              <img src="/logo.png" alt="Logo" width={200} height={250} />
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            <Link href="/" className="text-gray-600 hover:text-[#f07639] transition-colors px-3 py-2 text-sm font-medium">Inicio</Link>
            <Link href="/seguimiento" className="text-gray-600 hover:text-[#f07639] transition-colors px-3 py-2 text-sm font-medium">Revisar Encomienda</Link>
            <Link href="/quienes-somos" className="text-gray-600 hover:text-[#f07639] transition-colors px-3 py-2 text-sm font-medium">¿Quiénes Somos?</Link>
            <Link href="/ayuda" className="text-gray-600 hover:text-[#f07639] transition-colors px-3 py-2 text-sm font-medium">Ayuda / FAQs</Link>
            <Link href="/compra" className="text-gray-600 hover:text-[#f07639] transition-colors px-3 py-2 text-sm font-medium">Compra tu pasaje</Link>
          </div>

          {/* Desktop Right Side */}
          <div className="hidden md:flex items-center space-x-4">
            {status === "loading" ? (
              <div className="h-8 w-24 bg-gray-200 animate-pulse rounded-md"></div>
            ) : session ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 text-gray-700 hover:text-[#f07639] focus:outline-none transition-all duration-200"
                >
                  <div className="bg-gray-100 p-2 rounded-full hover:bg-orange-50 hover:text-[#f07639] transition-colors">
                    <User className="h-5 w-5" />
                  </div>
                  <span className="font-medium text-sm">{session.user?.name}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-[#f07639]' : ''}`} />
                </button>

                {/* Dropdown transition Wrapper */}
                <div 
                  className={`origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50 transition-all duration-200 ease-out
                    ${isDropdownOpen ? 'opacity-100 transform scale-100 translate-y-0 visible' : 'opacity-0 transform scale-95 -translate-y-2 invisible pointer-events-none'}`}
                >
                  {session.user?.role === "cliente" ? (
                    <>
                      <Link href="/perfil" className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-[#f07639] transition-colors" onClick={() => setIsDropdownOpen(false)}>Mi Perfil</Link>
                      <Link href="/perfil?tab=tickets" className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-[#f07639] transition-colors" onClick={() => setIsDropdownOpen(false)}>Mis Pasajes</Link>
                    </>
                  ) : (
                    <Link href="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-[#f07639] transition-colors" onClick={() => setIsDropdownOpen(false)}>Panel Admin</Link>
                  )}
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      signOut({ callbackUrl: '/' });
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-[#f07639] transition-colors"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-gray-600 hover:text-[#f07639] font-medium text-sm transition-colors">
                  Iniciar Sesión
                </Link>
                <Link href="/registro" className="bg-[#f07639] hover:bg-[#d8662d] text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors">
                  Registro
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#f07639]"
            >
              {isMobileMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link href="/" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Inicio</Link>
            <Link href="/seguimiento" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Revisar Encomienda</Link>
            <Link href="/quienes-somos" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">¿Quiénes Somos?</Link>
            <Link href="/ayuda" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50" onClick={() => setIsMobileMenuOpen(false)}>Ayuda / FAQs</Link>
            <Link href="/compra" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Compra tu pasaje</Link>
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            {session ? (
              <div className="px-5 space-y-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-gray-100 p-2 rounded-full">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">{session.user?.name}</div>
                    <div className="text-sm font-medium text-gray-500">{session.user?.email}</div>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  {session.user?.role === "cliente" ? (
                    <>
                      <Link href="/perfil" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50" onClick={() => setIsMobileMenuOpen(false)}>Mi Perfil</Link>
                      <Link href="/perfil?tab=tickets" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50" onClick={() => setIsMobileMenuOpen(false)}>Mis Pasajes</Link>
                    </>
                  ) : (
                    <Link href="/admin" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50" onClick={() => setIsMobileMenuOpen(false)}>Panel Admin</Link>
                  )}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      signOut({ callbackUrl: '/' });
                    }}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-5 flex flex-col gap-3 mt-4">
                <Link href="/login" className="block text-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50">
                  Iniciar Sesión
                </Link>
                <Link href="/registro" className="block text-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[#f07639] hover:bg-[#d8662d]">
                  Registro
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
