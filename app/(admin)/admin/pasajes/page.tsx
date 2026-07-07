import { Suspense } from "react";
import { obtenerSucursales } from "../../actions/sucursales";
import PasajesClient from "./PasajesClient";

export const metadata = {
  title: "Venta de Pasajes | El Cumbe Admin",
};

export default async function PasajesPage() {
  const sucursalesRes = await obtenerSucursales();
  const sucursales = sucursalesRes.success ? sucursalesRes.data : [];

  return (
    <div className="max-w-7xl mx-auto">
      <Suspense fallback={<div className="flex items-center justify-center py-20 text-slate-400 text-sm font-medium">Cargando...</div>}>
        <PasajesClient initialSucursales={sucursales} />
      </Suspense>
    </div>
  );
}
