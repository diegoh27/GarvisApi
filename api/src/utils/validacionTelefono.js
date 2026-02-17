/**
 * Prefijos móviles Venezuela (4 dígitos) + 7 dígitos = 11 caracteres.
 */
const PREFIJOS = ["0412", "0414", "0416", "0421", "0422", "0424", "0426"];

/**
 * Valida formato de teléfono: prefijo válido + 7 dígitos (solo números, 11 en total).
 * Acepta con o sin prefijo: si solo vienen 7 dígitos se considera inválido para "completo"
 * pero el backend puede normalizar. Aquí exigimos 11 dígitos empezando por un prefijo.
 *
 * @param {string} telefono - Ej: "04121234567"
 * @param {{ required?: boolean }} opts - required=false permite vacío (para campos opcionales)
 * @returns {{ valid: true, value: string } | { valid: false, message: string }}
 */
function validarTelefono(telefono, opts = {}) {
	const required = opts.required !== false;
	const s = String(telefono ?? "").trim();

	if (!s) {
		if (!required) return { valid: true, value: "" };
		return { valid: false, message: "El teléfono es requerido" };
	}

	const soloDigitos = s.replace(/\D/g, "");
	let prefijo = PREFIJOS.find((p) => soloDigitos.startsWith(p));
	let numero;
	if (prefijo) {
		numero = soloDigitos.slice(prefijo.length);
	} else if (soloDigitos.length === 7) {
		// Solo 7 dígitos: normalizar con prefijo por defecto
		prefijo = "0412";
		numero = soloDigitos;
	} else {
		return {
			valid: false,
			message:
				"El teléfono debe comenzar con 0412, 0414, 0416, 0421, 0422, 0424 o 0426 seguido de 7 dígitos",
		};
	}
	if (numero.length !== 7) {
		return {
			valid: false,
			message: "El número de teléfono debe tener 7 dígitos después del prefijo",
		};
	}
	const value = prefijo + numero;
	return { valid: true, value };
}

module.exports = { validarTelefono, PREFIJOS_TELEFONO: PREFIJOS };
