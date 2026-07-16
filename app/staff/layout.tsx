"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Bus, Globe } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  return (
    <div className="panel-shell flex min-h-screen flex-col bg-[var(--page-bg)] transition-colors duration-300">
      <header className="sticky top-0 z-50 flex h-[64px] items-center justify-between border-b border-[var(--topbar-border)] bg-[var(--topbar-bg)] px-4 shadow-[var(--shadow-sm)] transition-colors duration-300 sm:px-6">
        <Link href={session?.user?.role === 'conductor' ? '/staff/conductor' : '/staff/operario'} className="flex items-center gap-2 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#f07639]/25 bg-[var(--primary-soft)] text-[var(--primary-text)] transition-transform group-hover:scale-105">
            <Bus className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[14px] font-black uppercase leading-tight tracking-wide text-[var(--foreground)]">El Cumbe</span>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--primary-text)]">Panel de {session?.user?.role === 'conductor' ? 'Conductor' : 'Operario'}</span>
          </div>
        </Link>
        
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[13px] font-bold leading-tight text-[var(--foreground)]">{session?.user?.name}</p>
            <p className="text-[11px] font-medium capitalize text-[var(--muted)]">{session?.user?.role}</p>
          </div>

          <ThemeToggle />

          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--surface-secondary)] px-3 py-2 text-xs font-bold text-[var(--muted)] shadow-sm transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-text)]"
            title="Ir a la Web Principal (Pública)"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Ir a la Web</span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="group flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--surface-secondary)] text-[var(--muted)] transition-colors hover:border-red-500/40 hover:bg-red-50 hover:text-red-500"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden overflow-y-auto p-5 sm:p-6 lg:p-8 relative">
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
