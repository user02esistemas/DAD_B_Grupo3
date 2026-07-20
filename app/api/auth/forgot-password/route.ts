import { createHash, randomInt } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const GENERIC_MESSAGE = "Si el correo está registrado, enviaremos un código de recuperación";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] || char);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: "El correo no tiene un formato válido" }, { status: 400 });
    }

    const user = await prisma.usuario.findUnique({ where: { correo: email }, include: { persona: true } });
    if (!user) return NextResponse.json({ message: GENERIC_MESSAGE });

    const windowStart = new Date(Date.now() - 15 * 60_000);
    const recentCodes = await prisma.verificationCode.count({ where: { user_id: user.id, created_at: { gte: windowStart } } });
    if (recentCodes >= 3) return NextResponse.json({ message: "Demasiados intentos. Intenta nuevamente en 15 minutos" }, { status: 429 });

    if (!resend) {
      console.error("RESEND_API_KEY no está configurada.");
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    await prisma.$transaction([
      prisma.verificationCode.updateMany({ where: { user_id: user.id, is_used: false }, data: { is_used: true } }),
      prisma.verificationCode.create({ data: { user_id: user.id, code: hashCode(code), expires_at: expiresAt, is_used: false } }),
    ]);

    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM || "El Cumbe <onboarding@resend.dev>",
      to: user.correo,
      subject: "Código de recuperación de contraseña - El Cumbe",
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px"><h2>Recuperación de contraseña</h2><p>Hola ${escapeHtml(user.persona.nombres)},</p><p>Utiliza este código para restablecer tu contraseña:</p><p style="font-size:32px;font-weight:bold;letter-spacing:4px">${code}</p><p>Expira en 15 minutos.</p></div>`,
    });
    if (error) console.error("Resend API error:", error);
    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("Error en forgot-password:", error);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}