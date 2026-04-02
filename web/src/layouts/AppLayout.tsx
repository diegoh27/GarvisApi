import { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
	CalendarCheck,
	CalendarDays,
	FileCheck,
	FileText,
	Home,
	Package,
	Receipt,
	ShieldCheck,
	ShieldAlert,
	Stethoscope,
	UserPlus,
	Users,
	ListChecks,
	CreditCard,
	Wallet,
	Store,
} from "lucide-react";
import { useAuth } from "../shared";
import { useGetMisNotificacionesQuery } from "../features/notificaciones/notificacionesApi";
import { useGetTienePagoPendienteQuery } from "../features/citas/citasApi";
import Sidebar, { type NavItem } from "./Sidebar";
import Topbar from "./Topbar";
import MobilePatientTopbar from "./MobilePatientTopbar";
import MobilePatientBottomNav from "./MobilePatientBottomNav";
import { DolarFloatingWidget } from "../features/dolar";
import { MODERADOR_MENU_MODULES } from "../features/roles/moderadorMenuModules";
import { useGetPermisosMenuQuery } from "../features/roles/rolesApi";

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
		{ label: "Finanzas", to: "/finanzas", icon: Wallet },
		// Administración de usuarios
		{ label: "Usuarios", to: "/usuarios", icon: Users },
		{ label: "Moderadores", to: "/moderadores", icon: ShieldCheck },
		{ label: "Registrar especialista", to: "/admin/registrar-especialista", icon: UserPlus },
		{ label: "Registrar moderador", to: "/admin/registrar-moderador", icon: UserPlus },
		{ label: "Métodos de pago", to: "/admin/metodos-pago", icon: CreditCard },
		// Configuración del sistema
		{ label: "Especialidades", to: "/especialidades", icon: Stethoscope },
		{ label: "Ecos", to: "/ecos", icon: FileCheck },
		{ label: "Cita Mostrador", to: "/cita-mostrador", icon: Store },
		// Auditoría
		{ label: "Auditoría de Eventos", to: "/auditoria", icon: ShieldAlert },
	],
	moderador: [
		// Placeholder: el menú real se arma en AppLayout con MODERADOR_MENU_MODULES + permisos.
		{ label: "Home", to: "/dashboard", icon: Home },
	],
	especialista: [
		{ label: "Home", to: "/dashboard", icon: Home },
		{ label: "Calendario", to: "/calendario", icon: CalendarDays },
		{ label: "Pacientes", to: "/pacientes-especialista", icon: Users },
		{ label: "Subir resultados", to: "/resultados", icon: FileCheck },
		{ label: "Informes", to: "/informes", icon: FileText },
	],
	paciente: [
		{ label: "Home", to: "/dashboard", icon: Home },
		{ label: "Agendar cita", to: "/agendar-cita", icon: CalendarDays },
		{ label: "Mis citas", to: "/citas", icon: CalendarCheck },
		{ label: "Representados", to: "/representados", icon: Users },
		// { label: "Especialistas", to: "/especialistas", icon: Stethoscope },
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

	const { data: menuPermisosModerador } = useGetPermisosMenuQuery(undefined, {
		skip: role !== "moderador",
	});

	const navItems = useMemo(() => {
		if (role !== "moderador") {
			return navByRole[role] ?? [];
		}
		const home: NavItem = { label: "Home", to: "/dashboard", icon: Home };
		const auditoria: NavItem = {
			label: "Auditoría de Eventos",
			to: "/auditoria",
			icon: ShieldAlert,
		};
		const perm = menuPermisosModerador;
		const middle: NavItem[] = MODERADOR_MENU_MODULES.filter((m) => {
			if (!perm) return true;
			return perm[m.key] === true;
		}).map((m) => ({
			label: m.label,
			to: m.to,
			icon: m.icon,
		}));
		return [home, ...middle, auditoria];
	}, [role, menuPermisosModerador]);

	const showShell = !!token && !isAuthRoute;

	const { data: notificacionesNoLeidas = [] } = useGetMisNotificacionesQuery(
		{ solo_no_leidas: true, limit: 200 },
		{
			skip: !token,
			pollingInterval: 20000,
			refetchOnFocus: true,
		},
	);
	const { data: tienePagoData } = useGetTienePagoPendienteQuery(undefined, {
		skip: role !== "paciente",
	});
	const tienePagoPendiente = tienePagoData?.tienePagoPendiente ?? false;
	const unreadCount = notificacionesNoLeidas.length;
	const navItemsWithBadges = navItems.map((item) =>
			item.to === "/disponibilidad" && role === "paciente" && tienePagoPendiente
				? {
						...item,
						disabled: true,
						disabledTitle: "Tiene una cita con pago pendiente de verificación",
					}
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

	const isPaciente = role === "paciente";

	return (
		<div className="min-h-screen bg-mist text-brand-900">
			{/* Overlay para móvil cuando el sidebar está abierto (NO paciente) */}
			{sidebarOpen && !isPaciente && (
				<div
					className="fixed inset-0 z-40 bg-black/50 lg:hidden"
					onClick={closeSidebar}
					aria-hidden="true"
				/>
			)}

			{/* Mobile patient topbar: solo visible en <lg para pacientes */}
			{isPaciente && (
				<div className="lg:hidden">
					<MobilePatientTopbar
						fullName={fullName}
						unreadCount={unreadCount}
						role={user?.rol}
						onLogout={handleLogout}
					/>
				</div>
			)}

			<div className="flex min-h-screen">
				{/* Sidebar: para pacientes se oculta completamente en mobile, para otros roles mantiene comportamiento normal */}
				{isPaciente ? (
					<div className="hidden lg:block">
						<Sidebar
							navItems={navItemsWithBadges}
							isOpen={false}
							onClose={() => {}}
						/>
					</div>
				) : (
					<Sidebar
						navItems={navItemsWithBadges}
						isOpen={sidebarOpen}
						onClose={closeSidebar}
					/>
				)}

				<div className="flex min-h-screen flex-1 flex-col min-w-0">
					{/* Topbar: para pacientes se oculta en mobile (reemplazada por MobilePatientTopbar), otros roles normal */}
					{isPaciente ? (
						<div className="hidden lg:block">
							<Topbar
								onToggleSidebar={toggleSidebar}
								fullName={fullName}
								role={user?.rol}
								onLogout={handleLogout}
								unreadCount={unreadCount}
							/>
						</div>
					) : (
						<Topbar
							onToggleSidebar={toggleSidebar}
							fullName={fullName}
							role={user?.rol}
							onLogout={handleLogout}
							unreadCount={unreadCount}
						/>
					)}

					<main
						className={`flex-1 p-4 sm:p-6 min-w-0 ${
							isPaciente ? "mt-16 pb-24 lg:mt-0 lg:pb-0" : "bg-shell"
						}`}
					>
						<Outlet />
					</main>
				</div>
			</div>

			{(role === "admin" || role === "moderador") && <DolarFloatingWidget />}

			{/* Mobile bottom nav: solo visible en <lg para pacientes */}
			{isPaciente && (
				<div className="lg:hidden">
					<MobilePatientBottomNav tienePagoPendiente={tienePagoPendiente} />
				</div>
			)}
		</div>
	);
};

export default AppLayout;
