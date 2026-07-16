# Registro de Errores y Progreso - Proyecto "El Cumbe"

## 1. Modelos Inexistentes y Nombres de Columnas Incorrectos en Prisma (Recuperación de Contraseña)
- **Problema:** En las rutas `app/api/auth/forgot-password/route.ts` y `app/api/auth/reset-password/route.ts` se intenta acceder a `prisma.users` y `prisma.verification_codes`. Estos modelos no están definidos en `schema.prisma` ni creados en MySQL. Adicionalmente, se usan columnas incorrectas como `email` y `password` en lugar de `correo` y `contrasena` (que son las definidas en el modelo `Usuario`).
- **Solución:**
  1. Agregar el modelo `VerificationCode` a `schema.prisma` mapeándolo a `verification_codes`.
  2. Agregar la tabla `verification_codes` al archivo `cumbe_db_actualizado.sql`.
  3. Corregir el código de las APIs de forgot-password/reset-password para usar `prisma.usuario` y los nombres de campos reales (`correo`, `contrasena`, `nombre`).

## 2. Error de Compilación en `test_trips.ts`
- **Problema:** El archivo de pruebas `test_trips.ts` intenta importar `serializeBigInt` desde `./app/actions`, pero esta función no está exportada en `app/actions.ts` (está declarada localmente). Además, hace una llamada a `prisma.trips` que no existe (el modelo correcto es `viaje` o `Viaje`).
- **Solución:** Exportar la función `serializeBigInt` en `app/actions.ts`, utilizar el cliente Prisma singleton de `lib/prisma` e interactuar con el modelo `viaje`.

## 3. Advertencia de Rendimiento de React (Cascading Renders) en `verificar/page.tsx`
- **Problema:** En `app/recuperar-password/verificar/page.tsx`, la regla de linter `react-hooks/set-state-in-effect` falla porque hay un `useEffect` que llama a `setFormData` de forma síncrona en el montaje para inicializar el email desde los parámetros de búsqueda.
- **Solución:** Eliminar el `useEffect` redundante, puesto que el estado ya se inicializa de forma síncrona y directa mediante `useState(() => initialEmail)`.

## 4. Variables de Entorno Faltantes para Next-Auth y Resend
- **Problema:** Falta configurar variables de entorno críticas en el archivo `.env` como `NEXTAUTH_SECRET`, `NEXTAUTH_URL` y `RESEND_API_KEY`, lo cual causará que NextAuth y el envío de correos fallen en ejecución.
- **Solución:** Añadir variables por defecto seguras en el archivo `.env`.

## 5. Error "The table 'asiento_viaje' does not exist in the current database" al programar salidas
- **Problema:** Al intentar guardar un viaje programado, Prisma arrojaba un error indicando que la tabla `asiento_viaje` no existía. Esto se debe a que en el archivo SQL de la base de datos la tabla se define como `asientoviaje` (todo junto), mientras que en `schema.prisma` estaba mapeada con guion bajo (`asiento_viaje`). Lo mismo sucedía con `codigo_descuento` (mapeada en MySQL como `codigodescuento`).
- **Solución:**
  1. Corregir los mapeos `@@map` de los modelos `AsientoViaje` (a `"asientoviaje"`) y `CodigoDescuento` (a `"codigodescuento"`) en `prisma/schema.prisma`.
  2. Ejecutar `npx prisma generate` para regenerar el cliente.
  3. Solicitar al usuario que reinicie su servidor de desarrollo de Next.js (`npm run dev`) para liberar el query engine antiguo en memoria de Node y que tome el nuevo esquema.

## 6. Desfase de Zona Horaria (UTC vs America/Lima) en el buscador de pasajes
- **Problema:** El input de fecha de viaje aparecía vacío y su valor mínimo (`min`) se calculaba mediante `new Date().toISOString()`. Debido a que `toISOString()` devuelve la hora en formato UTC, en horas de la noche de Perú (desfase de -5 horas) el sistema ya consideraba que era el día siguiente (UTC+0), impidiendo que los usuarios pudieran programar o buscar viajes para el mismo día (hoy) en esas horas.
- **Solución:** Ajustar el cálculo de la fecha por defecto y el límite mínimo (`min`) utilizando `Intl.DateTimeFormat` forzando la zona horaria `"America/Lima"` (Perú). De este modo, la fecha inicial de hoy y el límite inferior siempre coinciden exactamente con la fecha real local de Perú, permitiendo además la edición del campo por parte del usuario.
- **Archivos modificados:**
  - `components/HomeBookingSearch.tsx`
  - `app/(public)/compra/page.tsx`

## 7. Errores de validación de Prisma y Drift de base de datos al agregar el modelo Pago
- **Problema:** Al agregar la tabla `Pago` y sus relaciones a `schema.prisma`, se generaron errores por la falta del cierre de la llave del modelo anterior `VerificationCode`. Adicionalmente, al intentar aplicar los cambios, se detectó un desfase (drift) con la base de datos porque el proyecto no utilizaba el control de migraciones de Prisma.
- **Solución:**
  1. Sellar correctamente el modelo anterior en `schema.prisma` y estructurar el modelo `Pago`.
  2. Cambiar la columna `updated_at` de `Pago` a `DateTime @default(now()) @db.Timestamp(0)` para ser consistente con el resto del proyecto y no causar fallas de default inválidos en la base de datos.
  3. Ejecutar `npx prisma db pull` para introspectar los índices existentes y sincronizar el esquema.
  4. Detener temporalmente el servidor Next.js para liberar los archivos bloqueados y poder ejecutar con éxito `npx prisma generate`.

## 8. [2026-06-24] Error de Server Actions síncronos
- **Problema**: Se exportó una función síncrona `serializeBigInt` en los archivos de Server Actions (`dashboard.ts`, `sucursales.ts`, `buses.ts`) que incluyen la directiva `"use server"`. Next.js requiere que todas las funciones exportadas en estos archivos sean asíncronas (`async`). Esto causó un error fatal en el renderizado de los Server Components que importaban desde estos archivos.
- **Solución**: Se eliminó la palabra clave `export` de la función auxiliar `serializeBigInt` en todos los archivos afectados. Al no ser exportada, se convierte en un helper interno del archivo y no es tratada como un Server Action expuesto, resolviendo así el error.

## 9. [2026-06-24] Error de serialización con Prisma Decimal
- **Problema**: La función recursiva de serialización manual (`serializeBigInt`) intentaba extraer las propiedades del prototipo de los objetos `Decimal` de Prisma (como el precio_base en la creación de Rutas). Esto provocaba un error de React que impedía pasar funciones desde Server Components a Client Components.
- **Solución**: Se reemplazó la lógica de serialización manual por `JSON.parse(JSON.stringify(obj, replacer))` con un replacer exclusivo para `BigInt`. `JSON.stringify` maneja nativamente la serialización segura ignorando funciones, y además, Prisma expone automáticamente un método `toJSON()` en sus tipos `Decimal` y fechas, resolviendo el problema de raíz.

## 10. [2026-06-24] Error de Compilación TS y Middleware Deprecado (NextAuth 404)
- **Problema**: El servidor devolvía Error 404 en `/api/auth/session`, `/admin` y la página raíz `/`. Esto sucedió por dos factores:
  1. Errores críticos de TypeScript en archivos antiguos de recuperación de contraseña (`forgot-password`, `reset-password`) que intentaban llamar a tablas en inglés (ej. `prisma.users`) cuando el esquema ahora está en español (`prisma.usuario`). Estos errores "rompían" la caché de rutas del App Router.
  2. Next.js 16 depreció `middleware.ts` a favor de `proxy.ts`, por lo que las protecciones de sesión no se ejecutaban correctamente.
- **Solución**: Se corrigieron los nombres de los modelos de Prisma en las rutas de API antiguas, se renombró `middleware.ts` a `proxy.ts` y se eliminó la carpeta `.next` para forzar la regeneración de la caché de tipos y rutas del servidor.

## 11. [2026-06-24] Integración de Croquis Realista para Buses de 2 Pisos
- **Problema:** Los buses de 2 pisos (como el de la ruta Cajamarca -> Chiclayo) usaban una cuadrícula genérica que no reflejaba la distribución física real del bus (pasillo, 3 asientos por fila en el piso 1, 4 asientos en el piso 2 y el espacio vacío de la escalera).
- **Solución:**
# Registro de Errores y Progreso - Proyecto "El Cumbe"

## 1. Modelos Inexistentes y Nombres de Columnas Incorrectos en Prisma (Recuperación de Contraseña)
- **Problema:** En las rutas `app/api/auth/forgot-password/route.ts` y `app/api/auth/reset-password/route.ts` se intenta acceder a `prisma.users` y `prisma.verification_codes`. Estos modelos no están definidos en `schema.prisma` ni creados en MySQL. Adicionalmente, se usan columnas incorrectas como `email` y `password` en lugar de `correo` y `contrasena` (que son las definidas en el modelo `Usuario`).
- **Solución:**
  1. Agregar el modelo `VerificationCode` a `schema.prisma` mapeándolo a `verification_codes`.
  2. Agregar la tabla `verification_codes` al archivo `cumbe_db_actualizado.sql`.
  3. Corregir el código de las APIs de forgot-password/reset-password para usar `prisma.usuario` y los nombres de campos reales (`correo`, `contrasena`, `nombre`).

## 2. Error de Compilación en `test_trips.ts`
- **Problema:** El archivo de pruebas `test_trips.ts` intenta importar `serializeBigInt` desde `./app/actions`, pero esta función no está exportada en `app/actions.ts` (está declarada localmente). Además, hace una llamada a `prisma.trips` que no existe (el modelo correcto es `viaje` o `Viaje`).
- **Solución:** Exportar la función `serializeBigInt` en `app/actions.ts`, utilizar el cliente Prisma singleton de `lib/prisma` e interactuar con el modelo `viaje`.

## 3. Advertencia de Rendimiento de React (Cascading Renders) en `verificar/page.tsx`
- **Problema:** En `app/recuperar-password/verificar/page.tsx`, la regla de linter `react-hooks/set-state-in-effect` falla porque hay un `useEffect` que llama a `setFormData` de forma síncrona en el montaje para inicializar el email desde los parámetros de búsqueda.
- **Solución:** Eliminar el `useEffect` redundante, puesto que el estado ya se inicializa de forma síncrona y directa mediante `useState(() => initialEmail)`.

## 4. Variables de Entorno Faltantes para Next-Auth y Resend
- **Problema:** Falta configurar variables de entorno críticas en el archivo `.env` como `NEXTAUTH_SECRET`, `NEXTAUTH_URL` y `RESEND_API_KEY`, lo cual causará que NextAuth y el envío de correos fallen en ejecución.
- **Solución:** Añadir variables por defecto seguras en el archivo `.env`.

## 5. Error "The table 'asiento_viaje' does not exist in the current database" al programar salidas
- **Problema:** Al intentar guardar un viaje programado, Prisma arrojaba un error indicando que la tabla `asiento_viaje` no existía. Esto se debe a que en el archivo SQL de la base de datos la tabla se define como `asientoviaje` (todo junto), mientras que en `schema.prisma` estaba mapeada con guion bajo (`asiento_viaje`). Lo mismo sucedía con `codigo_descuento` (mapeada en MySQL como `codigodescuento`).
- **Solución:**
  1. Corregir los mapeos `@@map` de los modelos `AsientoViaje` (a `"asientoviaje"`) y `CodigoDescuento` (a `"codigodescuento"`) en `prisma/schema.prisma`.
  2. Ejecutar `npx prisma generate` para regenerar el cliente.
  3. Solicitar al usuario que reinicie su servidor de desarrollo de Next.js (`npm run dev`) para liberar el query engine antiguo en memoria de Node y que tome el nuevo esquema.

## 6. Desfase de Zona Horaria (UTC vs America/Lima) en el buscador de pasajes
- **Problema:** El input de fecha de viaje aparecía vacío y su valor mínimo (`min`) se calculaba mediante `new Date().toISOString()`. Debido a que `toISOString()` devuelve la hora en formato UTC, en horas de la noche de Perú (desfase de -5 horas) el sistema ya consideraba que era el día siguiente (UTC+0), impidiendo que los usuarios pudieran programar o buscar viajes para el mismo día (hoy) en esas horas.
- **Solución:** Ajustar el cálculo de la fecha por defecto y el límite mínimo (`min`) utilizando `Intl.DateTimeFormat` forzando la zona horaria `"America/Lima"` (Perú). De este modo, la fecha inicial de hoy y el límite inferior siempre coinciden exactamente con la fecha real local de Perú, permitiendo además la edición del campo por parte del usuario.
- **Archivos modificados:**
  - `components/HomeBookingSearch.tsx`
  - `app/(public)/compra/page.tsx`

## 7. Errores de validación de Prisma y Drift de base de datos al agregar el modelo Pago
- **Problema:** Al agregar la tabla `Pago` y sus relaciones a `schema.prisma`, se generaron errores por la falta del cierre de la llave del modelo anterior `VerificationCode`. Adicionalmente, al intentar aplicar los cambios, se detectó un desfase (drift) con la base de datos porque el proyecto no utilizaba el control de migraciones de Prisma.
- **Solución:**
  1. Sellar correctamente el modelo anterior en `schema.prisma` y estructurar el modelo `Pago`.
  2. Cambiar la columna `updated_at` de `Pago` a `DateTime @default(now()) @db.Timestamp(0)` para ser consistente con el resto del proyecto y no causar fallas de default inválidos en la base de datos.
  3. Ejecutar `npx prisma db pull` para introspectar los índices existentes y sincronizar el esquema.
  4. Detener temporalmente el servidor Next.js para liberar los archivos bloqueados y poder ejecutar con éxito `npx prisma generate`.

## 8. [2026-06-24] Error de Server Actions síncronos
- **Problema**: Se exportó una función síncrona `serializeBigInt` en los archivos de Server Actions (`dashboard.ts`, `sucursales.ts`, `buses.ts`) que incluyen la directiva `"use server"`. Next.js requiere que todas las funciones exportadas en estos archivos sean asíncronas (`async`). Esto causó un error fatal en el renderizado de los Server Components que importaban desde estos archivos.
- **Solución**: Se eliminó la palabra clave `export` de la función auxiliar `serializeBigInt` en todos los archivos afectados. Al no ser exportada, se convierte en un helper interno del archivo y no es tratada como un Server Action expuesto, resolviendo así el error.

## 9. [2026-06-24] Error de serialización con Prisma Decimal
- **Problema**: La función recursiva de serialización manual (`serializeBigInt`) intentaba extraer las propiedades del prototipo de los objetos `Decimal` de Prisma (como el precio_base en la creación de Rutas). Esto provocaba un error de React que impedía pasar funciones desde Server Components a Client Components.
- **Solución**: Se reemplazó la lógica de serialización manual por `JSON.parse(JSON.stringify(obj, replacer))` con un replacer exclusivo para `BigInt`. `JSON.stringify` maneja nativamente la serialización segura ignorando funciones, y además, Prisma expone automáticamente un método `toJSON()` en sus tipos `Decimal` y fechas, resolviendo el problema de raíz.

## 10. [2026-06-24] Error de Compilación TS y Middleware Deprecado (NextAuth 404)
- **Problema**: El servidor devolvía Error 404 en `/api/auth/session`, `/admin` y la página raíz `/`. Esto sucedió por dos factores:
  1. Errores críticos de TypeScript en archivos antiguos de recuperación de contraseña (`forgot-password`, `reset-password`) que intentaban llamar a tablas en inglés (ej. `prisma.users`) cuando el esquema ahora está en español (`prisma.usuario`). Estos errores "rompían" la caché de rutas del App Router.
  2. Next.js 16 depreció `middleware.ts` a favor de `proxy.ts`, por lo que las protecciones de sesión no se ejecutaban correctamente.
- **Solución**: Se corrigieron los nombres de los modelos de Prisma en las rutas de API antiguas, se renombró `middleware.ts` a `proxy.ts` y se eliminó la carpeta `.next` para forzar la regeneración de la caché de tipos y rutas del servidor.

## 11. [2026-06-24] Integración de Croquis Realista para Buses de 2 Pisos
- **Problema:** Los buses de 2 pisos (como el de la ruta Cajamarca -> Chiclayo) usaban una cuadrícula genérica que no reflejaba la distribución física real del bus (pasillo, 3 asientos por fila en el piso 1, 4 asientos en el piso 2 y el espacio vacío de la escalera).
- **Solución:**
  1. Se actualizó el Bus ID 2 en la base de datos a capacidad 60 (12 en el primer piso, 48 en el segundo piso) y se regeneraron los asientos de todos los viajes en la Ruta 3 (Cajamarca -> Chiclayo).
  2. Se implementaron las funciones `renderPiso1DoblePiso` y `renderPiso2DoblePiso` en `app/(public)/compra/page.tsx` para renderizar el croquis exacto con el pasillo central, el volante y el vacío físico de la escalera en la cubierta superior (filas 3 y 4 de la derecha).
  3. Se diseñó un SVG inline exacto para renderizar los asientos recreando la silueta de la butaca de la imagen (respaldo superior redondeado, ensanche para apoyabrazos a los lados, línea de cojín interior y el número de asiento perfectamente centrado dentro del respaldo), todo en un color uniforme (marrón `#7c2d12` para disponibles, naranja `#f07639` con relleno para seleccionados, y gris con una X fina para ocupados).
  4. Se renombraron las etiquetas "Cubierta inferior" y "Cubierta superior" a "Primer Piso" y "Segundo Piso". Adicionalmente, se compactaron las dimensiones del asiento a `w-9 h-10` y los márgenes verticales de las grillas a `space-y-2` y `gap-1.5`, logrando que todo el croquis sea visible en una sola pantalla sin necesidad de hacer scroll vertical.
  5. Se agregaron y posicionaron los iconos correspondientes a los **televisores (TV)** en el pasillo central (Fila 1 en el Primer Piso; y Filas 1, 5, 6 y 11 en el Segundo Piso) y la **escalera** en el espacio vacío del lado derecho de las filas 3 y 4 del Segundo Piso, replicando exactamente la distribución física de la imagen de referencia.

## 12. [2026-06-25] Error P1012 de validación de Prisma al ejecutar db push
- **Problema:** Al ejecutar `npx prisma db push`, Prisma mostraba un error `P1012` indicando que los tipos "CodigoVerificacion" y "Cliente" no existían. Esto se debió a un error de tipado en las relaciones (el modelo era `VerificationCode` y `Usuario`, respectivamente). Además, el nuevo modelo `Pago` requería relaciones opuestas explícitas en `AsientoViaje` y `Viaje`.
- **Solución:**
  1. Corregir las referencias de los modelos en `prisma/schema.prisma` (`CodigoVerificacion` a `VerificationCode` en `Usuario`, y `Cliente` a `Usuario` en `VerificationCode`).
  2. Ejecutar `npx prisma format` para que Prisma agregue automáticamente las relaciones opuestas (`pagos Pago[]`) faltantes en `AsientoViaje` y `Viaje`.

## 13. Error "La placa podría estar duplicada" al crear un Bus
- **Problema:** Al crear un bus, la UI enviaba los campos `asientos_piso_1`, `asientos_restringidos` e `imagenes`. Estos campos no existían en el modelo `Bus` de `schema.prisma`. Al intentar guardarlos, Prisma arrojaba un error de validación, el cual era capturado por un bloque catch genérico en `crearBus` que devolvía un mensaje engañoso sobre la placa duplicada, aún con la tabla vacía.
- **Solución:**
  1. Se agregaron los campos `asientos_piso_1 (Int?)`, `asientos_restringidos (String? @db.Text)` e `imagenes (String? @db.Text)` al modelo `Bus` en `schema.prisma`.
  2. Se ejecutó `npx prisma db push` para sincronizar la base de datos.

## 14. [2026-06-27] Errores TypeScript en compra y recuperación de contraseña por esquema antiguo
- **Problema:** Tras la actualización a la nueva arquitectura basada en `Persona`, el servidor lanzó múltiples errores en `app/actions.ts` y las rutas de autenticación. Errores como "Property 'cliente' does not exist" o "Unknown argument 'bloqueado_por_token'" surgieron debido a que el código seguía referenciando al modelo `cliente` deprecado y a campos removidos en `AsientoViaje`.
- **Solución:**
  1. Se reemplazaron todas las llamadas a `prisma.cliente` por `prisma.usuario` en el proceso de simulación de pago, recuperación de contraseña y obtención del perfil.
  2. En la creación de pasajes, se implementó la lógica correcta haciendo primero un `prisma.persona.upsert()` antes de asociar el `persona_id` a `Pasaje`.
  3. Se removió el campo `bloqueado_por_token` de los argumentos de `AsientoViaje` ya que no es parte del nuevo esquema.

## 15. [2026-06-27] Los tickets del usuario no aparecían en el Perfil
- **Problema:** Tras la migración al esquema de `Persona`, la función `getClienteProfile` solo estaba consultando los pasajes asignados directamente al `persona_id` asociado a la cuenta. Esto provocaba que los pasajes comprados por el usuario (donde él es el `comprador_id` pero quizás compró para otro pasajero) no se mostraran en su lista de "Mis Pasajes". Además, el frontend esperaba los campos de nombre y apellido directamente en el objeto del pasaje.
- **Solución:** Se modificó la consulta en `app/actions.ts` para buscar los pasajes donde el usuario sea el `comprador_id` OR su respectivo `persona_id`. Adicionalmente, se mapearon los datos del `pasajero` (`nombres`, `apellidos`, `dni`) directamente en el objeto principal del pasaje devuelto para mantener total retrocompatibilidad con el frontend.

## 16. [2026-06-27] División incorrecta de Nombres y Apellidos en la base de datos al registrar usuarios
- **Problema:** El formulario de registro en el frontend (`app/(public)/registro/page.tsx`) enviaba un campo único `name` que el endpoint de la API (`app/api/auth/register/route.ts`) dividía mediante `.split(" ")` tomando la primera palabra como nombres y el resto como apellidos. Esto causaba un registro incorrecto en la tabla `Persona` para personas con múltiples nombres (ej. Juan Carlos).
- **Solución:** Se reemplazó el campo único `name` en el formulario y en el estado de React del frontend por dos inputs y campos independientes: `nombres` y `apellidos`. Asimismo, se modificó la API de registro para recibir ambos parámetros y guardarlos directamente y sin divisiones en la base de datos.



## 17. [2026-07-16] Mejora Integral del Sistema de Temas (Dark Mode y Light Mode)
- **Problema:** El sistema de temas anterior tenía:
  1. Paleta de colores poco refinada con bajo contraste en modo oscuro (especialmente para accesibilidad).
  2. ThemeToggle con estilos genéricos sin efectos visuales premium.
  3. Transiciones de tema abruptas sin suavidad.
  4. Variables CSS limitadas y sin estandarización de sombras y colores de acentuación.
  5. No detectaba cambios de preferencia del sistema operativo en tiempo real.
  
- **Solución Implementada:**
  1. **Paleta de colores mejorada** en `app/globals.css`:
     - Light Mode: Backgrounds en #ffffff y #f1f5f9 con bordes e inputs más claros y contrastados.
     - Dark Mode: Backgrounds en #0a0c15 y #111827 con mejor contraste WCAG AA para legibilidad.
     - Agregadas variables para sombras (`--shadow-sm`, `--shadow-md`, `--shadow-lg`), colores acentuados (blue, green, red, yellow).
  
  2. **ThemeProvider mejorado** en `components/ThemeProvider.tsx`:
     - Implementación de `applyTheme()` con transiciones suaves (300ms).
     - Sincronización con cambios de preferencia del SO via `window.matchMedia()`.
     - Atributo `data-theme` agregado al html para mejor control de CSS.
  
  3. **ThemeToggle redeseñado** en `components/ThemeToggle.tsx`:
     - Botón con animación de fondo gradiente en hover.
     - Icono Sun/Moon con animación `spin-slow` al estar en modo oscuro.
     - Mejor contraste y sombras con transiciones suaves.
     - Tamaño aumentado a 10px (40px de alto/ancho).
  
  4. **Nuevas animaciones CSS**:
     - `@keyframes spin-slow`: Rotación lenta para el icono del sol (3s).
     - `@keyframes glow-pulse`: Efecto de resplandor pulsante para textos.
     - `@keyframes fadeInDown`: Desvanecimiento hacia abajo.
     - `@keyframes slideInRight`: Deslizamiento desde la derecha.
  
  5. **Clases CSS reutilizables**:
     - `.glass-card` y `.glass-card-light`: Efectos glassmorphism mejorados.
     - `.card-base`, `.card-hover`, `.card-focus`: Estilos estándar para tarjetas.
     - `.btn-primary`, `.btn-secondary`: Botones con hover effects.
     - `.text-gradient-orange`, `.text-gradient-blue`: Textos con gradientes.
  
  6. **Sobrescrituras de modo oscuro mejoradas**:
     - Colores de texto, fondos y bordes completamente redefinidos para cada utilidad de Tailwind.
     - Sombras ajustadas para modo oscuro con mayor profundidad visual.
     - Hover states consistentes con la paleta de marca.
  
  7. **Scrollbars estilizados** con transiciones suaves y colores temáticos.
  
- **Archivos modificados:**
  - `app/globals.css` (completamente reescrito con nueva paleta y animaciones)
  - `components/ThemeProvider.tsx` (mejorada sincronización y transiciones)
  - `components/ThemeToggle.tsx` (rediseño de UI/UX)



## 18. [2026-07-16] Corrección Integral del Sistema de Temas (Dark/Light Mode)
- **Problema**: Múltiples componentes permanecían con fondos blancos y colores hardcodeados en modo oscuro, creando una experiencia inconsistente. Elementos específicos identificados:
  1. **FloatingTicketButton**: Fondo naranja sin variantes dark, borde blanco hardcodeado
  2. **Services & ServicesList**: Cards con bg-white sin variante dark, textos sin adaptación
  3. **Carousel & AdsCarousel**: Fondos grises y navegación sin respuesta al tema
  4. **HomeBookingSearch**: Componente crítico completamente blanco en dark mode (dropdowns, inputs, contenedor principal)
  5. **Páginas públicas** (Ayuda, Quienes Somos): Cards, acordeones y sucursales sin modo oscuro
  6. Textos con color-gray-900, gray-600, gray-500 sin variantes dark
  7. Bordes con border-gray-100 sin variantes dark
  8. Fondos con bg-gray-50 sin variantes dark
  9. Sombras sin adaptación para modo oscuro

- **Solución Implementada**:
  
  **A. Componentes Básicos Corregidos:**
  1. **FloatingTicketButton.tsx**:
     - Añadido `dark:bg-orange-600 dark:hover:bg-orange-700`
     - Sombra adaptada: `dark:shadow-orange-900/50`
     - Borde dinámico: `border-white/20 dark:border-orange-700`
  
  2. **Services.tsx**:
     - Cards: `bg-white dark:bg-[#111827]`
     - Bordes: `border-gray-100 dark:border-slate-700`
     - Textos: `text-gray-900 dark:text-slate-100`
     - Iconos: `bg-orange-50 dark:bg-orange-950/30`
  
  3. **ServicesList.tsx**:
     - Idéntica adaptación a Services.tsx
     - Efectos hover adaptados al tema oscuro
  
  4. **Carousel.tsx & AdsCarousel.tsx**:
     - Fondo: `bg-gray-100 dark:bg-slate-800`
     - Controles: `bg-black/20 dark:bg-black/40`
     - Dots: `bg-gray-300 dark:bg-slate-500`
     - Bordes: `border-gray-100 dark:border-slate-700`
  
  **B. Componente Crítico HomeBookingSearch.tsx:**
  - Contenedor principal: `bg-white dark:bg-[#111827]`
  - Sombras: `shadow-2xl dark:shadow-black/20`
  - Bordes: `border-white/50 dark:border-slate-700`
  - Título: `text-gray-800 dark:text-slate-100`
  - Inputs internos: `bg-white dark:bg-[#0f1219]`
  - Dropdowns: `bg-white dark:bg-[#111827]`
  - Labels: `text-gray-400 dark:text-slate-500`
  - Opciones seleccionadas: `text-gray-900 dark:text-slate-100`
  - Hover states: `hover:bg-orange-50/50 dark:hover:bg-orange-950/20`
  - Items dropdown: `bg-orange-50 dark:bg-orange-950/30`
  - Fecha input: `text-gray-900 dark:text-slate-100`
  - Botón buscar: `dark:bg-orange-600 dark:hover:bg-orange-700`
  
  **C. Páginas Públicas:**
  
  1. **ayuda/page.tsx**:
     - Cards FAQ: `bg-white dark:bg-[#111827]`
     - Títulos: `text-gray-900 dark:text-slate-100`
     - Contenido acordeón: `bg-orange-50/30 dark:bg-orange-950/20`
     - Divisores: `divide-gray-100 dark:divide-slate-700`
     - Banner contacto: `from-orange-50 dark:from-orange-950/20`
     - Info boxes equipaje: `bg-gray-50 dark:bg-slate-800`
  
  2. **quienes-somos/page.tsx**:
     - Cards Misión/Visión: `bg-white dark:bg-[#111827]`
     - Título sección: `text-gray-900 dark:text-slate-100`
     - Tarjetas sucursales: `bg-white dark:bg-[#111827]`
     - Textos internos: `text-gray-900 dark:text-slate-100`
     - Bordes: `border-gray-100 dark:border-slate-700`
     - Sombras: `shadow-xl dark:shadow-black/20`
  
  **D. Patrón de Colores Estandarizado:**
  - **Fondos principales**: `bg-white dark:bg-[#111827]`
  - **Fondos secundarios**: `bg-gray-50 dark:bg-slate-800`
  - **Superficies internas**: `bg-white dark:bg-[#0f1219]`
  - **Texto primario**: `text-gray-900 dark:text-slate-100`
  - **Texto secundario**: `text-gray-600 dark:text-slate-400`
  - **Texto terciario**: `text-gray-500 dark:text-slate-500`
  - **Bordes**: `border-gray-100 dark:border-slate-700`
  - **Divisores**: `divide-gray-100 dark:divide-slate-700`
  - **Sombras**: `shadow-xl dark:shadow-black/20`
  - **Acentos naranjas**: `bg-orange-50 dark:bg-orange-950/30`
  - **Botones primarios**: `bg-[#f07639] dark:bg-orange-600 hover:bg-orange-600 dark:hover:bg-orange-700`

  **E. Transiciones Suaves:**
  - Todos los cambios incluyen `transition-colors duration-300` o `transition-all duration-300`
  - Asegura experiencia fluida al cambiar de tema
  
- **Archivos Modificados**:
  1. `components/FloatingTicketButton.tsx` - Botón flotante adaptado
  2. `components/Services.tsx` - Sección servicios homepage
  3. `components/ServicesList.tsx` - Lista servicios sidebar
  4. `components/Carousel.tsx` - Carrusel principal
  5. `components/AdsCarousel.tsx` - Carrusel publicitario
  6. `components/HomeBookingSearch.tsx` - Buscador principal (crítico)
  7. `app/(public)/ayuda/page.tsx` - Centro de ayuda con FAQs
  8. `app/(public)/quienes-somos/page.tsx` - Página institucional
  
- **Resultado**: Sistema de temas completamente consistente y profesional. Todos los componentes visibles en la captura del usuario ahora respetan correctamente el modo oscuro/claro sin elementos blancos inesperados.

