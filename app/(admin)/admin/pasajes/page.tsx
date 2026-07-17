import { Suspense } from "react";
import { obtenerSucursales } from "../../actions/sucursales";
import PasajesClient from "./PasajesClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "Venta de Pasajes | El Cumbe Admin",
};

export default async function PasajesPage() {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role || "cliente";

  const sucursalesRes = await obtenerSucursales();
  const sucursales = sucursalesRes.success ? sucursalesRes.data : [];

  return (
    <div className="max-w-7xl mx-auto">
      <Suspense fallback={<div className="flex items-center justify-center py-20 text-slate-400 text-sm font-medium">Cargando...</div>}>
        <PasajesClient initialSucursales={sucursales} userRole={userRole} />
      </Suspense>
    </div>
  );
}
