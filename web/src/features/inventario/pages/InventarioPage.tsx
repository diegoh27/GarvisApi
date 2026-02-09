import { useState } from "react";
import ProductosPage from "./ProductosPage";
import ObligacionesPage from "./ObligacionesPage";
import NominaPage from "./NominaPage";

type TabType = "productos" | "entes" | "nomina" | "alquiler" | "facturacion";

export default function InventarioPage() {
	const [activeTab, setActiveTab] = useState<TabType>("productos");

	const tabs: { id: TabType; label: string }[] = [
		{ id: "productos", label: "Producto" },
		{ id: "entes", label: "Entes Legales" },
		{ id: "nomina", label: "Nómina" },
		{ id: "alquiler", label: "Alquiler" },
		{ id: "facturacion", label: "Facturación" },
	];

	return (
		<div className="min-h-screen bg-gray-100">
			{/* Tab Navigation */}
			<div className="bg-white border-b border-gray-200">
				<div className="max-w-7xl mx-auto w-full">
					<div className="overflow-x-auto w-full">
						<div className="flex flex-nowrap gap-0 min-w-max">
							{tabs.map((tab) => (
								<button
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={`px-6 py-4 font-medium text-sm transition-colors ${activeTab === tab.id
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
				</div>
			</div>

			{/* Tab Content */}
			<div className="max-w-7xl mx-auto">
				{activeTab === "productos" && <ProductosPage />}
				{activeTab === "entes" && <ObligacionesPage />}
				{activeTab === "nomina" && <NominaPage />}
				{activeTab === "alquiler" && (
					<div className="p-6">
						<p className="text-gray-600">
							Esta sección aún no está implementada
						</p>
					</div>
				)}
				{activeTab === "facturacion" && (
					<div className="p-6">
						<p className="text-gray-600">
							Esta sección aún no está implementada
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
