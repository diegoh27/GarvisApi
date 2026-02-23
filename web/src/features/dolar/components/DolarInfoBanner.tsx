import { useState } from "react";
import { useGetDolarOficialQuery } from "../dolarApi";
import { convertUSDToVES, formatVES, formatFechaHoraLocal } from "../../../shared";
import { DollarSign, RefreshCw, Calendar, Calculator } from "lucide-react";

const formatFecha = (fechaString: string): string =>
	fechaString ? formatFechaHoraLocal(fechaString) : "Fecha no disponible";

const DolarInfoBanner = () => {
	const { data, isLoading, error, refetch } = useGetDolarOficialQuery();
	const [montoUSD, setMontoUSD] = useState<string>("");

	if (isLoading) {
		return (
			<div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
				<div className="flex items-center gap-2 text-sm text-emerald-700">
					<RefreshCw className="h-4 w-4 animate-spin" />
					<span>Cargando tasa del dólar...</span>
				</div>
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 text-sm text-amber-700">
						<DollarSign className="h-4 w-4" />
						<span>No se pudo cargar la tasa del dólar</span>
					</div>
					<button
						onClick={() => refetch()}
						className="text-xs font-semibold text-amber-700 hover:text-amber-800"
					>
						Reintentar
					</button>
				</div>
			</div>
		);
	}

	const fechaActualizacion = data.fechaActualizacion
		? formatFecha(data.fechaActualizacion)
		: "Fecha no disponible";

	// Calcular conversión en tiempo real
	const montoNumerico = parseFloat(montoUSD) || 0;
	const montoVES = montoNumerico > 0 ? convertUSDToVES(montoNumerico, data.promedio) : 0;

	return (
		<div className="mb-4 rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100 px-4 py-3 shadow-sm">
			<div className="flex flex-col gap-3">
				{/* Información principal de la tasa */}
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
							<DollarSign className="h-5 w-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<span className="text-sm font-semibold text-emerald-900">
									Tasa BCV (Oficial):
								</span>
								<span className="text-lg font-bold text-emerald-700">
									Bs. {data.promedio.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
								</span>
							</div>
							<div className="flex items-center gap-1 text-xs text-emerald-600">
								<Calendar className="h-3 w-3" />
								<span>Actualizado {fechaActualizacion}</span>
							</div>
						</div>
					</div>
					<button
						onClick={() => refetch()}
						className="flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
						title="Actualizar tasa"
					>
						<RefreshCw className="h-3 w-3" />
						Actualizar
					</button>
				</div>

				{/* Calculadora interactiva */}
				<div className="border-t border-emerald-200 pt-3">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-2">
							<Calculator className="h-4 w-4 text-emerald-600" />
							<span className="text-xs font-semibold text-emerald-900">Calculadora:</span>
						</div>
						<div className="flex flex-1 items-center gap-2 sm:justify-end">
							<div className="flex items-center gap-2">
								<input
									type="number"
									step="0.01"
									min="0"
									placeholder="0.00"
									value={montoUSD}
									onChange={(e) => setMontoUSD(e.target.value)}
									className="h-8 w-24 rounded-md border border-emerald-300 px-2 text-xs font-semibold text-emerald-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
								/>
								<span className="text-xs font-semibold text-emerald-700">USD</span>
								<span className="text-xs text-emerald-600">=</span>
								<span className="min-w-[100px] rounded-md bg-white px-2 py-1 text-xs font-bold text-emerald-800">
									{montoNumerico > 0 ? formatVES(montoVES) : "Bs. 0,00"}
								</span>
							</div>
							{montoUSD && (
								<button
									onClick={() => setMontoUSD("")}
									className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
									title="Limpiar"
								>
									✕
								</button>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default DolarInfoBanner;
