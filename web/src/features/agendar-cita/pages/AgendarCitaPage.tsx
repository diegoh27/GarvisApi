import { useState } from "react";
import StepperProgress from "../components/StepperProgress";
import PasoParaQuien from "../components/PasoParaQuien";
import PasoServicio from "../components/PasoServicio";
import PasoFechaHora from "../components/PasoFechaHora";
import PasoCheckout from "../components/PasoCheckout";

/**
 * Wizard state for the multi-step appointment flow.
 * Steps: 1=Paciente, 2=Servicio, 3=Fecha, 4=Pago
 */
export type AgendarCitaState = {
	pacienteType: "yo" | "representado" | null;
	id_representado?: string;
	id_eco?: string;
	ecoNombre?: string;
	fecha?: string;
	hora?: string;
	id_disponibilidad?: string;
	id_especialista?: string;
	especialistaNombre?: string;
};

const AgendarCitaPage = () => {
	const [step, setStep] = useState(1);
	const [state, setState] = useState<AgendarCitaState>({
		pacienteType: null,
	});

	const handleStep1Next = (data: { tipo: "yo" | "representado"; id_representado?: string }) => {
		setState((prev) => ({
			...prev,
			pacienteType: data.tipo,
			id_representado: data.id_representado,
		}));
		setStep(2);
	};

	const handleStep2Next = (data: { id_eco: string; ecoNombre: string }) => {
		setState((prev) => ({
			...prev,
			id_eco: data.id_eco,
			ecoNombre: data.ecoNombre,
		}));
		setStep(3);
	};

	const handleStep2Back = () => {
		setStep(1);
	};

	const handleStep3Next = (data: {
		fecha: string;
		hora: string;
		id_disponibilidad: string;
		id_especialista: string;
		especialistaNombre: string;
	}) => {
		setState((prev) => ({
			...prev,
			fecha: data.fecha,
			hora: data.hora,
			id_disponibilidad: data.id_disponibilidad,
			id_especialista: data.id_especialista,
			especialistaNombre: data.especialistaNombre,
		}));
		setStep(4);
	};

	const handleStep3Back = () => {
		setStep(2);
	};

	const handleStep4Back = () => {
		setStep(3);
	};

	// Step 2 uses wide layout (12-col grid); others use medium
	const containerClass = step === 2 ? "max-w-6xl" : "max-w-5xl";

	return (
		<div className={`${containerClass} mx-auto w-full`}>
			<StepperProgress currentStep={step} />

			{step === 1 && <PasoParaQuien onNext={handleStep1Next} />}

			{step === 2 && (
				<PasoServicio
					onNext={handleStep2Next}
					onBack={handleStep2Back}
				/>
			)}

			{step === 3 && state.id_eco && state.ecoNombre && (
				<PasoFechaHora
					idEco={state.id_eco}
					ecoNombre={state.ecoNombre}
					onNext={handleStep3Next}
					onBack={handleStep3Back}
				/>
			)}

			{step === 4 && state.id_eco && state.ecoNombre && state.fecha && state.hora && state.id_disponibilidad && state.id_especialista && state.especialistaNombre && (
				<PasoCheckout
					idEco={state.id_eco}
					ecoNombre={state.ecoNombre}
					fecha={state.fecha}
					hora={state.hora}
					idDisponibilidad={state.id_disponibilidad}
					idEspecialista={state.id_especialista}
					especialistaNombre={state.especialistaNombre}
					idRepresentado={state.id_representado}
					onBack={handleStep4Back}
				/>
			)}
		</div>
	);
};

export default AgendarCitaPage;
