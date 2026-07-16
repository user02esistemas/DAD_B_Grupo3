import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { seatIds, guestToken } = body;
    
    if (seatIds && Array.isArray(seatIds) && seatIds.length > 0) {
      const session = await getServerSession(authOptions);
      let ownership = {};
      if (session?.user?.email) {
        const user = await prisma.usuario.findUnique({ where: { correo: session.user.email } });
        if (!user) return NextResponse.json({ success: false }, { status: 401 });
        ownership = { bloqueado_por_usuario_id: user.id };
      } else if (typeof guestToken === "string" && guestToken.length > 10) {
        ownership = { bloqueado_por_token: guestToken };
      } else {
        return NextResponse.json({ success: false }, { status: 401 });
      }

      await prisma.asientoViaje.updateMany({
        where: { 
          id: { in: seatIds.map((id: string) => BigInt(id)) }, 
          estado: "pendiente",
          ...ownership,
        },
        data: { 
          estado: "disponible",
          bloqueado_por_usuario_id: null,
          bloqueado_por_token: null,
          bloqueado_en: null,
        }
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Error en API release-seats:", e);
    return NextResponse.json({ success: false });
  }
}
