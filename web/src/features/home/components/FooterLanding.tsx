import { Link } from "react-router-dom";

const FooterLanding = () => {
	const year = new Date().getFullYear();

	return (
		<footer className="relative overflow-hidden bg-gradient-to-b from-[#E0F7FA] via-white to-[#F0FDFA]">
			{/* Decoración suave */}
			<div className="pointer-events-none absolute inset-0 opacity-70">
				<div className="absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-[#5EEAD4]/30 blur-3xl" />
				<div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#93C5FD]/20 blur-3xl" />
				<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#99F6E4]/80 to-transparent" />
			</div>

			<div className="relative mx-auto w-full max-w-7xl px-6 py-14 lg:px-12">
				{/* CTA superior */}
				<div className="mb-10 overflow-hidden rounded-3xl bg-white/70 p-6 shadow-xl ring-1 ring-[#99F6E4]/40 backdrop-blur md:p-10">
					<div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
						<div>
							<p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0E7490]/80">
								Listo para tu cita
							</p>
							<h3 className="mt-2 text-2xl font-bold text-slate-800 md:text-3xl">
								Agenda en minutos, sin complicaciones.
							</h3>
							<p className="mt-2 max-w-2xl text-base text-slate-600 md:text-base">
								Selecciona disponibilidad, confirma tu horario y recibe atención especializada con
								resultados confiables.
							</p>
						</div>
						<div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
							<Link
								to="/disponibilidad"
								className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#14B8A6] to-[#0E7490] px-6 py-3 text-base font-semibold text-white shadow-md shadow-teal-500/25 transition-all hover:-translate-y-0.5 hover:shadow-lg"
							>
								Ver disponibilidad
							</Link>
							<a
								href="#contactanos"
								className="inline-flex items-center justify-center rounded-full border border-[#14B8A6]/40 bg-white/80 px-6 py-3 text-base font-semibold text-[#0E7490] shadow-sm transition-colors hover:bg-[#F0FDFA]"
							>
								Contáctanos
							</a>
						</div>
					</div>
				</div>

				{/* Contenido */}
				<div className="grid gap-10 md:grid-cols-4">
					<div className="md:col-span-2">
						<div className="flex items-center gap-3">
							<img
								src="/logo.png"
								alt="Logo Garbis"
								className="h-16 w-16 object-contain drop-shadow-[0_2px_10px_rgba(20,184,166,0.18)]"
							/>
							<div>
								<p className="text-base font-semibold text-slate-800">Unidad de Ecografía Garbis</p>
								<p className="text-sm text-slate-500">Diagnóstico por imágenes · Maracay</p>
							</div>
						</div>
						<p className="mt-4 max-w-md text-base leading-relaxed text-slate-600">
							Un servicio cercano, profesional y moderno para que tu experiencia sea clara desde la
							cita hasta el resultado.
						</p>
						<div className="mt-5 flex flex-wrap gap-2">
							<span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-[#0E7490] ring-1 ring-[#99F6E4]/50">
								Especialistas certificados
							</span>
							<span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-[#0E7490] ring-1 ring-[#99F6E4]/50">
								Equipos de alta resolución
							</span>
							<span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-[#0E7490] ring-1 ring-[#99F6E4]/50">
								Atención cercana
							</span>
						</div>
					</div>

					<div>
						<p className="text-base font-bold text-slate-800">Secciones</p>
						<ul className="mt-4 space-y-3 text-base text-slate-600">
							<li>
								<a className="hover:text-[#0E7490]" href="#inicio">
									Inicio
								</a>
							</li>
							<li>
								<a className="hover:text-[#0E7490]" href="#sobre-nosotros">
									Nosotros
								</a>
							</li>
							<li>
								<a className="hover:text-[#0E7490]" href="#servicios">
									Servicios
								</a>
							</li>
							<li>
								<a className="hover:text-[#0E7490]" href="#contactanos">
									Contáctanos
								</a>
							</li>
						</ul>
					</div>

					<div>
						<p className="text-base font-bold text-slate-800">Contacto</p>
						<ul className="mt-4 space-y-3 text-base text-slate-600">
							<li>
								<a
									className="hover:text-[#0E7490]"
									href="https://wa.me/584124238603"
									target="_blank"
									rel="noopener noreferrer"
								>
									WhatsApp: +58 412-423-86-03
								</a>
							</li>
							<li>
								<a
									className="hover:text-[#0E7490]"
									href="mailto:unidadecografiagarbis1@gmail.com"
								>
									unidadecografiagarbis1@gmail.com
								</a>
							</li>
							<li>
								<a
									className="hover:text-[#0E7490]"
									href="https://instagram.com/unidadecografiagarbis"
									target="_blank"
									rel="noopener noreferrer"
								>
									Instagram: @unidadecografiagarbis
								</a>
							</li>
						</ul>
					</div>
				</div>

				<div className="mt-10 flex flex-col gap-3 border-t border-[#99F6E4]/40 pt-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
					<p>© {year} Unidad de Ecografía Garbis. Todos los derechos reservados.</p>
					<p className="text-slate-500/80">
						Hecho con cuidado para una experiencia clara y bonita.
					</p>
				</div>
			</div>
		</footer>
	);
};

export default FooterLanding;

