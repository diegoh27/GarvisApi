import type { Obligacion } from "../../inventario/api/entesLegalesApi";
import type { AlquilerContrato } from "../../inventario/api/alquilerApi";
import type { Empleado } from "../../inventario/api/nominaApi";
import type { EspecialistaComision } from "../../inventario/api/comisionesApi";

/** Días antes del vencimiento para mostrar alerta amarilla */
export const FIN_ALERT_DAYS_BEFORE = 3;

/** Días sin pagar comisión para considerarla “vencida” (alerta roja) */
const COMISIONES_DIAS_VENCIDA = 14;

export type FinanceAlertSeverity = "overdue" | "due_soon";

export type FinanceAlertTab = "alquiler" | "entes" | "nomina" | "comisiones";

export type FinanceAlert = {
	id: string;
	severity: FinanceAlertSeverity;
	message: string;
	tab: FinanceAlertTab;
};

const toDateOnly = (value: string | Date | null | undefined): Date | null => {
	if (value == null || value === "") return null;
	const d = typeof value === "string" ? new Date(value) : new Date(value);
	if (Number.isNaN(d.getTime())) return null;
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const startOfToday = (): Date => {
	const n = new Date();
	return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

/** Días calendario hasta la fecha (negativo si ya pasó) */
const calendarDaysUntil = (due: Date, today: Date): number =>
	Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

const fmt = (d: Date) =>
	d.toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" });

type BuildInput = {
	contratos: AlquilerContrato[];
	obligaciones: Obligacion[];
	empleados: Empleado[];
	comisionesPendientes: EspecialistaComision[];
};

/**
 * Alertas según vencimientos: rojo = vencido, amarillo = vence en ≤ FIN_ALERT_DAYS_BEFORE días.
 * Comisiones sin fecha de vencimiento: amarillo si hay pendientes; rojo si la más antigua supera COMISIONES_DIAS_VENCIDA.
 */
export function buildFinanceAlerts({
	contratos,
	obligaciones,
	empleados,
	comisionesPendientes,
}: BuildInput): FinanceAlert[] {
	const today = startOfToday();
	const alerts: FinanceAlert[] = [];

	for (const c of contratos) {
		if (c.estado === "Pagado") continue;
		const due = toDateOnly(c.fecha_vencimiento);
		const label = c.nombre?.trim() || "Alquiler";
		if (c.estado === "Vencido" || (due && due < today)) {
			alerts.push({
				id: `alq-${c.id_contrato}-v`,
				severity: "overdue",
				message: `${label} vencido`,
				tab: "alquiler",
			});
			continue;
		}
		if (c.estado === "Pendiente" && due) {
			const days = calendarDaysUntil(due, today);
			if (days >= 0 && days <= FIN_ALERT_DAYS_BEFORE) {
				alerts.push({
					id: `alq-${c.id_contrato}-w`,
					severity: "due_soon",
					message: `Debe pagar alquiler (${label}) — vence el ${fmt(due)}`,
					tab: "alquiler",
				});
			}
		}
	}

	for (const o of obligaciones) {
		if (o.estado === "Pagado") continue;
		const concepto = (o.concepto || "Obligación").trim();
		const due = toDateOnly(o.fecha_vencimiento);
		if (o.estado === "Vencido" || (due && due < today)) {
			alerts.push({
				id: `obl-${o.id_obligacion}-v`,
				severity: "overdue",
				message: `${concepto} vencido`,
				tab: "entes",
			});
			continue;
		}
		if (o.estado === "Pendiente" && due) {
			const days = calendarDaysUntil(due, today);
			if (days >= 0 && days <= FIN_ALERT_DAYS_BEFORE) {
				alerts.push({
					id: `obl-${o.id_obligacion}-w`,
					severity: "due_soon",
					message: `Debe pagar ${concepto} — vence el ${fmt(due)}`,
					tab: "entes",
				});
			}
		}
	}

	for (const e of empleados) {
		if (e.estado !== "Activo") continue;
		if (e.estatus_pago === "Pagada" && e.estatus_pago_manual !== "Pendiente") continue;

		const nombre = [e.nombre, e.apellido].filter(Boolean).join(" ").trim() || "Empleado";
		const fechaRaw = e.proximo_pago_manual ?? e.proximo_pago;
		const due = toDateOnly(fechaRaw ?? undefined);
		const esperaPago =
			e.estatus_pago === "Pendiente" ||
			e.estatus_pago_manual === "Pendiente" ||
			e.estatus_pago === "Vencido";

		if (e.estatus_pago === "Vencido") {
			alerts.push({
				id: `nom-${e.id_empleado}-v`,
				severity: "overdue",
				message: `Nómina vencida: ${nombre}`,
				tab: "nomina",
			});
			continue;
		}
		if (esperaPago && due && due < today) {
			alerts.push({
				id: `nom-${e.id_empleado}-late`,
				severity: "overdue",
				message: `Nómina vencida: ${nombre}`,
				tab: "nomina",
			});
			continue;
		}
		if (esperaPago && due) {
			const days = calendarDaysUntil(due, today);
			if (days >= 0 && days <= FIN_ALERT_DAYS_BEFORE) {
				alerts.push({
					id: `nom-${e.id_empleado}-w`,
					severity: "due_soon",
					message: `Debe pagar nómina (${nombre}) — vence el ${fmt(due)}`,
					tab: "nomina",
				});
			}
		}
	}

	if (comisionesPendientes.length > 0) {
		let oldest: Date | null = null;
		for (const c of comisionesPendientes) {
			const d = toDateOnly(c.fecha_creacion);
			if (d && (!oldest || d < oldest)) oldest = d;
		}
		const daysSinceOldest = oldest
			? Math.round((today.getTime() - oldest.getTime()) / (24 * 60 * 60 * 1000))
			: 0;
		const stale = oldest != null && daysSinceOldest >= COMISIONES_DIAS_VENCIDA;

		if (stale) {
			alerts.push({
				id: "com-v",
				severity: "overdue",
				message: `Comisiones a especialistas pendientes (${comisionesPendientes.length}) — revisar pagos atrasados`,
				tab: "comisiones",
			});
		} else {
			alerts.push({
				id: "com-w",
				severity: "due_soon",
				message: `Debe pagar comisiones a especialistas (${comisionesPendientes.length} pendientes)`,
				tab: "comisiones",
			});
		}
	}

	const order = (a: FinanceAlert, b: FinanceAlert) => {
		if (a.severity !== b.severity) return a.severity === "overdue" ? -1 : 1;
		return a.message.localeCompare(b.message, "es");
	};

	return [...alerts].sort(order);
}
