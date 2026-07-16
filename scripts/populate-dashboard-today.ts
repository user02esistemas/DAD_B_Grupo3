import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Nombres y apellidos aleatorios para simular pasajeros y clientes
const NOMBRES = ["Jose", "Maria", "Juan", "Ana", "Luis", "Carlos", "Rosa", "Pedro", "Jorge", "Lucia", "Miguel", "Sofia", "David", "Elena", "Francisco", "Carmen", "Roberto", "Teresa", "Walter", "Beatriz"];
const APELLIDOS = ["Perez", "Gomez", "Flores", "Diaz", "Castro", "Mendoza", "Chavez", "Torres", "Quispe", "Mamani", "Sanchez", "Ramos", "Silva", "Medina", "Castillo", "Guerrero", "Romero", "Herrera", "Vargas", "Delgado"];

function generarPersonaAleatoria() {
  const nombre = NOMBRES[Math.floor(Math.random() * NOMBRES.length)] + " " + NOMBRES[Math.floor(Math.random() * NOMBRES.length)];
  const apellido = APELLIDOS[Math.floor(Math.random() * APELLIDOS.length)] + " " + APELLIDOS[Math.floor(Math.random() * APELLIDOS.length)];
  const dni = Math.floor(10000000 + Math.random() * 90000000).toString();
  const telefono = "9" + Math.floor(10000000 + Math.random() * 90000000).toString();
  return { nombres: nombre, apellidos: apellido, dni, telefono };
}

async function main() {
  console.log("🚀 Iniciando poblamiento de datos para el Dashboard de hoy (10 de Julio de 2026)...");

  // 1. Obtener todas las rutas
  const rutas = await prisma.ruta.findMany({
    include: { origen: true, destino: true }
  });
  console.log(`✅ Se encontraron ${rutas.length} rutas.`);

  // 2. Obtener buses
  const buses = await prisma.bus.findMany();
  if (buses.length === 0) {
    console.error("❌ No hay buses registrados.");
    process.exit(1);
  }
  console.log(`✅ Se encontraron ${buses.length} buses.`);

  // 3. Obtener conductores
  const conductores = await prisma.persona.findMany({
    where: { usuario: { rol: "conductor" } }
  });
  console.log(`✅ Se encontraron ${conductores.length} conductores.`);

  // 4. Configurar fechas de hoy
  const hoy = new Date(); // 2026-07-10T17:43:41...
  
  // Rango de horas para los viajes de hoy: 8:00 AM, 12:00 PM, 4:00 PM, 8:00 PM
  const horariosHoy = [
    { horas: 8, minutos: 0, label: "8:00 AM" },
    { horas: 12, minutos: 0, label: "12:00 PM" },
    { horas: 16, minutos: 0, label: "4:00 PM" },
    { horas: 20, minutos: 0, label: "8:00 PM" },
  ];

  let viajesCreados = 0;
  let pasajesVendidosCount = 0;

  console.log("\n--- CREANDO VIAJES Y PASAJES PARA HOY ---");
  for (const ruta of rutas) {
    // Para cada ruta crearemos 2 viajes en horarios alternos hoy
    const horariosRuta = [
      horariosHoy[ruta.id ? Number(ruta.id) % horariosHoy.length : 0],
      horariosHoy[(ruta.id ? Number(ruta.id) + 2 : 2) % horariosHoy.length]
    ];

    for (const horario of horariosRuta) {
      const fechaSalida = new Date(hoy);
      fechaSalida.setHours(horario.horas, horario.minutos, 0, 0);

      const fechaLlegada = new Date(fechaSalida);
      fechaLlegada.setMinutes(fechaLlegada.getMinutes() + ruta.duracion_estimada_minutos);

      const bus = buses[Math.floor(Math.random() * buses.length)];
      const conductor = conductores.length > 0 ? conductores[Math.floor(Math.random() * conductores.length)] : null;

      // Crear Viaje
      const viaje = await prisma.viaje.create({
        data: {
          ruta_id: ruta.id,
          bus_id: bus.id,
          conductor_id: conductor ? conductor.id : null,
          fecha_salida: fechaSalida,
          fecha_llegada: fechaLlegada,
          estado: "programado", // O "en_ruta" si ya pasó la hora
        }
      });

      viajesCreados++;
      console.log(`➕ Viaje creado para hoy a las ${horario.label} | Ruta: ${ruta.origen.nombre} ➡️ ${ruta.destino.nombre} | ID: ${viaje.id}`);

      // Generar asientos
      let restringidos: number[] = [];
      if (bus.asientos_restringidos) {
        try { restringidos = JSON.parse(bus.asientos_restringidos); } catch(e) {}
      }

      const totalAsientos = bus.capacidad;
      let asientosPiso1 = totalAsientos;
      let asientosPiso2 = 0;

      if (bus.pisos === 2) {
        asientosPiso1 = bus.asientos_piso_1 || 12;
        asientosPiso2 = totalAsientos - asientosPiso1;
      }

      // Crear los asientos y vender pasajes aleatorios (entre 3 y 8 pasajes por viaje)
      const cantPasajesAVender = Math.floor(3 + Math.random() * 6);
      const asientosOcupados = new Set<number>();
      while (asientosOcupados.size < cantPasajesAVender) {
        const numRandom = Math.floor(1 + Math.random() * totalAsientos);
        if (!restringidos.includes(numRandom)) {
          asientosOcupados.add(numRandom);
        }
      }

      // Crear asientos en lote
      const asientosData = [];
      for (let i = 1; i <= asientosPiso1; i++) {
        asientosData.push({
          numero_asiento: i,
          piso: 1,
          estado: asientosOcupados.has(i) ? "ocupado" : (restringidos.includes(i) ? "inactivo" : "disponible")
        });
      }
      if (bus.pisos === 2) {
        for (let i = 1; i <= asientosPiso2; i++) {
          const numAsiento = asientosPiso1 + i;
          asientosData.push({
            numero_asiento: numAsiento,
            piso: 2,
            estado: asientosOcupados.has(numAsiento) ? "ocupado" : (restringidos.includes(numAsiento) ? "inactivo" : "disponible")
          });
        }
      }

      // Guardar asientos y obtener sus IDs
      const asientosCreados = [];
      for (const as of asientosData) {
        const dbAsiento = await prisma.asientoViaje.create({
          data: {
            viaje_id: viaje.id,
            numero_asiento: as.numero_asiento,
            piso: as.piso,
            estado: as.estado
          }
        });
        asientosCreados.push(dbAsiento);
      }

      // Crear los pasajes vendidos para los asientos ocupados
      for (const asiento of asientosCreados) {
        if (asiento.estado === "ocupado") {
          const pData = generarPersonaAleatoria();
          const persona = await prisma.persona.create({ data: pData });

          // Venta del pasaje hoy (con hora aleatoria entre las 8 am y la hora actual)
          const fechaCompra = new Date(hoy);
          fechaCompra.setHours(Math.floor(8 + Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);

          await prisma.pasaje.create({
            data: {
              asiento_viaje_id: asiento.id,
              persona_id: persona.id,
              precio: ruta.precio_base,
              codigo_qr: `QR-DASH-${viaje.id}-${asiento.numero_asiento}`,
              fecha_compra: fechaCompra,
              abordado: Math.random() > 0.3
            }
          });
          pasajesVendidosCount++;
        }
      }
    }
  }

  console.log("\n--- CREANDO ENCOMIENDAS PARA HOY ---");
  // Consultar todas las sucursales reales de la base de datos para evitar IDs inexistentes
  const sucursalesDb = await prisma.sucursal.findMany();
  
  const distribucionEncomiendas = sucursalesDb.map((s, idx) => {
    const cantidades = [6, 4, 2];
    const cantidad = cantidades[idx % cantidades.length];
    return {
      destinoId: Number(s.id),
      cantidad: cantidad,
      destinoNombre: s.nombre
    };
  });

  let encomiendasCreadasCount = 0;

  for (const dist of distribucionEncomiendas) {
    for (let i = 0; i < dist.cantidad; i++) {
      // Buscar una ruta válida que llegue a este destino para que sea coherente
      const rutaValida = rutas.find(r => r.destino_id === BigInt(dist.destinoId)) || rutas[0];
      
      const remitenteData = generarPersonaAleatoria();
      const remitente = await prisma.persona.create({ data: remitenteData });

      const destinatarioData = generarPersonaAleatoria();
      const destinatario = await prisma.persona.create({ data: destinatarioData });

      const fechaCreacion = new Date(hoy);
      fechaCreacion.setHours(Math.floor(8 + Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);

      const peso = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(1 + Math.random() * 20);
      const precio = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(10 + Math.random() * 40);

      await prisma.encomienda.create({
        data: {
          codigo_seguimiento: `ENC-DASH-10-${dist.destinoId}-${i}`,
          remitente_id: remitente.id,
          destinatario_id: destinatario.id,
          origen_id: rutaValida.origen_id,
          destino_id: BigInt(dist.destinoId),
          peso_kg: parseFloat(peso),
          descripcion: "Caja de encomienda con mercadería general",
          precio: parseFloat(precio),
          estado: "recepcionado",
          created_at: fechaCreacion,
        }
      });
      encomiendasCreadasCount++;
    }
    console.log(`📦 Creadas ${dist.cantidad} encomiendas con destino a ${dist.destinoNombre}`);
  }

  console.log(`\n🎉 Dashboard de hoy completamente poblado con éxito.`);
  console.log(`📊 Resumen de inserciones:`);
  console.log(`   - Viajes activos creados para hoy: ${viajesCreados}`);
  console.log(`   - Pasajes vendidos creados para hoy: ${pasajesVendidosCount}`);
  console.log(`   - Encomiendas enviadas creadas para hoy: ${encomiendasCreadasCount}`);
}

main()
  .catch(e => {
    console.error("❌ Error al poblar datos del dashboard:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
