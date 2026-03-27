import { useState } from "react";
import { useGetDolarOficialQuery } from "../dolarApi";
import { convertUSDToVES, formatVES, formatFechaHoraLocal, useAuth } from "../../../shared";
import { DollarSign, RefreshCw, Calendar, Calculator, ChevronDown, ChevronUp } from "lucide-react";

const formatFecha = (fechaString: string): string =>
	fechaString ? formatFechaHoraLocal(fechaString) : "Fecha no disponible";

const DolarInfoBanner = () => {
	const { user } = useAuth();
	const { data, isLoading, error, refetch } = useGetDolarOficialQuery();
	const [montoUSD, setMontoUSD] = useState<string>("");
	const [isExpanded, setIsExpanded] = useState(true);

	// Ocultar permanentemente para los pacientes
	if (user?.rol === "paciente") {
		return null;
	}

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

	const montoNumerico = parseFloat(montoUSD) || 0;
	const montoVES = montoNumerico > 0 ? convertUSDToVES(montoNumerico, data.promedio) : 0;

	return (
		<div className="mb-4 rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100 px-4 py-3 shadow-sm transition-all duration-300">
			<div className="flex flex-col gap-3">
				{/* Top Header Toggle */}
				<div className="flex items-center justify-between">
					<div 
						className="flex items-center gap-2 cursor-pointer select-none group"
						onClick={() => setIsExpanded(!isExpanded)}
						title={isExpanded ? "Ocultar calculadora" : "Mostrar calculadora"}
					>
						<div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-emerald-600 text-white transition-transform group-hover:scale-105">
							<DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
						</div>
						<div className="flex flex-col">
							<div className="flex items-center gap-1.5">
								<span className="text-sm font-bold text-emerald-900">
									Tasa BCV: <span className="text-emerald-700">Bs. {data.promedio.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
								</span>
								{isExpanded ? (
									<ChevronUp className="h-4 w-4 text-emerald-600 transition-transform group-hover:-translate-y-0.5" />
								) : (
									<ChevronDown className="h-4 w-4 text-emerald-600 transition-transform group-hover:translate-y-0.5" />
								)}
							</div>
							{!isExpanded && (
								<div className="flex items-center gap-1 text-[10px] sm:text-xs text-emerald-600">
									<Calendar className="h-3 w-3" />
									<span>Act. {fechaActualizacion}</span>
								</div>
							)}
						</div>
					</div>
					
					{!isExpanded && (
						<button
							onClick={() => refetch()}
							className="flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
							title="Actualizar tasa"
						>
							<RefreshCw className="h-3 w-3" />
							<span className="hidden sm:inline">Actualizar</span>
						</button>
					)}
				</div>

				{/* Expanded Content */}
				{isExpanded && (
					<div className="animate-in fade-in slide-in-from-top-2 duration-300">
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3 pl-10 sm:pl-12">
							<div className="flex items-center gap-1 text-xs text-emerald-600">
								<Calendar className="h-3 w-3" />
								<span>Actualizado {fechaActualizacion}</span>
							</div>
							<button
								onClick={() => refetch()}
								className="flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 w-fit"
								title="Actualizar tasa"
							>
								<RefreshCw className="h-3 w-3" />
								Actualizar
							</button>
						</div>

						{/* Calculadora interactiva */}
						<div className="border-t border-emerald-200/60 pt-3">
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
				)}
			</div>
		</div>
	);
};

export default DolarInfoBanner;
