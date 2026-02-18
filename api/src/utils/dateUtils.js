/**
 * Normaliza un valor a string YYYY-MM-DD válido para guardar en BD.
 * Evita años erróneos (ej. 20260) por timezone o serialización.
 * @param {string | Date | null | undefined} value
 * @returns {string} "YYYY-MM-DD"
 * @throws Si el valor no es una fecha válida o el año no está en 1000-9999.
 */
function normalizeFechaForDb(value) {
	if (value == null || value === "") {
		const err = new Error("Fecha requerida");
		err.code = "VALIDATION";
		throw err;
	}
	let y;
	let m;
	let d;
	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) {
			const err = new Error("Fecha inválida");
			err.code = "VALIDATION";
			throw err;
		}
		y = value.getFullYear();
		m = value.getMonth() + 1;
		d = value.getDate();
	} else {
		const s = String(value).trim();
		const part = s.includes("T") ? s.split("T")[0] : s.slice(0, 10);
		const match = part.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (!match) {
			const err = new Error("Fecha debe ser YYYY-MM-DD");
			err.code = "VALIDATION";
			throw err;
		}
		y = parseInt(match[1], 10);
		m = parseInt(match[2], 10);
		d = parseInt(match[3], 10);
	}
	// Corregir año con "0" extra (ej. 20260 -> 2026) cuando viene de BD o serialización
	if (y > 9999 && y < 30000 && y % 10 === 0) {
		y = Math.floor(y / 10);
	}
	if (y < 1000 || y > 9999) {
		const err = new Error("Año de fecha inválido (debe estar entre 1000 y 9999)");
		err.code = "VALIDATION";
		throw err;
	}
	if (m < 1 || m > 12 || d < 1 || d > 31) {
		const err = new Error("Fecha inválida");
		err.code = "VALIDATION";
		throw err;
	}
	const ms = String(m).padStart(2, "0");
	const ds = String(d).padStart(2, "0");
	return `${y}-${ms}-${ds}`;
}

module.exports = { normalizeFechaForDb };
