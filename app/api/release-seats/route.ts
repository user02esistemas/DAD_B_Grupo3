import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { seatIds, guestToken } = await req.json();
    if (!Array.isArray(seatIds) || seatIds.length === 0 || seatIds.some((id) => !/^\d+$/.test(String(id)))) {
      return NextResponse.json({ success: false, error: "Asientos inválidos." }, { status: 400 });
    }

    const ownership: Array<{ bloqueado_por_usuario_id: bigint } | { bloqueado_por_token: string }> = [];
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const user = await prisma.usuario.findUnique({ where: { correo: session.user.email } });
      if (user) ownership.push({ bloqueado_por_usuario_id: user.id });
    }
    if (typeof guestToken === "string" && guestToken.length >= 16) {
      ownership.push({ bloqueado_por_token: guestToken });
    }
    if (ownership.length === 0) return NextResponse.json({ success: false }, { status: 401 });

    const result = await prisma.asientoViaje.updateMany({
      where: { id: { in: seatIds.map((id) => BigInt(id)) }, estado: "pendiente", OR: ownership },
      data: { estado: "disponible", bloqueado_por_usuario_id: null, bloqueado_por_token: null, bloqueado_en: null }
    });
    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error("Error en API release-seats:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}