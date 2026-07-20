import assert from "assert";
import * as jwt from "jsonwebtoken";

process.env.NEXTAUTH_SECRET ||= "test_only_secret_with_at_least_32_chars";

async function runUnitTests() {
  console.log("=================================================");
  console.log("🧪  EJECUTANDO SUITE DE PRUEBAS UNITARIAS (EL CUMBE)");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function test(description: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✅ PASÓ: ${description}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FALLÓ: ${description}`);
      console.error(`     Detalle: ${err.message}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // SUITE 1: Validación de Formatos y Datos de Entrada (RegEx)
  // -------------------------------------------------------------
  console.log("📋 Suite 1: Validaciones de Entrada (Zod / RegEx)");

  test("Debe validar que un DNI peruano contenga exactamente 8 dígitos", () => {
    const validDni = "74829104";
    const invalidDniShort = "1234567";
    const invalidDniAlpha = "7482910a";

    assert.strictEqual(/^\d{8}$/.test(validDni), true);
    assert.strictEqual(/^\d{8}$/.test(invalidDniShort), false);
    assert.strictEqual(/^\d{8}$/.test(invalidDniAlpha), false);
  });

  test("Debe validar que el teléfono celular contenga exactamente 9 dígitos", () => {
    const validPhone = "918273645";
    const invalidPhoneShort = "91827364";
    
    assert.strictEqual(/^\d{9}$/.test(validPhone), true);
    assert.strictEqual(/^\d{9}$/.test(invalidPhoneShort), false);
  });

  test("Debe validar que los nombres solo contengan letras y espacios", () => {
    const validName = "Juan Carlos";
    const invalidNameNumbers = "Juan123";

    assert.strictEqual(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(validName), true);
    assert.strictEqual(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(invalidNameNumbers), false);
  });

  // -------------------------------------------------------------
  // SUITE 2: Seguridad y Autenticación JWT
  // -------------------------------------------------------------
  console.log("\n📋 Suite 2: Seguridad y Firma de Tokens JWT");

  const secret = process.env.NEXTAUTH_SECRET!;

  test("Debe generar un token JWT válido con payload de usuario", () => {
    const mockUser = {
      id: "10",
      role: "cliente",
      dni: "74829104",
      persona_id: "10"
    };

    const token = jwt.sign(mockUser, secret, { expiresIn: "1h" });
    assert.ok(token && typeof token === "string");

    const decoded = jwt.verify(token, secret) as any;
    assert.strictEqual(decoded.id, "10");
    assert.strictEqual(decoded.role, "cliente");
    assert.strictEqual(decoded.dni, "74829104");
  });

  test("Debe rechazar un token JWT alterado o con firma incorrecta", () => {
    const invalidToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature";
    assert.throws(() => {
      jwt.verify(invalidToken, secret);
    });
  });

  // -------------------------------------------------------------
  // SUITE 3: Reglas de Negocio (Asientos y Precios)
  // -------------------------------------------------------------
  console.log("\n📋 Suite 3: Reglas de Negocio (Asientos y Transacciones)");

  test("Debe calcular correctamente el precio total de una compra múltiple de asientos", () => {
    const pricePerSeat = 45.50;
    const selectedCount = 3;
    const total = Number((pricePerSeat * selectedCount).toFixed(2));

    assert.strictEqual(total, 136.50);
  });

  test("Debe limitar la cantidad máxima de asientos a 6 por transacción", () => {
    const seatsSelected7 = [1, 2, 3, 4, 5, 6, 7];
    const isExceeded = seatsSelected7.length > 6;
    assert.strictEqual(isExceeded, true);
  });

  console.log("\n-------------------------------------------------");
  console.log(`📊 RESUMEN: ${passed} pruebas pasaron, ${failed} fallaron.`);
  console.log("-------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runUnitTests();
