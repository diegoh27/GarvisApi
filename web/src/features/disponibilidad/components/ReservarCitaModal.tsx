import { X } from "lucide-react";
import type { Eco } from "../../ecos/ecosApi";
import type { DisponibilidadPublicaPorEcoItem } from "../disponibilidadApi";
import ReservarCitaParaMiForm from "./ReservarCitaParaMiForm";

type ReservarCitaModalProps = {
	block: DisponibilidadPublicaPorEcoItem;
	eco: Eco;
	onClose: () => void;
	onSuccess?: () => void;
};

const ReservarCitaModal = ({
	block,
	eco,
	onClose,
	onSuccess,
}: ReservarCitaModalProps) => {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="relative flex w-full max-w-3xl max-h-[90vh] flex-col rounded-xl bg-paper shadow-lg">
				<div className="flex items-center justify-between border-b border-mist p-4">
					<h2 className="text-lg font-semibold text-brand-900">Reservar cita</h2>
					<button
						onClick={onClose}
						className="rounded-lg p-1 text-brand-800 hover:bg-cloud"
						aria-label="Cerrar"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<ReservarCitaParaMiForm
					block={block}
					eco={eco}
					onClose={onClose}
					onSuccess={onSuccess}
				/>
			</div>
		</div>
	);
};

export default ReservarCitaModal;
