import { useState, useMemo } from "react";
import { PageShell } from "../../../shared";
import MonthCalendar from "../../../components/calendario/MonthCalendar";
import { useGetDisponibilidadesByFechaQuery } from "../moderadoresApi";
import { useGetCitasByFechaQuery } from "../moderadoresApi";
import DiaItemsList from "../components/DiaItemsList";

const CalendarioModeradorPage = () => {
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [selectedDate, setSelectedDate] = useState<string | null>(null);

	// Obtener disponibilidades y citas del día seleccionado
	const { data: disponibilidades = [], isLoading: loadingDisp } =
		useGetDisponibilidadesByFechaQuery(selectedDate || "", {
			skip: !selectedDate,
		});
	const { data: citas = [], isLoading: loadingCitas } = useGetCitasByFechaQuery(
		selectedDate || "",
		{
			skip: !selectedDate,
		}
	);

	// Para el calendario, necesitamos obtener todas las disponibilidades del mes
	// Por ahora, usamos un array vacío y solo mostramos cuando se selecciona un día
	// TODO: Crear endpoint que devuelva todas las disponibilidades de un rango de fechas
	const disponibilidadesParaCalendario = useMemo(() => {
		// Por ahora retornamos array vacío - el calendario mostrará los días sin indicadores
		// Cuando se seleccione un día, se cargarán los datos
		return [];
	}, []);

	const handleDateClick = (dateKey: string) => {
		setSelectedDate(dateKey);
	};

	const handleMonthChange = (newMonth: Date) => {
		setCurrentMonth(newMonth);
		setSelectedDate(null); // Limpiar selección al cambiar de mes
	};

	return (
		<PageShell title="Calendario" subtitle="Vista mensual y gestión de disponibilidades y citas">
			<div className="grid gap-6 lg:grid-cols-[1fr_400px]">
				{/* Calendario mensual */}
				<div className="min-w-0">
					<MonthCalendar
						currentMonth={currentMonth}
						selectedDate={selectedDate}
						disponibilidades={disponibilidadesParaCalendario}
						onDateClick={handleDateClick}
						onMonthChange={handleMonthChange}
					/>
				</div>

				{/* Panel derecho con items del día */}
				<div className="min-w-0">
					{selectedDate ? (
						<DiaItemsList
							fecha={selectedDate}
							disponibilidades={disponibilidades}
							citas={citas}
							loading={loadingDisp || loadingCitas}
						/>
					) : (
						<div className="rounded-2xl bg-paper p-4 shadow-sm">
							<p className="text-sm text-brand-800">
								Selecciona un día en el calendario para ver las disponibilidades y citas.
							</p>
						</div>
					)}
				</div>
			</div>
		</PageShell>
	);
};

export default CalendarioModeradorPage;
