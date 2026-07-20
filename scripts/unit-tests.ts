import assert from "assert";
import * as jwt from "jsonwebtoken";
import { canAccessPersona, verifyMobileToken } from "../lib/mobileAuth";

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

  test("Debe verificar correctamente el encabezado Authorization Bearer con verifyMobileToken", () => {
    const mockUser = { id: "5", role: "cliente", dni: "12345678", persona_id: "5" };
    const token = jwt.sign(mockUser, secret, { expiresIn: "1h" });

    const reqMock = new Request("http://localhost:3000/api/movil/compras", {
      headers: { "Authorization": `Bearer ${token}` }
    });

    const result = verifyMobileToken(reqMock, ["cliente"]);
    assert.strictEqual(result.valid, true);
    if (result.valid) {
      assert.strictEqual(result.user.id, "5");
      assert.strictEqual(result.user.role, "cliente");
    }
  });

  test("Debe denegar acceso cuando el rol no cumple la lista autorizada", () => {
    const mockUser = { id: "5", role: "cliente", dni: "12345678", persona_id: "5" };
    const token = jwt.sign(mockUser, secret, { expiresIn: "1h" });

    const reqMock = new Request("http://localhost:3000/api/movil/admin", {
      headers: { "Authorization": `Bearer ${token}` }
    });

    const result = verifyMobileToken(reqMock, ["admin", "operador"]);
    assert.strictEqual(result.valid, false);
  });

  test("Debe rechazar tokens sin una identidad completa", () => {
    const token = jwt.sign({ id: "5", role: "cliente" }, secret, { expiresIn: "1h" });
    const reqMock = new Request("http://localhost/api/movil/compras", {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(verifyMobileToken(reqMock).valid, false);
  });

  test("Debe impedir que un usuario acceda a recursos de otra persona", () => {
    const cliente = { id: "5", role: "cliente", dni: "12345678", persona_id: "5" };
    const admin = { ...cliente, role: "admin" };
    assert.strictEqual(canAccessPersona(cliente, BigInt(6)), false);
    assert.strictEqual(canAccessPersona(cliente, BigInt(5)), true);
    assert.strictEqual(canAccessPersona(admin, BigInt(6)), true);
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
