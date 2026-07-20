export function getPeruDateString(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getPeruDayRange(dateString = getPeruDateString()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) throw new Error("Fecha inválida.");
  const start = new Date(`${dateString}T00:00:00.000-05:00`);
  const end = new Date(`${dateString}T23:59:59.999-05:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new Error("Fecha inválida.");
  return { start, end };
}
