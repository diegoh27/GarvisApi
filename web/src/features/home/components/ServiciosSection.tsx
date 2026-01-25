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
			className="flex min-h-screen flex-col justify-center bg-[#F0F8F7] px-6 py-12 md:py-16 lg:py-20"
		>
			<div className="mx-auto w-full max-w-7xl">
				{/* Título */}
				<h2 className="mb-12 text-center text-4xl font-bold text-[#1C837F] md:text-5xl lg:text-6xl">
					Nuestros servicios
				</h2>

				{/* Grid de servicios */}
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{servicios.map((servicio, index) => (
						<div
							key={index}
							className="mx-auto w-full max-w-sm rounded-xl bg-white p-6 shadow-md transition-transform hover:scale-105"
						>
							{/* Imagen del servicio */}
							<div className="mb-4 flex justify-center">
								<img
									src={servicio.imagen}
									alt={servicio.titulo}
									className="h-32 w-32 object-contain"
								/>
							</div>

							{/* Título */}
							<h3 className="mb-2 text-center text-lg font-bold text-[#1C837F] md:text-xl">
								{servicio.titulo}
							</h3>

							{/* Descripción */}
							<p className="text-center text-sm leading-relaxed text-[#4A5568] md:text-base">
								{servicio.descripcion}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

export default ServiciosSection;
