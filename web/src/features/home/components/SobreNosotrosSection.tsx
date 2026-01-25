const SobreNosotrosSection = () => {
	const valores = [
		{
			icono: "🏥",
			titulo: "Equipos de última generación",
			descripcion: "Tecnología de alta resolución para diagnósticos precisos y confiables.",
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
			className="flex min-h-screen flex-col justify-center bg-[#F0F8F7] px-6 py-12 md:py-16 lg:py-20 "
		>
			<div className="mx-auto w-full max-w-7xl mt-[-2.5rem]  ">
				{/* Título */}
				<div className="mb-4 text-center md:mb-12">
					<h2 className="text-4xl font-bold text-[#1C837F] md:text-5xl lg:text-6xl">
						Sobre nosotros
					</h2>
				</div>

				{/* Contenido principal */}
				<div className="mb-10 grid gap-8 md:grid-cols-2 lg:mb-12 lg:gap-12">
					{/* Texto descriptivo */}
					<div className="space-y-6">
						<p className="text-lg leading-relaxed text-[#4A5568] md:text-xl">
							En la <span className="font-semibold text-[#1C837F]">Unidad de Ecografía Garbis</span>, nos
							especializamos en brindar servicios de diagnóstico por imágenes de la más alta calidad.
							Ubicados en Maracay, estado Aragua, contamos con tecnología de vanguardia y un equipo
							de profesionales altamente capacitados.
						</p>
						<p className="text-lg leading-relaxed text-[#4A5568] md:text-xl">
							Nuestro compromiso es ofrecer diagnósticos precisos y oportunos, priorizando siempre el
							bienestar y la salud de nuestros pacientes. Trabajamos con equipos de última generación
							que nos permiten obtener resultados confiables en el menor tiempo posible.
						</p>
					</div>

					{/* Estadísticas o información destacada */}
					<div className="flex flex-col justify-center space-y-6 rounded-2xl bg-white p-8 shadow-lg">
						<div className="text-center">
							<div className="text-4xl font-bold text-[#1C837F] md:text-5xl">+10</div>
							<div className="mt-2 text-sm font-medium text-[#4A5568] md:text-base">
								Años de experiencia
							</div>
						</div>
						<div className="h-px bg-[#E0F2F1]"></div>
						<div className="text-center">
							<div className="text-4xl font-bold text-[#1C837F] md:text-5xl">100%</div>
							<div className="mt-2 text-sm font-medium text-[#4A5568] md:text-base">
								Equipos certificados
							</div>
						</div>
						<div className="h-px bg-[#E0F2F1]"></div>
						<div className="text-center">
							<div className="text-4xl font-bold text-[#1C837F] md:text-5xl">24/7</div>
							<div className="mt-2 text-sm font-medium text-[#4A5568] md:text-base">
								Atención disponible
							</div>
						</div>
					</div>
				</div>

				{/* Valores/Características */}
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 lg:pt-4">
					{valores.map((valor, index) => (
						<div
							key={index}
							className="rounded-xl bg-white p-6 shadow-md transition-transform hover:scale-105"
						>
							<div className="mb-4 text-4xl">{valor.icono}</div>
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
