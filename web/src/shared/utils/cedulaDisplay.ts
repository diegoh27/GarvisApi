/**
 * Tipos de cédula (Venezuela): V, E, J, P, G
 */
export const CEDULA_TIPOS = ["V", "E", "J", "P", "G"] as const;
export type TipoCedula = (typeof CEDULA_TIPOS)[number];

const PREFIX_REGEX = /^([VEJPG])(.*)$/i;

/**
 * Parsea un valor de cédula que puede venir como "V12345678" o solo "12345678".
 * Devuelve { tipo, numero } para usar en selector + input.
 */
export function parseCedulaDisplay(value: string | null | undefined): {
  tipo: TipoCedula;
  numero: string;
} {
  const s = String(value ?? "").trim();
  const match = s.match(PREFIX_REGEX);
  if (match) {
    const tipo = (match[1].toUpperCase() as TipoCedula);
    const numero = (match[2] ?? "").replace(/\D/g, "");
    return {
      tipo: CEDULA_TIPOS.includes(tipo) ? tipo : "V",
      numero,
    };
  }
  const soloNumeros = s.replace(/\D/g, "");
  return { tipo: "V", numero: soloNumeros };
}
