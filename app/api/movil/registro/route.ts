import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const { nombres, apellidos, correo, contrasena, dni, telefono } = await req.json();

    if (!nombres || !apellidos || !correo || !contrasena || !dni) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios (nombres, apellidos, correo, contrasena, dni)" },
        { status: 400 }
      );
    }

    if (!nombres.trim() || !apellidos.trim()) {
      return NextResponse.json(
        { error: "Los nombres y apellidos no pueden estar vacíos" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return NextResponse.json(
        { error: "Formato de correo electrónico inválido" },
        { status: 400 }
      );
    }

    if (contrasena.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }

    if (!/^\d{8}$/.test(dni)) {
      return NextResponse.json(
        { error: "DNI inválido (debe tener exactamente 8 dígitos numéricos)" },
        { status: 400 }
      );
    }

    if (telefono && !/^\d{9}$/.test(telefono)) {
      return NextResponse.json(
        { error: "Teléfono inválido (debe tener exactamente 9 dígitos numéricos)" },
        { status: 400 }
      );
    }

    const normalizedEmail = correo.trim().toLowerCase();

    // Verificar si el correo ya está en uso por otro Usuario
    const existingUser = await prisma.usuario.findUnique({
      where: { correo: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "El correo electrónico ingresado ya está registrado" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Buscar o crear la Persona
      const persona = await tx.persona.upsert({
        where: { dni },
        update: {
          nombres: nombres.trim().toUpperCase(),
          apellidos: apellidos.trim().toUpperCase(),
          telefono: telefono || null
        },
        create: {
          nombres: nombres.trim().toUpperCase(),
          apellidos: apellidos.trim().toUpperCase(),
          dni,
          telefono: telefono || null,
        },
      });

      // 2. Validar que la Persona no tenga ya un Usuario asociado
      const usuarioExistente = await tx.usuario.findUnique({
        where: { persona_id: persona.id },
      });

      if (usuarioExistente) {
        throw new Error("DNI_REGISTRADO");
      }

      // 3. Hashear password y crear el Usuario
      const hashedPassword = await bcrypt.hash(contrasena, 12);

      const newUser = await tx.usuario.create({
        data: {
          persona_id: persona.id,
          correo: normalizedEmail,
          contrasena: hashedPassword,
          rol: "cliente",
        },
      });

      return { newUser, persona };
    });

    return NextResponse.json(
      { 
        success: true, 
        message: "Usuario registrado con éxito", 
        userId: result.newUser.id.toString(),
        user: {
          id: result.newUser.id.toString(),
          nombres: `${result.persona.nombres} ${result.persona.apellidos}`,
          correo: result.newUser.correo,
          rol: result.newUser.rol,
          dni: result.persona.dni
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error en el registro móvil:", error);
    
    if (error.message === "DNI_REGISTRADO") {
      return NextResponse.json(
        { error: "El DNI ingresado ya tiene una cuenta vinculada" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
