import { X, UserRound, Calendar, Hash } from "lucide-react";
import type { Representado } from "../../representados/representadosApi";
import { parseCedulaDisplay, formatFechaCortaLocal } from "../../../shared";

type ModalsProps = {
	isOpen: boolean;
	onClose: () => void;
	representado: Representado | null;
};

// Calculate age
const calcularEdad = (fechaNacimiento: string): number => {
	const hoy = new Date();
	const nac = new Date(`${fechaNacimiento.slice(0, 10)}T00:00:00`);
	let edad = hoy.getFullYear() - nac.getFullYear();
	const m = hoy.getMonth() - nac.getMonth();
	if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
	return edad;
};

const VerRepresentadoModal = ({ isOpen, onClose, representado }: ModalsProps) => {
	if (!isOpen || !representado) return null;

	const { tipo, numero } = parseCedulaDisplay(representado.cedula);
	const cedulaFormat = numero ? `${tipo}-${numero}` : "No registrada";
	const edad = calcularEdad(representado.fecha_nacimiento);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-brand-900/40 backdrop-blur-sm" onClick={onClose} />
			<div className="relative w-full max-w-sm bg-paper rounded-[2rem] shadow-2xl flex flex-col p-6 sm:p-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
				{/* Header */}
				<div className="flex items-center justify-between mb-6">
					<h3 className="font-headline text-xl font-bold text-brand-900">
						Datos del Familiar
					</h3>
					<button
						onClick={onClose}
						className="p-2 bg-cloud text-brand-600 rounded-full hover:bg-brand-200 hover:text-brand-800 transition-colors"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Body */}
				<div className="space-y-4">
					<div className="flex items-center gap-4 bg-brand-50 p-4 rounded-2xl border border-brand-100">
						<div className="w-12 h-12 rounded-full bg-brand-200 text-brand-800 flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
							{(representado.nombre[0] + representado.apellido[0]).toUpperCase()}
						</div>
						<div className="min-w-0">
							<p className="font-bold text-brand-900 text-lg truncate">
								{representado.nombre} {representado.apellido}
							</p>
							<p className="text-brand-600 text-sm font-medium uppercase tracking-wider truncate">
								{representado.parentesco ?? "Familiar"}
							</p>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="bg-cloud p-4 rounded-2xl flex flex-col gap-1">
							<Hash className="h-5 w-5 text-brand-600 mb-1" />
							<p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Cédula</p>
							<p className="font-semibold text-brand-900 text-base truncate" title={cedulaFormat}>{cedulaFormat}</p>
						</div>
						
						<div className="bg-cloud p-4 rounded-2xl flex flex-col gap-1">
							<Calendar className="h-5 w-5 text-brand-600 mb-1" />
							<p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Nacimiento</p>
							<p className="font-semibold text-brand-900 text-base">{formatFechaCortaLocal(representado.fecha_nacimiento)}</p>
							<p className="text-sm text-brand-600 font-medium">{edad} años</p>
						</div>

						<div className="col-span-2 bg-cloud p-4 rounded-2xl flex items-center gap-3">
							<UserRound className="h-5 w-5 text-brand-600 shrink-0" />
							<div>
								<p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Género</p>
								<p className="font-semibold text-brand-900 text-base">{representado.genero}</p>
							</div>
						</div>
					</div>
				</div>
				
				{/* Footer */}
				<div className="mt-8">
					<button
						onClick={onClose}
						className="w-full bg-brand-800 text-white font-bold py-3.5 rounded-xl hover:bg-brand-900 active:scale-95 transition-all shadow-md shadow-brand-800/10"
					>
						Cerrar
					</button>
				</div>
			</div>
		</div>
	);
};

export default VerRepresentadoModal;
