# 🚌 DOCUMENTACIÓN TÉCNICA MAESTRA - SISTEMA "EL CUMBE S.A.C."
> **Manual Técnico Integral y Guía de Servicios: Dónde se crea cada entidad, flujos funcionales, APIs y arquitectura de software.**

---

## 📋 TABLA DE CONTENIDOS
1. [Visión General de la Arquitectura](#1-visión-general-de-la-arquitectura)
2. [Guía de Creación y Gestión de Entidades (¿Dónde se crea cada cosa?)](#2-guía-de-creación-y-gestión-de-entidades-dónde-se-crea-cada-cosa)
   - [2.1 Gestión de Usuarios, Clientes y Personal (Conductores, Operarios, Vendedores, Admin)](#21-gestión-de-usuarios-clientes-y-personal)
   - [2.2 Creación y Reserva de Pasajes (Venta Web, Ventanilla y App Móvil)](#22-creación-y-reserva-de-pasajes)
   - [2.3 Programación de Viajes y Asignación de Flota](#23-programación-de-viajes-y-asignación-de-flota)
   - [2.4 Registro y Seguimiento de Encomiendas](#24-registro-y-seguimiento-de-encomiendas)
   - [2.5 Gestión de Flota de Buses, Rutas y Sucursales](#25-gestión-de-flota-de-buses-rutas-y-sucursales)
3. [Servicios Funcionales de la Página Web y Aplicativo Móvil](#3-servicios-funcionales-de-la-página-web-y-aplicativo-móvil)
   - [3.1 Módulo del Cliente](#31-módulo-del-cliente)
   - [3.2 Módulo del Conductor](#32-módulo-del-conductor)
   - [3.3 Módulo del Operario de Embarque](#33-módulo-del-operario-de-embarque)
   - [3.4 Módulo de Administración y Venta](#34-módulo-de-administración-y-venta)
4. [Estructura del Proyecto y Archivos Clave](#4-estructura-del-proyecto-y-archivos-clave)
5. [Modelo de Datos E-R (Prisma / PostgreSQL)](#5-modelo-de-datos-e-r-prisma--postgresql)
6. [Catálogo de APIs REST Móviles (`/api/movil`)](#6-catálogo-de-apis-rest-móviles-apimovil)
7. [Manejo de Seguridad (RBAC y JWT)](#7-manejo-de-seguridad-rbac-y-jwt)
8. [Integraciones Externas (Culqi, Resend API, jsPDF, QRCode)](#8-integraciones-externas-culqi-resend-api-jspdf-qrcode)
9. [Pruebas Automáticas y Calidad de Código](#9-pruebas-automáticas-y-calidad-de-código)
10. [Variables de Entorno y Comandos](#10-variables-de-entorno-y-comandos)

---

## 1. VISIÓN GENERAL DE LA ARQUITECTURA

El sistema **El Cumbe S.A.C.** es una plataforma de software omnicanal (Web + Móvil + Backend + BD Relacional) para la gestión completa de pasajes, carga, flota y personal operativo.

```mermaid
graph TD
    A[Cliente Final] -->|Portal Web Next.js 16| B[Servidor Next.js App Router]
    A -->|App Móvil Expo| C[APIs REST /api/movil]
    
    D[Staff: Conductor / Operario] -->|Web Staff / App Móvil| B
    E[Admin / Vendedor / Gerente] -->|Panel Admin Web| B
    
    B -->|ORM Prisma| F[(PostgreSQL Supabase)]
    C -->|ORM Prisma| F
    
    B -->|SDK Pasarela| G[Culqi Gateway - Tarjetas / Yape]
    B -->|Emails Transaccionales| H[Resend API - PDF + QR]
```

---

## 2. GUÍA DE CREACIÓN Y GESTIÓN DE ENTIDADES (¿Dónde se crea cada cosa?)

### 2.1 Gestión de Usuarios, Clientes y Personal

```mermaid
sequenceDiagram
    participant U as Usuario / Admin
    participant V as Vista (Web / Móvil)
    participant A as Action / API Route
    participant DB as PostgreSQL (Prisma)

    U->>V: Ingresa Nombres, DNI, Correo, Rol
    alt Registro Público (Cliente)
        V->>A: POST /api/auth/register o /api/movil/registro
    else Creación por Admin (Staff / Cliente)
        V->>A: Server Action crearUsuario()
    end
    A->>DB: Crea Persona + Usuario (Hash bcrypt)
    DB-->>A: Registro exitoso
    A-->>V: Confirma creación
```

* **¿Dónde se crean los Clientes (Público)?**
  * **Página Web:** En `/registro` ([`app/(public)/registro/page.tsx`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28public%29/registro/page.tsx)), consume `POST /api/auth/register`.
  * **App Móvil:** En la pantalla `RegisterScreen.tsx` ([`app-movil-elcumbe/src/screens/RegisterScreen.tsx`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app-movil-elcumbe/src/screens/RegisterScreen.tsx)), consume `POST /api/movil/registro`.
* **¿Dónde se crea y administra el Personal (Conductores, Operarios, Vendedores, Admins)?**
  * **Panel Web de Administración:** En `/admin/usuarios` ([`UsuariosClient.tsx`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28admin%29/admin/usuarios/UsuariosClient.tsx)).
  * **Lógica del Servidor:** Utiliza la Server Action `crearUsuario()` y `actualizarRolUsuario()` en [`app/(admin)/actions/usuarios.ts`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28admin%29/actions/usuarios.ts).
  * **Filtro de Separación:** El panel clasifica en tiempo real mediante pestañas interactivas entre **Personal de la Empresa** y **Clientes / Pasajeros**.
  * **Siembra Inicial de Cuentas Staff:** Mediante el script [`scripts/seed-roles.ts`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/scripts/seed-roles.ts).

---

### 2.2 Creación y Reserva de Pasajes

* **¿Dónde compra / crea pasajes el Cliente?**
  * **Web:** En `/compra` ([`app/(public)/compra/page.tsx`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28public%29/compra/page.tsx)). Ejecuta `comprarPasajeConCulqi()` en [`app/actions.ts`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/actions.ts).
  * **App Móvil:** En `BusSeatSelectionScreen.tsx` + `PaymentScreen.tsx`, consume `POST /api/movil/compras`.
* **¿Dónde vende pasajes el Vendedor en Ventanilla?**
  * **Panel Web:** En `/admin/pasajes` ([`app/(admin)/admin/pasajes/page.tsx`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28admin%29/admin/pasajes/page.tsx)), ejecuta `crearPasajeVentanilla()`.
* **Mecanismo Anti-Doble Reserva (Race Condition):**
  * Toda creación de pasaje bloquea el asiento mediante una **Transacción Atómica en Prisma** (`marcarAsientosPendientes` en [`app/actions.ts`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/actions.ts)). Si otro usuario intenta comprar el mismo asiento simultáneamente, la base de datos aborta la segunda solicitud y devuelve un error amigable.
* **Emisión de Boleto Digital y QR:**
  * Al confirmarse el pago, se genera un **Código QR único** (`código_qr: TEST-QR-XXX`), se almacena en la tabla `Pasaje` y se envía automáticamente una copia HTML + PDF por correo electrónico vía **Resend API**.

---

### 2.3 Programación de Viajes y Asignación de Flota

* **¿Dónde se crean y programan los Viajes?**
  * **Panel Web Admin:** En `/admin/viajes` ([`ViajeClient.tsx`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28admin%29/admin/viajes/ViajeClient.tsx)).
  * **Lógica Servidor:** Server Action `crearViajeConAsientos()` en [`app/(admin)/actions/viajes.ts`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28admin%29/actions/viajes.ts).
* **Guarda Anti-Solapamiento (Prevención de Conflictos de Horario):**
  * Al crear o editar un viaje, el sistema verifica si el **Bus** o el **Conductor** seleccionado ya tienen otro viaje asignado que se solape en el mismo rango de fecha y hora. Si hay cruce, bloquea la creación y alerta al administrador.
* **Generación Automática de Asientos:**
  * Al programar un viaje, la Server Action consulta la capacidad del bus y crea en lote los registros de `AsientoViaje` (*Piso 1, Piso 2, Número de Asiento*) ajustándose a la distribución del vehículo.

---

### 2.4 Registro y Seguimiento de Encomiendas

* **¿Dónde se crean las Encomiendas?**
  * **Panel Web Ventanilla:** En `/admin/encomiendas` ([`app/(admin)/admin/encomiendas/page.tsx`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28admin%29/admin/encomiendas/page.tsx)), ejecuta `crearEncomienda()` en [`app/actions.ts`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/actions.ts).
  * **Código de Rastreabilidad:** Asigna automáticamente un código único `ENC-YYYYMMDD-XXX` (ej. `ENC-20260720-001`).
* **Transición Automática del Ciclo de Vida de Encomiendas:**
  1. **En Agencia Origen:** Estado `recepcionado`.
  2. **Al Iniciar Viaje el Conductor (`en_ruta`):** El sistema pasa automáticamente todas las encomiendas del bus a estado **`en_transito`**.
  3. **Al Finalizar Viaje el Conductor (`completado`):** El sistema pasa automáticamente todas las encomiendas a estado **`en_destino`** (disponibles en agencia para ser recogidas por el destinatario).
* **¿Dónde rastrea el cliente su paquete?**
  * **Web:** En `/seguimiento` ([`app/(public)/seguimiento/page.tsx`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28public%29/seguimiento/page.tsx)).
  * **App Móvil:** En la pantalla `SeguimientoScreen.tsx` ([`app-movil-elcumbe/src/screens/SeguimientoScreen.tsx`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app-movil-elcumbe/src/screens/SeguimientoScreen.tsx)).

---

### 2.5 Gestión de Flota de Buses, Rutas y Sucursales

* **Buses:**
  * **Creación / Edición:** En `/admin/buses` ([`BusClient.tsx`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28admin%29/admin/buses/BusClient.tsx)) vía `crearBus()` en [`app/(admin)/actions/buses.ts`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28admin%29/actions/buses.ts).
  * **Distribución:** Configuración de placa, modelo, 1 o 2 pisos, capacidad total y asientos inactivos (JSON array `asientos_restringidos`).
* **Rutas Interprovinciales:**
  * **Creación / Edición:** En `/admin/rutas` vía `crearRuta()` en [`app/(admin)/actions/rutas.ts`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28admin%29/actions/rutas.ts). Asocia Sucursal Origen, Sucursal Destino, Precio base sugerido y Duración estimada en horas.
* **Agencias / Sucursales:**
  * **Creación / Edición:** En `/admin/sucursales` vía `crearSucursal()` en [`app/(admin)/actions/sucursales.ts`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28admin%29/actions/sucursales.ts). Registra nombre de agencia, ciudad, dirección, teléfono de contacto y coordenadas GPS.

---

## 3. SERVICIOS FUNCIONALES DE LA PÁGINA WEB Y APLICATIVO MÓVIL

### 3.1 Módulo del Cliente

| Servicio / Funcionalidad | Ubicación Web | Ubicación App Móvil | Descripción |
| :--- | :--- | :--- | :--- |
| **Búsqueda de Pasajes** | `/` y `/compra` | `ClienteDashboardScreen.tsx` | Filtro por origen, destino y fecha con selector visual. |
| **Selección de Asientos** | `/compra` | `BusSeatSelectionScreen.tsx` | Croquis de bus multinivel (Piso 1 y Piso 2) en tiempo real. |
| **Pago en Línea** | `/compra` | `PaymentScreen.tsx` | Integración Culqi SDK (Tarjetas Visa/MC y Yape). |
| **Mis Boletos Digitales** | `/perfil` | `MisBoletosScreen.tsx` | Consulta de boletos comprados con renderizado de QR. |
| **Rastreo de Encomiendas**| `/seguimiento` | `SeguimientoScreen.tsx` | Consulta por código de rastreo con línea de tiempo. |
| **Libro de Reclamaciones**| `/reclamaciones`| `ReclamacionesScreen.tsx` | Registro de reclamos según normativa INDECOPI. |
| **Centro de Ayuda / FAQ** | `/ayuda` | `AyudaScreen.tsx` | Preguntas frecuentes y canales de soporte directo. |
| **Perfil de Usuario** | `/perfil` | `PerfilScreen.tsx` | Edición de datos personales, teléfono y foto. |

---

### 3.2 Módulo del Conductor

Acceso exclusivo para usuarios con rol `conductor` (vía Web `/staff/conductor` o App Móvil en `ConductorDashboardScreen.tsx`):

1. **Dashboard de Itinerario:** Resumen de viajes asignados para la fecha actual (huso horario Perú `America/Lima`).
2. **Control de Estado de Ruta:** Botones para `INICIAR VIAJE` (`en_ruta`) y `FINALIZAR VIAJE` (`completado`).
3. **Navegación GPS y Geocercado (Fórmula Haversine):**
   * En `ConductorViajeDetalleScreen.tsx` ([`app-movil-elcumbe/src/screens/ConductorViajeDetalleScreen.tsx`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app-movil-elcumbe/src/screens/ConductorViajeDetalleScreen.tsx)).
   * Calcula la distancia en kilómetros entre el bus y los puntos de ruta.
   * **Lanzador de Google Maps:** Abre la navegación giro a giro en tiempo real mediante `Linking.openURL()`.
4. **Pestaña Encomiendas:** Muestra el listado de paquetes que van en la bodega de la unidad.
5. **Pestaña Gastos de Ruta:** Registro móvil de peajes, viáticos, combustible y lavado, con cálculo de suma total. (API `/api/movil/conductor/gastos`).
6. **Pestaña Bitácora de Ocurrencias:** Registro de incidencias en carretera o demoras por clima. (API `/api/movil/conductor/bitacora`).
7. **Reporte de Fallas de Bus:** Registro de averías en `/staff/conductor/novedades` (API `/api/movil/conductor/novedades`).

---

### 3.3 Módulo del Operario de Embarque

Acceso exclusivo para usuarios con rol `operario` (vía Web `/staff/operario` o App Móvil en `OperadorDashboardScreen.tsx`):

1. **Dashboard de Embarque en Vivo:**
   * Muestra métricas vivas: **Viajes Programados**, **Pasajeros a Bordo** (`Abordados / Total Pasajeros`), y **Pendientes de Embarque**.
2. **Lista de Manifiesto de Pasajeros:**
   * Muestra la lista de pasajeros por viaje (Asiento `A-1`, Nombre, DNI).
   * Permite alternar manualmente el estado con un botón en 1 toque (`A bordo` / `Pendiente`). Consume `PUT /api/movil/operario/pasajeros`.
3. **Escáner de Boletos por Cámara (QR Code):**
   * En `QRScannerScreen.tsx` ([`app-movil-elcumbe/src/screens/QRScannerScreen.tsx`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app-movil-elcumbe/src/screens/QRScannerScreen.tsx)).
   * Utiliza `Expo Camera` para leer el QR del pasajero en la puerta del bus.
   * Valida en BD vía `/api/movil/pasajes/validar-qr`, marca el pasaje como `abordado = true` e impide la reutilización del boleto.

---

### 3.4 Módulo de Administración y Venta

Acceso para usuarios con rol `admin`, `gerente` o `vendedor`:

* **Panel General (`/admin`):** Métricas consolidadas de ventas de pasajes, ingresos por encomiendas, ocupación de flota y salidas diarias.
* **Filtros por Roles en Usuarios (`/admin/usuarios`):** Separación mediante pestañas entre **Personal de la Empresa** (*Admin, Gerente, Vendedor, Operario, Conductor*) y **Clientes**.
* **Gestión Operativa:** Altas, bajas y modificaciones de buses, rutas, agencias y horarios de salidas.

---

## 4. ESTRUCTURA DEL PROYECTO Y ARCHIVOS CLAVE

```
app_WebCumbe/
├── app/                        # Aplicación Web Next.js (App Router)
│   ├── (admin)/                # Panel Administrativo y Server Actions
│   │   ├── actions/            # Server Actions (buses, conductor, operario, rutas, viajes, usuarios)
│   │   │   ├── buses.ts        # Lógica CRUD de buses y asientos
│   │   │   ├── conductor.ts    # Lógica de itinerario, gastos y bitácora de conductores
│   │   │   ├── operario.ts     # Lógica de manifiesto y validación QR de embarque
│   │   │   ├── rutas.ts        # Lógica CRUD de rutas interprovinciales
│   │   │   ├── sucursales.ts   # Lógica CRUD de agencias
│   │   │   ├── usuarios.ts     # Lógica de gestión de usuarios y roles
│   │   │   └── viajes.ts       # Lógica de viajes y guardas anti-solapamiento
│   │   ├── admin/              # Vistas Administrativas (/admin/usuarios, /admin/viajes, etc.)
│   │   └── layout.tsx          # Navegación principal con filtrado por rol (RBAC)
│   ├── (public)/               # Portal Público para Clientes (/compra, /seguimiento, /perfil, etc.)
│   ├── api/                    # Endpoints REST del Servidor
│   │   ├── auth/               # Autenticación, Registro y Reset de Password
│   │   ├── movil/              # APIs REST exclusivas para la App Móvil
│   │   └── pasajes/validar-qr/ # Endpoint de validación de código QR
│   ├── staff/                  # Vistas Web dedicadas a Conductor y Operario
│   ├── actions.ts              # Server Actions globales (compras Culqi, encomiendas, pasajes)
│   └── proxy.ts                # Middleware principal Next.js para protección de rutas (RBAC)
├── app-movil-elcumbe/          # Aplicativo Móvil React Native / Expo
│   ├── src/
│   │   ├── screens/            # Pantallas móviles (Cliente, Conductor, Operario, QR Scanner)
│   │   └── context/AuthContext # Contexto de autenticación móvil y almacenamiento de token
│   └── App.tsx                 # Enrutador Native Stack de React Navigation
├── lib/                        # Clientes y Utilidades del Sistema
│   ├── auth.ts                 # Configuración de NextAuth.js
│   ├── mobileAuth.ts           # Verificador de Bearer Token JWT para APIs Móviles
│   ├── prisma.ts               # Instancia Singleton de Prisma Client
│   ├── customer-profile.ts     # Gestor de historial de compras del cliente
│   └── bus-images.ts           # Catálogo de imágenes de la flota
├── prisma/
│   └── schema.prisma           # Esquema relacional PostgreSQL
├── scripts/                    # Suite de testing automáticos y semillas
│   ├── unit-tests.ts           # 11 Pruebas unitarias
│   └── run-tests.ts            # Pruebas de integración y concurrencia
├── .env                        # Variables de entorno locales
└── DOCUMENTACION_TECNICA.md    # Este documento maestro
```

---

## 5. MODELO DE DATOS E-R (PRISMA / POSTGRESQL)

```mermaid
erDiagram
    Usuario ||--|| Persona : "pertenece_a"
    Usuario ||--o{ VerificationCode : "posee"
    Persona ||--o{ Viaje : "conduce (conductor)"
    Persona ||--o{ Pasaje : "compra (pasajero)"
    Persona ||--o{ Encomienda : "recibe (destinatario)"
    
    Sucursal ||--o{ Ruta : "origen"
    Sucursal ||--o{ Ruta : "destino"
    Sucursal ||--o{ Encomienda : "origen"
    Sucursal ||--o{ Encomienda : "destino"
    
    Ruta ||--o{ Viaje : "asigna"
    Bus ||--o{ Viaje : "utiliza"
    Bus ||--o{ NovedadBus : "reporta"
    
    Viaje ||--o{ AsientoViaje : "contiene"
    Viaje ||--o{ Encomienda : "lleva"
    Viaje ||--o{ GastoRuta : "registra"
    Viaje ||--o{ BitacoraViaje : "registra"
    
    AsientoViaje ||--o| Pasaje : "reserva"
```

---

## 6. CATÁLOGO DE APIS REST MÓVILES (`/api/movil`)

Todas las APIs móviles retornan respuestas estructuradas en formato JSON serializando tipos `BigInt` de forma segura.

| Método | Endpoint | Parámetros / Body | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/movil/login` | `{ correo, contrasena }` | Autentica al usuario y devuelve token JWT + Datos de usuario y rol. |
| `POST` | `/api/movil/registro` | `{ nombres, apellidos, dni, correo... }` | Registra una nueva cuenta de cliente. |
| `GET` | `/api/movil/viajes` | `?origenId=&destinoId=&fecha=` | Lista viajes disponibles para compra de pasajes. |
| `GET` | `/api/movil/viajes/asientos` | `?viajeId=X` | Devuelve el mapa completo de asientos (piso 1 y 2) con sus estados. |
| `POST` | `/api/movil/compras` | `{ viajeId, asientos, pasajeroData, tokenCulqi }` | Procesa la compra atómica y emite el boleto QR. |
| `GET` | `/api/movil/conductor/viajes` | Header: `Authorization: Bearer <TOKEN>` | Lista viajes asignados al conductor logueado. |
| `PUT` | `/api/movil/conductor/viajes` | `{ viajeId, estado }` | Actualiza estado de viaje (`en_ruta`, `completado`) y encomiendas. |
| `POST/DEL`| `/api/movil/conductor/gastos` | `{ viajeId, concepto, monto }` | Registra o elimina un gasto operativo del bus en ruta. |
| `POST/PUT`| `/api/movil/conductor/bitacora` | `{ viajeId, observacion }` | Registra o edita una novedad en la bitacora de ruta. |
| `GET` | `/api/movil/operario/viajes` | Header: `Authorization: Bearer <TOKEN>` | Devuelve salidas de hoy y métricas de abordaje para operario. |
| `GET/PUT`| `/api/movil/operario/pasajeros`| `{ pasajeId, abordado }` | Consulta manifiesto de pasajeros y conmuta estado de abordaje. |
| `POST` | `/api/movil/pasajes/validar-qr` | `{ codigo_qr }` | Valida código QR escaneado por cámara y marca abordaje. |

---

## 7. MANEJO DE SEGURIDAD (RBAC Y JWT)

1. **Web RBAC (`proxy.ts`):** Middleware de Next.js que analiza el token de sesión en cada URL. Si un cliente intenta ingresar a `/admin` o un conductor a `/staff/operario`, la solicitud es rechazada y redireccionada automáticamente.
2. **Móvil Bearer Token (`lib/mobileAuth.ts`):** Valida la firma criptográfica del token enviado en las cabeceras HTTP de la App Móvil mediante la clave secreta `NEXTAUTH_SECRET`.

---

## 8. INTEGRACIONES EXTERNAS (CULQI, RESEND API, JSPDF, QRCODE)

### Pasarela de Pagos Culqi:
* Permite cobro con **Tarjetas de Crédito/Débito** y **Yape**.
* Entorno de pruebas (Sandbox) utilizando la Public Key `pk_test_...` y Secret Key `sk_test_...`.

### Envío de Correos con PDF Adjunto (Resend API):
* Al confirmarse un boleto o solicitar restablecimiento de contraseña, el servidor genera un documento PDF dinámico utilizando `jsPDF` y código QR con `qrcode`.
* Se envía vía la API de **Resend** (`resend.emails.send`) incluyendo el PDF en base64 como archivo adjunto `Boleto_Digital_ElCumbe.pdf`.

---

## 9. PRUEBAS AUTOMÁTICAS Y CALIDAD DE CÓDIGO

Ejecuta toda la suite de testing con el comando:

```bash
npm test
```

### Resultados de la Suite de Pruebas:
* **11 Pruebas Unitarias PASADAS:** Validaciones Zod/RegEx de DNI, teléfono, firma JWT, cálculo de tarifas y tope de 6 asientos por compra.
* **Prueba de Integración Concurrencia PASADA:** Verificación de bloqueo atómico a nivel de base de datos ante solicitudes simultáneas de compra sobre el mismo asiento.

---

## 10. VARIABLES DE ENTORNO Y COMANDOS

Ejemplo de configuración del archivo `.env`:

```env
# Base de Datos PostgreSQL Supabase
DATABASE_URL="postgresql://postgres:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# NextAuth & Seguridad JWT
NEXTAUTH_SECRET="development_secret_key_32_characters_long"
NEXTAUTH_URL="http://localhost:3000"

# Pasarela Culqi (Sandbox)
NEXT_PUBLIC_CULQI_PUBLIC_KEY="pk_test_..."
CULQI_SECRET_KEY="sk_test_..."

# Correos Transaccionales (Resend)
RESEND_API_KEY="re_..."
RESEND_FROM="El Cumbe <onboarding@resend.dev>"

# API Endpoint Móvil
EXPO_PUBLIC_API_URL="http://192.168.101.18:3000"
```

### Comandos Principales:
```bash
# Iniciar Servidor Web Next.js
npm run dev

# Iniciar App Móvil Expo
npm run mobile

# Ejecutar Suite Completa de Tests
npm test

# Sincronizar Esquema Prisma con la BD
npx prisma db push
```

---
*Documentación técnica maestra generada y validada para el repositorio **DAD_B_Grupo3**.*
