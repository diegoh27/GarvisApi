import { useState } from "react";
import { Link } from "react-router-dom";

const HeaderLanding = () => {
	const [isMenuOpen, setIsMenuOpen] = useState(false);

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
			const headerOffset = 80; // Altura del header sticky
			const elementPosition = element.getBoundingClientRect().top;
			const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

			window.scrollTo({
				top: offsetPosition,
				behavior: "smooth",
			});
		}
		closeMenu();
	};

	return (
		<header className="sticky top-0 z-50 bg-[#E0F2F1] py-4 shadow-sm">
			<div className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-12">
				{/* Logo - Más a la izquierda */}
				<Link to="/" className="flex items-center gap-3 -ml-2 lg:-ml-4">
					<img
						src="/logo.png"
						alt="Logo Garbis"
						className="h-30 w-30 object-contain"
					/>
					{/* <div className="flex flex-col">
						<span className="text-xs font-medium text-[#1C837F] leading-tight">
							UNIDAD DE ECOGRAFÍA
						</span>
						<span className="text-lg font-bold text-[#1C837F] leading-tight">GARBIS</span>
					</div> */}
				</Link>

				{/* Navegación Desktop - Centrada */}
				<nav className="hidden items-center gap-8 lg:flex">
					<a
						href="#inicio"
						onClick={(e) => handleNavClick(e, "#inicio")}
						className="text-sm font-medium text-[#4A5568] transition-colors hover:text-[#1C837F]"
					>
						Inicio
					</a>
					<a
						href="#sobre-nosotros"
						onClick={(e) => handleNavClick(e, "#sobre-nosotros")}
						className="text-sm font-medium text-[#4A5568] transition-colors hover:text-[#1C837F]"
					>
						Sobre nosotros
					</a>
					<a
						href="#servicios"
						onClick={(e) => handleNavClick(e, "#servicios")}
						className="text-sm font-medium text-[#4A5568] transition-colors hover:text-[#1C837F]"
					>
						Servicios
					</a>
					<a
						href="#contactanos"
						onClick={(e) => handleNavClick(e, "#contactanos")}
						className="text-sm font-medium text-[#4A5568] transition-colors hover:text-[#1C837F]"
					>
						Contáctanos
					</a>
				</nav>

				{/* Botones de acción Desktop - Más a la derecha */}
				<div className="hidden items-center gap-3 lg:flex -mr-2 lg:-mr-4">
					<Link
						to="/auth/login"
						className="rounded-full border-2 border-[#1C837F] bg-white px-6 py-2.5 text-sm font-medium text-[#1C837F] transition-colors hover:bg-[#E0F2F1]"
					>
						Iniciar Sesión
					</Link>
					<Link
						to="/auth/register"
						className="rounded-full bg-[#1C837F] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#156B68]"
					>
						Registrarse
					</Link>
				</div>

				{/* Botón Hamburguesa - Solo móvil */}
				<button
					onClick={toggleMenu}
					className="flex flex-col items-center justify-center gap-1.5 rounded-lg p-2 text-[#1C837F] transition-colors hover:bg-[#1C837F]/10 lg:hidden"
					aria-label="Toggle menu"
				>
					<span
						className={`block h-0.5 w-6 bg-[#1C837F] transition-all ${isMenuOpen ? "translate-y-2 rotate-45" : ""
							}`}
					/>
					<span
						className={`block h-0.5 w-6 bg-[#1C837F] transition-all ${isMenuOpen ? "opacity-0" : ""
							}`}
					/>
					<span
						className={`block h-0.5 w-6 bg-[#1C837F] transition-all ${isMenuOpen ? "-translate-y-2 -rotate-45" : ""
							}`}
					/>
				</button>
			</div>

			{/* Menú móvil desplegable */}
			{isMenuOpen && (
				<div className="absolute left-0 right-0 top-full bg-[#E0F2F1] shadow-lg lg:hidden">
					<nav className="flex flex-col border-t border-[#1C837F]/20 px-6 py-4">
						<a
							href="#inicio"
							onClick={(e) => handleNavClick(e, "#inicio")}
							className="py-3 text-base font-medium text-[#4A5568] transition-colors hover:text-[#1C837F]"
						>
							Inicio
						</a>
						<a
							href="#sobre-nosotros"
							onClick={(e) => handleNavClick(e, "#sobre-nosotros")}
							className="py-3 text-base font-medium text-[#4A5568] transition-colors hover:text-[#1C837F]"
						>
							Sobre nosotros
						</a>
						<a
							href="#servicios"
							onClick={(e) => handleNavClick(e, "#servicios")}
							className="py-3 text-base font-medium text-[#4A5568] transition-colors hover:text-[#1C837F]"
						>
							Servicios
						</a>
						<a
							href="#contactanos"
							onClick={(e) => handleNavClick(e, "#contactanos")}
							className="py-3 text-base font-medium text-[#4A5568] transition-colors hover:text-[#1C837F]"
						>
							Contáctanos
						</a>
						<div className="mt-4 flex flex-col gap-3 border-t border-[#1C837F]/20 pt-4">
							<Link
								to="/auth/login"
								onClick={closeMenu}
								className="rounded-full border-2 border-[#1C837F] bg-white px-6 py-2.5 text-center text-sm font-medium text-[#1C837F] transition-colors hover:bg-[#E0F2F1]"
							>
								Iniciar Sesión
							</Link>
							<Link
								to="/auth/register"
								onClick={closeMenu}
								className="rounded-full bg-[#1C837F] px-6 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-[#156B68]"
							>
								Registrarse
							</Link>
						</div>
					</nav>
				</div>
			)}
		</header>
	);
};

export default HeaderLanding;
