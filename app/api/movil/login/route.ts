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
        { error: "Usuario no encontrado o credenciales inválidas" },
        { status: 401 }
      );
    }

    // 2. Verificar contraseña
    const isValidPassword = await bcrypt.compare(contrasena, user.contrasena);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Contraseña incorrecta" },
        { status: 401 }
      );
    }

    // 3. Restricción de Rol
    const rolPermitido = user.rol === "conductor" || user.rol === "operario" || user.rol === "operador" || user.rol === "cliente";
    if (!rolPermitido) {
      return NextResponse.json(
        { error: "Acceso no autorizado para esta aplicación." },
        { status: 403 }
      );
    }

    // 4. Generar respuesta exitosa
    const fullName = `${user.persona.nombres} ${user.persona.apellidos}`.trim();

    // Generar un JWT simple (opcional, si tienes un SECRET configurado)
    const secret = process.env.NEXTAUTH_SECRET || "default_movil_secret_key";
    const token = jwt.sign(
      { 
        id: user.id.toString(), 
        role: user.rol, 
        dni: user.persona.dni,
        persona_id: user.persona_id.toString() 
      },
      secret,
      { expiresIn: "30d" }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Login móvil exitoso",
        token, // El token que la app usará en el header Authorization
        user: {
          id: user.id.toString(),
          nombres: fullName,
          correo: user.correo,
          rol: user.rol,
          dni: user.persona.dni
        }
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Error en login móvil:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: error.message },
      { status: 500 }
    );
  }
}
