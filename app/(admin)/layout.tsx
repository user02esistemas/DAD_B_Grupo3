"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
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
  User,
  Globe,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import { useState } from "react";
import NotificacionesDropdown from "./admin/NotificacionesDropdown";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const userRole = session?.user?.role || "cliente";

  const mainNav = [
    { name: "Inicio", href: "/admin", icon: LayoutDashboard, roles: ["admin", "vendedor", "gerente"] },
    { name: "Pasajes", href: "/admin/pasajes", icon: Ticket, roles: ["admin", "vendedor"] },
    { name: "Encomiendas", href: "/admin/encomiendas", icon: Package, roles: ["admin", "vendedor"] },
    { name: "Mi Panel", href: "/admin/conductor", icon: LayoutDashboard, roles: ["conductor"] },
    { name: "Mis Viajes", href: "/admin/conductor/viajes", icon: Bus, roles: ["conductor"] },
  ];
  
  const managementNav = [
    { name: "Viajes", href: "/admin/viajes", icon: Route, roles: ["admin", "vendedor"] },
    { name: "Rutas", href: "/admin/rutas", icon: MapPin, roles: ["admin"] },
    { name: "Buses", href: "/admin/buses", icon: Bus, roles: ["admin"] },
    { name: "Sucursales", href: "/admin/sucursales", icon: Building, roles: ["admin"] },
    { name: "Reclamaciones", href: "/admin/reclamaciones", icon: MessageSquareWarning, roles: ["admin"] },
    { name: "Usuarios", href: "/admin/usuarios", icon: User, roles: ["admin", "gerente"] },
  ];

  const reportsNav = [
    { name: "Reporte de Ventas", href: "/admin/reportes", icon: BarChart3, roles: ["admin", "gerente"] },
    { name: "Reporte de Operaciones", href: "/admin/reportes/operaciones", icon: ClipboardList, roles: ["admin", "gerente"] },
  ];

  const getPageTitle = () => {
    const all = [...mainNav, ...managementNav, ...reportsNav];
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
            : "text-[#aeb9b3] hover:text-white hover:bg-white/[0.05] font-medium"
          }
        `}
      >
        <div className={`
          w-9 h-9 rounded-lg flex items-center justify-center mr-3 transition-all duration-200
          ${isActive 
            ? "bg-[#f07639] text-white shadow-lg shadow-[#f07639]/30" 
            : "bg-white/[0.06] text-[#aeb9b3] group-hover:bg-white/[0.1] group-hover:text-white"
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
    <div className="panel-shell flex min-h-screen flex-col bg-[var(--page-bg)] transition-colors duration-300 md:flex-row">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ========= SIDEBAR ========= */}
      <div className={`
        fixed md:sticky top-0 left-0 z-50 h-screen w-[260px] flex flex-col shrink-0 border-r border-[#26362f] transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        {/* Sidebar background with gradient */}
        <div className="absolute inset-0 bg-[#101814]" />
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
                <span className="px-3 text-[10px] font-black text-[#85958d] uppercase tracking-[0.2em]">Servicios</span>
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
                  <span className="px-3 text-[10px] font-black text-[#85958d] uppercase tracking-[0.2em]">Gestión</span>
                  <div className="h-px flex-1 bg-gradient-to-l from-white/10 to-transparent" />
                </div>
                <div className="space-y-1">
                  {managementNav.filter(item => item.roles.includes(userRole)).map(renderNavItem)}
                </div>
              </div>
            )}

            {/* Reportes */}
            {reportsNav.filter(item => item.roles.includes(userRole)).length > 0 && (
              <div className="mb-6">
                <div className="flex items-center px-4 mb-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                  <span className="px-3 text-[10px] font-black text-[#85958d] uppercase tracking-[0.2em]">Reportes</span>
                  <div className="h-px flex-1 bg-gradient-to-l from-white/10 to-transparent" />
                </div>
                <div className="space-y-1">
                  {reportsNav.filter(item => item.roles.includes(userRole)).map(renderNavItem)}
                </div>
              </div>
            )}
          </nav>

          {/* User Panel at Bottom */}
          <div className="p-4 border-t border-white/[0.06]">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center justify-center px-3 py-2.5 bg-white/[0.02] hover:bg-red-500/10 text-[#aeb9b3] hover:text-red-300 border border-white/[0.06] hover:border-red-500/25 rounded-xl transition-all duration-200 text-[12px] font-bold group"
            >
              <LogOut className="w-3.5 h-3.5 mr-2 group-hover:-translate-x-0.5 transition-transform" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* ========= MAIN CONTENT ========= */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between border-b border-[var(--topbar-border)] bg-[var(--topbar-bg)] px-6 shadow-[var(--shadow-sm)] transition-colors duration-300">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              className="md:hidden text-slate-500 hover:text-[#f07639] transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
              <span className="text-[var(--muted)]">Admin</span>
              <ChevronRight className="h-3.5 w-3.5 text-[var(--muted-light)]" />
              <span className="font-bold text-[var(--primary-text)]">{getPageTitle()}</span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Notificaciones */}
            <NotificacionesDropdown />

            {/* Toggle Tema */}
            <ThemeToggle />

            {/* Volver a la Web */}
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--surface-secondary)] px-3 py-2 text-[11px] font-bold text-[var(--muted)] shadow-sm transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-text)] md:flex"
              title="Ir a la Web Principal (Pública)"
            >
              <Globe className="w-3.5 h-3.5" />
              Ver Web
            </Link>
            
            {/* User info */}
            <div className="relative">
              <button 
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="hidden cursor-pointer items-center gap-3 border-l border-[var(--topbar-border)] pl-4 text-left outline-none transition-opacity hover:opacity-85 sm:flex"
              >
                <div className="text-right">
                  <p className="text-[13px] font-bold leading-tight text-[var(--foreground)]">{session?.user?.name}</p>
                  <p className="text-[11px] font-medium capitalize text-[var(--muted)]">{session?.user?.role}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f07639] to-[#d45a1f] flex items-center justify-center text-white font-black text-sm shadow-sm transition-transform active:scale-95">
                  {session?.user?.name?.charAt(0) || "A"}
                </div>
              </button>

              {userDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 z-50 mt-2.5 w-48 rounded-lg border border-[var(--dropdown-border)] bg-[var(--dropdown-bg)] py-2 shadow-[var(--shadow-lg)] animate-in fade-in slide-in-from-top-2 duration-150">
                    <Link 
                      href="/admin/perfil"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center px-4 py-2.5 text-[13px] font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--primary-soft)] hover:text-[var(--primary-text)]"
                    >
                      <User className="w-4 h-4 mr-2.5" />
                      Ver Perfil
                    </Link>
                    <Link 
                      href="/"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center border-t border-[var(--dropdown-border)] px-4 py-2.5 text-[13px] font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--primary-soft)] hover:text-[var(--primary-text)]"
                    >
                      <Globe className="w-4 h-4 mr-2.5" />
                      Ir a la Web
                    </Link>
                    <button 
                      onClick={() => {
                        setUserDropdownOpen(false);
                        signOut({ callbackUrl: "/login" });
                      }}
                      className="flex w-full cursor-pointer items-center border-t border-[var(--dropdown-border)] px-4 py-2.5 text-left text-[13px] font-semibold text-red-500 transition-colors hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4 mr-2.5" />
                      Cerrar Sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-72px)] flex-1 overflow-x-hidden overflow-y-auto bg-[var(--page-bg)] p-5 transition-colors duration-300 sm:p-6 lg:p-8">
          <div className="animate-fade-in-up max-w-[1750px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
