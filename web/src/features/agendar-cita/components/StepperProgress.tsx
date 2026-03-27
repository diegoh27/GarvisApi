import {
	User,
	FileSearch,
	CalendarDays,
	CreditCard,
	Check,
} from "lucide-react";

type StepperProgressProps = {
	currentStep: number; // 1–4
};

const steps = [
	{ label: "Paciente", icon: User },
	{ label: "Servicio", icon: FileSearch },
	{ label: "Fecha", icon: CalendarDays },
	{ label: "Pago", icon: CreditCard },
];

const StepperProgress = ({ currentStep }: StepperProgressProps) => {
	const progressPercent =
		currentStep <= 1 ? 0 : ((currentStep - 1) / (steps.length - 1)) * 100;

	return (
		<>
			{/* ─── MOBILE: compact bar indicator ─── */}
			<div className="mb-8 lg:hidden">
				<div className="flex justify-between items-end mb-2">
					<span className="text-[10px] font-bold tracking-widest uppercase text-brand-800">
						Paso {currentStep} de {steps.length}
					</span>
					<span className="text-xs font-semibold text-slate-400">
						{steps[currentStep - 1]?.label}
					</span>
				</div>
				<div className="flex gap-1.5 w-full">
					{steps.map((_, i) => (
						<div
							key={i}
							className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
								i < currentStep ? "bg-brand-800" : "bg-cloud"
							}`}
						/>
					))}
				</div>
			</div>

			{/* ─── DESKTOP: circle stepper ─── */}
			<div className="mb-16 hidden lg:block">
				<div className="flex justify-between items-center relative">
					<div className="absolute top-5 left-0 w-full h-1 bg-cloud rounded-full -translate-y-1/2" />
					<div
						className="absolute top-5 left-0 h-1 rounded-full -translate-y-1/2 z-10 transition-all duration-500"
						style={{
							width: `${progressPercent}%`,
							background: "linear-gradient(90deg, #054542 0%, #1C837F 100%)",
						}}
					/>
					{steps.map((step, i) => {
						const stepNum = i + 1;
						const isActive = stepNum === currentStep;
						const isCompleted = stepNum < currentStep;
						const Icon = step.icon;
						return (
							<div key={step.label} className="relative z-20 flex flex-col items-center gap-3">
								<div
									className={`w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-white transition-all ${
										isActive
											? "bg-brand-800 text-white shadow-lg shadow-brand-800/30"
											: isCompleted
												? "bg-brand-800 text-white"
												: "bg-white text-slate-400 shadow-sm"
									}`}
								>
									{isCompleted ? (
										<Check className="h-5 w-5" strokeWidth={3} />
									) : (
										<Icon className="h-5 w-5" />
									)}
								</div>
								<span
									className={`text-xs font-headline tracking-tight ${
										isActive
											? "font-bold text-brand-800"
											: isCompleted
												? "font-semibold text-brand-600"
												: "font-medium text-slate-400"
									}`}
								>
									Paso {stepNum}: {step.label}
								</span>
							</div>
						);
					})}
				</div>
			</div>
		</>
	);
};

export default StepperProgress;
