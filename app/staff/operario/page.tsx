import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { obtenerViajesOperario, obtenerFiltrosOperario } from "@/app/(admin)/actions/operario";
import OperarioDashboardClient from "./OperarioDashboardClient";

export const dynamic = "force-dynamic";

export default async function OperarioDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "operario") {
    redirect("/login");
  }

  // Obtener datos en paralelo
  const [viajesRes, filtrosRes] = await Promise.all([
    obtenerViajesOperario(),
    obtenerFiltrosOperario(),
  ]);

  const viajes = viajesRes.success ? viajesRes.data : [];
  const rutas = filtrosRes.success ? filtrosRes.data.rutas : [];
  const buses = filtrosRes.success ? filtrosRes.data.buses : [];

  return (
    <OperarioDashboardClient
      viajes={viajes}
      rutas={rutas}
      buses={buses}
      userName={session.user.name ?? "Operario"}
    />
  );
}
