const ServiciosSection = () => {
	const servicios = [
		{
			imagen: "/abdominal.png",
			titulo: "Eco Abdominal",
			descripcion: "Evaluación detallada de hígado, vesícula, páncreas, riñones y bazo.",
		},
		{
			imagen: "/pelvico.png",
			titulo: "Eco Pélvico",
			descripcion: "Estudio ginecológico completo para valorar útero, ovarios y vejiga.",
		},
		{
			imagen: "/mamario.png",
			titulo: "Eco Mamario",
			descripcion: "Chequeo preventivo y diagnóstico de las glándulas mamarias.",
		},
		{
			imagen: "/doppler.png",
			titulo: "Eco Doppler Vascular",
			descripcion: "Análisis del flujo sanguíneo arterial y venoso (superiores e inferiores).",
		},
		{
			imagen: "/obstetrico.png",
			titulo: "Eco Obstétrico y Genético",
			descripcion: "Control prenatal avanzado, incluyendo Genéticos I y II para el bienestar",
		},
		{
			imagen: "/renal.png",
			titulo: "Eco Renal y Prostático",
			descripcion: "Revisión del sistema urinario, riñones, vejiga y próstata en hombres.",
		},
		{
			imagen: "/tiroideo.png",
			titulo: "Eco Tiroideo",
			descripcion: "Evaluación específica de la glándula tiroides y estructuras del cuello.",
		},
		{
			imagen: "/blandas.png",
			titulo: "Eco de Partes Blandas",
			descripcion: "Diagnóstico de hernias, lesiones musculares, testiculares e inguinales.",
		},
	];

	return (
		<section
			id="servicios"
			className="flex min-h-screen flex-col justify-center bg-[#F0F8F7] px-6 py-16 md:py-20 lg:py-24"
		>
			<div className="mx-auto w-full max-w-7xl">
				{/* Título */}
				<div className="mb-10 overflow-visible text-center md:mb-14">
					<p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#1C837F]/80">
						Especialidades
					</p>
					<div className="overflow-visible py-1">
						<h2
							className="pt-1 pb-2 leading-relaxed bg-gradient-to-r from-[#5EEAD4] via-[#14B8A6] to-[#0E7490] bg-clip-text text-3xl font-bold text-transparent md:text-4xl lg:text-5xl [box-decoration-break:clone]"
							style={{ WebkitBoxDecorationBreak: "clone" }}
						>
							Nuestros servicios
						</h2>
					</div>
					<p className="mx-auto mt-3 max-w-2xl text-base text-[#4A5568] md:text-base">
						Estudios ecográficos diseñados para evaluar diferentes partes del cuerpo con el máximo
						detalle y seguridad para el paciente.
					</p>
				</div>

				{/* Grid de servicios */}
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{servicios.map((servicio, index) => (
						<div
							key={index}
							className="group relative mx-auto flex h-full w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-gradient-to-b from-white via-[#F0FDFA] to-[#E0F7FA] p-6 shadow-lg ring-1 ring-[#99F6E4]/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-teal-200/40 hover:ring-2 hover:ring-[#14B8A6]/50"
						>
							{/* Barra superior de acento */}
							<div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#5EEAD4] via-[#14B8A6] to-[#0E7490]" />

							{/* Contenedor de imagen con glow */}
							<div className="relative mb-5 flex justify-center">
								<div className="absolute inset-0 flex justify-center">
									<div className="h-24 w-24 rounded-full bg-gradient-to-br from-[#5EEAD4]/30 to-[#14B8A6]/20 blur-xl transition-transform duration-300 group-hover:scale-150 group-hover:opacity-80" />
								</div>
								<div className="relative flex h-28 w-28 items-center justify-center rounded-2xl bg-white/90 shadow-inner ring-1 ring-[#99F6E4]/50 transition-all duration-300 group-hover:ring-2 group-hover:ring-[#14B8A6]/40">
									<img
										src={servicio.imagen}
										alt={servicio.titulo}
										className="h-20 w-20 object-contain transition-transform duration-300 group-hover:scale-110"
									/>
								</div>
							</div>

							{/* Título con gradiente */}
							<h3 className="mb-2 text-center text-lg font-bold md:text-xl">
								<span className="bg-gradient-to-r from-[#0E7490] via-[#14B8A6] to-[#0E7490] bg-clip-text text-transparent">
									{servicio.titulo}
								</span>
							</h3>
							{/* Línea decorativa bajo el título */}
							<div className="mx-auto mb-3 h-0.5 w-12 rounded-full bg-gradient-to-r from-transparent via-[#14B8A6] to-transparent opacity-80" />

							{/* Descripción */}
							<p className="flex-1 text-center text-base leading-relaxed text-slate-600 md:text-base">
								{servicio.descripcion}
							</p>

							{/* Badge */}
							<div className="mt-4 flex justify-center">
								<span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-[#0E7490] shadow-sm ring-1 ring-[#99F6E4]/60">
									<span className="h-1.5 w-1.5 rounded-full bg-[#14B8A6]" />
									Orientado por especialista
								</span>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

export default ServiciosSection;
