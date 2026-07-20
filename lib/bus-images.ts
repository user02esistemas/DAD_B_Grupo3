export function parseBusImages(raw?: string | null): string[] {
  if (!raw || !raw.trim()) return [];
  const trimmed = raw.trim();

  // 1. JSON Array format
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // fallback if JSON parse fails
    }
  }

  // 2. Custom separator |||
  if (trimmed.includes("|||")) {
    return trimmed.split("|||").map((s) => s.trim()).filter(Boolean);
  }

  // 3. Base64 data URLs incorrectly joined by comma
  if (trimmed.includes("data:image/")) {
    const parts = trimmed
      .split(/(?=data:image\/)/g)
      .map((p) => p.replace(/^,|,$/g, "").trim())
      .filter(Boolean);
    if (parts.length > 0) return parts;
  }

  // 4. Standard comma-separated relative or absolute URLs
  return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
}

export function serializeBusImages(images: string[]): string {
  return JSON.stringify(images);
}
