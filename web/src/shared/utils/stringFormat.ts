/**
 * Normaliza espacios: quita espacios al inicio y final y colapsa múltiples espacios internos a uno.
 */
export function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Convierte a "Title Case": primera letra de cada palabra en mayúscula, resto en minúscula.
 * Ej: "jose diaz" → "Jose Diaz", "   JOSE   DIAZ   " → "Jose Diaz"
 */
export function toTitleCase(value: string): string {
  const normalized = normalizeSpaces(value);
  if (!normalized) return "";
  return normalized
    .split(" ")
    .map((word) =>
      word.length
        ? word[0].toUpperCase() + word.slice(1).toLowerCase()
        : ""
    )
    .join(" ");
}

/**
 * Para nombres y apellidos: quita espacios de más y aplica Title Case.
 */
export function formatNombreApellido(value: string): string {
  return toTitleCase(value);
}
