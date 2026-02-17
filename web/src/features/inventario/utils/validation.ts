/**
 * Constantes y helpers de validación para formularios de Inventario.
 */

/** Montos/precios: mínimo 0.01, máximo compatible con DECIMAL(10,2) */
export const MONTO_MIN = 0.01;
export const MONTO_MAX = 99_999_999.99;
export const MONTO_DECIMALES = 2;
export const MONTO_ENTEROS_MAX = 8;

/**
 * Sanitiza el valor de un input de monto: solo dígitos y un punto, máx 8 enteros y 2 decimales.
 */
export function sanitizeMonto(raw: string): string {
  const onlyNumbersAndDot = raw.replace(/[^\d.]/g, "");
  const parts = onlyNumbersAndDot.split(".");
  const entera = (parts[0] || "").slice(0, MONTO_ENTEROS_MAX);
  const decimal = (parts[1] || "").slice(0, MONTO_DECIMALES);
  if (parts.length <= 1) return entera;
  return `${entera}.${decimal}`;
}

/**
 * Valida que el monto sea >= MONTO_MIN y <= MONTO_MAX y finito.
 * Retorna mensaje de error o "" si es válido.
 */
export function validarMonto(value: string | number): string {
  const n = typeof value === "number" ? value : parseFloat(String(value).trim());
  if (!Number.isFinite(n)) return "El monto debe ser un número válido";
  if (n < MONTO_MIN) return "El monto debe ser al menos 0,01";
  if (n > MONTO_MAX) return "El monto no puede superar el valor máximo permitido";
  return "";
}

export const MAX_LENGTH = {
  nombreEnte: 120,
  concepto: 200,
  nombreProducto: 120,
  referencia: 80,
  proveedor: 120,
  motivoAjuste: 500,
  nombreContrato: 120,
  descripcionContrato: 500,
  nombreApellido: 36,
  cargo: 80,
} as const;

export function validarSoloNumeros(value: string): boolean {
  return /^\d*$/.test(value.trim());
}

export function validarMontoMayorCero(value: string | number): boolean {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) && n > 0;
}

export function validarEnteroNoNegativo(value: string | number): boolean {
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  return Number.isInteger(n) && n >= 0;
}

export function validarEnteroPositivo(value: string | number): boolean {
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  return Number.isInteger(n) && n >= 1;
}

export function validarPorcentaje(value: string | number): boolean {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) && n >= 1 && n <= 100;
}

export function validarLongitudMaxima(value: string, max: number): boolean {
  return value.trim().length <= max;
}
