import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../shared";
import { useGetMisCitasCompletasQuery, useGetTienePagoPendienteQuery } from "../../citas/citasApi";
import { useGetRepresentadosQuery } from "../../representados/representadosApi";
import type { Representado } from "../../representados/representadosApi";
import VerRepresentadoModal from "./VerRepresentadoModal";
import {
	CalendarDays,
	CalendarPlus,
	ChevronRight,
	Clock,
	HeartPulse,
	Stethoscope,
	Users,
	Info,
	PlusCircle,
	Plus,
	ArrowRight,
	AlertTriangle,
	User,
} from "lucide-react";
import { getTodayKey, toDateKey, formatHora, buildDateTime } from "../utils/dateUtils";
import { formatFechaConDiaSinAnio } from "../../../shared";

const getSaludo = () => {
	const h = new Date().getHours();
	if (h < 12) return "Buenos días";
	if (h < 19) return "Buenas tardes";
	return "Buenas noches";
};

/** Calculate age from a birthdate string (YYYY-MM-DD). */
const calcularEdad = (fechaNacimiento: string): number => {
	const hoy = new Date();
	const nac = new Date(`${fechaNacimiento.slice(0, 10)}T00:00:00`);
	let edad = hoy.getFullYear() - nac.getFullYear();
	const m = hoy.getMonth() - nac.getMonth();
	if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
	return edad;
};

/** Initials circle for representados (instead of external images). */
const InitialAvatar = ({ nombre, apellido }: { nombre: string; apellido: string }) => {
	const initials = `${(nombre?.[0] ?? "").toUpperCase()}${(apellido?.[0] ?? "").toUpperCase()}`;
	return (
		<div className="w-10 h-10 rounded-full bg-brand-200 text-brand-800 flex items-center justify-center font-bold text-sm shrink-0">
			{initials || <User className="h-4 w-4" />}
		</div>
	);
};

const DashboardPaciente = () => {
	const { user } = useAuth();
	const [selectedRepresentado, setSelectedRepresentado] = useState<Representado | null>(null);
	const { data: citas = [], isLoading: loadingCitas } = useGetMisCitasCompletasQuery();
	const { data: tienePagoData } = useGetTienePagoPendienteQuery();
	const tienePagoPendiente = tienePagoData?.tienePagoPendiente ?? false;
	const { data: representadosData } = useGetRepresentadosQuery({ page: 1, limit: 10 });
	const representados = representadosData?.data ?? [];

	const nombre = user?.nombre?.trim() || "";
	const saludo = getSaludo();
	const welcomeName = nombre || user?.apellido?.trim() || "";

	const todayKey = getTodayKey();
	const cancelada = 2;
	const atendida = 3;

	// Upcoming appointments: not cancelled, not attended, date >= today
	const proximasCitas = citas
		.filter((c) => {
			const estado = Number(c.estado_cita);
			if (estado === cancelada || estado === atendida) return false;
			return toDateKey(c.fecha_cita) >= todayKey;
		})
		.sort(
			(a, b) =>
				buildDateTime(a.fecha_cita, a.hora_cita).getTime() -
				buildDateTime(b.fecha_cita, b.hora_cita).getTime(),
		);
	const proximaCita = proximasCitas[0];

	// History: completed appointments, most recent first, max 3
	const historial = citas
		.filter((c) => Number(c.estado_cita) === atendida)
		.sort(
			(a, b) =>
				buildDateTime(b.fecha_cita, b.hora_cita).getTime() -
				buildDateTime(a.fecha_cita, a.hora_cita).getTime(),
		)
		.slice(0, 3);

	return (
		<div className="space-y-8">
			{/* Banner: pago pendiente de verificación */}
			{tienePagoPendiente && (
				<div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm">
					<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
					<div className="min-w-0 flex-1 text-sm">
						<p className="font-semibold">Tiene una cita con pago pendiente de verificación</p>
						<p className="mt-1">
							No puede agendar otra cita hasta que un moderador apruebe o rechace el pago. Puede revisar el estado en{" "}
							<Link to="/citas" className="font-medium underline hover:text-amber-800">
								Mis citas
							</Link>
							.
						</p>
					</div>
				</div>
			)}

			{/* GREETING SECTION */}
			<header>
				<h2 className="text-3xl font-headline font-extrabold text-brand-900 tracking-tight mb-1 sm:text-4xl">
					{saludo}, {welcomeName || "Paciente"}
				</h2>
				<p className="text-brand-600 text-base max-w-2xl sm:text-lg">
					Bienvenido de nuevo a tu portal de salud integral.
				</p>
			</header>

			{/* HERO BANNER */}
			<section>
				<div className="relative bg-brand-800 rounded-3xl p-8 overflow-hidden flex items-center justify-between shadow-xl sm:p-10">
					{/* Background decorative texture */}
					<div
						className="absolute top-0 right-0 w-1/3 h-full bg-brand-600 opacity-20"
						style={{ clipPath: "polygon(25% 0%, 100% 0%, 100% 100%, 0% 100%)" }}
					/>
					<div className="relative z-10 max-w-xl">
						<h3 className="text-white font-headline text-2xl font-bold mb-2 sm:text-3xl sm:mb-3">
							¿Necesitas realizar una ecografía?
						</h3>
						<p className="text-brand-100/90 text-base sm:text-lg">
							Gestiona tu salud hoy mismo agendando una nueva cita con nuestros especialistas.
						</p>
					</div>
					<div className="relative z-10 hidden sm:block">
						{tienePagoPendiente ? (
							<span
								className="bg-white/60 text-brand-600 font-bold px-8 py-4 rounded-xl flex items-center gap-3 shadow-lg cursor-not-allowed select-none"
								title="Tiene una cita con pago pendiente de verificación"
							>
								<CalendarPlus className="h-5 w-5" />
								Agendar Nueva Cita
							</span>
						) : (
							<Link
								to="/agendar-cita"
								className="bg-white text-brand-800 font-bold px-8 py-4 rounded-xl flex items-center gap-3 shadow-lg hover:bg-slate-50 transition-all active:scale-95 group"
							>
								<CalendarPlus className="h-5 w-5 group-hover:rotate-12 transition-transform" />
								Agendar Nueva Cita
							</Link>
						)}
					</div>
				</div>
			</section>

			{/* BENTO GRID LAYOUT */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
				{/* LEFT COLUMN: CITAS (col-span-8) */}
				<div className="lg:col-span-8 space-y-6 lg:space-y-8">
					{/* Card 1: Upcoming Appointment */}
					<div className="bg-paper rounded-3xl p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.03)] relative border border-brand-200/30 sm:p-8">
						{loadingCitas ? (
							<div className="h-28 animate-pulse rounded-xl bg-cloud" />
						) : proximaCita ? (
							<>
								<div className="absolute top-6 right-6 bg-brand-100 text-brand-800 text-[10px] font-bold px-3 py-1 rounded-full tracking-widest uppercase sm:top-8 sm:right-8">
									Próxima Cita
								</div>
								<div className="flex items-start gap-4 sm:gap-6">
									<div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600 shrink-0 sm:w-16 sm:h-16">
										<HeartPulse className="h-7 w-7 sm:h-8 sm:w-8" />
									</div>
									<div className="min-w-0 flex-1">
										<h4 className="text-xl font-headline font-bold text-brand-900 mb-1 pr-24 sm:text-2xl">
											{proximaCita.eco_nombre}
										</h4>
										<p className="text-brand-600 font-medium flex items-center gap-2 mb-4 sm:mb-6 text-sm">
											<User className="h-3.5 w-3.5" />
											{proximaCita.especialista_nombre} {proximaCita.especialista_apellido}
										</p>
										<div className="flex gap-6 sm:gap-10">
											<div className="flex items-center gap-3">
												<div className="p-2 bg-cloud rounded-lg text-brand-600">
													<CalendarDays className="h-5 w-5" />
												</div>
												<div>
													<p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
														Fecha
													</p>
													<p className="font-semibold text-brand-900 text-sm">
														{formatFechaConDiaSinAnio(proximaCita.fecha_cita)}
													</p>
												</div>
											</div>
											<div className="flex items-center gap-3">
												<div className="p-2 bg-cloud rounded-lg text-brand-600">
													<Clock className="h-5 w-5" />
												</div>
												<div>
													<p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
														Hora
													</p>
													<p className="font-semibold text-brand-900 text-sm">
														{formatHora(proximaCita.hora_cita)}
													</p>
												</div>
											</div>
										</div>
									</div>
								</div>
							</>
						) : (
							<div className="text-center py-6">
								<CalendarDays className="mx-auto h-12 w-12 text-brand-300" />
								<p className="mt-3 text-sm font-medium text-brand-800">
									No tienes citas pendientes
								</p>
								<p className="mt-1 text-xs text-brand-600">
									Agenda una cita cuando lo necesites.
								</p>
								{!tienePagoPendiente && (
									<Link
										to="/agendar-cita"
										className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900 transition-colors"
									>
										<CalendarPlus className="h-4 w-4" />
										Agendar cita
									</Link>
								)}
							</div>
						)}
					</div>

					{/* Card 2: History */}
					<div className="bg-paper rounded-3xl p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.03)] border border-brand-200/30 sm:p-8">
						<div className="flex justify-between items-center mb-6 sm:mb-8">
							<h4 className="text-lg font-headline font-bold text-brand-900 sm:text-xl">
								Historial de citas
							</h4>
							<Link
								to="/citas"
								className="text-brand-800 font-semibold text-sm hover:underline flex items-center gap-1"
							>
								Ver todo
								<ArrowRight className="h-3.5 w-3.5" />
							</Link>
						</div>
						<div className="space-y-3 sm:space-y-4">
							{loadingCitas ? (
								<>
									<div className="h-16 animate-pulse rounded-xl bg-cloud" />
									<div className="h-16 animate-pulse rounded-xl bg-cloud" />
								</>
							) : historial.length > 0 ? (
								historial.map((cita) => (
									<div
										key={cita.id_cita}
										className="flex items-center justify-between p-3 rounded-2xl hover:bg-mist/50 transition-colors group sm:p-4"
									>
										<div className="flex items-center gap-3 sm:gap-4 min-w-0">
											<div className="w-10 h-10 rounded-xl bg-cloud flex items-center justify-center text-brand-600 group-hover:bg-white group-hover:shadow-sm transition-all shrink-0 sm:w-12 sm:h-12">
												<Stethoscope className="h-5 w-5" />
											</div>
											<div className="min-w-0">
												<p className="font-bold text-brand-900 text-sm truncate">
													{cita.eco_nombre}
												</p>
												<p className="text-xs text-brand-600 truncate">
													{cita.especialista_nombre} {cita.especialista_apellido}
												</p>
											</div>
										</div>
										<div className="text-right shrink-0 ml-3">
											<p className="text-sm font-semibold text-brand-900">
												{formatFechaConDiaSinAnio(cita.fecha_cita)}
											</p>
											<p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">
												Completada
											</p>
										</div>
									</div>
								))
							) : (
								<div className="text-center py-6 text-brand-600 text-sm">
									No tienes citas completadas aún.
								</div>
							)}
						</div>
					</div>
				</div>

				{/* RIGHT COLUMN: FAMILY (col-span-4) */}
				<div className="lg:col-span-4">
					<div className="bg-cloud/50 rounded-3xl p-6 flex flex-col h-full border border-brand-200/30 sm:p-8">
						<div className="flex items-center gap-3 mb-6 sm:mb-8">
							<div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-brand-800 shadow-sm">
								<Users className="h-5 w-5" />
							</div>
							<h4 className="text-lg font-headline font-bold text-brand-900 sm:text-xl">
								Mis Representados
							</h4>
						</div>
						<div className="space-y-3 mb-6 sm:space-y-4 sm:mb-8">
							{representados.length > 0 ? (
								representados.slice(0, 4).map((rep) => (
									<div
										key={rep.id_representado}
										onClick={() => setSelectedRepresentado(rep)}
										className="bg-white p-3 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow cursor-pointer sm:p-4"
									>
										<div className="flex items-center gap-3 min-w-0">
											<InitialAvatar nombre={rep.nombre} apellido={rep.apellido} />
											<div className="min-w-0">
												<p className="text-sm font-bold text-brand-900 truncate">
													{rep.nombre} {rep.apellido}
												</p>
												<p className="text-[10px] text-brand-600 font-medium uppercase tracking-wider truncate">
													{rep.parentesco ?? "Familiar"}
													{rep.fecha_nacimiento ? ` • ${calcularEdad(rep.fecha_nacimiento)} años` : ""}
												</p>
											</div>
										</div>
										<ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
									</div>
								))
							) : (
								<div className="text-center py-4 text-brand-600 text-sm">
									No tienes representados registrados.
								</div>
							)}

							{/* Gestionar familia button */}
							<Link
								to="/representados"
								className="w-full py-3 border-2 border-dashed border-brand-300 rounded-2xl text-brand-600 font-bold text-sm hover:border-brand-800 hover:text-brand-800 transition-all flex items-center justify-center gap-2 sm:py-4"
							>
								<PlusCircle className="h-5 w-5" />
								Gestionar familia
							</Link>
						</div>

						{/* Info Alert Box */}
						<div className="mt-auto bg-brand-100/70 p-4 rounded-2xl border-l-4 border-brand-500 sm:p-5">
							<div className="flex gap-3">
								<Info className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
								<p className="text-sm text-brand-800 leading-relaxed font-medium">
									Como representante, puedes visualizar expedientes y agendar citas para tus familiares
									registrados.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Contextual FAB (Quick action) */}
			{!tienePagoPendiente && (
				<Link
					to="/agendar-cita"
					className="fixed bottom-6 right-6 w-14 h-14 bg-brand-800 text-white rounded-2xl shadow-2xl hidden lg:flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-40 group sm:bottom-8 sm:right-8 sm:w-16 sm:h-16"
				>
					<Plus className="h-6 w-6" />
					<div className="absolute right-full mr-4 bg-brand-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
						Nueva Consulta Rápida
					</div>
				</Link>
			)}

			<VerRepresentadoModal
				isOpen={!!selectedRepresentado}
				onClose={() => setSelectedRepresentado(null)}
				representado={selectedRepresentado}
			/>
		</div>
	);
};

export default DashboardPaciente;
