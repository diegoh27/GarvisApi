/**
 * Prefijos de teléfono móvil Venezuela (mismo orden que en registro).
 * Formato final: prefijo + 7 dígitos (ej: 04121234567).
 */
export const TELEFONO_PREFIXES = [
	"0412",
	"0414",
	"0416",
	"0421",
	"0422",
	"0424",
	"0426",
] as const;

export type TelefonoPrefix = (typeof TELEFONO_PREFIXES)[number];

const PREFIXES_ORDER = [...TELEFONO_PREFIXES];

/**
 * Parsea un valor de teléfono que puede venir como "04121234567" o "1234567".
 * Devuelve { prefix, number } para usar en selector + input (7 dígitos).
 */
export function parseTelefonoDisplay(
	value: string | null | undefined
): { prefix: TelefonoPrefix; number: string } {
	const s = String(value ?? "").trim().replace(/\D/g, "");
	if (s.length >= 11) {
		const pref = PREFIXES_ORDER.find((p) => s.startsWith(p));
		if (pref) {
			return {
				prefix: pref,
				number: s.slice(pref.length).slice(0, 7),
			};
		}
	}
	if (s.length >= 4) {
		const pref = PREFIXES_ORDER.find((p) => s.startsWith(p));
		if (pref) {
			return {
				prefix: pref,
				number: s.slice(pref.length).slice(0, 7),
			};
		}
	}
	// Solo dígitos o valor raro: asumir número son los últimos 7
	const number = s.slice(-7).slice(0, 7);
	const prefix = PREFIXES_ORDER.includes("0412" as TelefonoPrefix)
		? "0412"
		: TELEFONO_PREFIXES[0];
	return { prefix, number };
}

/** Valida que el número tenga exactamente 7 dígitos. */
export function validarNumeroTelefono(numero: string): boolean {
	return /^\d{7}$/.test(String(numero ?? "").trim());
}

export const MENSAJE_TELEFONO_REQUERIDO = "El teléfono es requerido";
export const MENSAJE_TELEFONO_7_DIGITOS = "El número debe tener 7 dígitos";
