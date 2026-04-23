type SummaryItem = {
	label: string;
	value: string;
};

type DaySummaryCardProps = {
	dateLabel: string;
	items: SummaryItem[];
	/** Si se pasa, reemplaza el título por defecto "Resumen del día" */
	title?: string;
};

const DaySummaryCard = ({ dateLabel, items, title }: DaySummaryCardProps) => {
	return (
		<div className="flex h-full min-h-0 flex-col rounded-2xl bg-paper p-5 shadow-sm">
			<div className="flex items-center justify-between">
				<h3 className="text-base font-semibold text-brand-900">
					{title ?? "Resumen del día"}
				</h3>
				{title == null && (
					<span className="text-[11px] font-semibold text-brand-800">
						{dateLabel}
					</span>
				)}
			</div>
			<div className="mt-4 grid gap-3 sm:grid-cols-2">
				{items.map((item) => (
					<div
						key={item.label}
						className="rounded-xl border border-mist bg-cloud px-3 py-3"
					>
						<p className="text-sm text-brand-800">{item.label}</p>
						<p className="text-lg font-semibold text-brand-900">{item.value}</p>
					</div>
				))}
			</div>
		</div>
	);
};

export default DaySummaryCard;
