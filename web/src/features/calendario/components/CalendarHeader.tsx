type CalendarHeaderProps = {
	weekRangeLabel: string;
	onPrevWeek: () => void;
	onNextWeek: () => void;
};

const CalendarHeader = ({
	weekRangeLabel,
	onPrevWeek,
	onNextWeek,
}: CalendarHeaderProps) => {
	return (
		<div className="flex flex-wrap items-center justify-between gap-3">
			<div className="flex items-center gap-2 text-xs text-brand-900">
				<button
					className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-mist text-brand-800"
					onClick={onPrevWeek}
				>
					{"<"}
				</button>
				<span className="font-semibold">{weekRangeLabel}</span>
				<button
					className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-mist text-brand-800"
					onClick={onNextWeek}
				>
					{">"}
				</button>
			</div>
			<div className="flex items-center gap-2 text-xs text-brand-800">
				<button className="rounded-full bg-brand-700 px-3 py-1 text-paper">
					Semana
				</button>
			</div>
		</div>
	);
};

export default CalendarHeader;
