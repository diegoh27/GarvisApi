import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
	Bell,
	CalendarCheck,
	CalendarDays,
	FileCheck,
	FileText,
	Home,
	Package,
	Receipt,
	Settings,
	ShieldCheck,
	ShieldAlert,
	Stethoscope,
	UserPlus,
	Users,
	ListChecks,
	CreditCard,
} from "lucide-react";
import { useAuth } from "../shared";
import { useGetMisNotificacionesQuery } from "../features/notificaciones/notificacionesApi";
import Sidebar, { type NavItem } from "./Sidebar";
import Topbar from "./Topbar";
import { DolarInfoBanner } from "../features/dolar";

const navByRole: Record<string, NavItem[]> = {
	admin: [
		// Navegación principal
		{ label: "Home", to: "/dashboard", icon: Home },
		{ label: "Calendario", to: "/calendario-moderador", icon: CalendarDays },
		{ label: "Todas las citas", to: "/todas-las-citas", icon: ListChecks },
		{ label: "Verificación de pagos", to: "/pagos", icon: Receipt },
		{ label: "Disponibilidad pendientes", to: "/disponibilidad/pendientes", icon: CalendarCheck },
		// Gestión de pacientes
		{ label: "Pacientes", to: "/pacientes", icon: Users },
		// Resultados e informes
		{ label: "Subir resultados", to: "/resultados", icon: FileCheck },
		{ label: "Informes", to: "/informes", icon: FileText },
		// Gestión de inventario
		{ label: "Inventario", to: "/inventario", icon: Package },
		// Administración de usuarios
		{ label: "Usuarios", to: "/usuarios", icon: Users },
		{ label: "Moderadores", to: "/moderadores", icon: ShieldCheck },
		{ label: "Registrar especialista", to: "/admin/registrar-especialista", icon: UserPlus },
		{ label: "Registrar moderador", to: "/admin/registrar-moderador", icon: UserPlus },
		{ label: "Métodos de pago", to: "/admin/metodos-pago", icon: CreditCard },
		// Configuración del sistema
		{ label: "Especialidades", to: "/especialidades", icon: Stethoscope },
		{ label: "Ecos", to: "/ecos", icon: FileCheck },
		// Auditoría
		{ label: "Auditoría de Eventos", to: "/auditoria", icon: ShieldAlert },
		// Notificaciones (penúltimo)
		{ label: "Notificaciones", to: "/notificaciones", icon: Bell },
		// Configuración (último)
		{ label: "Configuración", to: "/configuracion", icon: Settings },
	],
	moderador: [
		// Navegación principal
		{ label: "Home", to: "/dashboard", icon: Home },
		{ label: "Calendario", to: "/calendario-moderador", icon: CalendarDays },
		{ label: "Todas las citas", to: "/todas-las-citas", icon: ListChecks },
		{ label: "Verificación de pagos", to: "/pagos", icon: Receipt },
		{ label: "Disponibilidad pendientes", to: "/disponibilidad/pendientes", icon: CalendarCheck },
		// Gestión de pacientes
		{ label: "Pacientes", to: "/pacientes", icon: Users },
		// Resultados e informes
		{ label: "Subir resultados", to: "/resultados", icon: FileCheck },
		{ label: "Informes", to: "/informes", icon: FileText },
		// Gestión de inventario
		{ label: "Inventario", to: "/inventario", icon: Package },
		// Auditoría
		{ label: "Auditoría de Eventos", to: "/auditoria", icon: ShieldAlert },
		// Notificaciones (penúltimo)
		{ label: "Notificaciones", to: "/notificaciones", icon: Bell },
		// Configuración (último)
		{ label: "Configuración", to: "/configuracion", icon: Settings },
	],
	especialista: [
		{ label: "Home", to: "/dashboard", icon: Home },
		{ label: "Calendario", to: "/calendario", icon: CalendarDays },
		{ label: "Pacientes", to: "/pacientes-especialista", icon: Users },
		{ label: "Subir resultados", to: "/resultados", icon: FileCheck },
		{ label: "Informes", to: "/informes", icon: FileText },
		{ label: "Notificaciones", to: "/notificaciones", icon: Bell },
		{ label: "Configuración", to: "/configuracion", icon: Settings },
	],
	paciente: [
		{ label: "Home", to: "/dashboard", icon: Home },
		{ label: "Agendar cita", to: "/disponibilidad", icon: CalendarDays },
		{ label: "Mis citas", to: "/citas", icon: CalendarCheck },
		{ label: "Representados", to: "/representados", icon: Users },
		// { label: "Especialistas", to: "/especialistas", icon: Stethoscope },
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

	const { data: notificacionesNoLeidas = [] } = useGetMisNotificacionesQuery(
		{ solo_no_leidas: true, limit: 200 },
		{
			skip: !token,
			pollingInterval: 20000,
			refetchOnFocus: true,
		},
	);
	const unreadCount = notificacionesNoLeidas.length;
	const navItemsWithBadges = navItems.map((item) =>
		item.to === "/notificaciones" && unreadCount > 0
			? { ...item, badge: unreadCount }
			: item,
	);

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
					navItems={navItemsWithBadges}
					isOpen={sidebarOpen}
					onClose={closeSidebar}
				/>
				<div className="flex min-h-screen flex-1 flex-col min-w-0">
					<Topbar
						onToggleSidebar={toggleSidebar}
						fullName={fullName}
						role={user?.rol}
						onLogout={handleLogout}
					/>
					<main className="flex-1 p-4 sm:p-6 min-w-0">
						{/* Banner informativo de tasa del dólar */}
						{(role === "admin" || role === "moderador" || role === "paciente") && (
							<DolarInfoBanner />
						)}
						<Outlet />
					</main>
				</div>
			</div>
		</div>
	);
};

export default AppLayout;
