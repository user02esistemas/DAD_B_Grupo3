import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, code, newPassword } = body;

    if (!email || !code || !newPassword || typeof email !== "string" || typeof code !== "string" || typeof newPassword !== "string") {
      return NextResponse.json(
        { message: "Faltan campos obligatorios o tienen formatos inválidos" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { message: "El formato de correo electrónico no es válido" },
        { status: 400 }
      );
    }

    if (code.trim().length !== 6 || !/^\d+$/.test(code.trim())) {
      return NextResponse.json(
        { message: "El código debe ser numérico y de exactamente 6 dígitos" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: "La nueva contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }

    const user = await prisma.cliente.findUnique({
      where: { correo: email },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Find a valid verification code
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        user_id: user.id,
        code: code,
        is_used: false,
        expires_at: {
          gt: new Date(), // Must not be expired
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!verificationCode) {
      return NextResponse.json(
        { message: "Código inválido o expirado" },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Run updates in a transaction
    await prisma.$transaction([
      prisma.cliente.update({
        where: { id: user.id },
        data: { contrasena: hashedPassword },
      }),
      prisma.verificationCode.update({
        where: { id: verificationCode.id },
        data: { is_used: true },
      }),
    ]);

    return NextResponse.json(
      { message: "Contraseña actualizada correctamente" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error en reset-password:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
