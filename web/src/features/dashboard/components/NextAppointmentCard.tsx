type NextAppointment = {
	patientName: string;
	study: string;
	dateLabel: string;
	timeLabel: string;
	paymentStatus: string;
	statusLabel: string;
};

type NextAppointmentCardProps = {
	appointment?: NextAppointment | null;
};

const NextAppointmentCard = ({ appointment }: NextAppointmentCardProps) => {
	return (
		<div className="rounded-2xl bg-paper p-5 shadow-sm">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold text-brand-900">Próxima cita</h3>
				{appointment ? (
					<span className="text-[11px] font-semibold text-brand-800">
						{appointment.dateLabel}
					</span>
				) : null}
			</div>
			{appointment ? (
				<>
					<div className="mt-4 flex items-start gap-4">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-cloud text-brand-800">
							{"+"}
						</div>
						<div className="space-y-1 text-xs text-brand-800">
							<p className="text-sm font-semibold text-brand-900">
								{appointment.patientName}
							</p>
							<p>{appointment.study}</p>
							<p>{appointment.timeLabel}</p>
						</div>
					</div>
					<div className="mt-4 flex flex-wrap gap-2 text-[11px]">
						<span className="rounded-full bg-cloud px-3 py-1 font-semibold text-brand-800">
							{appointment.paymentStatus}
						</span>
						<span className="rounded-full bg-brand-700 px-3 py-1 font-semibold text-paper">
							{appointment.statusLabel}
						</span>
					</div>
				</>
			) : (
				<p className="mt-4 text-xs text-brand-800">No hay citas próximas.</p>
			)}
		</div>
	);
};

export default NextAppointmentCard;
