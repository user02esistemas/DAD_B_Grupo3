import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

const resetAttemptLimits = new Map<string, { count: number; resetTime: number }>();

function checkAttemptRateLimit(key: string) {
  const now = Date.now();
  const limit = resetAttemptLimits.get(key);
  if (!limit || now > limit.resetTime) {
    resetAttemptLimits.set(key, { count: 1, resetTime: now + 15 * 60 * 1000 });
    return;
  }
  if (limit.count >= 5) {
    throw new Error("RATE_LIMIT");
  }
  limit.count++;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, code, newPassword } = body;

    if (!email || !code || !newPassword || typeof email !== "string" || typeof code !== "string" || typeof newPassword !== "string") {
      return NextResponse.json(
        { message: "Faltan campos obligatorios o tienen formatos invalidos" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { message: "El formato de correo electronico no es valido" },
        { status: 400 }
      );
    }

    if (code.trim().length !== 6 || !/^\d+$/.test(code.trim())) {
      return NextResponse.json(
        { message: "El codigo debe ser numerico y de exactamente 6 digitos" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: "La nueva contrasena debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }

    checkAttemptRateLimit(normalizedEmail);

    const user = await prisma.usuario.findUnique({
      where: { correo: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Codigo invalido o expirado" },
        { status: 400 }
      );
    }

    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        user_id: user.id,
        code: code.trim(),
        is_used: false,
        expires_at: {
          gt: new Date(),
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    if (!verificationCode) {
      return NextResponse.json(
        { message: "Codigo invalido o expirado" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: user.id },
        data: { contrasena: hashedPassword },
      }),
      prisma.verificationCode.update({
        where: { id: verificationCode.id },
        data: { is_used: true },
      }),
    ]);

    return NextResponse.json(
      { message: "Contrasena actualizada correctamente" },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMIT") {
      return NextResponse.json(
        { message: "Demasiados intentos. Intenta nuevamente en 15 minutos" },
        { status: 429 }
      );
    }
    console.error("Error en reset-password:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
