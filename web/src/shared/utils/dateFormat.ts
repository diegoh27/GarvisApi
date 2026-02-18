/**
 * Utilidades centralizadas de formato de fechas.
 * Siempre normalizamos a YYYY-MM-DD y parseamos como fecha local para evitar
 * desfases por UTC y años incorrectos (ej. 20260).
 */

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Normaliza un valor a clave YYYY-MM-DD (solo los primeros 10 caracteres válidos).
 */
export function toDateKey(value: string | Date | null | undefined): string {
	if (value == null) return "";
	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) return "";
		let y = value.getFullYear();
		if (y > 9999 && y < 30000 && y % 10 === 0) y = Math.floor(y / 10); // 20260 -> 2026
		if (y < 1000 || y > 9999) return "";
		const m = String(value.getMonth() + 1).padStart(2, "0");
		const d = String(value.getDate()).padStart(2, "0");
		return `${y}-${m}-${d}`;
	}
	const s = String(value).trim();
	const part = s.includes("T") ? s.split("T")[0] : s;
	// Corregir año con "0" extra (ej. 20260-02-18) en la tabla de listado
	const fixed = part.replace(/^20260-(\d{2})-(\d{2})/, "2026-$1-$2");
	const key = (fixed.slice(0, 10).match(/^\d{4}-\d{2}-\d{2}$/) ? fixed : part).slice(0, 10);
	return key;
}

/**
 * Parsea una cadena YYYY-MM-DD como fecha local (mediodía) para evitar desfase UTC.
 */
function parseDateKeyLocal(dateKey: string): Date | null {
	const match = dateKey.match(DATE_ONLY_REGEX);
	if (!match) return null;
	const [, y, m, d] = match;
	const year = parseInt(y!, 10);
	if (year < 1000 || year > 9999) return null; // evita años erróneos (ej. 20260)
	const month = parseInt(m!, 10) - 1;
	const day = parseInt(d!, 10);
	if (month < 0 || month > 11 || day < 1 || day > 31) return null;
	const date = new Date(year, month, day);
	if (Number.isNaN(date.getTime())) return null;
	return date;
}

/**
 * Formatea una fecha para mostrar (DD/MM/YYYY).
 * Usa solo la parte de fecha y parseo local para evitar 20260, UTC shift, etc.
 */
export function formatFechaLocal(
	value: string | Date | null | undefined,
	locale: string = "es-VE",
): string {
	const key = toDateKey(value);
	if (!key || key.length < 10) return "—";
	const date = parseDateKeyLocal(key);
	if (!date) return "—";
	return date.toLocaleDateString(locale, {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

/**
 * Formatea fecha de cita para la tabla "Mis citas" y dashboard.
 * Corrige 20260 -> 2026 en cualquier formato y usa fecha de calendario (UTC) para Date.
 */
export function formatFechaCitaTabla(
	value: string | Date | null | undefined,
	locale: string = "es-VE",
): string {
	if (value == null) return "—";
	let safe: string;
	if (typeof value === "string") {
		safe = value.replace(/20260-(\d{2})-(\d{2})/, "2026-$1-$2").replace(/20260/g, "2026");
	} else if (value instanceof Date) {
		let y = value.getUTCFullYear();
		const m = value.getUTCMonth() + 1;
		const d = value.getUTCDate();
		if (y === 20260 || (y > 9999 && y < 30000 && y % 10 === 0)) y = 2026;
		safe = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
	} else {
		safe = String(value).replace(/20260/g, "2026");
	}
	// Si llegó en formato DD/MM/YYYY (ej. de otra API o caché), convertir a YYYY-MM-DD para formatFechaLocal
	const dmy = safe.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
	if (dmy) {
		const [, day, month, year] = dmy;
		safe = `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`;
	}
	return formatFechaLocal(safe);
}

/**
 * Formatea fecha y hora (DD/MM/YYYY, HH:MM) en hora local.
 * Si el valor es solo fecha (YYYY-MM-DD), se interpreta como fecha local para evitar desfase UTC.
 */
export function formatFechaHoraLocal(
	value: string | Date | null | undefined,
	locale: string = "es-VE",
): string {
	if (value == null) return "—";
	const raw = String(value).trim();
	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) return "—";
		return value.toLocaleString(locale, {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	}
	// Solo fecha YYYY-MM-DD: parsear como local para no restar un día en UTC-
	const key = raw.slice(0, 10);
	if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
		const date = parseDateKeyLocal(toDateKey(raw));
		if (!date) return "—";
		const hasTime = raw.length > 10 && raw[10] === "T";
		const [h = 0, m = 0] = hasTime ? raw.slice(11, 16).split(":").map(Number) : [];
		date.setHours(h, m, 0, 0);
		return date.toLocaleString(locale, {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	}
	const d = new Date(raw);
	if (Number.isNaN(d.getTime())) return "—";
	return d.toLocaleString(locale, {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

/**
 * Formato corto (ej. "17 feb 2026") en hora local, sin desfase UTC.
 */
export function formatFechaCortaLocal(
	value: string | Date | null | undefined,
	locale: string = "es-VE",
): string {
	const key = toDateKey(value);
	if (!key || key.length < 10) return "—";
	const date = parseDateKeyLocal(key);
	if (!date) return "—";
	return date.toLocaleDateString(locale, {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

/**
 * Formatea fecha con nombre del día (ej. "lunes, 17/02/2026").
 */
export function formatFechaConDia(
	value: string | Date | null | undefined,
	locale: string = "es-VE",
): string {
	const key = toDateKey(value);
	if (!key || key.length < 10) return "—";
	const date = parseDateKeyLocal(key);
	if (!date) return "—";
	return date.toLocaleDateString(locale, {
		weekday: "long",
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

/**
 * Formato "weekday, day month" (sin año) para dashboard / próxima cita.
 * Parsea la fecha como local para evitar "hoy como ayer" en UTC-.
 */
export function formatFechaConDiaSinAnio(
	value: string | Date | null | undefined,
	locale: string = "es-VE",
): string {
	const key = toDateKey(value);
	if (!key || key.length < 10) return "—";
	const date = parseDateKeyLocal(key);
	if (!date) return "—";
	return date.toLocaleDateString(locale, {
		weekday: "long",
		day: "numeric",
		month: "long",
	});
}
