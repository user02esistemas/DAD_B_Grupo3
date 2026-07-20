type CulqiCharge = {
  id?: string;
  object?: string;
  amount?: number;
  current_amount?: number;
  amount_refunded?: number;
  currency?: string;
  currency_code?: string;
  email?: string | null;
  outcome?: { type?: string } | null;
};

function getSecretKey(): string {
  const secret = process.env.CULQI_SECRET_KEY;
  if (!secret) throw new Error("CULQI_SECRET_KEY no está configurada.");
  return secret;
}

async function culqiRequest(path: string, init?: RequestInit) {
  return fetch(`https://api.culqi.com/v2${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
}

export async function getCulqiCharge(chargeId: string): Promise<CulqiCharge> {
  if (!/^chr_(test|live)_[A-Za-z0-9]+$/.test(chargeId)) {
    throw new Error("El identificador de cargo no es válido.");
  }
  const response = await culqiRequest(`/charges/${encodeURIComponent(chargeId)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.user_message || "No se pudo verificar el cargo en Culqi.");
  return data as CulqiCharge;
}

export async function verifyCulqiCharge(
  chargeId: string,
  expectedAmountSoles: number,
  expectedEmail?: string,
): Promise<CulqiCharge> {
  const charge = await getCulqiCharge(chargeId);
  const expectedCents = Math.round(expectedAmountSoles * 100);
  const currency = charge.currency || charge.currency_code;

  if (
    charge.object !== "charge" ||
    charge.id !== chargeId ||
    charge.amount !== expectedCents ||
    currency !== "PEN" ||
    (charge.amount_refunded || 0) > 0 ||
    (typeof charge.current_amount === "number" && charge.current_amount !== expectedCents)
  ) {
    throw new Error("El cargo de Culqi no coincide con la compra solicitada.");
  }

  if (expectedEmail && charge.email && charge.email.toLowerCase() !== expectedEmail.trim().toLowerCase()) {
    throw new Error("El correo del cargo no coincide con el comprador.");
  }
  return charge;
}

export async function refundCulqiCharge(chargeId: string, amountSoles: number): Promise<boolean> {
  const response = await culqiRequest("/refunds", {
    method: "POST",
    body: JSON.stringify({
      amount: Math.round(amountSoles * 100),
      charge_id: chargeId,
      reason: "solicitud_comprador",
    }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    console.error("No se pudo devolver automáticamente el cargo de Culqi:", data);
  }
  return response.ok;
}
