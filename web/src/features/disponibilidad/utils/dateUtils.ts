/**
 * Utilidades de fecha para disponibilidad (formato, orden, rango).
 */

export const toDateKey = (value: string | Date): string => {
	if (value instanceof Date) {
		const d = value;
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
	}
	if (typeof value === "string" && value.length >= 10) {
		return value.includes("T") ? value.split("T")[0] : value.slice(0, 10);
	}
	return String(value).slice(0, 10);
};

export const formatFecha = (value: string): string => {
	if (!value) return "";
	const dateKey = toDateKey(value);
	const date = new Date(`${dateKey}T00:00:00`);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString("es-VE", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		weekday: "long",
	});
};

export const formatHora = (value: string): string => {
	if (!value) return "";
	const [hourStr, minuteStr = "00"] = value.split(":");
	const hour = Number(hourStr);
	if (Number.isNaN(hour)) return value;
	const period = hour >= 12 ? "PM" : "AM";
	const hour12 = hour % 12 === 0 ? 12 : hour % 12;
	return `${hour12}:${minuteStr} ${period}`;
};

/** Formato corto para mostrar en cards de filtro (ej: "28 ene 2026") */
export const formatFechaCorta = (dateKey: string): string => {
	if (!dateKey || dateKey.length < 10) return "";
	const date = new Date(`${dateKey.slice(0, 10)}T00:00:00`);
	if (Number.isNaN(date.getTime())) return dateKey.slice(0, 10);
	return date.toLocaleDateString("es-VE", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
};

/** Anticipación mínima en horas para reservar/asignar una cita */
const HORAS_ANTICIPACION_MINIMA = 2;

/**
 * Indica si un slot (fecha + hora de inicio) está al menos 2 horas en el futuro.
 * Sirve para no permitir reservar o asignar citas en horarios que ya pasaron o están muy próximos.
 */
export function isSlotAtLeast2HoursFromNow(fecha: string, horaInicio: string): boolean {
	if (!fecha || !horaInicio) return false;
	const dateKey = fecha.includes("T") ? fecha.split("T")[0] : fecha.slice(0, 10);
	const [h = "0", m = "0"] = horaInicio.trim().split(":");
	const slotStart = new Date(`${dateKey}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
	if (Number.isNaN(slotStart.getTime())) return false;
	const minAllowed = new Date();
	minAllowed.setTime(minAllowed.getTime() + HORAS_ANTICIPACION_MINIMA * 60 * 60 * 1000);
	return slotStart.getTime() >= minAllowed.getTime();
}
