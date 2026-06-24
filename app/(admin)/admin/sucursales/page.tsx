import { obtenerSucursales } from "../../actions/sucursales";
import SucursalClient from "./SucursalClient";

export const dynamic = "force-dynamic";

export default async function SucursalesPage() {
  const { data, success, error } = await obtenerSucursales();

  if (!success) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>Error al cargar las sucursales: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <SucursalClient initialData={data || []} />
    </div>
  );
}
