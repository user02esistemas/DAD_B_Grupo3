// Utility to serialize BigInt for JSON responses (next.js safe)
export function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}
