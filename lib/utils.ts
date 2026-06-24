// Utility to serialize BigInt for JSON responses (next.js safe)
export function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return obj.toString();
  if (typeof obj === "object") {
    if (obj instanceof Date) return obj.toISOString();
    if (Array.isArray(obj)) return obj.map(serializeBigInt);
    
    if (obj && typeof obj.toNumber === "function" && obj.d !== undefined) {
      return obj.toString();
    }

    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = serializeBigInt(obj[key]);
    }
    return newObj;
  }
  return obj;
}
