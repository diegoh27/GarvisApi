import { toDateKey } from "../../../shared";

/** Opciones de hora cada 20 min: 06:00 a 19:40 */
export const HORA_OPTIONS: { value: string; label: string }[] = (() => {
	const opts: { value: string; label: string }[] = [];
	for (let h = 6; h < 20; h++) {
		for (let m = 0; m < 60; m += 20) {
			const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
			const period = h >= 12 ? "PM" : "AM";
			const h12 = h % 12 === 0 ? 12 : h % 12;
			opts.push({ value, label: `${h12}:${String(m).padStart(2, "0")} ${period}` });
		}
	}
	return opts;
})();

export const METODOS_API: Array<"Efectivo" | "Transferencia" | "PagoMovil" | "Zelle" | "Otro"> = [
	"Efectivo",
	"Transferencia",
	"PagoMovil",
	"Zelle",
	"Otro",
];

/** Etiquetas UI → valor API (misma familia que el modal / backend) */
export const METODO_UI_OPTIONS: {
	label: string;
	value: "Efectivo" | "Transferencia" | "PagoMovil" | "Zelle" | "Otro";
}[] = [
	{ label: "Zelle", value: "Zelle" },
	{ label: "Pago Móvil", value: "PagoMovil" },
	{ label: "Transferencia", value: "Transferencia" },
	{ label: "Punto de venta", value: "Otro" },
	{ label: "Efectivo", value: "Efectivo" },
];

export function horaToMinutes(h: string): number {
	const parts = String(h).trim().split(":");
	const hour = parseInt(parts[0] || "0", 10);
	const min = parseInt(parts[1] || "0", 10);
	return hour * 60 + min;
}

export function slotsOverlap(a: string, b: string): boolean {
	const aMin = horaToMinutes(a);
	const bMin = horaToMinutes(b);
	return aMin < bMin + 20 && aMin + 20 > bMin;
}

export function isMorningSlot(hora: string): boolean {
	return horaToMinutes(hora) < 12 * 60;
}

export const defaultFechaCita = () => toDateKey(new Date());

/** Compara IDs (UUID CHAR u otros) de forma tolerante a espacios y mayúsculas/minúsculas. */
export function idsCoinciden(a: unknown, b: unknown): boolean {
	if (a == null || b == null) return false;
	return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}
