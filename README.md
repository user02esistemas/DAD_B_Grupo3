# 🚌 Empresa de Transportes "El Cumbe" — Plataforma Web

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript_5-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

**Sistema Integral de Gestión, Venta de Pasajes Interprovinciales y Control de Abordaje QR**

[Inicio Rápido](#-inicio-rápido-instalación--docker) •
[Sincronización en Equipo](#-flujo-de-trabajo-en-equipo-git--prisma) •
[Credenciales de Prueba](#-usuarios-y-credenciales-de-prueba) •
[Prisma Studio GUI](#-inspección-visual-de-la-base-de-datos-prisma-studio) •
[Características](#-características-principales) •
[Pruebas](#-pruebas-y-calidad)

</div>

---

## 🚀 Inicio Rápido (Instalación + Docker)

Al clonar el proyecto por primera vez, sigue estos **4 pasos sencillos**:

### 1. Instalar Dependencias (`node_modules`)
Instala los paquetes necesarios del proyecto:
```bash
npm install
```
> 💡 *La carpeta `node_modules` no se sube a Git. Este comando descarga y genera `node_modules` en tu laptop.*

### 2. Encender Docker
Levanta la base de datos PostgreSQL en segundo plano:
```bash
docker-compose up -d
```

### 3. Aplicar Migraciones y Cargar la Data Inicial
Crea la estructura de tablas con Prisma y siembra la data inicial (sucursales, rutas, buses y usuarios de prueba):
```bash
# Crear/actualizar tablas en la base de datos de Docker
npx prisma db push

# Cargar la data inicial de prueba
npx tsx scripts/seed-initial.ts
```

### 4. Iniciar el Proyecto Web
```bash
npm run dev
```
> 📍 Accede a la aplicación en `http://localhost:3000`.

---

## 🔄 Flujo de Trabajo en Equipo (Git + Prisma)

Cuando otro desarrollador sube cambios a Git en las dependencias o el esquema de la base de datos:

### Pasos para sincronizar tu proyecto local:
```bash
# 1. Traer los cambios más recientes desde Git
git pull

# 2. Si se instalaron nuevas librerías, actualizar node_modules
npm install

# 3. Actualizar la estructura de tablas en tu Docker local
npx prisma db push

# 4. (Opcional) Regenerar datos de prueba si hubo cambios en los datos iniciales
npx tsx scripts/seed-initial.ts
```

> 💡 **¿Cómo funciona?**
> - **Dependencias (`node_modules`)**: Se sincronizan ejecutando `npm install` si alguien agregó nuevas librerías en `package.json`.
> - **Estructura y Tablas**: Al hacer `git pull` y luego `npx prisma db push`, Prisma sincroniza automáticamente las tablas de tu Docker local para que tengan exactamente la misma estructura que las de tu equipo.
> - **Datos de Prueba**: Cada desarrollador tiene su propia base de datos en su Docker local. Para tener los mismos registros base (sucursales, buses, usuarios), ambos ejecutan el script de semillas (`seed-initial.ts`).

---

## 🔑 Usuarios y Credenciales de Prueba

Al ejecutar el script `seed-initial.ts`, se crean automáticamente los siguientes usuarios de prueba (Contraseña por defecto en `.env`: `test_password_123`):

| Rol | Correo Electrónico | Descripción de Acceso |
| :--- | :--- | :--- |
| 🔑 **Administrador** | `admin@cumbe.com` | Control total del sistema (`/admin`) |
| 💼 **Gerente** | `gerente@cumbe.com` | Reportes de ingresos y estadísticas |
| 🎟️ **Vendedor** | `vendedor@cumbe.com` | Venta presencial de pasajes en ventanilla |
| 📱 **Operario** | `operario@cumbe.com` | Escaneo QR y control de abordaje (`/staff/operario`) |
| 🚌 **Conductor** | `conductor@cumbe.com` | Manifiesto de viaje y pasajeros (`/staff/conductor`) |
| 👤 **Cliente** | `cliente@cumbe.com` | Portal de compras e historial personal |

---

## 🗄️ Inspección Visual de la Base de Datos (Prisma Studio)

Si deseas explorar o editar los registros de la base de datos de manera gráfica desde tu navegador:

```bash
npx prisma studio
```
> 📍 **Panel Visual**: Se abrirá automáticamente en `http://localhost:5555`.

### 📌 Puertos del Proyecto:
| Puerto | Servicio | Descripción |
| :--- | :--- | :--- |
| **`3000`** | 🌐 **Web App (Next.js)** | Plataforma web accesible desde el navegador (`http://localhost:3000`) |
| **`5555`** | 🗄️ **Prisma Studio (GUI)** | Panel visual para explorar tablas de la BD (`http://localhost:5555`) |
| **`5432`** | 🐘 **PostgreSQL (Docker)** | Servicio de BD interno TCP (Usado por Prisma y Docker, no es URL de navegador) |

---

## 🌐 Características Principales

| Módulo / Dominio | Funcionalidades Destacadas |
| :--- | :--- |
| 🛒 **Portal Cliente (Público)** | • Búsqueda interactiva de viajes por origen, destino y fecha.<br>• Selección de asientos en tiempo real (Piso 1 y Piso 2).<br>• Pago seguro simulado con pasarela Culqi.<br>• Descarga de boletos PDF e historial de compras. |
| 🛠️ **Panel Administrativo (`/admin`)** | • Gestión completa de Sucursales, Flota de Buses, Rutas y Programación de Viajes.<br>• Reportes analíticos y métricas operativas.<br>• Gestión de usuarios y asignación de roles. |
| 📲 **Módulo de Abordaje (`/staff/operario`)** | • Escáner en tiempo real mediante cámara web/móvil.<br>• Validación instantánea de tickets y estado de abordaje.<br>• Opción de búsqueda manual por DNI o código de pasaje. |
| 🚚 **Bitácora de Conductor (`/staff/conductor`)** | • Visualización de manifiesto de pasajeros por viaje.<br>• Hoja de ruta y estado del vehículo. |
| 📑 **Comprobantes y Notificaciones** | • Generación automática de boletos en PDF con QR.<br>• Envío automático de confirmaciones por correo electrónico. |

---

## 🛠️ Stack Tecnológico

* **Framework Web:** [Next.js 16](https://nextjs.org/) (App Router & Server Actions)
* **Frontend:** [React 19](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/) + [Tailwind CSS v4](https://tailwindcss.com/)
* **ORM & BD:** [Prisma v6](https://www.prisma.io/) + PostgreSQL (vía Docker)
* **Autenticación:** [NextAuth.js v4](https://next-auth.js.org/) (JWT + Cookies seguras)
* **Pasarela de Pago:** Culqi API (Sandbox)

---

## 🧪 Pruebas Automatizadas

```bash
# Ejecutar suite de pruebas unitarias e integración
npm test
```

---

## 👥 Equipo de Desarrollo

Proyecto desarrollado para la **Empresa de Transportes "El Cumbe"**. Todos los derechos reservados.
