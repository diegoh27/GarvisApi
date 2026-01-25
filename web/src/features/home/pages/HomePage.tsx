import { Link } from "react-router-dom";

const quickLinks = [
	{ label: "Moderadores", to: "/moderadores" },
	{ label: "Pacientes", to: "/pacientes" },
	{ label: "Especialistas", to: "/especialistas" },
	{ label: "Especialidades", to: "/especialidades" },
	{ label: "Disponibilidad", to: "/disponibilidad" },
	{ label: "Citas", to: "/citas" },
	{ label: "Resultados", to: "/resultados" },
	{ label: "Pagos", to: "/pagos" },
	{ label: "Inventario", to: "/inventario" },
	{ label: "Productos", to: "/productos" },
	{ label: "Entes legales", to: "/entes-legales" },
	{ label: "Empleados", to: "/empleados" },
	{ label: "Usuarios", to: "/usuarios" },
	{ label: "Roles", to: "/roles" },
];

const HomePage = () => {
	return (
		<div className="bg-slate-50 text-slate-900">
			<section className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-10 sm:px-6 lg:py-16">
				<div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
					<div className="space-y-6">
						<span className="badge badge-outline">Garvis UI</span>
						<h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
							Administra el flujo medico en un solo lugar.
						</h1>
						<p className="text-lg text-slate-600">
							Garvis centraliza citas, resultados, pagos y recursos internos para
							un consultorio moderno. Esta landing es el punto de entrada mientras
							el equipo implementa cada modulo.
						</p>
						<div className="flex flex-wrap gap-3">
							<Link to="/auth/login" className="btn btn-primary">
								Entrar al sistema
							</Link>
							<Link to="/auth/register" className="btn btn-outline">
								Crear cuenta
							</Link>
						</div>
					</div>
					<div className="relative">
						<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
							<div className="flex items-center justify-between text-xs text-slate-400">
								<span>Panel medico</span>
								<span>Garvis</span>
							</div>
							<div className="mt-6 space-y-4">
								<div className="h-3 w-2/3 rounded-full bg-slate-200" />
								<div className="h-3 w-1/2 rounded-full bg-slate-200" />
								<div className="grid grid-cols-3 gap-3 pt-2">
									<div className="h-16 rounded-2xl bg-cyan-100" />
									<div className="h-16 rounded-2xl bg-emerald-100" />
									<div className="h-16 rounded-2xl bg-amber-100" />
								</div>
								<div className="h-20 rounded-2xl bg-slate-100" />
							</div>
						</div>
						<div className="absolute -bottom-6 -left-6 hidden h-16 w-16 rounded-2xl bg-cyan-500/20 blur-sm sm:block" />
						<div className="absolute -top-6 -right-6 hidden h-20 w-20 rounded-full bg-emerald-500/20 blur-sm sm:block" />
					</div>
				</div>

				<section className="grid gap-6 lg:grid-cols-3">
					<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
						<h3 className="text-lg font-semibold">Consulta online</h3>
						<p className="mt-2 text-sm text-slate-600">
							Maneja solicitudes y confirma disponibilidad con aprobacion interna.
						</p>
						<Link to="/disponibilidad" className="mt-4 inline-flex text-sm font-semibold text-cyan-600">
							Ver disponibilidad
						</Link>
					</div>
					<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
						<h3 className="text-lg font-semibold">Soporte medico</h3>
						<p className="mt-2 text-sm text-slate-600">
							Resultados listos solo cuando el pago esta verificado.
						</p>
						<Link to="/resultados" className="mt-4 inline-flex text-sm font-semibold text-cyan-600">
							Explorar resultados
						</Link>
					</div>
					<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
						<h3 className="text-lg font-semibold">Gestion interna</h3>
						<p className="mt-2 text-sm text-slate-600">
							Control de pagos, inventario y roles desde un solo tablero.
						</p>
						<Link to="/pagos" className="mt-4 inline-flex text-sm font-semibold text-cyan-600">
							Ir a pagos
						</Link>
					</div>
				</section>

				<section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
					<div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
						<div className="space-y-3">
							<h2 className="text-2xl font-semibold">Accesos rapidos a modulos</h2>
							<p className="text-sm text-slate-600">
								Usa estos links para probar cada ruta mientras se construyen los
								endpoints reales.
							</p>
						</div>
						<Link to="/moderadores" className="btn btn-outline">
							Ir a moderadores
						</Link>
					</div>
					<div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{quickLinks.map((link) => (
							<Link
								key={link.to}
								to={link.to}
								className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700"
							>
								<span>{link.label}</span>
								<span className="text-xs text-slate-400">Abrir</span>
							</Link>
						))}
					</div>
				</section>

				<section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
					<div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
						<h2 className="text-2xl font-semibold">Listo para el dashboard</h2>
						<p className="mt-3 text-sm text-slate-600">
							Aqui se pueden colocar cards de resumen, actividades recientes y
							atajos a los modulos mas usados. Esta base queda lista para el
							compa en front.
						</p>
						<div className="mt-6 flex flex-wrap gap-3">
							<Link to="/especialistas" className="btn btn-sm btn-ghost">
								Especialistas
							</Link>
							<Link to="/pacientes" className="btn btn-sm btn-ghost">
								Pacientes
							</Link>
							<Link to="/inventario" className="btn btn-sm btn-ghost">
								Inventario
							</Link>
						</div>
					</div>
					<div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
						<p className="text-xs font-semibold uppercase tracking-wide text-white/60">
							Estado del sistema
						</p>
						<div className="mt-4 space-y-3 text-sm">
							<div className="flex items-center justify-between">
								<span>Citas hoy</span>
								<span className="font-semibold text-cyan-300">12</span>
							</div>
							<div className="flex items-center justify-between">
								<span>Pagos pendientes</span>
								<span className="font-semibold text-amber-300">3</span>
							</div>
							<div className="flex items-center justify-between">
								<span>Resultados listos</span>
								<span className="font-semibold text-emerald-300">8</span>
							</div>
						</div>
						<button className="btn btn-sm btn-outline mt-6 w-full border-white/20 text-white hover:bg-white/10">
							Ver resumen diario
						</button>
					</div>
				</section>
			</section>
		</div>
	);
};

export default HomePage;
