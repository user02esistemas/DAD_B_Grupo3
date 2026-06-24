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
      <PasajesClient initialSucursales={sucursales} />
    </div>
  );
}
