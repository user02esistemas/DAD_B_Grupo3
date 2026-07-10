import { obtenerUsuarios } from "@/app/(admin)/actions/usuarios";
import UsuariosClient from "./UsuariosClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  const result = await obtenerUsuarios();
  
  if (!result.success) {
    return (
      <div className="p-8 text-center bg-red-50 text-red-600 rounded-xl">
        {result.error}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <UsuariosClient 
        usuarios={result.data} 
        userRole={session.user.role || "cliente"} 
        currentUserId={session.user.id} 
      />
    </div>
  );
}
