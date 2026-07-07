"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Bus } from "lucide-react";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col">
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
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[13px] font-bold text-slate-800 leading-tight">{session?.user?.name}</p>
            <p className="text-[11px] text-slate-400 capitalize font-medium">{session?.user?.role}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center justify-center w-10 h-10 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-colors border border-slate-100 group"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden overflow-y-auto p-5 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
