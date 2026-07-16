import { BookOpen, ShieldCheck } from "lucide-react";
import { ComplaintBookForm } from "@/components/ComplaintBook";

export default function LibroReclamacionesPage() {
  return (
    <div className="min-h-screen bg-transparent">
      <header className="border-b border-[var(--card-border)] bg-[var(--surface-secondary)]">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[var(--primary-soft)] text-[var(--primary-text)]">
              <BookOpen className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase text-[var(--primary-text)]">Atención al consumidor</p>
              <h1 className="mt-1 text-3xl font-extrabold text-[var(--foreground)] sm:text-4xl">Libro de Reclamaciones Virtual</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                Registra una queja o reclamo relacionado con nuestros servicios de transporte y encomiendas.
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 border-t border-[var(--card-border)] pt-4 text-xs text-[var(--muted)]">
            <ShieldCheck className="h-4 w-4 text-[var(--secondary)]" aria-hidden="true" />
            Transportes El Cumbe S.A.C. - RUC 20123456789
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <ComplaintBookForm />
      </main>
    </div>
  );
}
