/**
 * Valida cédula venezolana: acepta con prefijo (V, E, J, P, G) + números o solo números.
 * El número debe estar entre 100.000 y 50.000.000.
 * Devuelve el valor normalizado siempre con prefijo (si solo vienen dígitos se usa "V").
 *
 * @param {string} cedula - Valor a validar (ej: "V12345678", "12345678")
 * @param {{ required?: boolean }} opts - Si required=false, cadena vacía es válida (para campos opcionales)
 * @returns {{ valid: true, value: string } | { valid: false, message: string }}
 */
function validarCedula(cedula, opts = {}) {
	const required = opts.required !== false;
	const s = String(cedula ?? "").trim();

	if (!s) {
		if (!required) return { valid: true, value: "" };
		return { valid: false, message: "La cédula es requerida" };
	}

	// Aceptar: opcional [VEJPG] + dígitos
	const match = s.match(/^([VEJPG])?(\d+)$/i);
	if (!match) {
		return {
			valid: false,
			message:
				"La cédula debe ser tipo V, E, J, P o G seguido de números, o solo números",
		};
	}
	const num = parseInt(match[2], 10);
	if (!Number.isFinite(num) || num < 100000 || num > 50000000) {
		return {
			valid: false,
			message: "El número de cédula debe estar entre 100.000 y 50.000.000",
		};
	}
	// Guardar siempre con prefijo (por defecto V si no vino)
	const prefix = match[1] ? match[1].toUpperCase() : "V";
	const value = prefix + match[2];
	return { valid: true, value };
}

module.exports = { validarCedula };
