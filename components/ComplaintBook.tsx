"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  BookOpen,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Printer,
  Send,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";
import { buscarPersonaPorDNI, registrarReclamo } from "@/app/actions";

type ComplaintFormData = {
  nombres: string;
  apellidos: string;
  dni: string;
  telefono: string;
  correo: string;
  tipo: "reclamo" | "queja";
  fecha_incidente: string;
  detalle_incidente: string;
  pedido_cliente: string;
};

type SuccessData = {
  codigo: string;
  tipo: string;
  persona: { nombres: string; apellidos: string; dni: string };
};

const initialFormData: ComplaintFormData = {
  nombres: "",
  apellidos: "",
  dni: "",
  telefono: "",
  correo: "",
  tipo: "reclamo",
  fecha_incidente: "",
  detalle_incidente: "",
  pedido_cliente: "",
};

const fieldClass =
  "h-11 w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 text-sm text-[var(--input-text)] outline-none placeholder:text-[var(--input-placeholder)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";

const textAreaClass =
  "w-full resize-y rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-3 text-sm leading-6 text-[var(--input-text)] outline-none placeholder:text-[var(--input-placeholder)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";

const labelClass = "mb-1.5 block text-xs font-bold text-[var(--foreground)]";

function RequiredMark() {
  return <span className="text-red-600 dark:text-red-400"> *</span>;
}

export function ComplaintBookForm({ onClose }: { onClose?: () => void }) {
  const idPrefix = useId().replace(/:/g, "");
  const [formData, setFormData] = useState<ComplaintFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingDni, setIsSearchingDni] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const searchDni = async () => {
      if (!/^\d{8}$/.test(formData.dni)) return;

      setIsSearchingDni(true);
      try {
        const result = await buscarPersonaPorDNI(formData.dni);
        if (result.success && result.data) {
          setFormData((current) => ({
            ...current,
            nombres: result.data.nombres,
            apellidos: result.data.apellidos,
            telefono: result.data.telefono || current.telefono,
            correo: result.data.correo || current.correo,
          }));
        }
      } catch (searchError) {
        console.error("Error al buscar DNI:", searchError);
      } finally {
        setIsSearchingDni(false);
      }
    };

    void searchDni();
  }, [formData.dni]);

  const updateField = (name: keyof ComplaintFormData, value: string) => {
    let normalizedValue = value;
    if (name === "dni") normalizedValue = value.replace(/\D/g, "").slice(0, 8);
    if (name === "telefono") normalizedValue = value.replace(/\D/g, "").slice(0, 9);
    setFormData((current) => ({ ...current, [name]: normalizedValue }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!/^\d{8}$/.test(formData.dni)) {
      setError("El DNI debe tener exactamente 8 dígitos.");
      return;
    }
    if (formData.telefono && !/^\d{9}$/.test(formData.telefono)) {
      setError("El teléfono debe tener exactamente 9 dígitos.");
      return;
    }
    if (formData.fecha_incidente > today) {
      setError("La fecha del incidente no puede ser posterior a hoy.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await registrarReclamo(formData);
      if (result.success && result.data) {
        setSuccessData(result.data);
      } else {
        setError(result.error || "No pudimos registrar tu solicitud.");
      }
    } catch (submitError) {
      console.error("Error al registrar el reclamo:", submitError);
      setError("Ocurrió un error de conexión. Inténtalo nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  if (successData) {
    return (
      <article data-complaint-receipt className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-5 sm:p-7">
        <header className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-2xl font-extrabold text-[var(--foreground)]">Reclamación registrada</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Conserva este código para consultar tu solicitud.</p>
          <div className="mx-auto mt-5 max-w-sm rounded-md border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-900/70 dark:bg-orange-950/30">
            <p className="text-[11px] font-bold uppercase text-orange-800 dark:text-orange-300">Código de reclamación</p>
            <p className="mt-1 text-xl font-extrabold text-[var(--primary-text)]">{successData.codigo}</p>
          </div>
        </header>

        <dl className="mt-7 grid gap-x-6 gap-y-4 border-y border-[var(--card-border)] py-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-bold text-[var(--muted)]">Consumidor</dt>
            <dd className="mt-1 font-semibold text-[var(--foreground)]">
              {successData.persona.nombres} {successData.persona.apellidos}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-[var(--muted)]">DNI</dt>
            <dd className="mt-1 font-semibold text-[var(--foreground)]">{successData.persona.dni}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-[var(--muted)]">Tipo</dt>
            <dd className="mt-1 font-semibold capitalize text-[var(--foreground)]">{successData.tipo}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-[var(--muted)]">Fecha del incidente</dt>
            <dd className="mt-1 font-semibold text-[var(--foreground)]">{formData.fecha_incidente}</dd>
          </div>
        </dl>

        <div className="mt-5 space-y-4 text-sm">
          <div>
            <h3 className="font-bold text-[var(--foreground)]">Detalle</h3>
            <p className="mt-1 whitespace-pre-wrap leading-6 text-[var(--muted)]">{formData.detalle_incidente}</p>
          </div>
          <div>
            <h3 className="font-bold text-[var(--foreground)]">Pedido del consumidor</h3>
            <p className="mt-1 whitespace-pre-wrap leading-6 text-[var(--muted)]">{formData.pedido_cliente}</p>
          </div>
        </div>

        <p className="mt-6 border-t border-[var(--card-border)] pt-4 text-xs leading-5 text-[var(--muted)]">
          Transportes El Cumbe brindará respuesta dentro del plazo legal aplicable.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 print:hidden sm:flex-row sm:justify-end">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-md border border-[var(--card-border)] px-5 text-sm font-bold text-[var(--foreground)] hover:bg-[var(--surface)]"
            >
              Cerrar
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-5 text-sm font-bold text-white hover:bg-[var(--primary-dark)]"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            Imprimir constancia
          </button>
        </div>
      </article>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate={false}>
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/80 dark:bg-red-950/35 dark:text-red-300">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <section aria-labelledby={`${idPrefix}-consumer`}>
        <div className="mb-5 flex items-center gap-3 border-b border-[var(--card-border)] pb-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--primary-soft)] text-[var(--primary-text)]">
            <UserRound className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase text-[var(--primary-text)]">Paso 1</p>
            <h3 id={`${idPrefix}-consumer`} className="font-extrabold text-[var(--foreground)]">Identificación del consumidor</h3>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${idPrefix}-dni`} className={labelClass}>DNI<RequiredMark /></label>
            <div className="relative">
              <input
                id={`${idPrefix}-dni`}
                name="dni"
                inputMode="numeric"
                autoComplete="off"
                required
                pattern="\d{8}"
                value={formData.dni}
                onChange={(event) => updateField("dni", event.target.value)}
                placeholder="8 dígitos"
                className={`${fieldClass} pr-10`}
              />
              {isSearchingDni && <LoaderCircle className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-[var(--primary)]" aria-label="Buscando DNI" />}
            </div>
          </div>
          <div>
            <label htmlFor={`${idPrefix}-email`} className={labelClass}>Correo electrónico<RequiredMark /></label>
            <input
              id={`${idPrefix}-email`}
              name="correo"
              type="email"
              autoComplete="email"
              required
              maxLength={120}
              value={formData.correo}
              onChange={(event) => updateField("correo", event.target.value)}
              placeholder="nombre@correo.com"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-names`} className={labelClass}>Nombres<RequiredMark /></label>
            <input
              id={`${idPrefix}-names`}
              name="nombres"
              autoComplete="given-name"
              required
              maxLength={80}
              value={formData.nombres}
              onChange={(event) => updateField("nombres", event.target.value)}
              placeholder="Tus nombres"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-lastnames`} className={labelClass}>Apellidos<RequiredMark /></label>
            <input
              id={`${idPrefix}-lastnames`}
              name="apellidos"
              autoComplete="family-name"
              required
              maxLength={80}
              value={formData.apellidos}
              onChange={(event) => updateField("apellidos", event.target.value)}
              placeholder="Tus apellidos"
              className={fieldClass}
            />
          </div>
          <div className="sm:col-span-2 sm:max-w-sm">
            <label htmlFor={`${idPrefix}-phone`} className={labelClass}>Teléfono o celular</label>
            <input
              id={`${idPrefix}-phone`}
              name="telefono"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              pattern="\d{9}"
              value={formData.telefono}
              onChange={(event) => updateField("telefono", event.target.value)}
              placeholder="9 dígitos (opcional)"
              className={fieldClass}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby={`${idPrefix}-incident`}>
        <div className="mb-5 flex items-center gap-3 border-b border-[var(--card-border)] pb-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--primary-soft)] text-[var(--primary-text)]">
            <FileText className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase text-[var(--primary-text)]">Paso 2</p>
            <h3 id={`${idPrefix}-incident`} className="font-extrabold text-[var(--foreground)]">Detalle de la incidencia</h3>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className={labelClass}>Tipo de incidencia<RequiredMark /></span>
            <div className="grid grid-cols-2 rounded-md border border-[var(--input-border)] bg-[var(--surface-secondary)] p-1" role="group" aria-label="Tipo de incidencia">
              {(["reclamo", "queja"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={formData.tipo === type}
                  onClick={() => updateField("tipo", type)}
                  className={`min-h-9 rounded px-3 text-sm font-bold capitalize transition-colors ${formData.tipo === type ? "bg-[var(--card-bg)] text-[var(--primary-text)] shadow-[var(--shadow-sm)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor={`${idPrefix}-date`} className={labelClass}>Fecha del incidente<RequiredMark /></label>
            <input
              id={`${idPrefix}-date`}
              name="fecha_incidente"
              type="date"
              required
              max={today}
              value={formData.fecha_incidente}
              onChange={(event) => updateField("fecha_incidente", event.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`${idPrefix}-detail`} className={labelClass}>Detalle del incidente<RequiredMark /></label>
            <textarea
              id={`${idPrefix}-detail`}
              name="detalle_incidente"
              required
              minLength={10}
              maxLength={1500}
              rows={4}
              value={formData.detalle_incidente}
              onChange={(event) => updateField("detalle_incidente", event.target.value)}
              placeholder="Describe qué ocurrió, dónde y cuándo."
              className={textAreaClass}
            />
            <p className="mt-1 text-right text-[11px] text-[var(--muted)]">{formData.detalle_incidente.length}/1500</p>
          </div>
        </div>
      </section>

      <section aria-labelledby={`${idPrefix}-request`}>
        <div className="mb-5 flex items-center gap-3 border-b border-[var(--card-border)] pb-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--primary-soft)] text-[var(--primary-text)]">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase text-[var(--primary-text)]">Paso 3</p>
            <h3 id={`${idPrefix}-request`} className="font-extrabold text-[var(--foreground)]">Pedido del consumidor</h3>
          </div>
        </div>
        <label htmlFor={`${idPrefix}-request-text`} className={labelClass}>¿Qué solución solicitas?<RequiredMark /></label>
        <textarea
          id={`${idPrefix}-request-text`}
          name="pedido_cliente"
          required
          minLength={5}
          maxLength={1000}
          rows={3}
          value={formData.pedido_cliente}
          onChange={(event) => updateField("pedido_cliente", event.target.value)}
          placeholder="Indica la solución concreta que esperas de la empresa."
          className={textAreaClass}
        />
        <p className="mt-1 text-right text-[11px] text-[var(--muted)]">{formData.pedido_cliente.length}/1000</p>
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--card-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-xs leading-5 text-[var(--muted)]">Al enviar, declaras que la información ingresada es verdadera.</p>
        <button
          type="submit"
          disabled={isLoading || isSearchingDni}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-6 text-sm font-bold text-white transition-colors hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:bg-[var(--surface)] disabled:text-[var(--muted)]"
        >
          {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          {isLoading ? "Registrando" : "Enviar reclamación"}
        </button>
      </div>
    </form>
  );
}

type ModalTriggerProps = {
  label?: string;
  className?: string;
  icon?: ReactNode;
};

export function ComplaintBookModalTrigger({
  label = "Libro de Reclamaciones",
  className = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#3a4a43] bg-[#202c27] px-4 text-sm font-semibold text-white transition-colors hover:border-[#f07639] hover:bg-[#26342e]",
  icon = <BookOpen className="h-[18px] w-[18px] text-[#ff8b55]" aria-hidden="true" />,
}: ModalTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const closeModal = () => {
    setIsOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className={className}
      >
        {icon}
        {label}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-3 backdrop-blur-[2px] sm:p-6 print:static print:block print:bg-white print:p-0"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--shadow-lg)] sm:max-h-[calc(100vh-3rem)] print:max-h-none print:max-w-none print:border-0 print:shadow-none"
          >
            <header className="flex items-start justify-between gap-4 border-b border-[var(--card-border)] bg-[var(--surface-secondary)] px-4 py-3.5 sm:px-6 print:hidden">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--primary-soft)] text-[var(--primary-text)]">
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 id={titleId} className="text-base font-extrabold text-[var(--foreground)] sm:text-lg">Libro de Reclamaciones Virtual</h2>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">Transportes El Cumbe S.A.C. - RUC 20123456789</p>
                </div>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={closeModal}
                aria-label="Cerrar Libro de Reclamaciones"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--card-border)] text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>
            <div className="overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
              <ComplaintBookForm onClose={closeModal} />
            </div>
          </section>
        </div>
      )}
    </>
  );
}
