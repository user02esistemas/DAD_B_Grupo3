"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Bus, Globe } from "lucide-react";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#edf1f7' }}>
      <header className="h-[64px] bg-white flex items-center justify-between px-6 sticky top-0 border-b border-slate-100 z-50 shadow-sm">
        <Link href={session?.user?.role === 'conductor' ? '/staff/conductor' : '/staff/operario'} className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f07639]/20 to-[#f07639]/10 border border-[#f07639]/20 flex items-center justify-center text-[#f07639] group-hover:scale-105 transition-transform">
            <Bus className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[14px] font-black text-slate-800 uppercase tracking-wide block leading-tight">El Cumbe</span>
            <span className="text-[10px] font-bold text-[#f07639] uppercase tracking-wider block">Panel de {session?.user?.role === 'conductor' ? 'Conductor' : 'Operario'}</span>
          </div>
        </Link>
        
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[13px] font-bold text-slate-800 leading-tight">{session?.user?.name}</p>
            <p className="text-[11px] text-slate-400 capitalize font-medium">{session?.user?.role}</p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-orange-50 text-slate-500 hover:text-[#f07639] rounded-xl transition-colors border border-slate-100 font-bold text-xs shadow-sm"
            title="Ir a la Web Principal (Pública)"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Ir a la Web</span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center justify-center w-10 h-10 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-colors border border-slate-100 group"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden overflow-y-auto p-5 sm:p-6 lg:p-8 relative">
        {/* Orbs decorativos */}
        <div className="absolute top-10 right-10 w-72 h-72 bg-[#f07639]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-300/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
