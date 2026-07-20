import * as jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface MobileTokenPayload {
  id: string;
  role: string;
  dni: string;
  persona_id: string;
}

type MobileAuthResult =
  | { valid: true; user: MobileTokenPayload }
  | { valid: false; response: NextResponse };

function getMobileJwtSecret(): string | null {
  const secret = process.env.NEXTAUTH_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function verifyMobileToken(
  req: Request,
  allowedRoles?: string[]
): MobileAuthResult {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: "Acceso no autorizado. Debe proporcionar un token Bearer." },
        { status: 401 }
      )
    };
  }

  const token = authHeader.slice(7).trim();
  const secret = getMobileJwtSecret();
  if (!secret) {
    console.error("NEXTAUTH_SECRET no está configurado o tiene menos de 32 caracteres.");
    return {
      valid: false,
      response: NextResponse.json(
        { error: "El servicio de autenticación no está configurado." },
        { status: 500 }
      )
    };
  }

  try {
    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] }) as Partial<MobileTokenPayload>;
    if (
      typeof decoded.id !== "string" ||
      typeof decoded.role !== "string" ||
      typeof decoded.dni !== "string" ||
      typeof decoded.persona_id !== "string"
    ) {
      throw new Error("El token no contiene una identidad válida.");
    }

    if (allowedRoles?.length && !allowedRoles.includes(decoded.role)) {
      return {
        valid: false,
        response: NextResponse.json(
          { error: "No cuenta con permisos para realizar esta operación." },
          { status: 403 }
        )
      };
    }

    return { valid: true, user: decoded as MobileTokenPayload };
  } catch {
    return {
      valid: false,
      response: NextResponse.json(
        { error: "Token de autorización inválido o expirado." },
        { status: 401 }
      )
    };
  }
}

/** Valida también que el usuario siga existiendo y conserve su identidad y rol. */
export async function authenticateMobileRequest(
  req: Request,
  allowedRoles?: string[]
): Promise<MobileAuthResult> {
  const tokenAuth = verifyMobileToken(req);
  if (!tokenAuth.valid) return tokenAuth;

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: BigInt(tokenAuth.user.id) },
      include: { persona: true },
    });

    if (
      !usuario ||
      usuario.persona_id.toString() !== tokenAuth.user.persona_id ||
      usuario.persona.dni !== tokenAuth.user.dni
    ) {
      return {
        valid: false,
        response: NextResponse.json({ error: "La sesión ya no es válida." }, { status: 401 }),
      };
    }

    if (allowedRoles?.length && !allowedRoles.includes(usuario.rol)) {
      return {
        valid: false,
        response: NextResponse.json(
          { error: "No cuenta con permisos para realizar esta operación." },
          { status: 403 }
        ),
      };
    }

    return {
      valid: true,
      user: {
        id: usuario.id.toString(),
        role: usuario.rol,
        dni: usuario.persona.dni,
        persona_id: usuario.persona_id.toString(),
      },
    };
  } catch {
    return {
      valid: false,
      response: NextResponse.json({ error: "No se pudo validar la sesión." }, { status: 401 }),
    };
  }
}

export function canAccessPersona(user: MobileTokenPayload, personaId: bigint): boolean {
  return user.role === "admin" || user.persona_id === personaId.toString();
}