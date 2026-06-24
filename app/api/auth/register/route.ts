import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, dni, phone, birth_date } = await req.json();

    if (!name || !email || !password || !dni || !phone || !birth_date) {
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

    const existingUser = await prisma.cliente.findUnique({
      where: { correo: email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "El correo ya está registrado" },
        { status: 400 }
      );
    }

    const existingDni = await prisma.cliente.findUnique({
      where: { dni },
    });

    if (existingDni) {
      return NextResponse.json(
        { message: "El DNI ya está registrado" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.cliente.create({
      data: {
        nombre: name,
        correo: email,
        contrasena: hashedPassword,
        dni,
        telefono: phone,
        fecha_nacimiento: birthDateObj,
      },
    });

    return NextResponse.json(
      { message: "Usuario registrado con éxito", userId: newUser.id.toString() },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en el registro:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
