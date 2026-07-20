# 🚌 DOCUMENTACIÓN TÉCNICA SISTEMA "EL CUMBE S.A.C."
> **Plataforma Integral de Venta de Pasajes, Encomiendas, Control Operativo y Aplicativo Móvil Multiplataforma**

---

## 📋 TABLA DE CONTENIDOS
1. [Visión General de la Arquitectura](#1-visión-general-de-la-arquitectura)
2. [Estructura del Proyecto](#2-estructura-del-proyecto)
3. [Modelo de Datos y Base de Datos (Prisma / PostgreSQL)](#3-modelo-de-datos-y-base-de-datos-prisma--postgresql)
4. [Control de Acceso Basado en Roles (RBAC)](#4-control-de-acceso-basado-en-roles-rbac)
5. [Módulo Web (Next.js 16 App Router)](#5-módulo-web-nextjs-16-app-router)
6. [Módulo Móvil (React Native / Expo)](#6-módulo-móvil-react-native--expo)
7. [APIs REST Móviles (`/api/movil`)](#7-apis-rest-móviles-apimovil)
8. [Flujos de Negocio Críticos y Lógica de Código](#8-flujos-de-negocio-críticos-y-lógica-de-código)
9. [Pruebas Automáticas y Validación de Calidad](#9-pruebas-automáticas-y-validación-de-calidad)
10. [Variables de Entorno y Despliegue](#10-variables-de-entorno-y-despliegue)

---

## 1. VISIÓN GENERAL DE LA ARQUITECTURA

El sistema **El Cumbe S.A.C.** es una solución enterprise omnichannel diseñada para la gestión integral de transporte interprovincial de pasajeros y carga.

```mermaid
graph TD
    A[Cliente / Usuario] -->|Web Next.js| B[Servidor Next.js 16 App Router]
    A -->|App Móvil Expo| C[APIs REST /api/movil]
    
    D[Staff Conductor & Operario] -->|Web Staff / App Móvil| B
    E[Admin / Vendedor / Gerente] -->|Panel Admin Web| B
    
    B -->|ORM Prisma| F[(PostgreSQL Supabase)]
    C -->|ORM Prisma| F
    
    B -->|Pasarela SDK| G[Culqi Payment Gateway]
    B -->|Emails Transaccionales| H[Resend API]
```

### Tecnologías Core Utilizadas:
* **Frontend Web:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide Icons, Recharts.
* **Aplicativo Móvil:** React Native, Expo SDK 54, React Navigation Native Stack, Expo Camera (Scanner QR).
* **Backend & API Layer:** Next.js Server Actions, Next.js API Routes, NextAuth.js v4, JWT Bearer Tokens.
* **Base de Datos:** PostgreSQL (Supabase / AWS Pooler), Prisma ORM v6.
* **Integraciones Externas:** Culqi API (Tarjetas y Yape Sandbox), Resend API (Emails transaccionales HTML + PDF), jsPDF + QRCode.

---

## 2. ESTRUCTURA DEL PROYECTO

```
app_WebCumbe/
├── app/                        # Aplicación Web Next.js (App Router)
│   ├── (admin)/                # Panel Administrativo y Server Actions
│   │   ├── actions/            # Server Actions (buses, conductor, operario, rutas, viajes, usuarios)
│   │   ├── admin/              # Vistas Admin (vendedores, buses, rutas, sucursales, usuarios)
│   │   └── layout.tsx          # Layout con navegación lateral RBAC
│   ├── (public)/               # Portal Público (Compra, Perfil, Seguimiento, Ayuda, Reclamaciones)
│   ├── api/                    # Endpoints REST (Auth, Móvil, QR Validation, Release Seats)
│   │   └── movil/              # APIs exclusivas para la App Móvil (Conductor, Operario, Cliente)
│   ├── staff/                  # Paneles Web dedicados para Personal Operativo
│   │   ├── conductor/          # Panel Web de Conductor (Dashboard, Rutas, Novedades, Alertas)
│   │   └── operario/           # Panel Web de Operario (Abordaje y Control QR)
│   ├── globals.css             # Estilos globales y diseño Tailwind
│   └── layout.tsx              # Layout Raíz y Provider NextAuth
├── app-movil-elcumbe/          # Aplicativo Móvil React Native (Expo)
│   ├── src/
│   │   ├── components/         # Componentes móviles reusables
│   │   ├── context/            # Contexto de Autenticación Móvil
│   │   └── screens/            # Pantallas (Cliente, Conductor, Operario, Scanner QR)
│   └── App.tsx                 # Contenedor de Navegación Native Stack
├── lib/                        # Librerías y Clientes compartidos
│   ├── auth.ts                 # Configuración NextAuth.js
│   ├── mobileAuth.ts           # Middleware de verificación JWT para la App Móvil
│   ├── prisma.ts               # Instancia Singleton del Cliente Prisma
│   ├── customer-profile.ts     # Gestor de perfiles y pasajes de clientes
│   └── bus-images.ts           # Catálogo dinámico de imágenes de flota de buses
├── prisma/
│   └── schema.prisma           # Esquema relacional de base de datos
├── public/                     # Recursos estáticos e imágenes
├── proxy.ts                    # Middleware principal de seguridad y RBAC de Next.js
├── scripts/                    # Scripts de testing y semillas de BD
│   ├── unit-tests.ts           # Suite de Pruebas Unitarias
│   ├── run-tests.ts            # Suite de Pruebas de Integración y Concurrencia
│   ├── seed-initial.ts         # Datos semilla iniciales del sistema
│   └── seed-roles.ts           # Semilla de roles y cuentas de staff
├── .env                        # Variables de entorno locales
└── DOCUMENTACION_TECNICA.md    # Este documento técnico
```

---

## 3. MODELO DE DATOS Y BASE DE DATOS (PRISMA / POSTGRESQL)

El modelo relacional está compuesto por 13 entidades interconectadas:

```mermaid
erDiagram
    Usuario ||--|| Persona : "pertenece_a"
    Usuario ||--o{ VerificationCode : "posee"
    Persona ||--o{ Viaje : "conduce (conductor)"
    Persona ||--o{ Pasaje : "compra (pasajero)"
    Persona ||--o{ Encomienda : "recibe (destinatario)"
    
    Sucursal ||--o{ Ruta : "origen"
    Sucursal ||--o{ Ruta : "destino"
    Sucursal ||--o{ Encomienda : "sucursal_origen"
    Sucursal ||--o{ Encomienda : "sucursal_destino"
    
    Ruta ||--o{ Viaje : "asigna_a"
    Bus ||--o{ Viaje : "transporta"
    Bus ||--o{ NovedadBus : "reporta"
    
    Viaje ||--o{ AsientoViaje : "contiene"
    Viaje ||--o{ Encomienda : "lleva"
    Viaje ||--o{ GastoRuta : "registra"
    Viaje ||--o{ BitacoraViaje : "bitacora"
    
    AsientoViaje ||--o| Pasaje : "reserva"
```

### Descripción de Entidades Clave:
* **`Usuario`**: Autenticación, correo, contraseña hasheada y rol (*admin, gerente, vendedor, operario, conductor, cliente*).
* **`Persona`**: Datos personales reales (nombres, apellidos, DNI de 8 dígitos, teléfono).
* **`Bus`**: Placa, marca, capacidad total, pisos (1 o 2) y asientos restringidos/inactivos en formato JSON.
* **`Viaje`**: Salidas programadas con fecha/hora (`America/Lima`), bus asignado, conductor asignado, tarifa base y estado (*programado, en_ruta, completado, cancelado*).
* **`AsientoViaje`**: Asientos individuales por viaje (piso, número, estado: *disponible, pendiente, vendido, inactivo*).
* **`Pasaje`**: Reserva formal de asiento con código QR único, precio final y estado de abordaje (`abordado: boolean`).
* **`Encomienda`**: Paquetes transportados con código de seguimiento único, sucursal origen/destino, destinatario y estado (*recepcionado, en_transito, en_destino, entregado*).

---

## 4. CONTROL DE ACCESO BASADO EN ROLES (RBAC)

La plataforma implementa seguridad estricta en dos capas:

### Capa Web (`proxy.ts` Middleware):
Intercepta todas las peticiones a `/admin/*`, `/staff/*` y redirecciona según la sesión NextAuth:
* **`admin` / `gerente`**: Acceso total al panel administrativo `/admin`.
* **`vendedor`**: Acceso limitado a Venta de Pasajes (`/admin/pasajes`), Registro de Encomiendas (`/admin/encomiendas`) y consulta de Viajes.
* **`conductor`**: Acceso restringido a su panel operativo `/staff/conductor`.
* **`operario`**: Acceso restringido a su panel de embarque `/staff/operario`.
* **`cliente`**: Redirección a portal público `/`.

### Capa Móvil (`lib/mobileAuth.ts` JWT Bearer Token):
Cada petición desde la App Móvil incluye el encabezado `Authorization: Bearer <TOKEN>`. El middleware decodifica y valida el token firmado con `NEXTAUTH_SECRET`, verificando el rol autorizado.

---

## 5. MÓDULO WEB (NEXT.JS 16 APP ROUTER)

### A. Portal Administrativo (`/admin`):
* **Gestión de Usuarios (`/admin/usuarios`):** Separación en pestañas por categorías (*Todos, Personal de la Empresa, Clientes*), asignación de roles y edición de datos personales.
* **Control de Viajes (`/admin/viajes`):** Programación de salidas con **guardas anti-solapamiento** (impide asignar el mismo bus o conductor a viajes cruzados en el mismo rango horario).
* **Gestión de Flota de Buses (`/admin/buses`):** Definición de capacidad, 1 o 2 pisos y restricción dinámica de asientos.
* **Venta de Pasajes y Encomiendas:** Módulo posventa en ventanilla para agencias.

### B. Paneles Operativos Web (`/staff`):
* **Conductor (`/staff/conductor`):** Visualización de salidas del día en huso Perú, control de itinerario y reporte de fallas de bus.
* **Operario (`/staff/operario`):** Métricas de embarque en vivo, lista de manifiesto de pasajeros y validación de boletos QR.

---

## 6. MÓDULO MÓVIL (REACT NATIVE / EXPO)

La aplicación móvil (`app-movil-elcumbe`) provee 3 modos según el usuario logueado:

### 1. Modo Cliente / Pasajero:
* Búsqueda dinámica de pasajes por origen, destino y fecha.
* Mapa visual interactivo de asientos por pisos (Piso 1 y Piso 2).
* Formulario de datos de pasajeros.
* Integración con pasarela de pago (Tarjeta / Yape).
* Mis Boletos Digitales con generación de código QR.
* Módulos de Perfil, Seguimiento de Encomiendas, Ayuda y Libro de Reclamaciones.

### 2. Modo Conductor:
* **Dashboard Corporativo:** Métricas de ruta (Total viajes, Horas de ruta, Estado de bus asignado).
* **Detalle del Viaje:**
  * **Pestaña Ruta:** Detección de paradas mediante geocercado GPS (Fórmula Haversine) y botón de navegación turno a turno con Google Maps (`Linking.openURL`).
  * **Pestaña Encomiendas:** Lista de paquetes transportados en la bodega del bus.
  * **Pestaña Gastos de Ruta:** Registro de peajes, viáticos y combustible con suma en tiempo real.
  * **Pestaña Bitácora:** Registro de ocurrencias e incidencias mecánicas o climáticas.

### 3. Modo Operario / Embarque:
* **Dashboard de Control:** Métricas vivas de embarque (*Viajes Salidas, A Bordo, Pendientes*).
* **Lista de Manifiesto:** Modal con la lista completa de pasajeros con boletos y conmutador manual en 1 toque (`A bordo` / `Pendiente`).
* **Escáner QR Integrado (Expo Camera):** Cámara para escanear el boleto digital en puerta del bus y registrar abordaje automático.

---

## 7. APIS REST MÓVILES (`/api/movil`)

| Método | Ruta API | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/movil/login` | Autenticación móvil y emisión de JWT Token |
| `POST` | `/api/movil/registro` | Registro público de nuevos clientes |
| `GET` | `/api/movil/viajes` | Catálogo de viajes disponibles para compra |
| `GET` | `/api/movil/viajes/asientos` | Estado de asientos por mapa de bus |
| `POST` | `/api/movil/compras` | Procesamiento de reserva y compra de pasaje |
| `GET` | `/api/movil/conductor/viajes` | Obtención de viajes asignados al conductor con `persona_id` dinámico |
| `PUT` | `/api/movil/conductor/viajes` | Cambio de estado de viaje y **actualización automática de encomiendas** |
| `POST/DEL`| `/api/movil/conductor/gastos` | Registro y eliminación de gastos operacionales de ruta |
| `POST/PUT`| `/api/movil/conductor/bitacora` | Registro y edición de bitácora de incidencias |
| `GET` | `/api/movil/operario/viajes` | Salidas y métricas de embarque para operario |
| `GET/PUT`| `/api/movil/operario/pasajeros` | Lista de pasajeros por viaje y toggle de abordaje |
| `POST` | `/api/movil/pasajes/validar-qr` | Validación de boleto QR escaneado por cámara |

---

## 8. FLUJOS DE NEGOCIO CRÍTICOS Y LÓGICA DE CÓDIGO

### A. Manejo de Concurrencia y Anti-Race Condition en Reservas
Para evitar que dos clientes compren el mismo asiento al mismo milisegundo:
```ts
// Se ejecuta dentro de una Transacción Atómica en Prisma
await prisma.$transaction(async (tx) => {
  const asiento = await tx.asientoViaje.findFirst({
    where: { id: asientoId, estado: "disponible" }
  });
  if (!asiento) throw new Error("Uno o más asientos ya fueron reservados o vendidos por otro pasajero.");

  await tx.asientoViaje.update({
    where: { id: asientoId },
    data: { estado: "vendido" }
  });
});
```

### B. Transición Automática de Estado de Encomiendas
Cuando el Conductor actualiza el estado de su viaje a través de la Web o la App Móvil:
* **`INICIAR VIAJE` (`estado = en_ruta`):** Todas las encomiendas vinculadas al viaje cambian automáticamente a estado **`en_transito`**.
* **`FINALIZAR VIAJE` (`estado = completado`):** Al arribar al terminal de destino, todas las encomiendas cambian automáticamente a estado **`en_destino`** (cápsula verde listo para entrega).

### C. Normalización de Horarios Perú (`America/Lima`)
Todas las comparaciones de fechas para dashboards y salidas utilizan conversión estricta al huso de Perú para evitar desfasajes UTC:
```ts
const getPeruDateStr = (date: Date | string) => {
  return new Date(date).toLocaleDateString("en-CA", { timeZone: "America/Lima" });
};
```

---

## 9. PRUEBAS AUTOMÁTICAS Y VALIDACIÓN DE CALIDAD

El proyecto cuenta con una suite completa de pruebas ejecutables mediante:

```bash
npm test
```

### Cobertura de Pruebas (`scripts/unit-tests.ts` y `scripts/run-tests.ts`):
1. **Validaciones de Entrada (Zod / RegEx):** DNI peruano de 8 dígitos, teléfono celular de 9 dígitos y sanitización de nombres.
2. **Seguridad JWT:** Verificación de firma, validez de Bearer Tokens y rechazo de tokens alterados o sin rol autorizado.
3. **Reglas de Negocio:** Límite máximo de 6 asientos por compra y tarifas acumuladas.
4. **Prueba de Integración Atomicidad:** Simulación de 2 compras concurrentes simultáneas al mismo asiento en la BD real.

---

## 10. VARIABLES DE ENTORNO Y DESPLIEGUE

Ejemplo de configuración del archivo `.env`:

```env
# Base de Datos PostgreSQL Supabase
DATABASE_URL="postgresql://postgres:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# NextAuth & Seguridad
NEXTAUTH_SECRET="development_secret_key_32_characters_long"
NEXTAUTH_URL="http://localhost:3000"

# Pasarela Culqi (Pruebas)
NEXT_PUBLIC_CULQI_PUBLIC_KEY="pk_test_..."
CULQI_SECRET_KEY="sk_test_..."

# Correos Transaccionales (Resend)
RESEND_API_KEY="re_..."
RESEND_FROM="El Cumbe <onboarding@resend.dev>"

# API Endpoint Móvil
EXPO_PUBLIC_API_URL="http://192.168.101.18:3000"
```

---

### 📌 Comandos de Desarrollo:

```bash
# Iniciar servidor de desarrollo Web Next.js
npm run dev

# Iniciar servidor de Expo para App Móvil
npm run mobile

# Ejecutar Suite Completa de Pruebas
npm test

# Ejecutar migración de esquema Prisma
npx prisma db push
```

---
*Documentación técnica generada y verificada para el repositorio **DAD_B_Grupo3**.*
