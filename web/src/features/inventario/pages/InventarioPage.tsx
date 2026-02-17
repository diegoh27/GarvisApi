import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { RefreshCw } from "lucide-react";
import { baseApi } from "../../../app/api/baseApi";
import { useAuth } from "../../../shared";
import { useGetPermisosInventarioQuery } from "../../roles/rolesApi";
import ProductosPage from "./ProductosPage";
import ObligacionesPage from "./ObligacionesPage";
import NominaPage from "./NominaPage";
import AlquilerPage from "./AlquilerPage";
import ComisionesEspecialistasPage from "./ComisionesEspecialistasPage";
import FacturacionPage from "./FacturacionPage";

const INVENTARIO_TAGS = [
	"Productos",
	"Compras",
	"HistorialCompras",
	"Ajustes",
	"HistorialAjustes",
	"EntesLegales",
	"Obligaciones",
	"HistorialEnteLegal",
	"Empleado",
	"NominaPago",
	"AlquilerContrato",
	"AlquilerPago",
	"EspecialistaComision",
	"Facturacion",
] as const;

type TabType =
	| "productos"
	| "entes"
	| "nomina"
	| "alquiler"
	| "comisiones"
	| "facturacion";

const ALL_TABS: { id: TabType; label: string }[] = [
	{ id: "productos", label: "Producto" },
	{ id: "entes", label: "Entes Legales" },
	{ id: "nomina", label: "Nómina" },
	{ id: "alquiler", label: "Alquiler" },
	{ id: "comisiones", label: "Comisiones" },
	{ id: "facturacion", label: "Facturación" },
];

export default function InventarioPage() {
	const dispatch = useDispatch();
	const { user } = useAuth();
	const { data: permisos, isLoading: permisosLoading } =
		useGetPermisosInventarioQuery(undefined, {
			skip: user?.rol !== "admin" && user?.rol !== "moderador",
		});
	const [activeTab, setActiveTab] = useState<TabType>("productos");
	const [isRefreshing, setIsRefreshing] = useState(false);

	const isAdmin = user?.rol === "admin";
	const isModerador = user?.rol === "moderador";

	const tabs = useMemo(() => {
		if (isAdmin) return ALL_TABS;
		if (isModerador && permisos) {
			const list = ALL_TABS.filter((t) => permisos[t.id] === true);
			// Si por config quedan cero pestañas, mostrar al menos Producto para no dejar la barra vacía
			return list.length > 0 ? list : [ALL_TABS[0]];
		}
		// Moderador sin permisos cargados aún: conservador (sin facturación)
		if (isModerador && permisosLoading) {
			return ALL_TABS.filter((t) => t.id !== "facturacion");
		}
		return ALL_TABS.filter((t) => t.id !== "facturacion");
	}, [isAdmin, isModerador, permisos, permisosLoading]);

	// Si el tab activo ya no está permitido (ej. era facturacion y dejó de ser admin), ir al primero
	const safeActiveTab = useMemo(() => {
		const allowed = tabs.map((t) => t.id);
		return allowed.includes(activeTab) ? activeTab : (tabs[0]?.id ?? "productos");
	}, [activeTab, tabs]);

	useEffect(() => {
		if (!tabs.some((t) => t.id === activeTab)) {
			setActiveTab((tabs[0]?.id ?? "productos") as TabType);
		}
	}, [tabs, activeTab]);

	const handleRefrescar = () => {
		setIsRefreshing(true);
		dispatch(baseApi.util.invalidateTags(INVENTARIO_TAGS as unknown as string[]));
		setTimeout(() => setIsRefreshing(false), 400);
	};

	return (
		<div className="min-h-screen bg-gray-100">
			{/* Tab Navigation */}
			<div className="bg-white border-b border-gray-200">
				<div className="max-w-7xl mx-auto w-full">
					<div className="flex items-center justify-between gap-3 px-2 sm:px-0">
						<div className="overflow-x-auto flex-1 min-w-0">
							<div className="flex flex-nowrap gap-0 min-w-max">
								{tabs.map((tab) => (
									<button
										key={tab.id}
										onClick={() => setActiveTab(tab.id)}
										className={`px-6 py-4 font-medium text-sm transition-colors ${safeActiveTab === tab.id
											? "text-teal-600 border-b-2 border-teal-600"
											: "text-gray-600 hover:text-gray-900"
											}`}
										style={{ whiteSpace: "nowrap" }}
									>
										{tab.label}
									</button>
								))}
							</div>
						</div>
						<button
							type="button"
							onClick={handleRefrescar}
							disabled={isRefreshing}
							className="flex items-center gap-2 shrink-0 px-4 py-2.5 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
							title="Refrescar todos los datos de inventario"
						>
							<RefreshCw
								className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
								aria-hidden
							/>
							<span className="hidden sm:inline">Refrescar</span>
						</button>
					</div>
				</div>
			</div>

			{/* Tab Content */}
			<div className="max-w-7xl mx-auto">
				{safeActiveTab === "productos" && <ProductosPage />}
				{safeActiveTab === "entes" && <ObligacionesPage />}
				{safeActiveTab === "nomina" && <NominaPage />}
				{safeActiveTab === "alquiler" && <AlquilerPage />}
				{safeActiveTab === "comisiones" && <ComisionesEspecialistasPage />}
				{safeActiveTab === "facturacion" && <FacturacionPage />}
			</div>
		</div>
	);
}
