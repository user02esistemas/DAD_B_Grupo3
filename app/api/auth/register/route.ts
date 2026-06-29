import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { nombres, apellidos, email, password, dni, phone, birth_date } = await req.json();

    if (!nombres || !apellidos || !email || !password || !dni || !phone || !birth_date) {
      return NextResponse.json(
        { message: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    const birthDateObj = new Date(birth_date);
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }

    if (age < 18) {
      return NextResponse.json(
        { message: "Debes ser mayor de edad para registrarte" },
        { status: 400 }
      );
    }

    // Verificar si el correo ya está en uso por otro Usuario
    const existingUser = await prisma.usuario.findUnique({
      where: { correo: email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "El correo ya está registrado" },
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
          telefono: phone
        },
        create: {
          nombres: nombres.trim().toUpperCase(),
          apellidos: apellidos.trim().toUpperCase(),
          dni,
          telefono: phone,
        },
      });

      // 2. Validar que la Persona no tenga ya un Usuario web asociado
      const usuarioExistente = await tx.usuario.findUnique({
        where: { persona_id: persona.id },
      });

      if (usuarioExistente) {
        throw new Error("DNI_REGISTRADO");
      }

      // 3. Hashear password y crear el Usuario
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await tx.usuario.create({
        data: {
          persona_id: persona.id,
          correo: email,
          contrasena: hashedPassword,
          rol: "cliente",
        },
      });

      return newUser;
    });

    return NextResponse.json(
      { message: "Usuario registrado con éxito", userId: result.id.toString() },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error en el registro:", error);
    
    if (error.message === "DNI_REGISTRADO") {
      return NextResponse.json(
        { message: "El DNI ya tiene una cuenta vinculada" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
