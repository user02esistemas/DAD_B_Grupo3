import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { message: "Se requiere un correo electrónico válido" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { message: "El correo electrónico no tiene un formato válido" },
        { status: 400 }
      );
    }

    const user = await prisma.cliente.findUnique({
      where: { correo: email },
    });

    if (!user) {
      return NextResponse.json(
        { message: "No existe un usuario con ese correo" },
        { status: 404 }
      );
    }

    // Generate 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Expires in 15 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await prisma.verificationCode.create({
      data: {
        user_id: user.id,
        code,
        expires_at: expiresAt,
        is_used: false,
      },
    });

    const { data, error: resendError } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: user.correo,
      subject: "Código de recuperación de contraseña - El Cumbe",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb; text-align: center;">Recuperación de contraseña</h2>
          <p>Hola ${user.nombre},</p>
          <p>Has solicitado restablecer tu contraseña. Utiliza el siguiente código de 6 dígitos para continuar:</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1f2937;">${code}</span>
          </div>
          <p>Este código expirará en 15 minutos.</p>
          <p>Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
          <br />
          <p>Atentamente,</p>
          <p><strong>El equipo de El Cumbe</strong></p>
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
      { message: "Código enviado al correo electrónico" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error en forgot-password:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
