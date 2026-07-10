import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    const rol = token?.rol as string | undefined;

    // Solo verificamos restricciones si están intentando acceder al panel de administración
    if (pathname.startsWith("/admin")) {

      // ==========================================
      // 1. REGLAS PARA VENDEDOR
      // ==========================================
      if (rol === "vendedor") {
        const rutasPermitidasVendedor = [
          "/admin",
          "/admin/pasajes",
          "/admin/encomiendas",
          "/admin/viajes"
        ];

        const isAllowed = rutasPermitidasVendedor.some((route) => {
          if (route === "/admin") return pathname === "/admin";
          return pathname.startsWith(route);
        });

        if (!isAllowed) {
          return NextResponse.redirect(new URL("/admin", req.url));
        }
      }

      // ==========================================
      // 2. REGLAS PARA GERENTE (Estadísticas y Auditoría)
      // ==========================================
      if (rol === "gerente") {
        const rutasPermitidasGerente = [
          "/admin",               // Dashboard principal (Estadísticas)
          "/admin/reclamaciones", // Para auditar quejas y reclamos
          "/admin/usuarios",      // Para auditar al personal y clientes (solo lectura sugerido)
          // Puedes agregar más rutas de reportes aquí en el futuro
        ];

        const isAllowed = rutasPermitidasGerente.some((route) => {
          if (route === "/admin") return pathname === "/admin";
          return pathname.startsWith(route);
        });

        if (!isAllowed) {
          return NextResponse.redirect(new URL("/admin", req.url));
        }
      }

      // Nota: Si el rol es "admin", no entra en ninguno de los IF anteriores,
      // por lo que tiene acceso ilimitado a TODAS las rutas por defecto.
    }

    // Pasa normalmente si cumple las reglas
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // Exige token válido para entrar a cualquier ruta protegida
    },
  }
);

export const config = {
  matcher: ["/admin/:path*"],
};