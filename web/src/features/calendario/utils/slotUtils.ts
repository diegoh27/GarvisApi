export type SlotPreview = { fecha: string; hora_inicio: string; hora_fin: string };

export const parseTimeToMinutes = (timeStr: string): number => {
	const [h, m] = timeStr.split(":").map(Number);
	if (Number.isNaN(h) || Number.isNaN(m)) return 0;
	return h * 60 + m;
};

export const minutesToTime = (totalMinutes: number): string => {
	const h = Math.floor(totalMinutes / 60);
	const m = totalMinutes % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
};

export const generateSlots = (
	fecha: string,
	horaInicio: string,
	horaFin: string,
): SlotPreview[] => {
	const start = parseTimeToMinutes(horaInicio);
	const end = parseTimeToMinutes(horaFin);
	if (start >= end) return [];
	const slots: SlotPreview[] = [];
	for (let m = start; m < end; m += 20) {
		const hora_inicio = minutesToTime(m);
		const hora_fin = minutesToTime(m + 20);
		slots.push({ fecha, hora_inicio, hora_fin });
	}
	return slots;
};

export const generateSlotsRange = (
	fechaDesde: string,
	fechaHasta: string,
	horaInicio: string,
	horaFin: string,
): SlotPreview[] => {
	const startDate = new Date(`${fechaDesde}T00:00:00`);
	const endDate = new Date(`${fechaHasta}T00:00:00`);
	if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
		return [];
	}
	if (startDate > endDate) return [];

	const slots: SlotPreview[] = [];
	for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
		const y = d.getFullYear();
		if (y < 1000 || y > 9999) continue;
		const dateKey = `${y}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
		slots.push(...generateSlots(dateKey, horaInicio, horaFin));
	}
	return slots;
};
