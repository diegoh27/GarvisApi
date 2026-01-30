/**
 * Utilidades de fecha para el dashboard (resumen del día, próximas citas, etc.).
 */

export const getTodayKey = (): string => {
	const today = new Date();
	return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

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

export const formatHora = (value: string): string => {
	const [hourStr, minute] = value.split(":");
	const hour = Number(hourStr);
	const period = hour >= 12 ? "PM" : "AM";
	const hour12 = hour % 12 || 12;
	return `${hour12}:${minute} ${period}`;
};

export const formatDateLabel = (value: string | Date): string =>
	new Date(`${toDateKey(value)}T00:00:00`).toLocaleDateString("es-ES", {
		day: "2-digit",
		month: "short",
	});

export const buildDateTime = (fechaCita: string, horaCita: string): Date =>
	new Date(`${toDateKey(fechaCita)}T${horaCita}`);
