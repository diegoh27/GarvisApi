import type { LucideIcon } from "lucide-react";
import {
	CalendarCheck,
	CalendarDays,
	ClipboardList,
	FileCheck,
	FileText,
	ListChecks,
	Package,
	Receipt,
	Stethoscope,
	UserPlus,
	Users,
	Wallet,
} from "lucide-react";
import type { PermisosMenuModerador } from "./rolesApi";

export type PermisoMenuKey = keyof PermisosMenuModerador;

export type ModeradorMenuModuleDef = {
	key: PermisoMenuKey;
	label: string;
	description: string;
	to: string;
	icon: LucideIcon;
};

/** Orden del menú lateral (debe coincidir con filtrado en AppLayout). */
export const MODERADOR_MENU_MODULES: ModeradorMenuModuleDef[] = [
	{
		key: "calendario",
		label: "Calendario",
		description: "Vista de agenda y disponibilidad diaria.",
		to: "/calendario-moderador",
		icon: CalendarDays,
	},
	{
		key: "todas_las_citas",
		label: "Todas las citas",
		description: "Listado y seguimiento de citas del sistema.",
		to: "/todas-las-citas",
		icon: ListChecks,
	},
	{
		key: "verificacion_pagos",
		label: "Verificación de pagos",
		description: "Auditar y aprobar transferencias y comprobantes.",
		to: "/pagos",
		icon: Receipt,
	},
	{
		key: "disponibilidad_pendientes",
		label: "Disponibilidad pendientes",
		description: "Revisar y aprobar franjas propuestas por especialistas.",
		to: "/disponibilidad/pendientes",
		icon: CalendarCheck,
	},
	{
		key: "pacientes",
		label: "Pacientes",
		description: "Consultar y gestionar fichas de pacientes.",
		to: "/pacientes",
		icon: Users,
	},
	{
		key: "subir_resultados",
		label: "Subir resultados",
		description: "Adjuntar estudios e informes de resultados.",
		to: "/resultados",
		icon: FileCheck,
	},
	{
		key: "informes",
		label: "Informes",
		description: "Acceso a informes médicos e informes completados.",
		to: "/informes",
		icon: FileText,
	},
	{
		key: "inventario",
		label: "Inventario",
		description: "Productos, stock y movimientos de inventario.",
		to: "/inventario",
		icon: Package,
	},
	{
		key: "finanzas",
		label: "Finanzas",
		description: "Módulos financieros y tableros relacionados.",
		to: "/finanzas",
		icon: Wallet,
	},
	{
		key: "registrar_especialista",
		label: "Registrar especialista",
		description: "Alta de nuevos especialistas en el sistema.",
		to: "/admin/registrar-especialista",
		icon: UserPlus,
	},
	{
		key: "registrar_moderador",
		label: "Registrar moderador",
		description: "Crear cuentas con rol moderador.",
		to: "/admin/registrar-moderador",
		icon: UserPlus,
	},
	{
		key: "especialidades",
		label: "Especialidades",
		description: "Catálogo de especialidades médicas.",
		to: "/especialidades",
		icon: Stethoscope,
	},
	{
		key: "ecos",
		label: "Ecos",
		description: "Configuración de ecografías y precios.",
		to: "/ecos",
		icon: ClipboardList,
	},
];
