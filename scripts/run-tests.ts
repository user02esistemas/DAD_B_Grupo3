import { prisma } from "../lib/prisma";
import { liberarAsientos, marcarAsientosPendientes } from "../app/actions";
import assert from "assert";

async function runTests() {
  console.log("🚀 Iniciando suite de pruebas de integración para 'El Cumbe'...\n");

  let sucursalOrigen: any;
  let sucursalDestino: any;
  let bus: any;
  let ruta: any;
  let viaje: any;
  let asientos: any[] = [];
  let testError: unknown = null;
  const runId = Date.now().toString(36).toUpperCase();

  try {
    // =========================================================================
    // SETUP: Crear entidades temporales de prueba en la Base de Datos
    // =========================================================================
    console.log("⚙️  Configurando datos temporales de prueba en la BD...");

    // Recuperar residuos de ejecuciones antiguas cuyo process.exit impedía el finally.
    const staleTrips = await prisma.viaje.findMany({
      where: { bus: { placa: "TST-999" } },
      select: { id: true, ruta_id: true },
    });
    const staleTripIds = staleTrips.map((item) => item.id);
    const staleRouteIds = [...new Set(staleTrips.map((item) => item.ruta_id))];
    if (staleTripIds.length) {
      await prisma.asientoViaje.deleteMany({ where: { viaje_id: { in: staleTripIds } } });
      await prisma.viaje.deleteMany({ where: { id: { in: staleTripIds } } });
    }
    if (staleRouteIds.length) await prisma.ruta.deleteMany({ where: { id: { in: staleRouteIds } } });
    await prisma.bus.deleteMany({ where: { placa: "TST-999" } });
    await prisma.sucursal.deleteMany({ where: { nombre: { in: ["ORIGEN TEST", "DESTINO TEST"] } } });
    
    sucursalOrigen = await prisma.sucursal.create({
      data: { nombre: `ORIGEN TEST ${runId}`, direccion: "Calle Test 123" }
    });
    
    sucursalDestino = await prisma.sucursal.create({
      data: { nombre: `DESTINO TEST ${runId}`, direccion: "Calle Test 456" }
    });

    bus = await prisma.bus.create({
      data: { placa: `TST-${runId}`, marca: "Volvo Test", capacidad: 10, pisos: 1 }
    });

    ruta = await prisma.ruta.create({
      data: {
        origen_id: sucursalOrigen.id,
        destino_id: sucursalDestino.id,
        duracion_estimada_minutos: 180,
        precio_base: 50.00
      }
    });

    viaje = await prisma.viaje.create({
      data: {
        ruta_id: ruta.id,
        bus_id: bus.id,
        fecha_salida: new Date(),
        estado: "programado"
      }
    });

    // Crear 2 asientos de prueba para el viaje
    for (let i = 1; i <= 2; i++) {
      const asiento = await prisma.asientoViaje.create({
        data: {
          viaje_id: viaje.id,
          numero_asiento: i,
          piso: 1,
          estado: "disponible"
        }
      });
      asientos.push(asiento);
    }
    console.log("✅ Datos temporales creados correctamente.\n");

    // =========================================================================
    // PRUEBA 1: Validación de Zona Horaria Peruana (Lima)
    // =========================================================================
    console.log("📋 Prueba 1: Validando robustez horaria (Lima, Perú)...");
    
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;

    assert.ok(year && month && day, "Error al extraer los datos de fecha en formato de Lima");
    console.log(`   - Huso horario actual detectado para Lima: ${year}-${month}-${day}`);
    console.log("✅ Prueba 1 exitosa.\n");

    // =========================================================================
    // PRUEBA 2: Concurrencia y Atomicidad en Reserva de Asientos (Race Conditions)
    // =========================================================================
    console.log("📋 Prueba 2: Validando atomicidad y prevención de Race Conditions...");
    
    const seatIdToLock = asientos[0].id.toString();
    const guestToken1 = "guest_token_usuario_1";
    const guestToken2 = "guest_token_usuario_2";

    console.log(`   - Lanzando 2 reservas simultáneas para el asiento ID: ${seatIdToLock}...`);
    
    // Ejecutamos ambas reservas al mismo tiempo
    const [res1, res2] = await Promise.all([
      marcarAsientosPendientes([seatIdToLock], guestToken1),
      marcarAsientosPendientes([seatIdToLock], guestToken2)
    ]);

    console.log("   - Resultados de las solicitudes simultáneas:");
    console.log("     * Solicitud Usuario 1:", res1);
    console.log("     * Solicitud Usuario 2:", res2);

    // Una de las dos solicitudes debe haber sido exitosa y la otra rechazada
    const oneSuccess = (res1.success && !res2.success) || (!res1.success && res2.success);
    assert.ok(oneSuccess, "¡Fallo! Ambas solicitudes devolvieron el mismo estado de éxito/error. Riesgo de sobre-venta activo.");

    const failedResult = res1.success ? res2 : res1;
    assert.ok(
      failedResult.error && failedResult.error.includes("reservados o vendidos"),
      "¡Fallo! El mensaje de error de concurrencia no coincide con el esperado."
    );
    const winningToken = res1.success ? guestToken1 : guestToken2;
    const losingToken = res1.success ? guestToken2 : guestToken1;
    const unauthorizedRelease = await liberarAsientos([seatIdToLock], losingToken);
    assert.strictEqual(unauthorizedRelease.count, 0, "Un token ajeno no debe liberar la reserva ganadora");
    const ownerRelease = await liberarAsientos([seatIdToLock], winningToken);
    assert.strictEqual(ownerRelease.count, 1, "El dueño debe poder liberar su reserva");

    console.log("✅ Prueba 2 exitosa: El sistema bloqueó la doble reserva de forma atómica a nivel BD.");

  } catch (error: any) {
    console.error("\n❌ Una o más pruebas fallaron:");
    console.error(error);
    testError = error;
  } finally {
    // =========================================================================
    // CLEANUP: Limpiar la Base de Datos al finalizar
    // =========================================================================
    console.log("\n🧹 Iniciando limpieza de datos temporales...");
    
    if (viaje) {
      await prisma.asientoViaje.deleteMany({ where: { viaje_id: viaje.id } });
      await prisma.viaje.delete({ where: { id: viaje.id } });
    }
    if (ruta) {
      await prisma.ruta.delete({ where: { id: ruta.id } });
    }
    if (bus) {
      await prisma.bus.delete({ where: { id: bus.id } });
    }
    if (sucursalOrigen) {
      await prisma.sucursal.delete({ where: { id: sucursalOrigen.id } });
    }
    if (sucursalDestino) {
      await prisma.sucursal.delete({ where: { id: sucursalDestino.id } });
    }
    
    console.log("🧹 Limpieza finalizada correctamente.");
  }

  if (testError) {
    process.exitCode = 1;
    return;
  }
  console.log("\n🎉 ¡Todas las pruebas han pasado con éxito!");
}

runTests();
