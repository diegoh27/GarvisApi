import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const SECTION_IDS = ["#inicio", "#sobre-nosotros", "#servicios", "#contactanos"];

const HeaderLanding = () => {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [activeSection, setActiveSection] = useState<string>("#inicio");

	const toggleMenu = () => {
		setIsMenuOpen(!isMenuOpen);
	};

	const closeMenu = () => {
		setIsMenuOpen(false);
	};

	const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
		e.preventDefault();
		const element = document.querySelector(targetId);
		if (element) {
			const headerOffset = 80;
			const elementPosition = element.getBoundingClientRect().top;
			const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

			window.scrollTo({
				top: offsetPosition,
				behavior: "smooth",
			});
		}
		setActiveSection(targetId);
		closeMenu();
	};

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					const id = entry.target.getAttribute("id");
					if (id) {
						setActiveSection(`#${id}`);
					}
					break;
				}
			},
			{ rootMargin: "-20% 0px -70% 0px", threshold: 0 }
		);

		SECTION_IDS.forEach((hash) => {
			const id = hash.slice(1);
			const el = document.getElementById(id);
			if (el) observer.observe(el);
		});

		return () => observer.disconnect();
	}, []);

	const navLinks = [
		{ href: "#inicio", label: "Inicio" },
		{ href: "#sobre-nosotros", label: "Nosotros" },
		{ href: "#servicios", label: "Servicios" },
		{ href: "#contactanos", label: "Contáctanos" },
	];

	return (
		<header className="sticky top-0 z-50 border-b border-white/20 bg-white/80 py-4 shadow-sm backdrop-blur-xl">
			{/* Línea de acento inferior */}
			<div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#99F6E4]/80 to-transparent" />

			<div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10">
				{/* Logo */}
				<Link to="/" className="flex items-center gap-3 -ml-2 lg:-ml-4">
					<img
						src="/logo.png"
						alt="Logo Garbis"
						className="h-14 w-auto object-contain drop-shadow-[0_2px_8px_rgba(20,184,166,0.15)]"
					/>
				</Link>

				{/* Navegación Desktop */}
				<nav className="hidden items-center gap-1 lg:flex">
					{navLinks.map(({ href, label }) => {
						const isActive = activeSection === href;
						return (
							<a
								key={href}
								href={href}
								onClick={(e) => handleNavClick(e, href)}
								className="group relative px-4 py-2.5 text-base font-semibold uppercase tracking-wider"
							>
								<span
									className={`transition-colors duration-200 ${isActive ? "text-[#0E7490]" : "text-slate-500"
										} group-hover:text-[#0E7490]`}
								>
									{label}
								</span>
								<span
									className={`absolute bottom-0 left-0 h-0.5 rounded-full bg-gradient-to-r from-[#14B8A6] via-[#5EEAD4] to-[#14B8A6] transition-all duration-300 ${isActive ? "w-full" : "w-0 group-hover:w-full"
										}`}
								/>
							</a>
						);
					})}
				</nav>

				{/* Botones CTA Desktop */}
				<div className="hidden items-center gap-2 lg:flex">
					<Link
						to="/auth/login"
						className="rounded-full border border-[#14B8A6]/50 bg-white/90 px-5 py-2.5 text-base font-semibold text-[#0E7490] shadow-sm transition-all duration-200 hover:border-[#14B8A6] hover:bg-[#F0FDFA] hover:shadow-md"
					>
						Iniciar Sesión
					</Link>
					<Link
						to="/auth/register"
						className="rounded-full bg-gradient-to-r from-[#14B8A6] to-[#0E7490] px-5 py-2.5 text-base font-semibold text-white shadow-md shadow-teal-500/25 transition-all duration-200 hover:shadow-lg hover:shadow-teal-500/30 hover:-translate-y-0.5"
					>
						Registrarse
					</Link>
				</div>

				{/* Hamburguesa móvil */}
				<button
					onClick={toggleMenu}
					className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-xl transition-colors hover:bg-[#E0F7FA]/70 active:bg-[#E0F7FA] lg:hidden"
					aria-label="Abrir menú"
					aria-expanded={isMenuOpen}
				>
					<span
						className={`block h-0.5 w-5 rounded-full bg-[#0E7490] transition-all duration-300 ${isMenuOpen ? "translate-y-2 rotate-45" : ""}`}
					/>
					<span
						className={`block h-0.5 w-5 rounded-full bg-[#0E7490] transition-all duration-300 ${isMenuOpen ? "scale-x-0 opacity-0" : ""}`}
					/>
					<span
						className={`block h-0.5 w-5 rounded-full bg-[#0E7490] transition-all duration-300 ${isMenuOpen ? "-translate-y-2 -rotate-45" : ""}`}
					/>
				</button>
			</div>

			{/* Menú móvil */}
			<div
				className={`overflow-y-auto overflow-x-hidden transition-all duration-300 ease-out lg:hidden ${isMenuOpen ? "max-h-[85vh] opacity-100" : "max-h-0 opacity-0"}`}
			>
				<nav className="border-t border-[#99F6E4]/30 bg-gradient-to-b from-white/95 to-[#F0FDFA]/95 px-4 py-4 pb-5 backdrop-blur-lg">
					<div className="flex flex-col gap-0.5">
						{navLinks.map(({ href, label }) => {
							const isActive = activeSection === href;
							return (
								<a
									key={href}
									href={href}
									onClick={(e) => handleNavClick(e, href)}
									className="group relative py-3 pl-4 text-base font-semibold uppercase tracking-wide"
								>
									<span
										className={`transition-colors duration-200 ${isActive ? "text-[#0E7490]" : "text-slate-500"
											} group-hover:text-[#0E7490]`}
									>
										{label}
									</span>
									<span
										className={`absolute bottom-0 left-4 h-0.5 rounded-full bg-gradient-to-r from-[#14B8A6] via-[#5EEAD4] to-[#14B8A6] transition-all duration-300 ${isActive ? "w-[calc(100%-2rem)]" : "w-0 group-hover:w-[calc(100%-2rem)]"
											}`}
									/>
								</a>
							);
						})}
					</div>
					<div className="mt-3 flex flex-col gap-3 border-t border-[#99F6E4]/40 pt-4">
						<Link
							to="/auth/login"
							onClick={closeMenu}
							className="flex min-h-[44px] items-center justify-center rounded-xl border border-[#14B8A6]/50 bg-white py-3 text-center text-base font-semibold leading-normal text-[#0E7490] transition-colors hover:bg-[#F0FDFA]"
						>
							Iniciar Sesión
						</Link>
						<Link
							to="/auth/register"
							onClick={closeMenu}
							className="flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-[#14B8A6] to-[#0E7490] py-3 text-center text-base font-semibold leading-normal text-white shadow-md shadow-teal-500/25 transition-all hover:shadow-lg"
						>
							Registrarse
						</Link>
					</div>
				</nav>
			</div>
		</header>
	);
};

export default HeaderLanding;
