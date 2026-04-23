import { Calendar } from "lucide-react";
import { formatFechaCorta } from "../utils/dateUtils";

type FiltroFechaCardProps = {
	fechaDesde: string;
	fechaHasta: string;
};

/**
 * Card que muestra el rango de fechas aplicado en el filtro.
 * Solo tiene sentido mostrarla cuando al menos una fecha está definida.
 */
const FiltroFechaCard = ({ fechaDesde, fechaHasta }: FiltroFechaCardProps) => {
	const tieneDesde = fechaDesde.length >= 10;
	const tieneHasta = fechaHasta.length >= 10;
	if (!tieneDesde && !tieneHasta) return null;

	return (
		<div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-cloud/50 px-4 py-3">
			<div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700">
				<Calendar className="h-4 w-4" />
			</div>
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-brand-800">
				{tieneDesde && (
					<span>
						<strong className="text-brand-900">Desde:</strong>{" "}
						{formatFechaCorta(fechaDesde)}
					</span>
				)}
				{tieneHasta && (
					<span>
						<strong className="text-brand-900">Hasta:</strong>{" "}
						{formatFechaCorta(fechaHasta)}
					</span>
				)}
			</div>
		</div>
	);
};

export default FiltroFechaCard;
