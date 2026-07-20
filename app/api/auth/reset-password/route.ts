import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { assertRateLimit, rateLimitKey, requestAddress } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(code) || newPassword.length < 8) {
      return NextResponse.json({ message: "Los datos proporcionados no son válidos" }, { status: 400 });
    }
    assertRateLimit(rateLimitKey("reset-password", requestAddress(req.headers), email), 5, 15 * 60_000);

    const user = await prisma.usuario.findUnique({ where: { correo: email } });
    if (!user) return NextResponse.json({ message: "Código inválido o expirado" }, { status: 400 });
    const verificationCode = await prisma.verificationCode.findFirst({
      where: { user_id: user.id, code: createHash("sha256").update(code).digest("hex"), is_used: false, expires_at: { gt: new Date() } },
      orderBy: { created_at: "desc" },
    });
    if (!verificationCode) return NextResponse.json({ message: "Código inválido o expirado" }, { status: 400 });

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction([
      prisma.usuario.update({ where: { id: user.id }, data: { contrasena: hashedPassword } }),
      prisma.verificationCode.updateMany({ where: { user_id: user.id, is_used: false }, data: { is_used: true } }),
    ]);
    return NextResponse.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMIT") {
      return NextResponse.json({ message: "Demasiados intentos. Intenta nuevamente en 15 minutos" }, { status: 429 });
    }
    console.error("Error en reset-password:", error);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
