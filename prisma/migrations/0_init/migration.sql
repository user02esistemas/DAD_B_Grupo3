-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Persona" (
    "id" BIGSERIAL NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "telefono" TEXT,
    "fecha_nacimiento" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" BIGSERIAL NOT NULL,
    "persona_id" BIGINT NOT NULL,
    "correo" TEXT NOT NULL,
    "contrasena" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'cliente',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sucursal" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sucursal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bus" (
    "id" BIGSERIAL NOT NULL,
    "placa" TEXT NOT NULL,
    "marca" TEXT,
    "capacidad" INTEGER NOT NULL,
    "pisos" INTEGER NOT NULL DEFAULT 1,
    "asientos_piso_1" INTEGER,
    "asientos_restringidos" TEXT,
    "imagenes" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ruta" (
    "id" BIGSERIAL NOT NULL,
    "origen_id" BIGINT NOT NULL,
    "destino_id" BIGINT NOT NULL,
    "duracion_estimada_minutos" INTEGER NOT NULL,
    "precio_base" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ruta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Viaje" (
    "id" BIGSERIAL NOT NULL,
    "ruta_id" BIGINT NOT NULL,
    "bus_id" BIGINT NOT NULL,
    "conductor_id" BIGINT,
    "fecha_salida" TIMESTAMP(3) NOT NULL,
    "fecha_llegada" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'programado',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Viaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsientoViaje" (
    "id" BIGSERIAL NOT NULL,
    "viaje_id" BIGINT NOT NULL,
    "numero_asiento" INTEGER NOT NULL,
    "piso" INTEGER NOT NULL DEFAULT 1,
    "estado" TEXT NOT NULL DEFAULT 'disponible',
    "bloqueado_por_usuario_id" BIGINT,
    "bloqueado_por_token" TEXT,
    "bloqueado_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AsientoViaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pasaje" (
    "id" BIGSERIAL NOT NULL,
    "asiento_viaje_id" BIGINT NOT NULL,
    "persona_id" BIGINT NOT NULL,
    "comprador_id" BIGINT,
    "precio" DECIMAL(65,30) NOT NULL,
    "fecha_compra" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "codigo_qr" TEXT,
    "abordado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pasaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encomienda" (
    "id" BIGSERIAL NOT NULL,
    "codigo_seguimiento" TEXT NOT NULL,
    "remitente_id" BIGINT NOT NULL,
    "destinatario_id" BIGINT NOT NULL,
    "origen_id" BIGINT NOT NULL,
    "destino_id" BIGINT NOT NULL,
    "viaje_id" BIGINT,
    "peso_kg" DECIMAL(65,30) NOT NULL,
    "descripcion" TEXT,
    "precio" DECIMAL(65,30) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'recepcionado',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Encomienda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reclamo" (
    "id" BIGSERIAL NOT NULL,
    "codigo_reclamo" TEXT NOT NULL,
    "persona_id" BIGINT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'reclamo',
    "detalle_incidente" TEXT NOT NULL,
    "pedido_cliente" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "respuesta_admin" TEXT,
    "correo_contacto" TEXT,
    "referencia" TEXT,
    "fecha_incidente" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reclamo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodigoDescuento" (
    "id" BIGSERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "usuario_id" BIGINT NOT NULL,
    "porcentaje_descuento" INTEGER NOT NULL DEFAULT 10,
    "esta_usado" BOOLEAN NOT NULL DEFAULT false,
    "fecha_expiracion" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodigoDescuento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_codes" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pago" (
    "id" BIGSERIAL NOT NULL,
    "viaje_id" BIGINT NOT NULL,
    "asiento_id" BIGINT,
    "preference_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "amount" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GastoRuta" (
    "id" BIGSERIAL NOT NULL,
    "viaje_id" BIGINT NOT NULL,
    "conductor_id" BIGINT NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "foto_url" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GastoRuta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NovedadMecanica" (
    "id" BIGSERIAL NOT NULL,
    "viaje_id" BIGINT NOT NULL,
    "bus_id" BIGINT NOT NULL,
    "conductor_id" BIGINT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NovedadMecanica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertaCentral" (
    "id" BIGSERIAL NOT NULL,
    "viaje_id" BIGINT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertaCentral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BitacoraViaje" (
    "id" BIGSERIAL NOT NULL,
    "viaje_id" BIGINT NOT NULL,
    "conductor_id" BIGINT NOT NULL,
    "tipo" TEXT NOT NULL,
    "gravedad" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "retraso_minutos" INTEGER NOT NULL DEFAULT 0,
    "solucionado" BOOLEAN NOT NULL DEFAULT false,
    "fecha_solucion" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BitacoraViaje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Persona_dni_key" ON "Persona"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_persona_id_key" ON "Usuario"("persona_id");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_key" ON "Usuario"("correo");

-- CreateIndex
CREATE INDEX "Usuario_rol_idx" ON "Usuario"("rol");

-- CreateIndex
CREATE UNIQUE INDEX "Bus_placa_key" ON "Bus"("placa");

-- CreateIndex
CREATE INDEX "Viaje_fecha_salida_estado_idx" ON "Viaje"("fecha_salida", "estado");

-- CreateIndex
CREATE INDEX "Viaje_conductor_id_idx" ON "Viaje"("conductor_id");

-- CreateIndex
CREATE INDEX "AsientoViaje_estado_bloqueado_en_idx" ON "AsientoViaje"("estado", "bloqueado_en");

-- CreateIndex
CREATE INDEX "AsientoViaje_bloqueado_por_usuario_id_idx" ON "AsientoViaje"("bloqueado_por_usuario_id");

-- CreateIndex
CREATE INDEX "AsientoViaje_bloqueado_por_token_idx" ON "AsientoViaje"("bloqueado_por_token");

-- CreateIndex
CREATE UNIQUE INDEX "AsientoViaje_viaje_id_numero_asiento_key" ON "AsientoViaje"("viaje_id", "numero_asiento");

-- CreateIndex
CREATE UNIQUE INDEX "Pasaje_asiento_viaje_id_key" ON "Pasaje"("asiento_viaje_id");

-- CreateIndex
CREATE UNIQUE INDEX "Pasaje_codigo_qr_key" ON "Pasaje"("codigo_qr");

-- CreateIndex
CREATE INDEX "Pasaje_fecha_compra_idx" ON "Pasaje"("fecha_compra");

-- CreateIndex
CREATE INDEX "Pasaje_comprador_id_idx" ON "Pasaje"("comprador_id");

-- CreateIndex
CREATE INDEX "Pasaje_persona_id_idx" ON "Pasaje"("persona_id");

-- CreateIndex
CREATE UNIQUE INDEX "Encomienda_codigo_seguimiento_key" ON "Encomienda"("codigo_seguimiento");

-- CreateIndex
CREATE INDEX "Encomienda_estado_idx" ON "Encomienda"("estado");

-- CreateIndex
CREATE INDEX "Encomienda_viaje_id_idx" ON "Encomienda"("viaje_id");

-- CreateIndex
CREATE INDEX "Encomienda_remitente_id_idx" ON "Encomienda"("remitente_id");

-- CreateIndex
CREATE INDEX "Encomienda_destinatario_id_idx" ON "Encomienda"("destinatario_id");

-- CreateIndex
CREATE UNIQUE INDEX "Reclamo_codigo_reclamo_key" ON "Reclamo"("codigo_reclamo");

-- CreateIndex
CREATE INDEX "Reclamo_estado_created_at_idx" ON "Reclamo"("estado", "created_at");

-- CreateIndex
CREATE INDEX "Reclamo_persona_id_idx" ON "Reclamo"("persona_id");

-- CreateIndex
CREATE UNIQUE INDEX "CodigoDescuento_codigo_key" ON "CodigoDescuento"("codigo");

-- CreateIndex
CREATE INDEX "idx_verification_codes_user_id" ON "verification_codes"("user_id");

-- CreateIndex
CREATE INDEX "verification_codes_user_id_created_at_idx" ON "verification_codes"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_pago_asiento_id" ON "pago"("asiento_id");

-- CreateIndex
CREATE INDEX "idx_pago_viaje_id" ON "pago"("viaje_id");

-- CreateIndex
CREATE INDEX "GastoRuta_viaje_id_idx" ON "GastoRuta"("viaje_id");

-- CreateIndex
CREATE INDEX "GastoRuta_conductor_id_idx" ON "GastoRuta"("conductor_id");

-- CreateIndex
CREATE INDEX "NovedadMecanica_viaje_id_idx" ON "NovedadMecanica"("viaje_id");

-- CreateIndex
CREATE INDEX "NovedadMecanica_conductor_id_idx" ON "NovedadMecanica"("conductor_id");

-- CreateIndex
CREATE INDEX "AlertaCentral_viaje_id_leido_idx" ON "AlertaCentral"("viaje_id", "leido");

-- CreateIndex
CREATE INDEX "BitacoraViaje_viaje_id_idx" ON "BitacoraViaje"("viaje_id");

-- CreateIndex
CREATE INDEX "BitacoraViaje_conductor_id_idx" ON "BitacoraViaje"("conductor_id");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ruta" ADD CONSTRAINT "Ruta_origen_id_fkey" FOREIGN KEY ("origen_id") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ruta" ADD CONSTRAINT "Ruta_destino_id_fkey" FOREIGN KEY ("destino_id") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viaje" ADD CONSTRAINT "Viaje_ruta_id_fkey" FOREIGN KEY ("ruta_id") REFERENCES "Ruta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viaje" ADD CONSTRAINT "Viaje_bus_id_fkey" FOREIGN KEY ("bus_id") REFERENCES "Bus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viaje" ADD CONSTRAINT "Viaje_conductor_id_fkey" FOREIGN KEY ("conductor_id") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoViaje" ADD CONSTRAINT "AsientoViaje_viaje_id_fkey" FOREIGN KEY ("viaje_id") REFERENCES "Viaje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoViaje" ADD CONSTRAINT "AsientoViaje_bloqueado_por_usuario_id_fkey" FOREIGN KEY ("bloqueado_por_usuario_id") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pasaje" ADD CONSTRAINT "Pasaje_asiento_viaje_id_fkey" FOREIGN KEY ("asiento_viaje_id") REFERENCES "AsientoViaje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pasaje" ADD CONSTRAINT "Pasaje_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pasaje" ADD CONSTRAINT "Pasaje_comprador_id_fkey" FOREIGN KEY ("comprador_id") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encomienda" ADD CONSTRAINT "Encomienda_remitente_id_fkey" FOREIGN KEY ("remitente_id") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encomienda" ADD CONSTRAINT "Encomienda_destinatario_id_fkey" FOREIGN KEY ("destinatario_id") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encomienda" ADD CONSTRAINT "Encomienda_origen_id_fkey" FOREIGN KEY ("origen_id") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encomienda" ADD CONSTRAINT "Encomienda_destino_id_fkey" FOREIGN KEY ("destino_id") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encomienda" ADD CONSTRAINT "Encomienda_viaje_id_fkey" FOREIGN KEY ("viaje_id") REFERENCES "Viaje"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reclamo" ADD CONSTRAINT "Reclamo_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodigoDescuento" ADD CONSTRAINT "CodigoDescuento_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_asiento_id_fkey" FOREIGN KEY ("asiento_id") REFERENCES "AsientoViaje"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_viaje_id_fkey" FOREIGN KEY ("viaje_id") REFERENCES "Viaje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoRuta" ADD CONSTRAINT "GastoRuta_viaje_id_fkey" FOREIGN KEY ("viaje_id") REFERENCES "Viaje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoRuta" ADD CONSTRAINT "GastoRuta_conductor_id_fkey" FOREIGN KEY ("conductor_id") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NovedadMecanica" ADD CONSTRAINT "NovedadMecanica_viaje_id_fkey" FOREIGN KEY ("viaje_id") REFERENCES "Viaje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NovedadMecanica" ADD CONSTRAINT "NovedadMecanica_bus_id_fkey" FOREIGN KEY ("bus_id") REFERENCES "Bus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NovedadMecanica" ADD CONSTRAINT "NovedadMecanica_conductor_id_fkey" FOREIGN KEY ("conductor_id") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertaCentral" ADD CONSTRAINT "AlertaCentral_viaje_id_fkey" FOREIGN KEY ("viaje_id") REFERENCES "Viaje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BitacoraViaje" ADD CONSTRAINT "BitacoraViaje_viaje_id_fkey" FOREIGN KEY ("viaje_id") REFERENCES "Viaje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BitacoraViaje" ADD CONSTRAINT "BitacoraViaje_conductor_id_fkey" FOREIGN KEY ("conductor_id") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

