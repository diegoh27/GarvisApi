import type { DisponibilidadPendiente } from "../../features/disponibilidad/disponibilidadApi";

type MonthCalendarProps = {
	currentMonth: Date;
	selectedDate: string | null;
	disponibilidades: DisponibilidadPendiente[];
	onDateClick: (dateKey: string) => void;
	onMonthChange: (newMonth: Date) => void;
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

	// Primer día del mes
	const firstDay = new Date(year, month, 1);
	// Último día del mes
	const lastDay = new Date(year, month + 1, 0);
	// Día de la semana del primer día (0 = domingo, 1 = lunes, etc.)
	const startDayOfWeek = firstDay.getDay();
	// Ajustar para que la semana empiece en lunes (0 = lunes, 6 = domingo)
	const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
	// Total de días en el mes
	const daysInMonth = lastDay.getDate();

	// Crear mapa de disponibilidades por fecha
	const disponibilidadesMap = new Map<string, DisponibilidadPendiente[]>();
	disponibilidades.forEach((disp) => {
		const dateKey = disp.fecha;
		if (!disponibilidadesMap.has(dateKey)) {
			disponibilidadesMap.set(dateKey, []);
		}
		disponibilidadesMap.get(dateKey)!.push(disp);
	});

	// Generar días del mes
	const days: Array<{
		day: number;
		dateKey: string;
		isCurrentMonth: boolean;
	}> = [];

	// Días del mes anterior (para completar la primera semana)
	for (let i = adjustedStartDay - 1; i >= 0; i--) {
		const prevMonth = new Date(year, month, -i);
		days.push({
			day: prevMonth.getDate(),
			dateKey: prevMonth.toISOString().slice(0, 10),
			isCurrentMonth: false,
		});
	}

	// Días del mes actual
	for (let day = 1; day <= daysInMonth; day++) {
		const date = new Date(year, month, day);
		days.push({
			day,
			dateKey: date.toISOString().slice(0, 10),
			isCurrentMonth: true,
		});
	}

	// Días del mes siguiente (para completar la última semana)
	const remainingDays = 42 - days.length; // 6 semanas * 7 días = 42
	for (let day = 1; day <= remainingDays; day++) {
		const nextMonth = new Date(year, month + 1, day);
		days.push({
			day: nextMonth.getDate(),
			dateKey: nextMonth.toISOString().slice(0, 10),
			isCurrentMonth: false,
		});
	}

	const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

	const getDateStatus = (dateKey: string) => {
		const today = new Date().toISOString().slice(0, 10);
		const isToday = dateKey === today;
		const isSelected = dateKey === selectedDate;
		const isPast = dateKey < today;
		const disp = disponibilidadesMap.get(dateKey) || [];
		
		// Contar por estado
		const pendientes = disp.filter((d) => d.estado === 0).length;
		const aprobadas = disp.filter((d) => d.estado === 1).length;
		const rechazadas = disp.filter((d) => d.estado === 2).length;
		const citas = disp.filter((d) => d.estado === 4).length;
		// Para citas pendientes de pago, necesitamos verificar estado_pago, pero DisponibilidadPendiente no lo tiene
		// Por ahora solo contamos las que son citas (estado 4)
		const citasPendientesPago = 0; // Se calculará cuando tengamos las citas

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
		const newMonth = new Date(year, month - 1, 1);
		onMonthChange(newMonth);
	};

	const goToNextMonth = () => {
		const newMonth = new Date(year, month + 1, 1);
		onMonthChange(newMonth);
	};

	const monthNames = [
		"Enero",
		"Febrero",
		"Marzo",
		"Abril",
		"Mayo",
		"Junio",
		"Julio",
		"Agosto",
		"Septiembre",
		"Octubre",
		"Noviembre",
		"Diciembre",
	];

	return (
		<div className="mt-4 overflow-x-auto rounded-2xl border border-mist bg-paper">
			{/* Header del calendario */}
			<div className="flex items-center justify-between border-b border-mist p-3 sm:p-4">
				<button
					onClick={goToPreviousMonth}
					className="rounded-lg p-2 hover:bg-brand-50"
					type="button"
				>
					<svg
						className="h-5 w-5 text-brand-700"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M15 19l-7-7 7-7"
						/>
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
					<svg
						className="h-5 w-5 text-brand-700"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</button>
			</div>

			{/* Días de la semana */}
			<div className="grid min-w-[560px] grid-cols-7 border-b border-mist text-xs text-brand-800">
				{weekDays.map((day) => (
					<div key={day} className="border-l border-mist p-2 sm:p-3 font-semibold first:border-l-0">
						{day}
					</div>
				))}
			</div>

			{/* Grid de días */}
			<div className="grid min-w-[560px] grid-cols-7 text-xs">
				{days.map(({ day, dateKey, isCurrentMonth }) => {
					const status = getDateStatus(dateKey);
					return (
						<div
							key={dateKey}
							className={`border-b border-l border-mist p-2 transition-colors first:border-l-0 ${
								!isCurrentMonth ? "bg-cloud/30 text-brand-400" : ""
							} ${status.isPast && isCurrentMonth ? "bg-cloud/60" : ""} ${
								status.isSelected && isCurrentMonth
									? "bg-brand-200 border-brand-500 border-2"
									: isCurrentMonth
										? "cursor-pointer hover:bg-brand-50"
										: ""
							}`}
							onClick={() => isCurrentMonth && onDateClick(dateKey)}
						>
							<div className="flex items-center justify-between">
								<span
									className={`font-semibold ${
										status.isToday ? "rounded-full bg-brand-700 px-2 py-0.5 text-paper" : ""
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
