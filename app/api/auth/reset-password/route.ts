import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const { email, code, newPassword } = await req.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { message: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { correo: email },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    /*
    // Find a valid verification code
    const verificationCode = await prisma.verification_codes.findFirst({
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
    */

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Run updates in a transaction to ensure both happen or neither
    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: user.id },
        data: { contrasena: hashedPassword },
      }),
      /*
      prisma.verification_codes.update({
        where: { id: verificationCode.id },
        data: { is_used: true },
      }),
      */
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
