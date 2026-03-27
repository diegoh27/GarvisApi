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
	// Progress line width percentage (from start of step 1 to current step)
	const progressPercent =
		currentStep <= 1 ? 0 : ((currentStep - 1) / (steps.length - 1)) * 100;

	return (
		<div className="mb-12 lg:mb-16">
			<div className="flex justify-between items-center relative">
				{/* Background line */}
				<div className="absolute top-5 left-0 w-full h-1 bg-cloud rounded-full -translate-y-1/2" />
				{/* Active progress line */}
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
						<div key={step.label} className="relative z-20 flex flex-col items-center gap-2 lg:gap-3">
							<div
								className={`w-9 h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center ring-4 ring-white transition-all ${
									isActive
										? "bg-brand-800 text-white shadow-lg shadow-brand-800/30"
										: isCompleted
											? "bg-brand-800 text-white"
											: "bg-white text-slate-400 shadow-sm"
								}`}
							>
								{isCompleted ? (
									<Check className="h-4 w-4 lg:h-5 lg:w-5" strokeWidth={3} />
								) : (
									<Icon className="h-4 w-4 lg:h-5 lg:w-5" />
								)}
							</div>
							<span
								className={`text-[10px] lg:text-xs font-headline tracking-tight hidden sm:block ${
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
	);
};

export default StepperProgress;
