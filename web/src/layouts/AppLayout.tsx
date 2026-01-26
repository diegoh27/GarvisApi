import { useState } from "react";
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
	UserPlus,
	Users,
} from "lucide-react";
import { useAuth } from "../shared";
import Sidebar, { type NavItem } from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";

const navByRole: Record<string, NavItem[]> = {
	admin: [
		{ label: "Home", to: "/dashboard", icon: Home },
		{ label: "Calendario", to: "/calendario-moderador", icon: CalendarDays },
		{ label: "Pacientes", to: "/pacientes", icon: Users },
		{ label: "Informes", to: "/informes", icon: FileText },
		{ label: "Notificaciones", to: "/notificaciones", icon: Bell },
		{ label: "Inventario", to: "/inventario", icon: Package },
		{ label: "Verificación de pagos", to: "/pagos", icon: Receipt },
		{ label: "Usuarios", to: "/usuarios", icon: Users },
		{ label: "Registrar especialista", to: "/admin/registrar-especialista", icon: UserPlus },
		{ label: "Registrar moderador", to: "/admin/registrar-moderador", icon: UserPlus },
		{ label: "Especialidades", to: "/especialidades", icon: Stethoscope },
		{ label: "Ecos", to: "/ecos", icon: FileCheck },
		{ label: "Configuración", to: "/configuracion", icon: Settings },
	],
	moderador: [
		{ label: "Home", to: "/dashboard", icon: Home },
		{ label: "Calendario", to: "/calendario-moderador", icon: CalendarDays },
		{ label: "Pacientes", to: "/pacientes", icon: Users },
		{ label: "Informes", to: "/informes", icon: FileText },
		{ label: "Notificaciones", to: "/notificaciones", icon: Bell },
		{ label: "Inventario", to: "/inventario", icon: Package },
		{ label: "Verificación de pagos", to: "/pagos", icon: Receipt },
		{ label: "Configuración", to: "/configuracion", icon: Settings },
	],
	especialista: [
		{ label: "Home", to: "/dashboard", icon: Home },
		{ label: "Calendario", to: "/calendario", icon: CalendarDays },
		{ label: "Pacientes", to: "/pacientes-especialista", icon: Users },
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
	const [sidebarOpen, setSidebarOpen] = useState(false);
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

	const toggleSidebar = () => {
		setSidebarOpen(!sidebarOpen);
	};

	const closeSidebar = () => {
		setSidebarOpen(false);
	};

	if (!showShell) {
		const isHomePage = location.pathname === "/";
		return (
			<div className="min-h-screen bg-base-100">
				<main className={isAuthRoute ? "min-h-screen" : isHomePage ? "" : "px-4 py-6"}>
					<Outlet />
				</main>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-mist text-brand-900">
			{/* Overlay para móvil cuando el sidebar está abierto */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 z-40 bg-black/50 lg:hidden"
					onClick={closeSidebar}
					aria-hidden="true"
				/>
			)}
			<div className="flex min-h-screen">
				<Sidebar
					navItems={navItems}
					isOpen={sidebarOpen}
					onClose={closeSidebar}
				/>
				<div className="flex min-h-screen flex-1 flex-col">
					<Topbar
						fullName={fullName}
						role={user?.rol}
						onLogout={handleLogout}
						onToggleSidebar={toggleSidebar}
					/>
					<main className="flex-1 p-4 sm:p-6">
						<Outlet />
					</main>
				</div>
			</div>
		</div>
	);
};

export default AppLayout;
