type NotificationItem = {
	id: string;
	title: string;
	timeLabel: string;
};

type RecentNotificationsCardProps = {
	notifications: NotificationItem[];
	emptyMessage?: string;
};

const RecentNotificationsCard = ({
	notifications,
	emptyMessage,
}: RecentNotificationsCardProps) => {
	return (
		<div className="rounded-2xl bg-paper p-5 shadow-sm">
			<h3 className="text-base font-semibold text-brand-900">
				Notificaciones recientes
			</h3>
			{notifications.length ? (
				<div className="mt-4 space-y-3">
					{notifications.map((notification) => (
						<div key={notification.id} className="rounded-xl bg-cloud p-3">
							<p className="text-sm font-semibold text-brand-900">
								{notification.title}
							</p>
							<p className="text-[11px] text-brand-800">
								{notification.timeLabel}
							</p>
						</div>
					))}
				</div>
			) : (
				<p className="mt-4 text-sm text-brand-800">
					{emptyMessage ?? "Sin notificaciones recientes."}
				</p>
			)}
		</div>
	);
};

export default RecentNotificationsCard;
