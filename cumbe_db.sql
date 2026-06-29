-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 28-06-2026 a las 05:47:20
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `cumbe_db`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `asientoviaje`
--

CREATE TABLE `asientoviaje` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `viaje_id` bigint(20) UNSIGNED NOT NULL,
  `numero_asiento` int(11) NOT NULL,
  `piso` int(11) NOT NULL DEFAULT 1,
  `estado` varchar(191) NOT NULL DEFAULT 'disponible',
  `bloqueado_por_usuario_id` bigint(20) UNSIGNED DEFAULT NULL,
  `bloqueado_en` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `bus`
--

CREATE TABLE `bus` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `placa` varchar(15) NOT NULL,
  `marca` varchar(50) DEFAULT NULL,
  `capacidad` int(11) NOT NULL,
  `pisos` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  `asientos_piso_1` int(11) DEFAULT NULL,
  `asientos_restringidos` text DEFAULT NULL,
  `imagenes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `codigodescuento`
--

CREATE TABLE `codigodescuento` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `usuario_id` bigint(20) UNSIGNED NOT NULL,
  `porcentaje_descuento` int(11) NOT NULL DEFAULT 10,
  `esta_usado` tinyint(1) NOT NULL DEFAULT 0,
  `fecha_expiracion` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `encomienda`
--

CREATE TABLE `encomienda` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `codigo_seguimiento` varchar(50) NOT NULL,
  `remitente_id` bigint(20) UNSIGNED NOT NULL,
  `destinatario_id` bigint(20) UNSIGNED NOT NULL,
  `origen_id` bigint(20) UNSIGNED NOT NULL,
  `destino_id` bigint(20) UNSIGNED NOT NULL,
  `viaje_id` bigint(20) UNSIGNED DEFAULT NULL,
  `peso_kg` decimal(5,2) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `precio` decimal(8,2) NOT NULL,
  `estado` varchar(191) NOT NULL DEFAULT 'recepcionado',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pago`
--

CREATE TABLE `pago` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `viaje_id` bigint(20) UNSIGNED NOT NULL,
  `asiento_id` bigint(20) UNSIGNED DEFAULT NULL,
  `preference_id` varchar(255) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `amount` decimal(8,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pasaje`
--

CREATE TABLE `pasaje` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `asiento_viaje_id` bigint(20) UNSIGNED NOT NULL,
  `persona_id` bigint(20) UNSIGNED NOT NULL,
  `comprador_id` bigint(20) UNSIGNED DEFAULT NULL,
  `precio` decimal(8,2) NOT NULL,
  `fecha_compra` timestamp NULL DEFAULT current_timestamp(),
  `codigo_qr` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `persona`
--

CREATE TABLE `persona` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `nombres` varchar(255) NOT NULL,
  `apellidos` varchar(255) NOT NULL,
  `dni` varchar(15) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reclamo`
--

CREATE TABLE `reclamo` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `codigo_reclamo` varchar(50) NOT NULL,
  `persona_id` bigint(20) UNSIGNED NOT NULL,
  `tipo` varchar(191) NOT NULL DEFAULT 'reclamo',
  `detalle_incidente` text NOT NULL,
  `pedido_cliente` text NOT NULL,
  `estado` varchar(191) NOT NULL DEFAULT 'pendiente',
  `respuesta_admin` text DEFAULT NULL,
  `fecha_incidente` date NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ruta`
--

CREATE TABLE `ruta` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `origen_id` bigint(20) UNSIGNED NOT NULL,
  `destino_id` bigint(20) UNSIGNED NOT NULL,
  `duracion_estimada_minutos` int(11) NOT NULL,
  `precio_base` decimal(8,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sucursal`
--

CREATE TABLE `sucursal` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario`
--

CREATE TABLE `usuario` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `persona_id` bigint(20) UNSIGNED NOT NULL,
  `correo` varchar(255) NOT NULL,
  `contrasena` varchar(255) NOT NULL,
  `rol` varchar(191) NOT NULL DEFAULT 'cliente',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `verification_codes`
--

CREATE TABLE `verification_codes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(10) NOT NULL,
  `expires_at` datetime NOT NULL,
  `is_used` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `viaje`
--

CREATE TABLE `viaje` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `ruta_id` bigint(20) UNSIGNED NOT NULL,
  `bus_id` bigint(20) UNSIGNED NOT NULL,
  `fecha_salida` datetime NOT NULL,
  `fecha_llegada` datetime DEFAULT NULL,
  `estado` varchar(191) NOT NULL DEFAULT 'programado',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `asientoviaje`
--
ALTER TABLE `asientoviaje`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `AsientoViaje_viaje_id_numero_asiento_key` (`viaje_id`,`numero_asiento`),
  ADD KEY `AsientoViaje_bloqueado_por_usuario_id_fkey` (`bloqueado_por_usuario_id`);

--
-- Indices de la tabla `bus`
--
ALTER TABLE `bus`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Bus_placa_key` (`placa`);

--
-- Indices de la tabla `codigodescuento`
--
ALTER TABLE `codigodescuento`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `CodigoDescuento_codigo_key` (`codigo`),
  ADD KEY `CodigoDescuento_usuario_id_fkey` (`usuario_id`);

--
-- Indices de la tabla `encomienda`
--
ALTER TABLE `encomienda`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Encomienda_codigo_seguimiento_key` (`codigo_seguimiento`),
  ADD KEY `Encomienda_remitente_id_fkey` (`remitente_id`),
  ADD KEY `Encomienda_destinatario_id_fkey` (`destinatario_id`),
  ADD KEY `Encomienda_origen_id_fkey` (`origen_id`),
  ADD KEY `Encomienda_destino_id_fkey` (`destino_id`),
  ADD KEY `Encomienda_viaje_id_fkey` (`viaje_id`);

--
-- Indices de la tabla `pago`
--
ALTER TABLE `pago`
  ADD PRIMARY KEY (`id`),
  ADD KEY `pago_asiento_id_fkey` (`asiento_id`),
  ADD KEY `pago_viaje_id_fkey` (`viaje_id`);

--
-- Indices de la tabla `pasaje`
--
ALTER TABLE `pasaje`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Pasaje_asiento_viaje_id_key` (`asiento_viaje_id`),
  ADD UNIQUE KEY `Pasaje_codigo_qr_key` (`codigo_qr`),
  ADD KEY `Pasaje_persona_id_fkey` (`persona_id`),
  ADD KEY `Pasaje_comprador_id_fkey` (`comprador_id`);

--
-- Indices de la tabla `persona`
--
ALTER TABLE `persona`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Persona_dni_key` (`dni`);

--
-- Indices de la tabla `reclamo`
--
ALTER TABLE `reclamo`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Reclamo_codigo_reclamo_key` (`codigo_reclamo`),
  ADD KEY `Reclamo_persona_id_fkey` (`persona_id`);

--
-- Indices de la tabla `ruta`
--
ALTER TABLE `ruta`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Ruta_origen_id_fkey` (`origen_id`),
  ADD KEY `Ruta_destino_id_fkey` (`destino_id`);

--
-- Indices de la tabla `sucursal`
--
ALTER TABLE `sucursal`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Usuario_persona_id_key` (`persona_id`),
  ADD UNIQUE KEY `Usuario_correo_key` (`correo`);

--
-- Indices de la tabla `verification_codes`
--
ALTER TABLE `verification_codes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `verification_codes_user_id_fkey` (`user_id`);

--
-- Indices de la tabla `viaje`
--
ALTER TABLE `viaje`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Viaje_ruta_id_fkey` (`ruta_id`),
  ADD KEY `Viaje_bus_id_fkey` (`bus_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `asientoviaje`
--
ALTER TABLE `asientoviaje`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `bus`
--
ALTER TABLE `bus`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `codigodescuento`
--
ALTER TABLE `codigodescuento`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `encomienda`
--
ALTER TABLE `encomienda`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pago`
--
ALTER TABLE `pago`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pasaje`
--
ALTER TABLE `pasaje`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `persona`
--
ALTER TABLE `persona`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `reclamo`
--
ALTER TABLE `reclamo`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `ruta`
--
ALTER TABLE `ruta`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `sucursal`
--
ALTER TABLE `sucursal`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `verification_codes`
--
ALTER TABLE `verification_codes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `viaje`
--
ALTER TABLE `viaje`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `asientoviaje`
--
ALTER TABLE `asientoviaje`
  ADD CONSTRAINT `AsientoViaje_bloqueado_por_usuario_id_fkey` FOREIGN KEY (`bloqueado_por_usuario_id`) REFERENCES `usuario` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `AsientoViaje_viaje_id_fkey` FOREIGN KEY (`viaje_id`) REFERENCES `viaje` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `codigodescuento`
--
ALTER TABLE `codigodescuento`
  ADD CONSTRAINT `CodigoDescuento_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `encomienda`
--
ALTER TABLE `encomienda`
  ADD CONSTRAINT `Encomienda_destinatario_id_fkey` FOREIGN KEY (`destinatario_id`) REFERENCES `persona` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Encomienda_destino_id_fkey` FOREIGN KEY (`destino_id`) REFERENCES `sucursal` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Encomienda_origen_id_fkey` FOREIGN KEY (`origen_id`) REFERENCES `sucursal` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Encomienda_remitente_id_fkey` FOREIGN KEY (`remitente_id`) REFERENCES `persona` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Encomienda_viaje_id_fkey` FOREIGN KEY (`viaje_id`) REFERENCES `viaje` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `pago`
--
ALTER TABLE `pago`
  ADD CONSTRAINT `pago_asiento_id_fkey` FOREIGN KEY (`asiento_id`) REFERENCES `asientoviaje` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `pago_viaje_id_fkey` FOREIGN KEY (`viaje_id`) REFERENCES `viaje` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `pasaje`
--
ALTER TABLE `pasaje`
  ADD CONSTRAINT `Pasaje_asiento_viaje_id_fkey` FOREIGN KEY (`asiento_viaje_id`) REFERENCES `asientoviaje` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Pasaje_comprador_id_fkey` FOREIGN KEY (`comprador_id`) REFERENCES `usuario` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Pasaje_persona_id_fkey` FOREIGN KEY (`persona_id`) REFERENCES `persona` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `reclamo`
--
ALTER TABLE `reclamo`
  ADD CONSTRAINT `Reclamo_persona_id_fkey` FOREIGN KEY (`persona_id`) REFERENCES `persona` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `ruta`
--
ALTER TABLE `ruta`
  ADD CONSTRAINT `Ruta_destino_id_fkey` FOREIGN KEY (`destino_id`) REFERENCES `sucursal` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Ruta_origen_id_fkey` FOREIGN KEY (`origen_id`) REFERENCES `sucursal` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD CONSTRAINT `Usuario_persona_id_fkey` FOREIGN KEY (`persona_id`) REFERENCES `persona` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `verification_codes`
--
ALTER TABLE `verification_codes`
  ADD CONSTRAINT `verification_codes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `usuario` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `viaje`
--
ALTER TABLE `viaje`
  ADD CONSTRAINT `Viaje_bus_id_fkey` FOREIGN KEY (`bus_id`) REFERENCES `bus` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Viaje_ruta_id_fkey` FOREIGN KEY (`ruta_id`) REFERENCES `ruta` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
