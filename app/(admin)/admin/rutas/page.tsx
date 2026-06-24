import { obtenerRutas } from "../../actions/rutas";
import { obtenerSucursales } from "../../actions/sucursales";
import RutaClient from "./RutaClient";

export const dynamic = "force-dynamic";

export default async function RutasPage() {
  const [rutasRes, sucursalesRes] = await Promise.all([
    obtenerRutas(),
    obtenerSucursales()
  ]);

  if (!rutasRes.success) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>Error al cargar las rutas: {rutasRes.error}</p>
      </div>
    );
  }

  const sucursales = sucursalesRes.success ? sucursalesRes.data : [];

  return (
    <div>
      <RutaClient initialRutas={rutasRes.data || []} sucursales={sucursales} />
    </div>
  );
}
