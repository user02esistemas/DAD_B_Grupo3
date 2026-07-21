# 🚌 DOCUMENTACIÓN TÉCNICA MAESTRA - PORTAL WEB "EL CUMBE S.A.C."
> **Manual Técnico Integral y Guía de Servicios: Dónde se crea cada entidad, flujos funcionales, y arquitectura de software.**

---

## 📋 TABLA DE CONTENIDOS
1. [Visión General de la Arquitectura](#1-visión-general-de-la-arquitectura)
2. [Guía de Creación y Gestión de Entidades](#2-guía-de-creación-y-gestión-de-entidades)
   - [2.1 Gestión de Usuarios, Clientes y Personal](#21-gestión-de-usuarios-clientes-y-personal)
   - [2.2 Creación y Reserva de Pasajes (Venta Web y Ventanilla)](#22-creación-y-reserva-de-pasajes)
   - [2.3 Programación de Viajes y Asignación de Flota](#23-programación-de-viajes-y-asignación-de-flota)
   - [2.4 Registro y Seguimiento de Encomiendas](#24-registro-y-seguimiento-de-encomiendas)
   - [2.5 Gestión de Flota de Buses, Rutas y Sucursales](#25-gestión-de-flota-de-buses-rutas-y-sucursales)
3. [Servicios Funcionales del Portal Web](#3-servicios-funcionales-del-portal-web)
   - [3.1 Módulo del Cliente](#31-módulo-del-cliente)
   - [3.2 Módulo del Conductor](#32-módulo-del-conductor)
   - [3.3 Módulo del Operario de Embarque](#33-módulo-del-operario-de-embarque)
   - [3.4 Módulo de Administración y Venta](#34-módulo-de-administración-y-venta)
4. [Estructura del Proyecto y Archivos Clave](#4-estructura-del-proyecto-y-archivos-clave)
5. [Modelo de Datos E-R (Prisma / PostgreSQL)](#5-modelo-de-datos-e-r-prisma--postgresql)
6. [Manejo de Seguridad (RBAC y JWT)](#6-manejo-de-seguridad-rbac-y-jwt)
7. [Integraciones Externas (Culqi, Resend API, jsPDF, QRCode)](#7-integraciones-externas-culqi-resend-api-jspdf-qrcode)
8. [Pruebas Automáticas y Calidad de Código](#8-pruebas-automáticas-y-calidad-de-código)
9. [Variables de Entorno y Comandos](#9-variables-de-entorno-y-comandos)

---

## 1. VISIÓN GENERAL DE LA ARQUITECTURA

El sistema **El Cumbe S.A.C.** es una plataforma web completa (Backend + Frontend integrado con Next.js App Router) y base de datos relacional para la gestión integral de pasajes, carga, flota y personal operativo.

```mermaid
graph TD
    A[Cliente / Público] -->|Portal Web Next.js| B[Servidor Next.js App Router]
    D[Staff: Conductor / Operario] -->|Web Staff / Portal Web| B
    E[Admin / Vendedor / Gerente] -->|Panel Admin Web| B
    
    B -->|ORM Prisma| F[(PostgreSQL Supabase)]
    
    B -->|SDK Pasarela| G[Culqi Gateway - Tarjetas]
    B -->|Emails Transaccionales| H[Resend API - PDF + QR]
```

---

## 2. GUÍA DE CREACIÓN Y GESTIÓN DE ENTIDADES

### 2.1 Gestión de Usuarios, Clientes y Personal

```mermaid
sequenceDiagram
    participant U as Usuario / Admin
    participant V as Vista Web
    participant A as Server Action / API Route
    participant DB as PostgreSQL (Prisma)

    U->>V: Ingresa Nombres, DNI, Correo, Rol
    alt Registro Público (Cliente)
        V->>A: POST /api/auth/register
    else Creación por Admin (Staff / Cliente)
        V->>A: Server Action crearUsuario()
    end
    A->>DB: Crea Persona + Usuario (Hash bcrypt)
    DB-->>A: Registro exitoso
    A-->>V: Confirma creación
```

* **¿Dónde se crean los Clientes (Público)?**
  * **Página Web:** En `/registro` ([`app/(public)/registro/page.tsx`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28public%29/registro/page.tsx)), consume `POST /api/auth/register`.
* **¿Dónde se crea y administra el Personal (Conductores, Operarios, Vendedores, Admins)?**
  * **Panel Web de Administración:** En `/admin/usuarios` ([`UsuariosClient.tsx`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28admin%29/admin/usuarios/UsuariosClient.tsx)).
  * **Lógica del Servidor:** Utiliza la Server Action `crearUsuario()` en [`app/(admin)/actions/usuarios.ts`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28admin%29/actions/usuarios.ts).
  * **Siembra Inicial de Cuentas Staff:** Mediante el script [`scripts/seed-roles.ts`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/scripts/seed-roles.ts).

---

### 2.2 Creación y Reserva de Pasajes

* **¿Dónde compra pasajes el Cliente?**
  * **Web:** En `/compra` ([`app/(public)/compra/page.tsx`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28public%29/compra/page.tsx)). Ejecuta `crearCargoCulqi()` y `procesarPagoMultiplesAsientosCulqi()` en [`app/actions.ts`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/actions.ts).
* **¿Dónde vende pasajes el Vendedor en Ventanilla?**
  * **Panel Web:** En `/admin/pasajes` ([`app/(admin)/admin/pasajes/page.tsx`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28admin%29/admin/pasajes/page.tsx)), ejecuta `venderPasaje()` en [`app/(admin)/actions/pasajes.ts`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/(admin)/actions/pasajes.ts).
* **Mecanismo Anti-Doble Reserva (Race Condition):**
  * Toda creación de pasaje bloquea el asiento mediante una **Transacción Atómica en Prisma** (`marcarAsientosPendientes` en [`app/actions.ts`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/actions.ts)). Si otro usuario intenta comprar el mismo asiento simultáneamente, la base de datos aborta la segunda solicitud y devuelve un error amigable.
* **Emisión de Boleto Digital y QR:**
  * Al confirmarse el pago y validarse el cargo con la API de Culqi, se genera un **Código QR único** (`código_qr: QR-xxxx`), se almacena en la tabla `Pasaje` y se envía automáticamente una copia por correo electrónico vía **Resend API**.

---

### 2.3 Programación de Viajes y Asignación de Flota

* **¿Dónde se crean y programan los Viajes?**
  * **Panel Web Admin:** En `/admin/viajes` ([`ViajeClient.tsx`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28admin%29/admin/viajes/ViajeClient.tsx)).
  * **Lógica de Creación:** Server Action `crearViaje()` en [`app/(admin)/actions/viajes.ts`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28admin%29/actions/viajes.ts).
* **Validación de Cruce de Horarios y Buses (Anti-Solapamiento):**
  * Un bus no puede estar asignado a dos viajes diferentes al mismo tiempo. El backend comprueba la disponibilidad horaria del bus asignado antes de permitir el registro del viaje.
* **Generación Automática del Mapa de Asientos:**
  * Al programar un viaje, se insertan automáticamente en la base de datos (`AsientoViaje`) todos los asientos físicos del bus asociado según su número de pisos y capacidad.

---

### 2.4 Registro y Seguimiento de Encomiendas

* **¿Dónde se registran las Encomiendas?**
  * **Panel Web Admin:** En `/admin/encomiendas` ([`EncomiendaClient.tsx`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28admin%29/admin/encomiendas/EncomiendaClient.tsx)).
  * **Lógica del Servidor:** Server Actions en [`encomiendas.ts`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28admin%29/actions/encomiendas.ts).
* **Seguimiento Público:**
  * Los clientes pueden consultar de manera anónima el estado de su encomienda en `/seguimiento` ([`page.tsx`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28public%29/seguimiento/page.tsx)), el cual utiliza `buscarEncomiendaPorCodigo()` ocultando datos sensibles.

---

### 2.5 Gestión de Flota de Buses, Rutas y Sucursales

* **¿Dónde se configuran las Sucursales, Rutas y Buses?**
  * **Buses:** En `/admin/buses` vía `crearBus()` en [`buses.ts`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28admin%29/actions/buses.ts).
  * **Rutas:** En `/admin/rutas` vía `crearRuta()` en [`rutas.ts`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28admin%29/actions/rutas.ts).
  * **Sucursales:** En `/admin/sucursales` vía `crearSucursal()` en [`sucursales.ts`](file:///d:/PROYECTOS/Proyectos_React/app_WebCumbe/app/%28admin%29/actions/sucursales.ts).

---

## 3. SERVICIOS FUNCIONALES DEL PORTAL WEB

### 3.1 Módulo del Cliente
* **Búsqueda de Pasajes:** En `/` y `/compra`. Filtro por origen, destino y fecha con selector visual.
* **Selección de Asientos:** En `/compra`. Croquis interactivo del bus por niveles (Piso 1 y Piso 2).
* **Pago Seguro con Tarjeta:** En `/compra`. Integración de Culqi SDK.
* **Mis Boletos:** En `/perfil`. Consulta de compras y renderizado de boletos digitales.
* **Rastreo de Encomiendas:** En `/seguimiento`. Consulta rápida y segura con línea de tiempo.
* **Libro de Reclamaciones:** En `/reclamaciones`. Registro formal de reclamos.

### 3.2 Módulo del Conductor
Acceso exclusivo en `/staff/conductor`:
1. **Itinerario:** Visualización de sus viajes programados.
2. **Control de Estado:** Cambiar estado del viaje a `en_ruta` o `completado`.
3. **Registro de Gastos:** Subir comprobantes de peaje, combustible, etc.
4. **Bitácora:** Registrar incidencias y novedades en carretera.

### 3.3 Módulo del Operario de Embarque
Acceso exclusivo en `/staff/operario`:
1. **Embarque:** Monitoreo en tiempo real del abordaje de pasajeros.
2. **Manifiesto:** Listado de pasajeros y conmutador de estado "A bordo".
3. **Validación QR:** Lectura y verificación de código QR del boleto en puerta de bus.

### 3.4 Módulo de Administración y Venta
Acceso en `/admin`:
* **Dashboard:** Métricas comerciales globales y de operación.
* **Gestión de Cuentas:** Administración de personal y clientes.
* **Mantenimiento:** Registro de sucursales, rutas, buses y tarifas.

---

## 4. ESTRUCTURA DEL PROYECTO Y ARCHIVOS CLAVE

```
app_WebCumbe/
├── app/                        # Aplicación Web Next.js (App Router)
│   ├── (admin)/                # Panel Administrativo y Server Actions
│   │   ├── actions/            # Server Actions (buses, conductor, rutas, viajes, usuarios)
│   │   ├── admin/              # Vistas Administrativas
│   │   └── layout.tsx          # Navegación protegida por rol (RBAC)
│   ├── (public)/               # Portal Público para Clientes (/compra, /seguimiento, etc.)
│   ├── api/                    # Endpoints REST del Servidor
│   │   └── auth/               # Autenticación, Registro y Reset de Password
│   ├── staff/                  # Vistas Web para Conductor y Operario
│   ├── actions.ts              # Server Actions globales (compras Culqi, reclamaciones, etc.)
│   └── proxy.ts                # Middleware principal Next.js para protección de rutas (RBAC)
├── lib/                        # Clientes y Utilidades del Sistema
│   ├── auth.ts                 # Configuración de NextAuth.js
│   ├── prisma.ts               # Instancia Singleton de Prisma Client
│   ├── dates.ts                # Gestión horaria local (America/Lima)
│   ├── rate-limit.ts           # Control de flujo e IP anti-spam
│   └── culqi.ts                # Integración con la pasarela Culqi
├── prisma/
│   ├── schema.prisma           # Esquema relacional PostgreSQL
│   └── migrations/             # Historial de migraciones del sistema
├── scripts/                    # Tests automáticos y semillas
│   ├── unit-tests.ts           # Suite de pruebas unitarias
│   └── run-tests.ts            # Pruebas de integración y concurrencia
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

## 6. MANEJO DE SEGURIDAD (RBAC Y JWT)

1. **Web RBAC (`proxy.ts`):** Middleware de Next.js que analiza el token de sesión en cada URL. Si un cliente intenta ingresar a `/admin` o un conductor a `/staff/operario`, la solicitud es rechazada y redireccionada automáticamente.
2. **NextAuth JWT:** Las credenciales de sesión se firman mediante JWT encriptado con la clave secreta `NEXTAUTH_SECRET` con expiración programada.

---

## 7. INTEGRACIONES EXTERNAS (CULQI, RESEND API, JSPDF)

### Pasarela de Pagos Culqi:
* Permite cobros seguros con **Tarjetas de Crédito/Débito** procesando los tokens de pago e interactuando con la API REST de Culqi de forma segura en el backend para validar el pago.

### Envío de Correos y PDF (Resend API):
* Al confirmarse un boleto, se genera un documento PDF dinámico utilizando `jsPDF` y se adjunta un código QR de embarque.
* Se envía vía la API de **Resend** (`resend.emails.send`) al correo electrónico verificado del comprador.

---

## 8. PRUEBAS AUTOMÁTICAS Y CALIDAD DE CÓDIGO

Ejecuta toda la suite de testing con el comando:
```bash
npm test
```
* **Pruebas Unitarias (`unit-tests.ts`):** Validaciones Zod/RegEx de DNI, teléfono y firma de sesiones.
* **Pruebas de Integración (`run-tests.ts`):** Verificación de bloqueo atómico a nivel de base de datos ante solicitudes simultáneas de compra sobre el mismo asiento (Race Conditions) bajo la hora oficial de Perú.

---

## 9. VARIABLES DE ENTORNO Y COMANDOS

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
```

### Comandos Principales:
```bash
# Iniciar Servidor Web Next.js (Desarrollo)
npm run dev

# Ejecutar Suite Completa de Tests
npm test

# Sincronizar Esquema Prisma con la BD
npx prisma db push
```

---
*Documentación técnica maestra actualizada para el portal web **DAD_B_Grupo3**.*
