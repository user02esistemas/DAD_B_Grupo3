# Empresa de Transportes "El Cumbe" - Plataforma Web

Bienvenido al repositorio oficial del proyecto web de la Empresa de Transportes "El Cumbe". Esta plataforma permite a los usuarios buscar viajes, seleccionar asientos interactivos (buses de 1 y 2 pisos) y comprar pasajes en línea.

## 🚀 Requisitos Previos

Para probar y ejecutar este proyecto localmente, asegúrate de tener instalado:

- [Node.js](https://nodejs.org/es/) (v18.x o superior)
- [MySQL](https://dev.mysql.com/downloads/installer/) (XAMPP, WAMP o instalación limpia)
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
1. Abre tu gestor de base de datos MySQL (ej. phpMyAdmin, DBeaver o MySQL Workbench).
2. Crea una base de datos llamada `cumbe_db`.
3. Importa el archivo SQL proporcionado en el proyecto: `cumbe_db_actualizado.sql`. Este archivo contiene la estructura de las tablas (usuarios, buses, viajes, asientos, pagos, etc.) y los datos iniciales necesarios para probar.

### 4. Configurar Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto basándote en un entorno de desarrollo. Deberás incluir al menos:

```env
# URL de conexión a tu base de datos MySQL local
DATABASE_URL="mysql://usuario:contrasena@localhost:3306/cumbe_db"

# NextAuth Configuración
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu_secreto_super_seguro_aqui"

# Resend (Para envío de correos, opcional para probar el flujo principal)
RESEND_API_KEY="tu_api_key_de_resend"
```
*(Reemplaza `usuario` y `contrasena` con tus credenciales locales de MySQL).*

### 5. Sincronizar Prisma
Sincroniza el ORM de Prisma con la base de datos para generar el cliente tipado:
```bash
npx prisma generate
```

### 6. Iniciar el Servidor de Desarrollo
Finalmente, levanta el proyecto:
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
