# Registro de Errores y Progreso

## [2026-06-24] Error de Server Actions síncronos
**Problema**: Se exportó una función síncrona `serializeBigInt` en los archivos de Server Actions (`dashboard.ts`, `sucursales.ts`, `buses.ts`) que incluyen la directiva `"use server"`. Next.js requiere que todas las funciones exportadas en estos archivos sean asíncronas (`async`). Esto causó un error fatal en el renderizado de los Server Components que importaban desde estos archivos.
**Solución**: Se eliminó la palabra clave `export` de la función auxiliar `serializeBigInt` en todos los archivos afectados. Al no ser exportada, se convierte en un helper interno del archivo y no es tratada como un Server Action expuesto, resolviendo así el error.

## [2026-06-24] Error de serialización con Prisma Decimal
**Problema**: La función recursiva de serialización manual (`serializeBigInt`) intentaba extraer las propiedades del prototipo de los objetos `Decimal` de Prisma (como el precio_base en la creación de Rutas). Esto provocaba un error de React que impedía pasar funciones desde Server Components a Client Components.
**Solución**: Se reemplazó la lógica de serialización manual por `JSON.parse(JSON.stringify(obj, replacer))` con un replacer exclusivo para `BigInt`. `JSON.stringify` maneja nativamente la serialización segura ignorando funciones, y además, Prisma expone automáticamente un método `toJSON()` en sus tipos `Decimal` y fechas, resolviendo el problema de raíz.

## [2026-06-24] Error de Compilación TS y Middleware Deprecado (NextAuth 404)
**Problema**: El servidor devolvía Error 404 en `/api/auth/session`, `/admin` y la página raíz `/`. Esto sucedió por dos factores:
1. Errores críticos de TypeScript en archivos antiguos de recuperación de contraseña (`forgot-password`, `reset-password`) que intentaban llamar a tablas en inglés (ej. `prisma.users`) cuando el esquema ahora está en español (`prisma.usuario`). Estos errores "rompían" la caché de rutas del App Router.
2. Next.js 16 depreció `middleware.ts` a favor de `proxy.ts`, por lo que las protecciones de sesión no se ejecutaban correctamente.
**Solución**: Se corrigieron los nombres de los modelos de Prisma en las rutas de API antiguas, se renombró `middleware.ts` a `proxy.ts` y se eliminó la carpeta `.next` para forzar la regeneración de la caché de tipos y rutas del servidor.
