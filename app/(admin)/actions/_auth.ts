import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requireAdminOrVendedor() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "admin" && session.user.role !== "vendedor")) {
    throw new Error("No autorizado.");
  }
  return session;
}

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    throw new Error("No autorizado.");
  }
  return session;
}

export async function requireConductorOwner(conductorId?: number) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "conductor" && session.user.role !== "admin")) {
    throw new Error("No autorizado.");
  }
  if (session.user.role === "conductor" && conductorId && Number(session.user.persona_id) !== conductorId) {
    throw new Error("No autorizado.");
  }
  return session;
}
