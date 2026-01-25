import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
	Bell,
	CalendarDays,
	FileCheck,
	FileText,
	Home,
	Package,
	Receipt,
	Settings,
	Stethoscope,
	Users,
} from "lucide-react";
import { useAuth } from "../shared";
import Sidebar, { type NavItem } from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";

const navByRole: Record<string, NavItem[]> = {
	admin: [
		{ label: "Home", to: "/dashboard", icon: Home },
		{ label: "Calendario", to: "/calendario", icon: CalendarDays },
		{ label: "Pacientes", to: "/pacientes", icon: Users },
		{ label: "Informes", to: "/informes", icon: FileText },
		{ label: "Notificaciones", to: "/notificaciones", icon: Bell },
		{ label: "Inventario", to: "/inventario", icon: Package },
		{ label: "Pagos e impuestos", to: "/pagos", icon: Receipt },
		{ label: "Configuración", to: "/configuracion", icon: Settings },
	],
	moderador: [
		{ label: "Home", to: "/dashboard", icon: Home },
		{ label: "Calendario", to: "/calendario", icon: CalendarDays },
		{ label: "Pacientes", to: "/pacientes", icon: Users },
		{ label: "Informes", to: "/informes", icon: FileText },
		{ label: "Notificaciones", to: "/notificaciones", icon: Bell },
		{ label: "Inventario", to: "/inventario", icon: Package },
		{ label: "Pagos e impuestos", to: "/pagos", icon: Receipt },
		{ label: "Configuración", to: "/configuracion", icon: Settings },
	],
	especialista: [
		{ label: "Home", to: "/dashboard", icon: Home },
		{ label: "Calendario", to: "/calendario", icon: CalendarDays },
		{ label: "Pacientes", to: "/pacientes", icon: Users },
		{ label: "Informes", to: "/informes", icon: FileText },
		{ label: "Notificaciones", to: "/notificaciones", icon: Bell },
		{ label: "Configuración", to: "/configuracion", icon: Settings },
	],
	paciente: [
		{ label: "Home", to: "/disponibilidad", icon: Home },
		{ label: "Calendario", to: "/citas", icon: CalendarDays },
		{ label: "Especialistas", to: "/especialistas", icon: Stethoscope },
		{ label: "Resultados", to: "/resultados", icon: FileCheck },
		{ label: "Notificaciones", to: "/notificaciones", icon: Bell },
		{ label: "Configuración", to: "/configuracion", icon: Settings },
	],
};

const AppLayout = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const { token, user, logout } = useAuth();
	const fullName = [user?.nombre, user?.apellido].filter(Boolean).join(" ") || null;
	const isAuthRoute = location.pathname.startsWith("/auth/");
	const role = user?.rol ?? "guest";
	const navItems = navByRole[role] ?? [];
	const showShell = !!token && !isAuthRoute;

	const handleLogout = () => {
		logout();
		navigate("/auth/login");
	};

	if (!showShell) {
		return (
			<div className="min-h-screen bg-base-100">
				<main className={isAuthRoute ? "min-h-screen" : "px-4 py-6"}>
					<Outlet />
				</main>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-mist text-brand-900">
			<div className="flex min-h-screen">
				<Sidebar navItems={navItems} />
				<div className="flex min-h-screen flex-1 flex-col">
					<Topbar
						fullName={fullName}
						role={user?.rol}
						onLogout={handleLogout}
					/>
					<main className="flex-1 p-6">
						<Outlet />
					</main>
				</div>
			</div>
		</div>
	);
};

export default AppLayout;
