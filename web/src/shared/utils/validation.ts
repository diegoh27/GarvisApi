/**
 * Validación de cédula: solo dígitos y rango entre 100.000 y 50.000.000.
 */
export const CEDULA_MIN = 100_000;
export const CEDULA_MAX = 50_000_000;

export function validarRangoCedula(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (!/^\d+$/.test(trimmed)) return false;
  const num = parseInt(trimmed, 10);
  return Number.isFinite(num) && num >= CEDULA_MIN && num <= CEDULA_MAX;
}

export const MENSAJE_RANGO_CEDULA =
  "La cédula debe estar entre 100.000 y 50.000.000";
