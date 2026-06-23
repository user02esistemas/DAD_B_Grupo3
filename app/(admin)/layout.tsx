"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { 
  BusFront, 
  LayoutDashboard, 
  Ticket, 
  Package, 
  Bus, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: "Inicio", href: "/admin", icon: LayoutDashboard },
    { name: "Venta Pasajes", href: "/admin/pasajes", icon: Ticket },
    { name: "Gestión Encomiendas", href: "/admin/encomiendas", icon: Package },
    { name: "Flota de Buses", href: "/admin/buses", icon: Bus },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/80 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-gray-900 text-white flex flex-col transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="flex items-center justify-between h-16 px-4 bg-gray-950">
          <Link href="/admin" className="flex items-center space-x-2">
            <BusFront className="w-8 h-8 text-[#f07639]" />
            <span className="text-xl font-bold tracking-tight">El Cumbe Admin</span>
          </Link>
          <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center px-4 py-3 rounded-xl transition-colors
                  ${isActive ? "bg-[#f07639] text-white font-bold shadow-md" : "text-gray-400 hover:bg-gray-800 hover:text-white font-medium"}
                `}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className={`w-5 h-5 mr-3 ${isActive ? "text-white" : "text-gray-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 bg-gray-950 border-t border-gray-800">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-[#f07639] font-bold uppercase">
              {session?.user?.name?.charAt(0) || "A"}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{session?.user?.name}</p>
              <p className="text-xs text-gray-500 truncate capitalize">{session?.user?.role}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center justify-center px-4 py-2 bg-gray-800 hover:bg-red-900/50 text-gray-300 hover:text-red-400 rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 z-30 shadow-sm sticky top-0">
          <div className="flex items-center">
            <button
              className="md:hidden text-gray-600 hover:text-gray-900 mr-4"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-800 hidden sm:block">Panel de Control</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-900">{session?.user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{session?.user?.role}</p>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
