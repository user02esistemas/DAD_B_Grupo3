import { obtenerEncomiendas } from "../../actions/encomiendas";
import { obtenerViajes } from "../../actions/viajes";
import EncomiendaClient from "./EncomiendaClient";

export const dynamic = "force-dynamic";

export default async function EncomiendasPage() {
  const [encomiendasRes, viajesRes] = await Promise.all([
    obtenerEncomiendas(),
    obtenerViajes()
  ]);

  if (!encomiendasRes.success) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>Error al cargar las encomiendas: {encomiendasRes.error}</p>
      </div>
    );
  }

  // Filtrar solo los viajes activos que pueden llevar encomiendas
  const viajesActivos = (viajesRes.success ? viajesRes.data : []).filter(
    (v: any) => v.estado === 'programado' || v.estado === 'en_ruta'
  );

  return (
    <div>
      <EncomiendaClient 
        initialEncomiendas={encomiendasRes.data || []} 
        viajesActivos={viajesActivos} 
      />
    </div>
  );
}
