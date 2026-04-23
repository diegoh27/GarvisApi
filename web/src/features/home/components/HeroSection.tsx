import { Link } from "react-router-dom";

const HeroSection = () => {
	return (
		<section
			id="inicio"
			className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#E0F7FA] via-white to-[#C7F5FF] px-6 py-16 md:py-24"
		>
			{/* Decoración de fondo */}
			<div className="pointer-events-none absolute inset-0 opacity-60">
				<div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-teal-100 blur-3xl" />
				<div className="absolute -right-24 top-40 h-64 w-64 rounded-full bg-emerald-100 blur-3xl" />
				<div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white/80 to-transparent" />
			</div>

			<div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 md:grid-cols-2 lg:gap-16">
				{/* Columna izquierda - Texto */}
				<div className="order-2 space-y-6 md:order-1">
					<div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1 text-sm font-medium text-[#1C837F] shadow-sm ring-1 ring-[#1C837F]/10">
						<span className="inline-block h-2 w-2 rounded-full bg-[#1C837F]" />
						<span>Unidad de Ecografía Garbis · Maracay</span>
					</div>
					<div className="overflow-visible py-1">
						<h1
							className="pt-1 pb-2 leading-relaxed bg-gradient-to-b from-[#5EEAD4] via-[#14B8A6] to-[#0E7490] bg-clip-text text-3xl font-semibold text-transparent md:text-5xl lg:text-6xl [box-decoration-break:clone]"
							style={{ WebkitBoxDecorationBreak: "clone" }}
						>
							Diagnósticos precisos para el cuidado de tu salud.
						</h1>
					</div>
					<p className="max-w-xl text-base text-slate-600 md:text-lg lg:text-xl">
						Contamos con especialistas certificados y equipos de alta resolución
						para resultados confiables en minutos.
					</p>
					<div className="flex flex-wrap items-center gap-4">
						<Link
							to="/disponibilidad"
							className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#1C837F] to-[#1BB3A5] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-teal-500/30 transition-transform hover:-translate-y-0.5 hover:shadow-xl"
						>
							Agenda tu cita aquí
						</Link>
						<span className="text-sm text-slate-500 md:text-base">
							Resultados en minutos, atención cercana y profesional.
						</span>
					</div>

					{/* Mini métricas */}
					<div className="mt-4 grid grid-cols-2 gap-4 text-sm md:text-base lg:max-w-md">
						<div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-100">
							<p className="text-[10px] font-medium uppercase tracking-wide text-teal-600">
								Experiencia
							</p>
							<p className="mt-1 text-lg font-semibold text-slate-800 md:text-xl">+10 años</p>
							<p className="mt-1 text-[11px] text-slate-500">
								en diagnóstico por imágenes de alta complejidad.
							</p>
						</div>
						<div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-100">
							<p className="text-[10px] font-medium uppercase tracking-wide text-teal-600">
								Confianza
							</p>
							<p className="mt-1 text-lg font-semibold text-slate-800 md:text-xl">+5.000</p>
							<p className="mt-1 text-[11px] text-slate-500">
								pacientes atendidos con resultados confiables.
							</p>
						</div>
					</div>
				</div>

				{/* Columna derecha - Imagen */}
				<div className="relative order-1 flex items-center justify-center md:order-2">
					<div className="relative w-full max-w-md">
						<div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-[#1C837F]/20 via-transparent to-[#1BB3A5]/30 blur-xl" />
						<img
							src="/imglanding.png"
							alt="Especialista realizando ecografía"
							className="relative w-full rounded-3xl object-cover shadow-2xl ring-1 ring-white/60"
						/>

						{/* Tarjeta flotante */}
						<div className="absolute -bottom-6 left-4 right-auto w-44 rounded-2xl bg-white/95 p-3 shadow-lg backdrop-blur">
							<p className="text-[10px] font-medium uppercase tracking-wide text-teal-600">
								Atención personalizada
							</p>
							<p className="mt-1 text-sm text-slate-700">
								Te guiamos en cada paso de tu estudio, desde la cita hasta el resultado.
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default HeroSection;