import { Link } from "react-router-dom";

const HeroSection = () => {
	return (
		<section
			id="inicio"
			className="flex min-h-screen items-center justify-center bg-[#E0F2F1] px-6 py-8 md:py-16 lg:py-20"
		>
			<div className="mx-auto grid w-full max-w-7xl items-center gap-6 md:grid-cols-2 md:gap-12 lg:gap-16">
				{/* Columna izquierda - Texto (abajo en móvil, izquierda en desktop) */}
				<div className="space-y-4 md:space-y-8 order-2 md:order-1">
					<h1 className="text-3xl font-bold leading-tight text-[#1C837F] md:text-5xl lg:text-6xl">
						Diagnósticos precisos para el cuidado de tu salud.
					</h1>
					<p className="text-base text-[#4A5568] md:text-lg lg:text-xl">
						Contamos con especialistas certificados y equipos de alta resolución
						para resultados confiables en minutos.
					</p>
					<Link
						to="/disponibilidad"
						className="inline-block rounded-full bg-[#1C837F] px-8 py-3.5 text-base font-medium text-white transition-colors hover:bg-[#156B68]"
					>
						Agenda tu cita aquí
					</Link>
				</div>

				{/* Columna derecha - Imagen (arriba en móvil, derecha en desktop) */}
				<div className="relative order-1 md:order-2">
					<img
						src="/imglanding.png"
						alt="Especialista realizando ecografía"
						className="w-full rounded-2xl object-cover shadow-lg"
					/>
				</div>
			</div>
		</section>
	);
};

export default HeroSection;
