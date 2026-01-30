import type { CitaCardItem } from "../../citas/components/CitaCard";
import CitaCard from "../../citas/components/CitaCard";

type CitasPorResultadoCardProps = {
	citas: CitaCardItem[];
	emptyMessage?: string;
	isLoading?: boolean;
	onVerCita?: (id_cita: string) => void;
};

const CitasPorResultadoCard = ({
	citas,
	emptyMessage = "Sin citas pendientes de resultado.",
	isLoading = false,
	onVerCita,
}: CitasPorResultadoCardProps) => {
	return (
		<div className="rounded-2xl bg-paper p-5 shadow-sm">
			<h3 className="text-sm font-semibold text-brand-900">
				Citas por Resultado (faltantes)
			</h3>
			{isLoading ? (
				<p className="mt-4 text-xs text-brand-600">Cargando...</p>
			) : citas.length ? (
				<div className="mt-4 space-y-2">
					{citas.map((item) => (
						<CitaCard
							key={item.id_cita}
							item={item}
							onClick={onVerCita}
							compact
						/>
					))}
				</div>
			) : (
				<p className="mt-4 text-xs text-brand-800">{emptyMessage}</p>
			)}
		</div>
	);
};

export default CitasPorResultadoCard;
