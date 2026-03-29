import { NavLink } from "react-router-dom";
import { LayoutGrid, CalendarPlus, CalendarCheck, UserCircle } from "lucide-react";

type BottomNavItem = {
	label: string;
	to: string;
	icon: typeof LayoutGrid;
	disabled?: boolean;
};

type MobilePatientBottomNavProps = {
	tienePagoPendiente?: boolean;
};

const MobilePatientBottomNav = ({ tienePagoPendiente = false }: MobilePatientBottomNavProps) => {
	const items: BottomNavItem[] = [
		{ label: "Inicio", to: "/dashboard", icon: LayoutGrid },
		{
			label: "Agendar",
			to: "/agendar-cita",
			icon: CalendarPlus,
			disabled: tienePagoPendiente,
		},
		{ label: "Mis Citas", to: "/citas", icon: CalendarCheck },
		{ label: "Perfil", to: "/configuracion", icon: UserCircle },
	];

	return (
		<nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-5 pt-2.5 bg-white/90 backdrop-blur-lg rounded-t-3xl shadow-[0_-4px_20px_rgba(5,69,66,0.08)] z-50">
			{items.map((item) => {
				const Icon = item.icon;

				if (item.disabled) {
					return (
						<span
							key={item.to}
							className="flex flex-col items-center justify-center text-slate-300 px-4 py-1.5 cursor-not-allowed"
							title="Tiene una cita con pago pendiente de verificación"
						>
							<Icon className="h-5 w-5" />
							<span className="text-[10px] font-semibold uppercase tracking-wider mt-1">
								{item.label}
							</span>
						</span>
					);
				}

				return (
					<NavLink
						key={item.to}
						to={item.to}
						end={item.to === "/dashboard"}
						className={({ isActive }) =>
							`flex flex-col items-center justify-center px-4 py-1.5 rounded-xl transition-all duration-300 ease-out tap-highlight-transparent ${
								isActive
									? "bg-brand-100 text-brand-800"
									: "text-slate-400 hover:text-brand-600"
							}`
						}
						style={{ WebkitTapHighlightColor: "transparent" }}
					>
						{({ isActive }) => (
							<>
								<Icon
									className="h-5 w-5"
									{...(isActive ? { strokeWidth: 2.5 } : {})}
								/>
								<span className="text-[10px] font-semibold uppercase tracking-wider mt-1">
									{item.label}
								</span>
							</>
						)}
					</NavLink>
				);
			})}
		</nav>
	);
};

export default MobilePatientBottomNav;
