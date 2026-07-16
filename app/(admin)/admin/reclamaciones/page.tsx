import { getReclamaciones } from "@/app/(admin)/actions/reclamaciones";
import ReclamacionesClient from "./ReclamacionesClient";
import { MessageSquareWarning } from "lucide-react";

export const metadata = {
  title: "Gestión de Reclamaciones | El Cumbe",
  description: "Administración de reclamos y quejas",
};

export const dynamic = "force-dynamic";

export default async function ReclamacionesPage() {
  const reclamaciones = await getReclamaciones();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#f07639] to-[#d45a1f] flex items-center justify-center text-white shadow-lg shadow-[#f07639]/20">
            <MessageSquareWarning className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Reclamaciones</h2>
            <p className="text-[12px] text-slate-400 font-medium">Gestión de quejas y reclamos de los clientes.</p>
          </div>
        </div>
      </div>

      <ReclamacionesClient initialData={reclamaciones} />
    </div>
  );
}
