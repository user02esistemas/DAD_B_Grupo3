# Empresa de Transportes "El Cumbe" - Plataforma Web & App Móvil

Bienvenido al repositorio oficial del sistema de transporte interprovincial de la **Empresa de Transportes "El Cumbe"**. El sistema cuenta con una arquitectura distribuida multinivel compuesta por una plataforma Web administrativa/pública en Next.js, una App Móvil en React Native/Expo, base de datos en la nube Supabase PostgreSQL y una API RESTful documentada con OpenAPI/Swagger.

---

## 🌐 Arquitectura y Despliegue en la Nube

* **Backend y Aplicación Web:** Desplegado en **Vercel**
* **Base de Datos Cloud:** **Supabase PostgreSQL** (instancia distribuida en AWS con conexión encriptada y pooler de transacciones).
* **Documentación OpenAPI/Swagger UI:** Accesible públicamente en la ruta `/docs` de la aplicación.
* **App Móvil:** Desarrollada en **React Native / Expo** con navegación nativa, escáner de códigos QR y pagos seguros con Culqi.

---

## 🛠️ Requisitos Previos e Instalación

### Requisitos:
* [Node.js](https://nodejs.org/es/) (v18.x o superior)
* [PostgreSQL](https://www.postgresql.org/) local o cuenta activa en [Supabase](https://supabase.com/)
* Git y Expo Go (para pruebas en dispositivo móvil)

### 1. Clonar el repositorio
```bash
git clone https://github.com/user02esistemas/DAD_B_Grupo3.git
cd DAD_B_Grupo3
```

### 2. Instalar dependencias del proyecto Web y Móvil
```bash
npm install
cd app-movil-elcumbe && npm install && cd ..
```

### 3. Configurar Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto con las siguientes claves:

```env
# Base de Datos Supabase PostgreSQL
DATABASE_URL="postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# JWT y NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="development_secret_key_32_characters_long"

# Pasarela de Pagos Culqi y Servicios
NEXT_PUBLIC_CULQI_PUBLIC_KEY="pk_test_lkYsEtGV030Goa3V"
CULQI_SECRET_KEY="sk_test_Lr8ZyYy1HvncSGGz"
RESEND_API_KEY="re_Smz1dtH8_5R9WVumzBmi2KhTbSqn2WECV"
EXPO_PUBLIC_API_URL="http://192.168.101.18:3000"
```

### 4. Sincronizar Base de Datos y Cargar Datos Iniciales
```bash
npx prisma db push
npx tsx scripts/seed-initial.ts
```

---

## 🧪 Pruebas Unitarias y de Integración

El proyecto cuenta con un comando formal para ejecutar la suite completa de pruebas unitarias y de integración:

```bash
npm test
```

### Cobertura de Pruebas:
* **Pruebas Unitarias (`scripts/unit-tests.ts`):** Validaciones de entrada (Zod / RegEx de DNI 8 dígitos, teléfono 9 dígitos, formatos de correo), firma y verificación de tokens Bearer JWT, control de roles de acceso, y reglas de negocio para transacciones.
* **Pruebas de Integración (`scripts/run-tests.ts`):** Validación de concurrencia y atomicidad a nivel de Base de Datos para prevenir sobreventa de asientos (Race Conditions) e integridad horaria (America/Lima).

---

## 📖 Documentación de API (OpenAPI 3.0 / Swagger UI)

El sistema provee una especificación completa **OpenAPI 3.0.0** accesible interactivamente:

* **Swagger UI Interactivo:** Accede a `http://localhost:3000/docs` en tu navegador.
* **Archivo JSON de Especificación:** `/openapi.json`

---

## 📱 Ejecución del Proyecto

### Iniciar Servidor Web / Backend REST:
```bash
npm run dev
```

### Iniciar App Móvil Expo:
```bash
npm run mobile
```

---

## 🔒 Seguridad y Roles

* **Estrategia JWT:** Firma y verificación de tokens Bearer (`jsonwebtoken` + `NextAuth`) en encabezados HTTP `Authorization: Bearer <token>`.
* **Control de Acceso por Roles (RBAC):** `admin`, `vendedor`, `gerente`, `conductor`, `operario` y `cliente`. Restricción de rutas mediante middleware `proxy.ts` en la Web y middleware `lib/mobileAuth.ts` en la API Móvil.
