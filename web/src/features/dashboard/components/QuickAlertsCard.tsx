type AlertItem = {
	id: string;
	message: string;
};

type QuickAlertsCardProps = {
	alerts: AlertItem[];
	emptyMessage?: string;
};

const QuickAlertsCard = ({ alerts, emptyMessage }: QuickAlertsCardProps) => {
	return (
		<div className="rounded-2xl bg-paper p-5 shadow-sm">
			<h3 className="text-sm font-semibold text-brand-900">Alertas rápidas</h3>
			{alerts.length ? (
				<div className="mt-4 space-y-3 text-xs text-brand-800">
					{alerts.map((alert) => (
						<div key={alert.id} className="rounded-xl bg-cloud p-3">
							{alert.message}
						</div>
					))}
				</div>
			) : (
				<p className="mt-4 text-xs text-brand-800">
					{emptyMessage ?? "Sin alertas pendientes."}
				</p>
			)}
		</div>
	);
};

export default QuickAlertsCard;
