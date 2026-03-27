/** Cuenta bloques de 20 min previstos (misma lógica que backend). */

function parseYmd(ymd: string) {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd).trim());
	if (!m) return null;
	return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
}

function ymdFromDate(d: Date) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function eachCalendarDay(fechaDesde: string, fechaHasta: string): string[] {
	const a = parseYmd(fechaDesde);
	const b = parseYmd(fechaHasta);
	if (!a || !b) return [];
	const start = new Date(a.y, a.mo - 1, a.d);
	const end = new Date(b.y, b.mo - 1, b.d);
	if (start > end) return [];
	const out: string[] = [];
	for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
		out.push(ymdFromDate(cur));
	}
	return out;
}

function parseTimeToMinutes(timeStr: string): number {
	const parts = String(timeStr).split(":");
	const h = Number(parts[0]);
	const m = Number(parts[1] ?? 0);
	if (Number.isNaN(h) || Number.isNaN(m)) return 0;
	return h * 60 + m;
}

export function countBloquesPrevistosMacro(
	fechaDesde: string,
	fechaHasta: string,
	horaInicio: string,
	horaFin: string,
): number {
	const days = eachCalendarDay(fechaDesde, fechaHasta).length;
	const start = parseTimeToMinutes(horaInicio);
	const end = parseTimeToMinutes(horaFin);
	if (end <= start) return 0;
	const span = end - start;
	if (span % 20 !== 0) return 0;
	return days * (span / 20);
}

export function duracionHorasMacro(horaInicio: string, horaFin: string): number {
	const start = parseTimeToMinutes(horaInicio);
	const end = parseTimeToMinutes(horaFin);
	if (end <= start) return 0;
	return (end - start) / 60;
}
