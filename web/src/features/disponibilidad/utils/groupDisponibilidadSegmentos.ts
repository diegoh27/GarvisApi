import type { DisponibilidadPendiente } from "../disponibilidadApi";
import { toDateKey } from "./dateUtils";

/** Varias filas de `disponibilidad` consecutivas se muestran como una sola “jornada” en UI. */
export type DisponibilidadSegmento = {
	ids: string[];
	id_especialista: string;
	fecha: string;
	hora_inicio: string;
	hora_fin: string;
	id_eco: string | null;
	eco_nombre: string | null;
	estado: number;
	nombre: string;
	apellido: string;
	especialidad: string;
};

/**
 * Agrupa bloques adyacentes (hora_fin === siguiente.hora_inicio) con mismo
 * especialista, fecha, eco y estado. Así una mañana de slots de 20 min se ve como un rango único.
 */
export function groupDisponibilidadSegmentos(
	rows: DisponibilidadPendiente[],
): DisponibilidadSegmento[] {
	if (!rows.length) return [];

	const sorted = [...rows].sort((a, b) => {
		const da = toDateKey(a.fecha);
		const db = toDateKey(b.fecha);
		if (da !== db) return da.localeCompare(db);
		if (a.id_especialista !== b.id_especialista) {
			return a.id_especialista.localeCompare(b.id_especialista);
		}
		const ecoA = a.id_eco ?? "";
		const ecoB = b.id_eco ?? "";
		if (ecoA !== ecoB) return ecoA.localeCompare(ecoB);
		if (a.estado !== b.estado) return a.estado - b.estado;
		return a.hora_inicio.localeCompare(b.hora_inicio);
	});

	const out: DisponibilidadSegmento[] = [];
	let chunk: DisponibilidadPendiente[] = [];

	const flush = () => {
		if (chunk.length === 0) return;
		const first = chunk[0]!;
		const last = chunk[chunk.length - 1]!;
		out.push({
			ids: chunk.map((r) => r.id_disponibilidad),
			id_especialista: first.id_especialista,
			fecha: toDateKey(first.fecha),
			hora_inicio: first.hora_inicio,
			hora_fin: last.hora_fin,
			id_eco: first.id_eco ?? null,
			eco_nombre: first.eco_nombre ?? null,
			estado: first.estado,
			nombre: first.nombre,
			apellido: first.apellido,
			especialidad: first.especialidad,
		});
		chunk = [];
	};

	for (const row of sorted) {
		if (chunk.length === 0) {
			chunk.push(row);
			continue;
		}
		const prev = chunk[chunk.length - 1]!;
		const mismoGrupo =
			prev.id_especialista === row.id_especialista &&
			toDateKey(prev.fecha) === toDateKey(row.fecha) &&
			(prev.id_eco ?? "") === (row.id_eco ?? "") &&
			prev.estado === row.estado;
		const contiguo = prev.hora_fin === row.hora_inicio;
		if (mismoGrupo && contiguo) {
			chunk.push(row);
		} else {
			flush();
			chunk.push(row);
		}
	}
	flush();
	return out;
}

/** Duración en horas entre dos horas HH:MM:SS del mismo día. */
export function duracionHorasSegmento(horaInicio: string, horaFin: string): number {
	const toMin = (t: string) => {
		const p = t.split(":").map((x) => parseInt(x, 10));
		const h = p[0] ?? 0;
		const m = p[1] ?? 0;
		return h * 60 + m;
	};
	const a = toMin(horaInicio);
	const b = toMin(horaFin);
	return Math.max(0, (b - a) / 60);
}
