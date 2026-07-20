import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { correo, contrasena } = body;

    if (!correo || !contrasena) {
      return NextResponse.json(
        { error: "Faltan credenciales (correo o contraseña)" },
        { status: 400 }
      );
    }

    const emailStr = correo.trim().toLowerCase();

    // 1. Buscar al usuario
    const user = await prisma.usuario.findUnique({
      where: { correo: emailStr },
      include: { persona: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    // 2. Verificar contraseña
    const isValidPassword = await bcrypt.compare(contrasena, user.contrasena);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    // 3. La app móvil ahora permite a todos los roles loguearse

    // 4. Generar respuesta exitosa
    const fullName = `${user.persona.nombres} ${user.persona.apellidos}`.trim();

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret || secret.length < 32) {
      console.error("NEXTAUTH_SECRET no está configurado o tiene menos de 32 caracteres.");
      return NextResponse.json(
        { error: "El servicio de autenticación no está configurado." },
        { status: 500 }
      );
    }
    const token = jwt.sign(
      { 
        id: user.id.toString(), 
        role: user.rol, 
        dni: user.persona.dni,
        persona_id: user.persona_id.toString() 
      },
      secret,
      { algorithm: "HS256", expiresIn: "8h" }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Login móvil exitoso",
        token, // El token que la app usará en el header Authorization
        user: {
          id: user.id.toString(),
          persona_id: user.persona_id.toString(),
          nombres: fullName,
          correo: user.correo,
          rol: user.rol,
          dni: user.persona.dni
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error en login móvil:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
