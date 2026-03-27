/**
 * Iteración de días y slots de 20 min para solicitudes macro (evita TZ: usa enteros Y/M/D).
 */

const SLOT_MINUTES = 20;

/** @param {string} ymd "YYYY-MM-DD" */
function parseYmd(ymd) {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd).trim());
	if (!m) return null;
	const y = Number(m[1]);
	const mo = Number(m[2]);
	const d = Number(m[3]);
	if (y < 1000 || y > 9999) return null;
	return { y, mo, d };
}

/** @returns {string} YYYY-MM-DD */
function ymdFromDate(d) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Lista cada día calendario entre fecha_desde y fecha_hasta (inclusive).
 * @param {string} fechaDesde YYYY-MM-DD
 * @param {string} fechaHasta YYYY-MM-DD
 * @returns {string[]}
 */
function eachCalendarDay(fechaDesde, fechaHasta) {
	const a = parseYmd(fechaDesde);
	const b = parseYmd(fechaHasta);
	if (!a || !b) return [];
	const start = new Date(a.y, a.mo - 1, a.d);
	const end = new Date(b.y, b.mo - 1, b.d);
	if (start > end) return [];
	const out = [];
	for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
		out.push(ymdFromDate(cur));
	}
	return out;
}

function parseTimeToMinutes(timeStr) {
	const s = String(timeStr || "").trim();
	const parts = s.split(":");
	const h = Number(parts[0]);
	const m = Number(parts[1] ?? 0);
	const sec = Number(parts[2] ?? 0);
	if (Number.isNaN(h) || Number.isNaN(m)) return null;
	return h * 60 + m + Math.floor(sec / 60);
}

function minutesToTime(totalMinutes) {
	const h = Math.floor(totalMinutes / 60);
	const m = totalMinutes % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/**
 * Genera pares [hora_inicio, hora_fin] de SLOT_MINUTES min dentro del rango diario.
 * @param {string} horaInicio "HH:MM:SS"
 * @param {string} horaFin "HH:MM:SS"
 * @returns {Array<{ hora_inicio: string; hora_fin: string }>}
 */
function slots20EnRangoDiario(horaInicio, horaFin) {
	const start = parseTimeToMinutes(horaInicio);
	const end = parseTimeToMinutes(horaFin);
	if (start === null || end === null || end <= start) return [];
	const slots = [];
	for (let m = start; m + SLOT_MINUTES <= end; m += SLOT_MINUTES) {
		slots.push({
			hora_inicio: minutesToTime(m),
			hora_fin: minutesToTime(m + SLOT_MINUTES),
		});
	}
	return slots;
}

/**
 * Valida rango horario para macro: 06:00–20:00, duración múltiplo de 20 min, fin > inicio.
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
function validateMacroHoraRange(hora_inicio, hora_fin) {
	const start = parseTimeToMinutes(hora_inicio);
	const end = parseTimeToMinutes(hora_fin);
	if (start === null || end === null) {
		return { ok: false, message: "Hora inválida" };
	}
	if (end <= start) {
		return { ok: false, message: "hora_fin debe ser mayor que hora_inicio" };
	}
	if ((end - start) % SLOT_MINUTES !== 0) {
		return {
			ok: false,
			message: `El rango horario debe ser múltiplo de ${SLOT_MINUTES} minutos`,
		};
	}
	const MIN_DIA = 6 * 60;
	const MAX_FIN = 20 * 60;
	if (start < MIN_DIA || end > MAX_FIN) {
		return {
			ok: false,
			message: "Horario fuera del rango permitido (06:00-20:00)",
		};
	}
	return { ok: true };
}

module.exports = {
	SLOT_MINUTES,
	eachCalendarDay,
	parseTimeToMinutes,
	minutesToTime,
	slots20EnRangoDiario,
	validateMacroHoraRange,
};
