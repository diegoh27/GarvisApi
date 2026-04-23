/**
 * Card compacta para mostrar una cita. Reutilizable en dashboard (especialista),
 * Todas las citas (moderador) y futuras vistas.
 */
export type CitaCardItem = {
	id_cita: string;
	patientName: string;
	ecoNombre: string;
	dateLabel: string;
	timeLabel: string;
	/** Ej: "Pago pendiente", "Sin resultado", "Confirmada" */
	badge?: string;
	badgeVariant?: "warning" | "success" | "info" | "neutral";
};

type CitaCardProps = {
	item: CitaCardItem;
	onClick?: (id_cita: string) => void;
	/** Si true, la card es más compacta (dashboard). Si false, más espaciada (listados). */
	compact?: boolean;
};

const badgeClasses: Record<NonNullable<CitaCardItem["badgeVariant"]>, string> = {
	warning: "bg-amber-400 text-brand-900",
	success: "bg-emerald-500 text-paper",
	info: "bg-blue-500 text-paper",
	neutral: "bg-cloud text-brand-800",
};

const CitaCard = ({ item, onClick, compact = true }: CitaCardProps) => {
	const baseClass =
		"rounded-xl border border-brand-200 bg-paper text-left transition-colors";
	const interactiveClass = onClick ? "cursor-pointer hover:bg-brand-50 hover:border-brand-300" : "";
	const paddingClass = compact ? "p-3" : "p-4";

	return (
		<div
			role={onClick ? "button" : undefined}
			onClick={onClick ? () => onClick(item.id_cita) : undefined}
			className={`${baseClass} ${interactiveClass} ${paddingClass}`}
		>
			<div className="flex flex-wrap items-center gap-2">
				<span className="text-base font-semibold text-brand-900">
					{item.patientName}
				</span>
				<span className="rounded-full bg-brand-700 px-2 py-0.5 text-sm font-medium text-paper">
					{item.ecoNombre}
				</span>
				{item.badge && (
					<span
						className={`rounded-full px-2 py-0.5 text-sm font-medium ${
							item.badgeVariant ? badgeClasses[item.badgeVariant] : badgeClasses.neutral
						}`}
					>
						{item.badge}
					</span>
				)}
			</div>
			<p className="mt-1 text-sm text-brand-600">
				{item.dateLabel} · {item.timeLabel}
			</p>
		</div>
	);
};

export default CitaCard;
