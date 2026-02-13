import type { DisponibilidadPendiente } from "../../disponibilidad/disponibilidadApi";

type MonthCalendarProps = {
	currentMonth: Date;
	selectedDate: string | null;
	disponibilidades: DisponibilidadPendiente[];
	onDateClick: (dateKey: string) => void;
	onMonthChange: (newMonth: Date) => void;
};

const getLocalDateKey = (date: Date) => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

const MonthCalendar = ({
	currentMonth,
	selectedDate,
	disponibilidades,
	onDateClick,
	onMonthChange,
}: MonthCalendarProps) => {
	const year = currentMonth.getFullYear();
	const month = currentMonth.getMonth();

	const firstDay = new Date(year, month, 1);
	const lastDay = new Date(year, month + 1, 0);
	const startDayOfWeek = firstDay.getDay();
	const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
	const daysInMonth = lastDay.getDate();

	const disponibilidadesMap = new Map<string, DisponibilidadPendiente[]>();
	disponibilidades.forEach((disp) => {
		const dateKey = disp.fecha;
		if (!disponibilidadesMap.has(dateKey)) {
			disponibilidadesMap.set(dateKey, []);
		}
		disponibilidadesMap.get(dateKey)!.push(disp);
	});

	const days: Array<{
		day: number;
		dateKey: string;
		isCurrentMonth: boolean;
	}> = [];

	for (let i = adjustedStartDay - 1; i >= 0; i--) {
		const prevMonth = new Date(year, month, -i);
		days.push({
			day: prevMonth.getDate(),
			dateKey: getLocalDateKey(prevMonth),
			isCurrentMonth: false,
		});
	}

	for (let day = 1; day <= daysInMonth; day++) {
		const date = new Date(year, month, day);
		days.push({
			day,
			dateKey: getLocalDateKey(date),
			isCurrentMonth: true,
		});
	}

	const remainingDays = 42 - days.length;
	for (let day = 1; day <= remainingDays; day++) {
		const nextMonth = new Date(year, month + 1, day);
		days.push({
			day: nextMonth.getDate(),
			dateKey: getLocalDateKey(nextMonth),
			isCurrentMonth: false,
		});
	}

	const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

	const getDateStatus = (dateKey: string) => {
		const today = getLocalDateKey(new Date());
		const isToday = dateKey === today;
		const isSelected = dateKey === selectedDate;
		const isPast = dateKey < today;
		const disp = disponibilidadesMap.get(dateKey) || [];

		const pendientes = disp.filter((d) => d.estado === 0).length;
		const aprobadas = disp.filter((d) => d.estado === 1).length;
		const rechazadas = disp.filter((d) => d.estado === 2).length;
		const citas = disp.filter((d) => d.estado === 4).length;
		const citasPendientesPago = 0;

		return {
			isToday,
			isSelected,
			isPast,
			pendientes,
			aprobadas,
			rechazadas,
			citas,
			citasPendientesPago,
			total: disp.length,
		};
	};

	const goToPreviousMonth = () => {
		onMonthChange(new Date(year, month - 1, 1));
	};

	const goToNextMonth = () => {
		onMonthChange(new Date(year, month + 1, 1));
	};

	const monthNames = [
		"Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
		"Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
	];

	return (
		<div className="mt-4 overflow-x-auto rounded-2xl border border-mist bg-paper">
			<div className="flex items-center justify-between border-b border-mist p-3 sm:p-4">
				<button
					onClick={goToPreviousMonth}
					className="rounded-lg p-2 hover:bg-brand-50"
					type="button"
				>
					<svg className="h-5 w-5 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
				</button>
				<h2 className="text-lg font-semibold text-brand-900">
					{monthNames[month]} {year}
				</h2>
				<button
					onClick={goToNextMonth}
					className="rounded-lg p-2 hover:bg-brand-50"
					type="button"
				>
					<svg className="h-5 w-5 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
					</svg>
				</button>
			</div>

			<div className="grid min-w-[560px] grid-cols-7 border-b border-mist text-xs text-brand-800">
				{weekDays.map((day) => (
					<div key={day} className="border-l border-mist p-2 sm:p-3 font-semibold first:border-l-0">
						{day}
					</div>
				))}
			</div>

			<div className="grid min-w-[560px] grid-cols-7 text-xs">
				{days.map(({ day, dateKey, isCurrentMonth }) => {
					const status = getDateStatus(dateKey);
					return (
						<div
							key={dateKey}
							className={`border-b border-l border-mist p-2 transition-colors first:border-l-0 ${!isCurrentMonth ? "bg-cloud/30 text-brand-400" : ""
								} ${status.isPast && isCurrentMonth ? "bg-cloud/60" : ""} ${status.isSelected && isCurrentMonth
									? "bg-brand-200 border-brand-500 border-2"
									: isCurrentMonth
										? "cursor-pointer hover:bg-cloud/50"
										: ""
								}`}
							onClick={() => isCurrentMonth && onDateClick(dateKey)}
						>
							<div className="flex items-center justify-between">
								<span
									className={`font-semibold ${status.isToday ? "rounded-full bg-brand-700 px-2 py-0.5 text-paper" : ""
										}`}
								>
									{day}
								</span>
								{status.total > 0 && (
									<span className="rounded-full bg-brand-700 px-1.5 py-0.5 text-[10px] text-paper">
										{status.total}
									</span>
								)}
							</div>
							{status.total > 0 && (
								<div className="mt-1 flex flex-wrap gap-0.5">
									{status.pendientes > 0 && (
										<span className="h-1.5 w-1.5 rounded-full bg-accent" title="Pendientes" />
									)}
									{status.aprobadas > 0 && (
										<span className="h-1.5 w-1.5 rounded-full bg-brand-700" title="Aprobadas" />
									)}
									{status.rechazadas > 0 && (
										<span className="h-1.5 w-1.5 rounded-full bg-red-500" title="Rechazadas" />
									)}
									{status.citas > 0 && (
										<span className="h-1.5 w-1.5 rounded-full bg-sky-500" title="Citas" />
									)}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default MonthCalendar;
