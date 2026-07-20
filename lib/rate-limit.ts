import { createHash } from "crypto";

type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();
const MAX_BUCKETS = 10_000;

export function requestAddress(headers: Headers): string {
  return (headers.get("x-forwarded-for")?.split(",")[0] || headers.get("x-real-ip") || "unknown").trim();
}

export function rateLimitKey(scope: string, ...parts: string[]): string {
  return `${scope}:${createHash("sha256").update(parts.join("|")).digest("hex")}`;
}

export function assertRateLimit(key: string, maxRequests: number, windowMs: number): void {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [candidate, value] of buckets) {
        if (value.resetAt <= now || buckets.size >= MAX_BUCKETS) buckets.delete(candidate);
        if (buckets.size < MAX_BUCKETS) break;
      }
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (current.count >= maxRequests) throw new Error("RATE_LIMIT");
  current.count += 1;
}
