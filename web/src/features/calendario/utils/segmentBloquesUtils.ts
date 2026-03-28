import type { Disponibilidad } from "../types";
import { parseTimeToMinutes } from "./slotUtils";

export function normalizeHoraDb(t: string): string {
	if (!t) return "00:00:00";
	const s = t.trim();
	if (s.length >= 8) return s.slice(0, 8);
	const [h, m = "0"] = s.split(":");
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

export function fechaKeyDisponibilidad(fecha: string | Date): string {
	if (!fecha) return "";
	if (fecha instanceof Date) return fecha.toISOString().slice(0, 10);
	const s = String(fecha);
	return s.includes("T") ? s.split("T")[0]! : s.slice(0, 10);
}

/**
 * Bloques reales de la API que intersectan el tramo horario del día (para cancelar/recrear sin perder ecos).
 */
export function bloquesDisponibilidadEnSegmento(
	lista: Disponibilidad[],
	dayKey: string,
	horaInicioSeg: string,
	horaFinSeg: string,
	estados?: number[],
): Disponibilidad[] {
	const hi = parseTimeToMinutes(normalizeHoraDb(horaInicioSeg));
	const hf = parseTimeToMinutes(normalizeHoraDb(horaFinSeg));
	return lista.filter((b) => {
		const fk = fechaKeyDisponibilidad(b.fecha);
		if (fk !== dayKey) return false;
		const e = Number(b.estado);
		if (estados && !estados.includes(e)) return false;
		const bs = parseTimeToMinutes(normalizeHoraDb(b.hora_inicio));
		const be = parseTimeToMinutes(normalizeHoraDb(b.hora_fin));
		return bs < hf && be > hi;
	});
}
