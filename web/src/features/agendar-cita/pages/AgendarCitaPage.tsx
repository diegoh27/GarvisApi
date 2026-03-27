import { useState } from "react";
import StepperProgress from "../components/StepperProgress";
import PasoParaQuien from "../components/PasoParaQuien";

/**
 * Wizard state for the multi-step appointment flow.
 * Steps: 1=Paciente, 2=Servicio, 3=Fecha, 4=Pago
 */
export type AgendarCitaState = {
	pacienteType: "yo" | "representado" | null;
	id_representado?: string;
	// Future steps will add:
	// id_eco?: string;
	// id_disponibilidad?: string;
	// pago?: {...}
};

const AgendarCitaPage = () => {
	const [step, setStep] = useState(1);
	const [_state, setState] = useState<AgendarCitaState>({
		pacienteType: null,
	});

	const handleStep1Next = (data: { tipo: "yo" | "representado"; id_representado?: string }) => {
		setState((prev) => ({
			...prev,
			pacienteType: data.tipo,
			id_representado: data.id_representado,
		}));
		setStep(2);
		// Step 2 will be implemented in Fase 3
	};

	return (
		<div className="max-w-4xl mx-auto w-full">
			<StepperProgress currentStep={step} />

			{step === 1 && <PasoParaQuien onNext={handleStep1Next} />}

			{/* Future steps (placeholder — will be replaced in Fase 3, 4, 5) */}
			{step === 2 && (
				<div className="text-center py-16">
					<p className="text-brand-600 text-lg font-medium">
						Paso 2: Selección de Servicio — próximamente
					</p>
					<button
						type="button"
						onClick={() => setStep(1)}
						className="mt-4 text-brand-800 font-bold underline text-sm"
					>
						← Volver al Paso 1
					</button>
				</div>
			)}
		</div>
	);
};

export default AgendarCitaPage;
