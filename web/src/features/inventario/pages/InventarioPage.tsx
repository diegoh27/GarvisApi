import { useState } from "react";
import { useDispatch } from "react-redux";
import { RefreshCw } from "lucide-react";
import { baseApi } from "../../../app/api/baseApi";
import ProductosPage from "./ProductosPage";
import ProveedoresPage from "./ProveedoresPage";
import ComprasPage from "./ComprasPage";
import CrearOrdenCompraPage from "./CrearOrdenCompraPage";
import RecepcionComprasPage from "./RecepcionComprasPage";
import RecetasPage from "./RecetasPage";
import KardexPage from "./KardexPage";

const INVENTARIO_TAGS = [
	"Productos",
	"Compras",
	"HistorialCompras",
	"Ajustes",
	"HistorialAjustes",
	"InventarioAuditoria",
] as const;

type TabType = "productos" | "proveedores" | "ordenes_compra" | "recepcion_compras" | "compras" | "recetas" | "kardex";

const ALL_TABS: { id: TabType; label: string }[] = [
	{ id: "productos", label: "Productos" },
	{ id: "proveedores", label: "Proveedores" },
	{ id: "ordenes_compra", label: "Órdenes de Compra" },
	{ id: "recepcion_compras", label: "Facturas de Compra" },
	{ id: "compras", label: "Compras Rápidas" },
	{ id: "recetas", label: "Recetas" },
	{ id: "kardex", label: "Movimientos de inventario" },
];

export default function InventarioPage() {
	const dispatch = useDispatch();
	const [activeTab, setActiveTab] = useState<TabType>("productos");
	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleRefrescar = () => {
		setIsRefreshing(true);
		dispatch(baseApi.util.invalidateTags(INVENTARIO_TAGS as any));
		setTimeout(() => setIsRefreshing(false), 400);
	};

	return (
		<div className="w-full bg-transparent">
			{/* Tab Navigation */}
			<div className="mb-5 bg-white border-b border-gray-200 rounded-t-2xl sm:rounded-2xl shadow-sm">
				<div className="w-full">
					<div className="flex items-center justify-between gap-3 px-4 sm:px-6">
						<div className="overflow-x-auto flex-1 min-w-0">
							<div className="flex flex-nowrap gap-0 min-w-max">
								{ALL_TABS.map((tab) => (
									<button
										key={tab.id}
										onClick={() => setActiveTab(tab.id)}
										className={`px-6 py-4 font-medium text-base transition-colors ${activeTab === tab.id
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
							className="flex items-center gap-2 shrink-0 px-4 py-2.5 text-base font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
			<div className="w-full pb-8">
				{activeTab === "productos" && <ProductosPage />}
				{activeTab === "proveedores" && <ProveedoresPage />}
				{activeTab === "ordenes_compra" && <CrearOrdenCompraPage />}
				{activeTab === "recepcion_compras" && <RecepcionComprasPage />}
				{activeTab === "compras" && <ComprasPage />}
				{activeTab === "recetas" && <RecetasPage />}
				{activeTab === "kardex" && <KardexPage />}
			</div>
		</div>
	);
}
