"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { buscarEncomiendaPorCodigo, buscarEncomiendasPorDNI } from "@/app/actions";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  LoaderCircle,
  MapPin,
  Package,
  PackageCheck,
  PackageSearch,
  Search,
  Truck,
  Warehouse,
} from "lucide-react";

const shipmentSteps = [
  { label: "Recepcionado", description: "Registrado en origen", icon: Package },
  { label: "En tránsito", description: "Viajando a destino", icon: Truck },
  { label: "Listo para recojo", description: "Disponible en oficina", icon: Warehouse },
  { label: "Entregado", description: "Recibido conforme", icon: PackageCheck },
];

const getProgressStep = (status: string) => {
  switch (status) {
    case "recepcionado":
      return 1;
    case "en_transito":
      return 2;
    case "listo_para_recojo":
      return 3;
    case "entregado":
      return 4;
    default:
      return 0;
  }
};

const statusConfig: Record<
  string,
  { label: string; icon: typeof Package; className: string }
> = {
  recepcionado: {
    label: "Recepcionado",
    icon: Package,
    className:
      "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/80 dark:bg-sky-950/40 dark:text-sky-300",
  },
  en_transito: {
    label: "En tránsito",
    icon: Truck,
    className:
      "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900/80 dark:bg-orange-950/40 dark:text-orange-300",
  },
  listo_para_recojo: {
    label: "Listo para recojo",
    icon: Warehouse,
    className:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/80 dark:bg-amber-950/40 dark:text-amber-300",
  },
  entregado: {
    label: "Entregado",
    icon: CheckCircle2,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/80 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? {
    label: status,
    icon: Package,
    className:
      "border-[var(--card-border)] bg-[var(--surface)] text-[var(--foreground)]",
  };
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold ${config.className}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {config.label}
    </span>
  );
}

function ShipmentProgress({ status }: { status: string }) {
  const currentStep = getProgressStep(status);
  const progress = `${((Math.max(1, currentStep) - 1) / 3) * 100}%`;

  return (
    <section aria-label="Progreso de la encomienda" className="border-t border-[var(--card-border)] pt-6">
      <div className="hidden sm:block">
        <div className="relative">
          <div className="absolute left-4 right-4 top-4 h-0.5 bg-[var(--surface)]" aria-hidden="true">
            <div
              className="h-full bg-[var(--primary)] transition-[width] duration-500"
              style={{ width: progress }}
            />
          </div>
          <ol className="relative grid grid-cols-4">
            {shipmentSteps.map((step, index) => {
              const stepNumber = index + 1;
              const completed = stepNumber < currentStep;
              const active = stepNumber === currentStep;
              const Icon = step.icon;

              return (
                <li key={step.label} className="flex flex-col items-center px-2 text-center">
                  <span
                    className={`z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                      completed
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                        : active
                          ? "border-[var(--primary)] bg-[var(--card-bg)] text-[var(--primary)] ring-4 ring-[var(--primary-soft)]"
                          : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--muted)]"
                    }`}
                  >
                    {completed ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span
                    className={`mt-3 text-xs font-bold ${
                      active || completed ? "text-[var(--foreground)]" : "text-[var(--muted)]"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="mt-1 text-[11px] leading-4 text-[var(--muted)]">{step.description}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <ol className="sm:hidden">
        {shipmentSteps.map((step, index) => {
          const stepNumber = index + 1;
          const completed = stepNumber < currentStep;
          const active = stepNumber === currentStep;
          const Icon = step.icon;

          return (
            <li key={step.label} className="relative flex min-h-16 gap-3 pb-3 last:min-h-0 last:pb-0">
              {index < shipmentSteps.length - 1 && (
                <span
                  className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${
                    completed ? "bg-[var(--primary)]" : "bg-[var(--surface)]"
                  }`}
                  aria-hidden="true"
                />
              )}
              <span
                className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                  completed
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                    : active
                      ? "border-[var(--primary)] bg-[var(--card-bg)] text-[var(--primary)]"
                      : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--muted)]"
                }`}
              >
                {completed ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </span>
              <div className="pt-0.5">
                <p className={`text-sm font-bold ${active || completed ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
                  {step.label}
                </p>
                <p className="text-xs text-[var(--muted)]">{step.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default function SeguimientoPage() {
  const { data: session } = useSession();
  const [dni, setDni] = useState("");
  const [useRegisteredDni, setUseRegisteredDni] = useState(false);
  const [loading, setLoading] = useState(false);
  const [encomiendas, setEncomiendas] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"en_curso" | "historial">("en_curso");

  useEffect(() => {
    const userDni = (session?.user as any)?.dni;
    if (userDni && !hasSearched) {
      setDni(userDni);
      setUseRegisteredDni(true);
      setLoading(true);
      setHasSearched(true);
      buscarEncomiendasPorDNI(userDni)
        .then((resultados) => setEncomiendas(resultados))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [session, hasSearched]);

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    setUseRegisteredDni(isChecked);

    const userDni = (session?.user as any)?.dni;
    setDni(isChecked && userDni ? userDni : "");
  };

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!session) {
      if (!dni || dni.trim().length < 5) return;
      setLoading(true);
      setHasSearched(true);
      setError(null);
      try {
        const result = await buscarEncomiendaPorCodigo(dni);
        if (result.success && result.data) {
          setEncomiendas([result.data]);
        } else {
          setEncomiendas([]);
          setError(result.error || "Encomienda no encontrada.");
        }
      } catch (searchError) {
        console.error(searchError);
        setError("Ocurrió un error al buscar la encomienda.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!dni || dni.length < 8) return;
    setLoading(true);
    setHasSearched(true);
    setError(null);
    try {
      const results = await buscarEncomiendasPorDNI(dni);
      setEncomiendas(results);
    } catch (searchError) {
      console.error(searchError);
      setError("Ocurrió un error al buscar las encomiendas.");
    } finally {
      setLoading(false);
    }
  };

  const enCurso = encomiendas.filter((shipment) =>
    ["recepcionado", "en_transito", "listo_para_recojo"].includes(shipment.estado),
  );
  const historial = encomiendas.filter((shipment) => shipment.estado === "entregado");
  const currentList = activeTab === "en_curso" ? enCurso : historial;
  const userDni = (session?.user as any)?.dni;
  const searchDisabled = loading || (session ? dni.length < 8 : dni.trim().length < 5);

  return (
    <div className="relative min-h-[calc(100vh-5rem)] bg-gradient-to-tr from-amber-50/50 via-white to-orange-50/40 dark:from-[#090a0f] dark:via-[#12131a] dark:to-[#090a0f] overflow-hidden">
      {/* Orbes decorativos difuminados de fondo (Glow effect) */}
      <div className="pointer-events-none absolute -left-36 top-[5%] z-0 h-96 w-96 rounded-full bg-orange-300/35 filter blur-3xl dark:bg-orange-900/10" />
      <div className="pointer-events-none absolute -right-36 bottom-[15%] z-0 h-96 w-96 rounded-full bg-amber-300/30 filter blur-3xl dark:bg-amber-900/10" />

      <section className="relative z-10">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:px-8 lg:py-10">
          <header className="relative z-10">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-[var(--primary-text)]">
              <PackageSearch className="h-4 w-4" aria-hidden="true" />
              Seguimiento de encomiendas
            </div>
            <h1 className="max-w-xl text-3xl font-extrabold leading-tight text-[var(--foreground)] sm:text-4xl">
              Ubica tu envío en cada tramo del camino
            </h1>
            <p className="mt-2.5 max-w-lg text-xs font-semibold leading-5 text-[var(--muted)]">
              {session
                ? "Consulta con tu DNI las encomiendas asociadas y revisa cuáles siguen en ruta."
                : "Consulta con el código entregado al registrar tu encomienda."}
            </p>
          </header>

          <form
            onSubmit={handleSearch}
            className="relative z-10 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]/90 backdrop-blur-md p-4 shadow-[var(--shadow-md)] sm:p-5"
          >
            <label htmlFor="tracking-query" className="text-sm font-bold text-[var(--foreground)]">
              {session ? "DNI (Remitente o Destinatario)" : "Código de seguimiento"}
            </label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]"
                  aria-hidden="true"
                />
                <input
                  id="tracking-query"
                  type="text"
                  maxLength={session ? 8 : 30}
                  className="h-12 w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] pl-11 pr-4 text-base font-semibold text-[var(--input-text)] outline-none placeholder:font-normal placeholder:text-[var(--input-placeholder)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-wait"
                  placeholder={session ? "Ingresa 8 dígitos" : "Ej. ENC-12345"}
                  value={dni}
                  onChange={(event) => {
                    setDni(session ? event.target.value.replace(/\D/g, "") : event.target.value.toUpperCase());
                    if (useRegisteredDni) setUseRegisteredDni(false);
                  }}
                  disabled={loading}
                  autoComplete="off"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={searchDisabled}
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-6 text-sm font-bold text-white shadow-[0_8px_22px_rgba(185,65,20,0.18)] transition-colors hover:bg-[var(--primary-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--card-bg)] disabled:cursor-not-allowed disabled:bg-[var(--surface)] disabled:text-[var(--muted)] disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
                    Consultando
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" aria-hidden="true" />
                    Buscar envío
                  </>
                )}
              </button>
            </div>

            {userDni && (
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-[var(--muted)]">
                <input
                  id="use-dni"
                  name="use-dni"
                  type="checkbox"
                  className="h-4 w-4 rounded border-[var(--input-border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  checked={useRegisteredDni}
                  onChange={handleCheckboxChange}
                />
                Usar mi DNI registrado ({userDni})
              </label>
            )}
          </form>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {error && !loading && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900/80 dark:bg-red-950/35 dark:text-red-300"
          >
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold">No pudimos completar la consulta</p>
              <p className="mt-0.5 font-normal">{error}</p>
            </div>
          </div>
        )}

        {!hasSearched && !error && (
          <section aria-labelledby="shipment-route-title">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-[var(--primary-text)]">Trayecto del envío</p>
                <h2 id="shipment-route-title" className="mt-1 text-xl font-extrabold text-[var(--foreground)] sm:text-2xl">
                  Cuatro estados, una ruta clara
                </h2>
              </div>
              <Truck className="hidden h-7 w-7 text-[var(--primary)] sm:block" aria-hidden="true" />
            </div>

            <ol className="grid overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] sm:grid-cols-2 lg:grid-cols-4">
              {shipmentSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.label}
                    className="flex min-h-28 items-center gap-4 border-b border-[var(--card-border)] p-5 last:border-b-0 sm:[&:nth-child(3)]:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--primary-soft)] text-[var(--primary-text)]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--muted)]">0{index + 1}</p>
                      <h3 className="mt-0.5 text-sm font-bold text-[var(--foreground)]">{step.label}</h3>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{step.description}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {hasSearched && !loading && !error && (
          <section className="space-y-6" aria-live="polite">
            {session && (
              <div className="flex overflow-x-auto border-b border-[var(--card-border)]" role="tablist" aria-label="Encomiendas">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "en_curso"}
                  onClick={() => setActiveTab("en_curso")}
                  className={`flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-bold transition-colors ${
                    activeTab === "en_curso"
                      ? "border-[var(--primary)] text-[var(--primary-text)]"
                      : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <Truck className="h-4 w-4" aria-hidden="true" />
                  En curso <span className="font-semibold">({enCurso.length})</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "historial"}
                  onClick={() => setActiveTab("historial")}
                  className={`flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-bold transition-colors ${
                    activeTab === "historial"
                      ? "border-[var(--primary)] text-[var(--primary-text)]"
                      : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <Clock3 className="h-4 w-4" aria-hidden="true" />
                  Historial <span className="font-semibold">({historial.length})</span>
                </button>
              </div>
            )}

            {currentList.length === 0 ? (
              <div className="flex flex-col items-center rounded-lg border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] px-5 py-12 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[var(--surface)] text-[var(--muted)]">
                  <PackageSearch className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-lg font-bold text-[var(--foreground)]">No hay encomiendas para mostrar</h2>
                <p className="mt-1 max-w-md text-sm leading-6 text-[var(--muted)]">
                  {session
                    ? activeTab === "en_curso"
                      ? "No encontramos encomiendas activas asociadas a este DNI."
                      : "Todavía no hay encomiendas entregadas en tu historial."
                    : "No encontramos una encomienda con el código ingresado."}
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {currentList.map((shipment) => (
                  <article
                    key={shipment.id}
                    className="overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--shadow-sm)]"
                  >
                    <header className="flex flex-col gap-3 border-b border-[var(--card-border)] bg-[var(--surface-secondary)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <div>
                        <p className="text-[11px] font-bold uppercase text-[var(--muted)]">Código de seguimiento</p>
                        <h2 className="mt-1 text-lg font-extrabold text-[var(--foreground)]">
                          {shipment.codigo_seguimiento}
                        </h2>
                      </div>
                      <StatusBadge status={shipment.estado} />
                    </header>

                    <div className="p-5 sm:p-6">
                      <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
                        <div className="rounded-md border border-[var(--card-border)] bg-[var(--surface-secondary)] p-4">
                          <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--muted)]">
                            <MapPin className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
                            Origen
                          </div>
                          <p className="mt-2 text-base font-extrabold text-[var(--foreground)]">
                            {shipment.origen?.nombre || "Sin información"}
                          </p>
                        </div>
                        <div className="flex items-center justify-center text-[var(--primary)]">
                          <ArrowRight className="h-5 w-5 rotate-90 md:rotate-0" aria-hidden="true" />
                        </div>
                        <div className="rounded-md border border-[var(--card-border)] bg-[var(--surface-secondary)] p-4">
                          <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--muted)]">
                            <Warehouse className="h-4 w-4 text-[var(--secondary)]" aria-hidden="true" />
                            Destino
                          </div>
                          <p className="mt-2 text-base font-extrabold text-[var(--foreground)]">
                            {shipment.destino?.nombre || "Sin información"}
                          </p>
                        </div>
                      </div>

                      <dl className="my-6 grid grid-cols-1 border-y border-[var(--card-border)] sm:grid-cols-3 sm:divide-x sm:divide-[var(--card-border)]">
                        <div className="flex items-center gap-3 border-b border-[var(--card-border)] py-4 sm:border-b-0 sm:px-4 sm:first:pl-0">
                          <Package className="h-5 w-5 shrink-0 text-[var(--muted)]" aria-hidden="true" />
                          <div>
                            <dt className="text-[11px] font-bold uppercase text-[var(--muted)]">Carga</dt>
                            <dd className="mt-0.5 text-sm font-bold text-[var(--foreground)]">{shipment.peso_kg} kg</dd>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 border-b border-[var(--card-border)] py-4 sm:border-b-0 sm:px-4">
                          <CalendarDays className="h-5 w-5 shrink-0 text-[var(--muted)]" aria-hidden="true" />
                          <div>
                            <dt className="text-[11px] font-bold uppercase text-[var(--muted)]">Registrado</dt>
                            <dd className="mt-0.5 text-sm font-bold text-[var(--foreground)]">
                              {new Date(shipment.created_at).toLocaleDateString("es-PE")}
                            </dd>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 py-4 sm:px-4 sm:pr-0">
                          <span className="text-lg font-black text-[var(--primary-text)]">S/</span>
                          <div>
                            <dt className="text-[11px] font-bold uppercase text-[var(--muted)]">Costo</dt>
                            <dd className="mt-0.5 text-sm font-bold text-[var(--foreground)]">S/ {shipment.precio}</dd>
                          </div>
                        </div>
                      </dl>

                      <ShipmentProgress status={shipment.estado} />

                      <div className="mt-6 flex items-start gap-2 border-t border-[var(--card-border)] pt-4 text-xs text-[var(--muted)]">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--secondary)]" aria-hidden="true" />
                        <p>
                          Destinatario: <span className="font-bold text-[var(--foreground)]">{shipment.destinatario_nombre}</span>
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
