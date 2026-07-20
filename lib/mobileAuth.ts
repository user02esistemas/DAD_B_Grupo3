import * as jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export interface MobileTokenPayload {
  id: string;
  role: string;
  dni: string;
  persona_id: string;
}

/**
 * Middleware de verificación para la API Móvil.
 * Extrae el encabezado 'Authorization: Bearer <token>', verifica la validez del JWT
 * y opcionalmente corrobora que el rol del usuario esté dentro de los roles permitidos.
 */
export function verifyMobileToken(
  req: Request,
  allowedRoles?: string[]
): { valid: true; user: MobileTokenPayload } | { valid: false; response: NextResponse } {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: "Acceso no autorizado. Debe proporcionar un token Bearer en el encabezado Authorization." },
        { status: 401 }
      )
    };
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.NEXTAUTH_SECRET || "default_movil_secret_key";

  try {
    const decoded = jwt.verify(token, secret) as MobileTokenPayload;

    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(decoded.role)) {
        return {
          valid: false,
          response: NextResponse.json(
            { error: `Acceso denegado. El rol '${decoded.role}' no cuenta con permisos suficientes.` },
            { status: 403 }
          )
        };
      }
    }

    return { valid: true, user: decoded };
  } catch (error: any) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: "Token de autorización inválido o expirado.", details: error.message },
        { status: 401 }
      )
    };
  }
}
