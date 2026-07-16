# Empresa de Transportes "El Cumbe" - Plataforma Web

Bienvenido al repositorio oficial del proyecto web de la Empresa de Transportes "El Cumbe". Esta plataforma permite a los usuarios buscar viajes, seleccionar asientos interactivos (buses de 1 y 2 pisos) y comprar pasajes en línea.

## 🚀 Requisitos Previos

Para probar y ejecutar este proyecto localmente, asegúrate de tener instalado:

- [Node.js](https://nodejs.org/es/) (v18.x o superior)
- [PostgreSQL](https://www.postgresql.org/) local o una cuenta activa en [Supabase](https://supabase.com/)
- Git

## 🛠️ Instalación y Configuración

Sigue estos pasos para configurar el proyecto en tu máquina:

### 1. Clonar el repositorio
```bash
git clone https://github.com/user02esistemas/DAD_B_Grupo3.git
cd DAD_B_Grupo3
```

### 2. Instalar dependencias
Instala todos los paquetes necesarios de Node.js:
```bash
npm install
```

### 3. Configurar la Base de Datos
Este proyecto utiliza **PostgreSQL** mediante Prisma ORM. Tienes dos opciones para la base de datos:
* **Opción A (Recomendada):** Crear un proyecto gratuito en **Supabase** y obtener las URLs de conexión (Connection Strings) para Modo Pooler (Transaction) y Conexión Directa.
* **Opción B:** Crear una base de datos local en PostgreSQL llamada `cumbe_db`.

Una vez configuradas las variables de entorno en el paso siguiente, podrás crear las tablas y esquemas automáticamente ejecutando:
```bash
npx prisma db push
```

Para cargar la base de datos con los datos iniciales de prueba (buses, usuarios como administradores, operarios, conductores y rutas de viaje), ejecuta:
```bash
npx tsx scripts/seed-initial.ts
```

### 4. Configurar Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto y añade las siguientes variables con tus credenciales:

```env
# URL de conexión a PostgreSQL (con soporte para pooler de Supabase)
DATABASE_URL="postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# NextAuth Configuración
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu_secreto_super_seguro_aqui"

# Resend (Para envío de correos, opcional para probar el flujo principal)
RESEND_API_KEY="tu_api_key_de_resend"

# Supabase Keys (Opcional, para integraciones del SDK si aplica)
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_xxx"
```

### 5. Sincronizar Prisma
Sincroniza y genera el cliente tipado de Prisma localmente:
```bash
npx prisma generate
```

### 6. Iniciar el Servidor de Desarrollo
Finalmente, levanta el proyecto en modo desarrollo:
```bash
npm run dev
```

Abre tu navegador y dirígete a [http://localhost:3000](http://localhost:3000) para ver la aplicación corriendo.

---

## 🚌 Características Principales para Probar

1. **Búsqueda de Viajes:** En la página principal, busca pasajes indicando origen, destino y fecha. *(Tip: Prueba la ruta Cajamarca -> Chiclayo para ver el bus de 2 pisos).*
2. **Selección de Asientos Interactiva:** El sistema muestra un croquis real de los asientos del bus, considerando pasillos, primer piso, segundo piso y televisores.
3. **Flujo de Pago Simulada/Integrada:** Verifica el proceso final en la pasarela Culqi para completar la reserva del boleto.
4. **Panel de Administración:** Gestión de buses, rutas, salidas y boletos.
