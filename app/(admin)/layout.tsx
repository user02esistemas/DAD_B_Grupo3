"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Ticket,
  Package,
  Bus,
  LogOut,
  Menu,
  X,
  Building,
  Route,
  MapPin,
  ChevronRight,
  MessageSquareWarning,
} from "lucide-react";
import { useState } from "react";
import NotificacionesDropdown from "./admin/NotificacionesDropdown";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userRole = session?.user?.role || "cliente";

  const mainNav = [
    { name: "Inicio", href: "/admin", icon: LayoutDashboard, roles: ["admin", "vendedor"] },
    { name: "Pasajes", href: "/admin/pasajes", icon: Ticket, roles: ["admin", "vendedor"] },
    { name: "Encomiendas", href: "/admin/encomiendas", icon: Package, roles: ["admin", "vendedor"] },
  ];
  
  const managementNav = [
    { name: "Viajes", href: "/admin/viajes", icon: Route, roles: ["admin", "vendedor"] },
    { name: "Rutas", href: "/admin/rutas", icon: MapPin, roles: ["admin"] },
    { name: "Buses", href: "/admin/buses", icon: Bus, roles: ["admin"] },
    { name: "Sucursales", href: "/admin/sucursales", icon: Building, roles: ["admin"] },
    { name: "Reclamaciones", href: "/admin/reclamaciones", icon: MessageSquareWarning, roles: ["admin"] },
  ];

  const getPageTitle = () => {
    const all = [...mainNav, ...managementNav];
    const current = all.find(item => item.href === pathname);
    return current?.name || "Panel de Control";
  };

  const renderNavItem = (item: any) => {
    const isActive = pathname === item.href;
    return (
      <Link
        key={item.name}
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        className={`
          group flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 relative
          ${isActive 
            ? "bg-[#f07639]/10 text-[#f07639] font-bold nav-active-bar" 
            : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] font-medium"
          }
        `}
      >
        <div className={`
          w-9 h-9 rounded-lg flex items-center justify-center mr-3 transition-all duration-200
          ${isActive 
            ? "bg-[#f07639] text-white shadow-lg shadow-[#f07639]/30" 
            : "bg-white/[0.06] text-slate-400 group-hover:bg-white/[0.1] group-hover:text-slate-200"
          }
        `}>
          <item.icon className="w-[18px] h-[18px]" />
        </div>
        <span className="text-[13px] tracking-wide">{item.name}</span>
        {isActive && (
          <ChevronRight className="w-4 h-4 ml-auto text-[#f07639]/60" />
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col md:flex-row">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ========= SIDEBAR ========= */}
      <div className={`
        fixed md:sticky top-0 left-0 z-50 h-screen w-[260px] flex flex-col transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        {/* Sidebar background with gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1220] via-[#0f1628] to-[#111a30]" />
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02]" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px'}} />
        
        <div className="relative flex flex-col h-full">
          {/* Logo Area */}
          <div className="px-5 pt-7 pb-5 flex justify-center border-b border-white/[0.04]">
            <Link href="/admin" className="flex flex-col items-center text-center group">
              <img src="/logocumbe.png" alt="El Cumbe Logo" className="h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-105" />
              <span className="text-[9px] font-black text-[#f07639] uppercase tracking-[0.2em] mt-2 block">
                Panel Administrativo
              </span>
            </Link>
          </div>  
            <button className="md:hidden absolute right-4 top-6 text-slate-400 hover:text-white transition-colors" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>

          {/* Navigation */}
          <nav className="flex-1 px-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {/* Servicios */}
            <div className="mb-6">
              <div className="flex items-center px-4 mb-3">
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                <span className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Servicios</span>
                <div className="h-px flex-1 bg-gradient-to-l from-white/10 to-transparent" />
              </div>
              <div className="space-y-1">
                {mainNav.filter(item => item.roles.includes(userRole)).map(renderNavItem)}
              </div>
            </div>

            {/* Gestión */}
            {managementNav.filter(item => item.roles.includes(userRole)).length > 0 && (
              <div className="mb-6">
                <div className="flex items-center px-4 mb-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                  <span className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Gestión</span>
                  <div className="h-px flex-1 bg-gradient-to-l from-white/10 to-transparent" />
                </div>
                <div className="space-y-1">
                  {managementNav.filter(item => item.roles.includes(userRole)).map(renderNavItem)}
                </div>
              </div>
            )}
          </nav>

          {/* User Panel at Bottom */}
          <div className="p-4 border-t border-white/[0.06]">
            <div className="bg-white/[0.04] rounded-xl p-3">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f07639]/20 to-[#f07639]/10 border border-[#f07639]/20 flex items-center justify-center text-[#f07639] font-black text-sm">
                  {session?.user?.name?.charAt(0) || "A"}
                </div>
                <div className="ml-3 overflow-hidden flex-1">
                  <p className="text-[13px] leading-tight font-bold text-white truncate">{session?.user?.name}</p>
                  <p className="text-[11px] text-slate-400 capitalize font-medium mt-0.5">{session?.user?.role}</p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center justify-center px-3 py-2 bg-white/[0.04] hover:bg-red-500/15 text-slate-400 hover:text-red-400 border border-white/[0.06] hover:border-red-500/20 rounded-lg transition-all duration-200 text-[12px] font-bold group"
              >
                <LogOut className="w-3.5 h-3.5 mr-2 group-hover:-translate-x-0.5 transition-transform" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========= MAIN CONTENT ========= */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-[64px] bg-white flex items-center justify-between px-6 z-30 sticky top-0 border-b border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              className="md:hidden text-slate-500 hover:text-[#f07639] transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="text-slate-400">Admin</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-[#f07639] font-bold">{getPageTitle()}</span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Notificaciones */}
            <NotificacionesDropdown />
            
            {/* User info */}
            <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-100">
              <div className="text-right">
                <p className="text-[13px] font-bold text-slate-800 leading-tight">{session?.user?.name}</p>
                <p className="text-[11px] text-slate-400 capitalize font-medium">{session?.user?.role}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f07639] to-[#d45a1f] flex items-center justify-center text-white font-black text-sm shadow-sm">
                {session?.user?.name?.charAt(0) || "A"}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-5 sm:p-6 lg:p-8 min-h-[calc(100vh-72px)]">
          <div className="animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
