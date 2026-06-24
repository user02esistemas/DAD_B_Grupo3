import { obtenerBuses } from "../../actions/buses";
import BusClient from "./BusClient";

export const dynamic = "force-dynamic";

export default async function BusesPage() {
  const { data, success, error } = await obtenerBuses();

  if (!success) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>Error al cargar los buses: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <BusClient initialData={data || []} />
    </div>
  );
}
