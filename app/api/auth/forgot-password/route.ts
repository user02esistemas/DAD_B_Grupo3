import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { randomInt } from "crypto";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const resetRateLimits = new Map<string, { count: number; resetTime: number }>();

function checkResetRateLimit(key: string) {
  const now = Date.now();
  const limit = resetRateLimits.get(key);
  if (!limit || now > limit.resetTime) {
    resetRateLimits.set(key, { count: 1, resetTime: now + 15 * 60 * 1000 });
    return;
  }
  if (limit.count >= 3) {
    throw new Error("RATE_LIMIT");
  }
  limit.count++;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { message: "Se requiere un correo electronico valido" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { message: "El correo electronico no tiene un formato valido" },
        { status: 400 }
      );
    }

    checkResetRateLimit(normalizedEmail);

    const user = await prisma.usuario.findUnique({
      where: { correo: normalizedEmail },
      include: { persona: true },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Si el correo esta registrado, enviaremos un codigo de recuperacion" },
        { status: 200 }
      );
    }

    if (!resend) {
      return NextResponse.json(
        { message: "El servicio de correo no esta configurado" },
        { status: 500 }
      );
    }

    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.verificationCode.create({
      data: {
        user_id: user.id,
        code,
        expires_at: expiresAt,
        is_used: false,
      },
    });

    const { error: resendError } = await resend.emails.send({
      from: process.env.RESEND_FROM || "El Cumbe <onboarding@resend.dev>",
      to: user.correo,
      subject: "Codigo de recuperacion de contrasena - El Cumbe",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb; text-align: center;">Recuperacion de contrasena</h2>
          <p>Hola ${user.persona ? user.persona.nombres : "Usuario"},</p>
          <p>Utiliza este codigo de 6 digitos para restablecer tu contrasena:</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1f2937;">${code}</span>
          </div>
          <p>Este codigo expira en 15 minutos.</p>
        </div>
      `,
    });

    if (resendError) {
      console.error("Resend API error:", resendError);
      return NextResponse.json(
        { message: resendError.message || "Error al enviar el correo" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Si el correo esta registrado, enviaremos un codigo de recuperacion" },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMIT") {
      return NextResponse.json(
        { message: "Demasiados intentos. Intenta nuevamente en 15 minutos" },
        { status: 429 }
      );
    }
    console.error("Error en forgot-password:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
