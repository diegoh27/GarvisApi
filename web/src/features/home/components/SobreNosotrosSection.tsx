const SobreNosotrosSection = () => {
	const valores = [
		{
			icono: "🏥",
			titulo: "Equipos de última generación",
			descripcion: "Tecnología de alta resolución para diagnósticos más precisos y confiables.",
		},
		{
			icono: "👨‍⚕️",
			titulo: "Especialistas certificados",
			descripcion: "Profesionales altamente capacitados con años de experiencia.",
		},
		{
			icono: "⚡",
			titulo: "Resultados rápidos",
			descripcion: "Diagnósticos confiables en minutos, sin largas esperas.",
		},
		{
			icono: "💚",
			titulo: "Compromiso con tu salud",
			descripcion: "Cuidamos de tu bienestar con atención personalizada y profesional.",
		},
	];

	return (
		<section
			id="sobre-nosotros"
			className="flex min-h-screen flex-col justify-center bg-[#F0F8F7] px-6 py-16 md:py-20 lg:py-24"
		>
			<div className="mx-auto w-full max-w-7xl">
				{/* Título */}
				<div className="mb-10 overflow-visible text-center md:mb-14">
					<p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1C837F]/80">
						Conócenos
					</p>
					<div className="overflow-visible py-1">
						<h2
							className="pt-1 pb-2 leading-relaxed bg-gradient-to-r from-[#5EEAD4] via-[#14B8A6] to-[#0E7490] bg-clip-text text-3xl font-bold text-transparent md:text-4xl lg:text-5xl [box-decoration-break:clone]"
							style={{ WebkitBoxDecorationBreak: "clone" }}
						>
							Sobre nosotros
						</h2>
					</div>
					<p className="mx-auto mt-3 max-w-2xl text-sm text-[#4A5568] md:text-base">
						Somos una unidad especializada en ecografía que combina experiencia médica,
						tecnología avanzada y un trato humano cercano para cuidar de tu salud.
					</p>
				</div>

				{/* Contenido principal */}
				<div className="mb-12 grid gap-10 md:grid-cols-2 lg:mb-16 lg:gap-14">
					{/* Texto descriptivo */}
					<div className="space-y-6">
						<p className="text-base leading-relaxed text-[#4A5568] md:text-lg">
							En la <span className="font-semibold text-[#1C837F]">Unidad de Ecografía Garbis</span>, nos
							especializamos en brindar servicios de diagnóstico por imágenes de la más alta calidad.
							Ubicados en Maracay, estado Aragua, contamos con tecnología de vanguardia y un equipo
							de profesionales altamente capacitados.
						</p>
						<p className="text-base leading-relaxed text-[#4A5568] md:text-lg">
							Nuestro compromiso es ofrecer diagnósticos precisos y oportunos, priorizando siempre el
							bienestar y la salud de nuestros pacientes. Trabajamos con equipos de última generación
							que nos permiten obtener resultados confiables en el menor tiempo posible.
						</p>

						<div className="mt-4 grid gap-4 text-sm text-[#4A5568] md:grid-cols-2">
							<div className="flex items-start gap-3 rounded-xl bg-white/60 p-4 shadow-sm">
								<span className="mt-1 text-lg">✔</span>
								<div>
									<p className="text-sm font-semibold text-[#1C837F]">
										Acompañamiento en todo el proceso
									</p>
									<p className="mt-1 text-xs md:text-sm">
										Desde la cita hasta la entrega del informe, te guiamos con un trato cercano.
									</p>
								</div>
							</div>
							<div className="flex items-start gap-3 rounded-xl bg-white/60 p-4 shadow-sm">
								<span className="mt-1 text-lg">✔</span>
								<div>
									<p className="text-sm font-semibold text-[#1C837F]">
										Protocolos claros y organizados
									</p>
									<p className="mt-1 text-xs md:text-sm">
										Agendamiento sencillo, atención puntual y resultados en tiempos definidos.
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Estadísticas o información destacada */}
					<div className="flex flex-col justify-center rounded-3xl bg-gradient-to-br from-white via-[#F5FFFE] to-[#E0F7FA] p-8 shadow-xl ring-1 ring-slate-100 md:p-10">
						<div className="grid gap-6 md:grid-cols-3">
							<div className="text-center">
								<div className="text-3xl font-bold text-[#1C837F] md:text-4xl">+10</div>
								<div className="mt-2 text-sm font-medium text-[#4A5568] md:text-base">
									Años de experiencia
								</div>
								<p className="mt-1 text-xs text-[#718096]">
									en ecografía y diagnóstico por imágenes.
								</p>
							</div>
							<div className="hidden h-16 w-px bg-gradient-to-b from-[#E0F2F1] via-[#C4E4DF] to-[#E0F2F1] md:block" />
							<div className="text-center md:col-span-1">
								<div className="text-3xl font-bold text-[#1C837F] md:text-4xl">100%</div>
								<div className="mt-2 text-sm font-medium text-[#4A5568] md:text-base">
									Equipos certificados
								</div>
								<p className="mt-1 text-xs text-[#718096]">
									con estándares internacionales de calidad.
								</p>
							</div>
							<div className="hidden h-16 w-px bg-gradient-to-b from-[#E0F2F1] via-[#C4E4DF] to-[#E0F2F1] md:block" />
							<div className="text-center">
								<div className="text-3xl font-bold text-[#1C837F] md:text-4xl">24/7</div>
								<div className="mt-2 text-sm font-medium text-[#4A5568] md:text-base">
									Atención disponible
								</div>
								<p className="mt-1 text-xs text-[#718096]">
									para responder tus dudas y gestionar tus estudios.
								</p>
							</div>
						</div>

						<div className="mt-6 rounded-2xl bg-[#E0F2F1]/70 p-4 text-sm text-[#2F4F4F]">
							<p className="font-semibold text-[#1C837F]">Nuestra misión</p>
							<p className="mt-1 text-xs md:text-sm">
								Brindar diagnósticos confiables y oportunos, con calidez humana y una experiencia de
								atención clara, cómoda y segura para cada paciente.
							</p>
						</div>
					</div>
				</div>

				{/* Valores/Características */}
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 lg:pt-4">
					{valores.map((valor, index) => (
						<div
							key={index}
							className="group rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-100 transition-all hover:-translate-y-1 hover:shadow-lg"
						>
							<div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#E0F2F1] text-2xl transition-transform group-hover:scale-110">
								{valor.icono}
							</div>
							<h3 className="mb-2 text-lg font-bold text-[#1C837F]">{valor.titulo}</h3>
							<p className="text-sm leading-relaxed text-[#4A5568]">{valor.descripcion}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

export default SobreNosotrosSection;
