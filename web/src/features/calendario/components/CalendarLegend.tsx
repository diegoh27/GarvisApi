type LegendItem = {
	label: string;
	colorClass: string;
};

type CalendarLegendProps = {
	items: LegendItem[];
};

const CalendarLegend = ({ items }: CalendarLegendProps) => {
	return (
		<div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-brand-800">
			{items.map((item) => (
				<div key={item.label} className="flex items-center gap-2">
					<span className={`h-2 w-2 rounded-full ${item.colorClass}`} />
					{item.label}
				</div>
			))}
		</div>
	);
};

export default CalendarLegend;
