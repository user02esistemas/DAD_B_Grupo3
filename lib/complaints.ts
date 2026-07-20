import { randomBytes } from "crypto";

export function createComplaintCode(date = new Date()): string {
  return `REC-${date.getFullYear()}-${randomBytes(10).toString("hex").toUpperCase()}`;
}
