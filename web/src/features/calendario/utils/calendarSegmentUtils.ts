import type { Disponibilidad, TimeOption } from "../types";
import { parseTimeToMinutes } from "./slotUtils";

export const cellKey = (dateKey: string, hourValue: string) =>
	`${dateKey}|${hourValue}`;

export function canMergeBlocks(a: Disponibilidad, b: Disponibilidad): boolean {
	if (a.id_disponibilidad === b.id_disponibilidad) return true;
	if (a.estado !== b.estado) return false;
	if (a.estado === 4 || b.estado === 4) return false;
	if ((a.eco_nombre ?? "") !== (b.eco_nombre ?? "")) return false;
	return true;
}

export type MergedSegment = {
	startSlot: number;
	endSlot: number;
	bloque: Disponibilidad;
};

export function buildMergedSegments(
	dayKey: string,
	timeOptions: TimeOption[],
	bloquesMap: Map<string, Disponibilidad>,
): MergedSegment[] {
	const segments: MergedSegment[] = [];
	let i = 0;
	while (i < timeOptions.length) {
		const hv = timeOptions[i].value;
		const key = cellKey(dayKey, hv);
		const b = bloquesMap.get(key);
		if (!b) {
			i += 1;
			continue;
		}
		let j = i;
		while (j + 1 < timeOptions.length) {
			const hvNext = timeOptions[j + 1].value;
			const keyNext = cellKey(dayKey, hvNext);
			const bNext = bloquesMap.get(keyNext);
			if (!bNext) break;
			const endMin = parseTimeToMinutes(hv) + 20 * (j - i + 1);
			const startNext = parseTimeToMinutes(hvNext);
			if (endMin !== startNext) break;
			if (!canMergeBlocks(b, bNext)) break;
			j += 1;
		}
		segments.push({ startSlot: i, endSlot: j, bloque: b });
		i = j + 1;
	}
	return segments;
}
