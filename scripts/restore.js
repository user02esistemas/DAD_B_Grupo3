const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log("=== INICIANDO RESTAURACIÓN DE LA BASE DE DATOS ===");

  const backupPath = path.join(__dirname, '../init_data.json');
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ No se encontró el archivo de backup en: ${backupPath}`);
    process.exit(1);
  }

  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

  // 1. Limpiar todas las tablas en orden inverso de dependencia para evitar violaciones de claves foráneas
  console.log("\nLimpiando base de datos existente...");
  await prisma.alertaCentral.deleteMany();
  await prisma.bitacoraViaje.deleteMany();
  await prisma.novedadMecanica.deleteMany();
  await prisma.gastoRuta.deleteMany();
  await prisma.pago.deleteMany();
  await prisma.verificationCode.deleteMany();
  await prisma.codigoDescuento.deleteMany();
  await prisma.reclamo.deleteMany();
  await prisma.encomienda.deleteMany();
  await prisma.pasaje.deleteMany();
  await prisma.asientoViaje.deleteMany();
  await prisma.viaje.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.persona.deleteMany();
  await prisma.ruta.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.sucursal.deleteMany();
  console.log("Base de datos limpia.");

  // Helpers de conversión
  const toBigInt = (val) => val ? BigInt(val) : undefined;
  const toDecimal = (val) => val ? parseFloat(val) : undefined;
  const toDate = (val) => val ? new Date(val) : undefined;

  // 2. Insertar los datos en orden correcto de dependencia
  console.log("\nInsertando datos...");

  // Sucursal
  if (backup.sucursal) {
    for (const item of backup.sucursal) {
      await prisma.sucursal.create({
        data: {
          id: toBigInt(item.id),
          nombre: item.nombre,
          direccion: item.direccion,
          created_at: toDate(item.created_at),
          updated_at: toDate(item.updated_at),
        }
      });
    }
    console.log(`- ${backup.sucursal.length} sucursales restauradas.`);
  }

  // Bus
  if (backup.bus) {
    for (const item of backup.bus) {
      await prisma.bus.create({
        data: {
          id: toBigInt(item.id),
          placa: item.placa,
          marca: item.marca,
          capacidad: item.capacidad,
          pisos: item.pisos,
          asientos_piso_1: item.asientos_piso_1,
          asientos_restringidos: item.asientos_restringidos,
          imagenes: item.imagenes,
          created_at: toDate(item.created_at),
          updated_at: toDate(item.updated_at),
        }
      });
    }
    console.log(`- ${backup.bus.length} buses restaurados.`);
  }

  // Ruta
  if (backup.ruta) {
    for (const item of backup.ruta) {
      await prisma.ruta.create({
        data: {
          id: toBigInt(item.id),
          origen_id: toBigInt(item.origen_id),
          destino_id: toBigInt(item.destino_id),
          duracion_estimada_minutos: item.duracion_estimada_minutos,
          precio_base: toDecimal(item.precio_base),
          created_at: toDate(item.created_at),
          updated_at: toDate(item.updated_at),
        }
      });
    }
    console.log(`- ${backup.ruta.length} rutas restauradas.`);
  }

  // Persona
  if (backup.persona) {
    for (const item of backup.persona) {
      await prisma.persona.create({
        data: {
          id: toBigInt(item.id),
          nombres: item.nombres,
          apellidos: item.apellidos,
          dni: item.dni,
          telefono: item.telefono,
          fecha_nacimiento: toDate(item.fecha_nacimiento),
          created_at: toDate(item.created_at),
          updated_at: toDate(item.updated_at),
        }
      });
    }
    console.log(`- ${backup.persona.length} personas restauradas.`);
  }

  // Usuario
  if (backup.usuario) {
    for (const item of backup.usuario) {
      await prisma.usuario.create({
        data: {
          id: toBigInt(item.id),
          persona_id: toBigInt(item.persona_id),
          correo: item.correo,
          contrasena: item.contrasena,
          rol: item.rol,
          created_at: toDate(item.created_at),
          updated_at: toDate(item.updated_at),
        }
      });
    }
    console.log(`- ${backup.usuario.length} usuarios restaurados.`);
  }

  // Viaje
  if (backup.viaje) {
    for (const item of backup.viaje) {
      await prisma.viaje.create({
        data: {
          id: toBigInt(item.id),
          ruta_id: toBigInt(item.ruta_id),
          bus_id: toBigInt(item.bus_id),
          conductor_id: toBigInt(item.conductor_id),
          fecha_salida: toDate(item.fecha_salida),
          fecha_llegada: toDate(item.fecha_llegada),
          estado: item.estado,
          created_at: toDate(item.created_at),
          updated_at: toDate(item.updated_at),
        }
      });
    }
    console.log(`- ${backup.viaje.length} viajes restaurados.`);
  }

  // AsientoViaje
  if (backup.asientoViaje) {
    for (const item of backup.asientoViaje) {
      await prisma.asientoViaje.create({
        data: {
          id: toBigInt(item.id),
          viaje_id: toBigInt(item.viaje_id),
          numero_asiento: item.numero_asiento,
          piso: item.piso,
          estado: item.estado,
          bloqueado_por_usuario_id: toBigInt(item.bloqueado_por_usuario_id),
          bloqueado_por_token: item.bloqueado_por_token,
          bloqueado_en: toDate(item.bloqueado_en),
          created_at: toDate(item.created_at),
          updated_at: toDate(item.updated_at),
        }
      });
    }
    console.log(`- ${backup.asientoViaje.length} asientos de viaje restaurados.`);
  }

  // Pasaje
  if (backup.pasaje) {
    for (const item of backup.pasaje) {
      await prisma.pasaje.create({
        data: {
          id: toBigInt(item.id),
          asiento_viaje_id: toBigInt(item.asiento_viaje_id),
          persona_id: toBigInt(item.persona_id),
          comprador_id: toBigInt(item.comprador_id),
          precio: toDecimal(item.precio),
          fecha_compra: toDate(item.fecha_compra),
          codigo_qr: item.codigo_qr,
          abordado: item.abordado,
          created_at: toDate(item.created_at),
          updated_at: toDate(item.updated_at),
        }
      });
    }
    console.log(`- ${backup.pasaje.length} pasajes restaurados.`);
  }

  // Encomienda
  if (backup.encomienda) {
    for (const item of backup.encomienda) {
      await prisma.encomienda.create({
        data: {
          id: toBigInt(item.id),
          codigo_seguimiento: item.codigo_seguimiento,
          remitente_id: toBigInt(item.remitente_id),
          destinatario_id: toBigInt(item.destinatario_id),
          origen_id: toBigInt(item.origen_id),
          destino_id: toBigInt(item.destino_id),
          viaje_id: toBigInt(item.viaje_id),
          peso_kg: toDecimal(item.peso_kg),
          descripcion: item.descripcion,
          precio: toDecimal(item.precio),
          estado: item.estado,
          created_at: toDate(item.created_at),
          updated_at: toDate(item.updated_at),
        }
      });
    }
    console.log(`- ${backup.encomienda.length} encomiendas restauradas.`);
  }

  // Reclamo
  if (backup.reclamo) {
    for (const item of backup.reclamo) {
      await prisma.reclamo.create({
        data: {
          id: toBigInt(item.id),
          codigo_reclamo: item.codigo_reclamo,
          persona_id: toBigInt(item.persona_id),
          tipo: item.tipo,
          detalle_incidente: item.detalle_incidente,
          pedido_cliente: item.pedido_cliente,
          estado: item.estado,
          respuesta_admin: item.respuesta_admin,
          correo_contacto: item.correo_contacto,
          referencia: item.referencia,
          fecha_incidente: toDate(item.fecha_incidente),
          created_at: toDate(item.created_at),
          updated_at: toDate(item.updated_at),
        }
      });
    }
    console.log(`- ${backup.reclamo.length} reclamos restaurados.`);
  }

  // CodigoDescuento
  if (backup.codigoDescuento) {
    for (const item of backup.codigoDescuento) {
      await prisma.codigoDescuento.create({
        data: {
          id: toBigInt(item.id),
          codigo: item.codigo,
          usuario_id: toBigInt(item.usuario_id),
          porcentaje_descuento: item.porcentaje_descuento,
          esta_usado: item.esta_usado,
          fecha_expiracion: toDate(item.fecha_expiracion),
          created_at: toDate(item.created_at),
          updated_at: toDate(item.updated_at),
        }
      });
    }
    console.log(`- ${backup.codigoDescuento.length} códigos de descuento restaurados.`);
  }

  // VerificationCode
  if (backup.verificationCode) {
    for (const item of backup.verificationCode) {
      await prisma.verificationCode.create({
        data: {
          id: toBigInt(item.id),
          user_id: toBigInt(item.user_id),
          code: item.code,
          expires_at: toDate(item.expires_at),
          is_used: item.is_used,
          created_at: toDate(item.created_at),
          updated_at: toDate(item.updated_at),
        }
      });
    }
    console.log(`- ${backup.verificationCode.length} códigos de verificación restaurados.`);
  }

  // Pago
  if (backup.pago) {
    for (const item of backup.pago) {
      await prisma.pago.create({
        data: {
          id: toBigInt(item.id),
          viaje_id: toBigInt(item.viaje_id),
          asiento_id: toBigInt(item.asiento_id),
          preference_id: item.preference_id,
          status: item.status,
          amount: toDecimal(item.amount),
          created_at: toDate(item.created_at),
          updated_at: toDate(item.updated_at),
        }
      });
    }
    console.log(`- ${backup.pago.length} pagos restaurados.`);
  }

  // GastoRuta
  if (backup.gastoRuta) {
    for (const item of backup.gastoRuta) {
      await prisma.gastoRuta.create({
        data: {
          id: toBigInt(item.id),
          viaje_id: toBigInt(item.viaje_id),
          conductor_id: toBigInt(item.conductor_id),
          concepto: item.concepto,
          monto: toDecimal(item.monto),
          foto_url: item.foto_url,
          created_at: toDate(item.created_at),
          updated_at: toDate(item.updated_at),
        }
      });
    }
    console.log(`- ${backup.gastoRuta.length} gastos de ruta restaurados.`);
  }

  // NovedadMecanica
  if (backup.novedadMecanica) {
    for (const item of backup.novedadMecanica) {
      await prisma.novedadMecanica.create({
        data: {
          id: toBigInt(item.id),
          bus_id: toBigInt(item.bus_id),
          viaje_id: toBigInt(item.viaje_id),
          conductor_id: toBigInt(item.conductor_id),
          categoria: item.categoria,
          descripcion: item.descripcion,
          estado: item.estado,
          created_at: toDate(item.created_at),
          updated_at: toDate(item.updated_at),
        }
      });
    }
    console.log(`- ${backup.novedadMecanica.length} novedades mecánicas restauradas.`);
  }

  // BitacoraViaje
  if (backup.bitacoraViaje) {
    for (const item of backup.bitacoraViaje) {
      await prisma.bitacoraViaje.create({
        data: {
          id: toBigInt(item.id),
          viaje_id: toBigInt(item.viaje_id),
          conductor_id: toBigInt(item.conductor_id),
          tipo: item.tipo,
          gravedad: item.gravedad,
          descripcion: item.descripcion,
          retraso_minutos: item.retraso_minutos,
          solucionado: item.solucionado,
          fecha_solucion: toDate(item.fecha_solucion),
          foto_url: item.foto_url,
          created_at: toDate(item.created_at),
          updated_at: toDate(item.updated_at),
        }
      });
    }
    console.log(`- ${backup.bitacoraViaje.length} bitácoras de viaje restauradas.`);
  }

  // AlertaCentral
  if (backup.alertaCentral) {
    for (const item of backup.alertaCentral) {
      await prisma.alertaCentral.create({
        data: {
          id: toBigInt(item.id),
          viaje_id: toBigInt(item.viaje_id),
          mensaje: item.mensaje,
          leido: item.leido,
          created_at: toDate(item.created_at),
          updated_at: toDate(item.updated_at),
        }
      });
    }
    console.log(`- ${backup.alertaCentral.length} alertas restauradas.`);
  }

  console.log("\n🎉 ¡Base de datos restaurada con éxito!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
