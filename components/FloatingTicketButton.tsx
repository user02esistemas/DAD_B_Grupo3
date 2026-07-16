"use client";

import Link from "next/link";
import { Ticket } from "lucide-react";
import { usePathname } from "next/navigation";

export default function FloatingTicketButton() {
  const pathname = usePathname();

  // Ocultar el acceso flotante donde competiría con la tarea principal.
  if (pathname === "/perfil" || pathname === "/compra" || pathname === "/seguimiento") {
    return null;
  }

  return (
    <Link
      href="/perfil?tab=tickets"
      aria-label="Mis Pasajes"
      className="group fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg border border-white/20 bg-[var(--primary)] px-4 py-3 text-white shadow-[0_14px_34px_rgba(167,64,20,0.32)] transition-all hover:-translate-y-0.5 hover:bg-[var(--primary-dark)] hover:shadow-[0_18px_40px_rgba(167,64,20,0.38)] active:translate-y-0 sm:px-5"
    >
      <Ticket className="w-5 h-5 group-hover:rotate-12 transition-transform" />
      <span className="font-bold text-sm md:text-base hidden sm:inline-block tracking-wide">Mis Pasajes</span>
    </Link>
  );
}
