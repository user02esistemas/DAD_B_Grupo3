# Empresa de Transportes "El Cumbe" - Plataforma Web & App Móvil

Bienvenido al repositorio oficial de la plataforma de gestión y venta de pasajes interprovinciales de la **Empresa de Transportes "El Cumbe"**. El sistema cuenta con una arquitectura moderna en **Next.js (App Router)**, **TypeScript**, **TailwindCSS**, **Prisma ORM**, base de datos PostgreSQL, autenticación **NextAuth** con soporte dinámico para túneles (ngrok) y un módulo de abordaje mediante escáner de códigos QR.

---

## 🌐 Arquitectura y Características Principales

* **Plataforma Web (Pública y Administrativa):** Desarrollada con Next.js 16 (App Router), React 19, TypeScript y TailwindCSS.
* **Control de Acceso por Roles (RBAC):** `admin`, `gerente`, `vendedor`, `conductor`, `operario` y `cliente`. Protección mediante middleware `proxy.ts`.
* **Sostenibilidad y Alta Concurrencia:** Bloqueo temporal atómico de asientos por 8 minutos previa compra para evitar sobreventa (Race Conditions).
* **Gestión de Pasajes y QR Únicos:** Generación de códigos de abordaje QR individuales e independientes para cada pasajero, incluso en compras grupales.
* **Integración con ngrok / Accesibilidad Externa:** Detección automática del host y protocolo (`x-forwarded-host`) para inicio de sesión transparente desde túneles locales y compartidos.
* **Módulo de Abordaje para Operarios (`/staff/operario`):** Interfaz móvil/web con escáner de cámara en tiempo real (`html5-qrcode`) o ingreso manual para validación de tickets y control de abordaje.
* **Pasarela de Pagos:** Integración con Culqi Sandbox para procesamiento simulado de tarjetas de crédito/débito.
* **Envío de Comprobantes PDF & Email:** Generación de boletos de viaje en PDF (`jsPDF`, `qrcode`) y notificación automática mediante Resend API.
* **App Móvil:** Proyecto React Native / Expo ubicado en la subcarpeta `app-movil-elcumbe`.

---

## 🛠️ Instalación y Configuración Inicial (Sin Base de Datos Previa)

Elige una de las siguientes dos opciones para preparar el entorno y crear la base de datos desde cero:

### 💡 Opción 1: Levantar todo con Docker (Recomendado - No requiere instalar PostgreSQL)
Si no tienes PostgreSQL instalado en tu computadora, Docker creará e iniciará automáticamente el motor de base de datos y la aplicación en un solo paso:

```bash
# 1. Clonar el repositorio
git clone https://github.com/user02esistemas/DAD_B_Grupo3.git
cd DAD_B_Grupo3

# 2. Iniciar contenedores (Crea la BD PostgreSQL y la Web automáticamente)
docker-compose up -d --build
```
*La aplicación estará lista en `http://localhost:3000` con la base de datos conectada en el puerto `5432`.*

---

### 💻 Opción 2: Instalación Manual Local (Si tienes PostgreSQL en tu PC)

#### 1. Clonar e instalar dependencias
```bash
git clone https://github.com/user02esistemas/DAD_B_Grupo3.git
cd DAD_B_Grupo3
npm install
```

#### 2. Configurar Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto (puedes copiar el contenido de `.env.example`):

```env
# Base de Datos PostgreSQL Local
DATABASE_URL="postgresql://postgres:tu_contraseña@localhost:5432/elcumbe?schema=public"
DIRECT_URL="postgresql://postgres:tu_contraseña@localhost:5432/elcumbe?schema=public"

# Autenticación y Claves
NEXTAUTH_SECRET="development_secret_key_32_characters_long"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_CULQI_PUBLIC_KEY="pk_test_lkYsEtGV030Goa3V"
CULQI_SECRET_KEY="sk_test_Lr8ZyYy1HvncSGGz"
```

#### 3. Crear la Base de Datos e Iniciar Tablas
1. Crea una base de datos vacía llamada `elcumbe` en tu servidor PostgreSQL (vía `pgAdmin` o terminal `CREATE DATABASE elcumbe;`).
2. Ejecuta los siguientes comandos para crear todas las tablas, relaciones e insertar los datos iniciales automáticamente:

```bash
# a. Crear todas las tablas e índices en la BD automáticamente
npx prisma db push

# b. Poblar sucursales, buses, rutas reales de Perú y usuarios por defecto (admin, vendedor, etc.)
npx tsx scripts/seed-initial.ts
```

#### 4. Iniciar la aplicación
```bash
npm run dev
```

---

## 🚀 Ejecución en Entorno de Desarrollo (Local)

### Iniciar Servidor Web
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

### Acceso a Túnel Externo (ngrok)
Para compartir el proyecto externamente con tu equipo sin fallos de autenticación:
```bash
ngrok http 3000
```
*El sistema resolverá dinámicamente el host de ngrok para los callbacks de NextAuth.*

---

## 🧪 Pruebas Unitarias y de Integración

Ejecuta la suite completa de verificación del sistema:

```bash
npm test
```

### Cobertura de Pruebas:
* **Validaciones de Entrada (`scripts/unit-tests.ts`):** Verificación de DNI peruano (8 dígitos), teléfono (9 dígitos), nombres y apellidos.
* **Seguridad y Tokens JWT:** Firma y verificación de tokens de sesión y asignación de roles RBAC.
* **Reglas de Negocio:** Cálculo de precios totales, límite de hasta 6 asientos por transacción y prevención de doble reserva atómica (Race Conditions).

---

## 📁 Estructura del Proyecto

```
app-WebCumbe/
├── app/                        # Next.js App Router (Rutas públicas, admin y staff)
│   ├── (admin)/                # Panel de administración (Rutas, Viajes, Pasajes, Buses, Sucursales)
│   ├── (public)/               # Portal de venta pública (/compra, /perfil, /reclamaciones)
│   ├── api/                    # endpoints API REST y NextAuth
│   └── staff/                  # Paneles dedicados para Conductores y Operarios de abordaje
├── components/                 # Componentes React reutilizables (UI, Modales, Tablas)
├── lib/                        # Clientes de BD (Prisma), utilidades PDF y helper de Auth
├── prisma/                     # Esquema de base de datos (`schema.prisma`)
├── public/                     # Archivos estáticos e imágenes de buses
├── scripts/                    # Scripts de semillas, respaldo BD (`backup.js`) y suites de prueba
├── proxy.ts                    # Middleware principal de Next.js para control de acceso (RBAC)
└── init_data.json              # Datos de respaldo / inicialización del sistema
```

---

## 🔒 Usuarios y Credenciales por Defecto (Entorno Pruebas)

Al ejecutar la semilla `seed-initial.ts`, se crean las siguientes cuentas de prueba (Contraseña para todas: `1234`):

| Rol | Correo | Permisos / Acceso |
| :--- | :--- | :--- |
| **Administrador** | `admin@cumbe.com` | Acceso total al panel `/admin` |
| **Vendedor** | `vendedor@cumbe.com` | Venta presencial de pasajes y encomiendas |
| **Gerente** | `gerente@cumbe.com` | Reportes y supervisión |
| **Operario** | `operario@cumbe.com` | Escaneo y abordaje de pasajeros (`/staff/operario`) |
| **Conductor** | `conductor@cumbe.com` | Vista de bitácora y hoja de ruta (`/staff/conductor`) |
| **Cliente** | `cliente@cumbe.com` | Portal web público y gestión de mi perfil |

---

## 📄 Licencia

Este proyecto forma parte del trabajo académico del Grupo 3 - DAD B.
