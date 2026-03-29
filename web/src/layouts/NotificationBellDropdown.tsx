import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth, formatFechaHoraLocal } from "../shared";
import { useGetMisNotificacionesQuery } from "../features/notificaciones/notificacionesApi";

type NotificationBellDropdownProps = {
	unreadCount: number;
	compact?: boolean;
};

const formatTime = (value: string) =>
	value ? formatFechaHoraLocal(value) : "";

const NotificationBellDropdown = ({
	unreadCount,
	compact = false,
}: NotificationBellDropdownProps) => {
	const { token } = useAuth();
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);

	const { data: items = [], isLoading } = useGetMisNotificacionesQuery(
		{ limit: 5 },
		{ skip: !token, pollingInterval: 20000, refetchOnFocus: true },
	);

	useEffect(() => {
		if (!open) return;
		const onDoc = (e: MouseEvent) => {
			if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", onDoc);
		return () => document.removeEventListener("mousedown", onDoc);
	}, [open]);

	return (
		<div className={`relative ${compact ? "" : ""}`} ref={rootRef}>
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="relative rounded-full p-2 text-brand-700 transition-colors hover:bg-cloud"
				aria-expanded={open}
				aria-haspopup="true"
				aria-label="Notificaciones"
			>
				<Bell className="h-5 w-5" />
				{unreadCount > 0 && (
					<span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
						{unreadCount > 99 ? "99+" : unreadCount}
					</span>
				)}
			</button>

			{open && (
				<div
					className={`absolute right-0 z-50 mt-2 flex max-h-[min(420px,70vh)] w-[min(100vw-2rem,20rem)] flex-col overflow-hidden rounded-2xl border border-mist bg-paper shadow-lg ${
						compact ? "top-full" : ""
					}`}
				>
					<div className="border-b border-mist px-3 py-2">
						<p className="text-xs font-semibold text-brand-900">Notificaciones</p>
					</div>
					<ul className="max-h-64 overflow-y-auto">
						{isLoading ? (
							<li className="px-3 py-6 text-center text-xs text-brand-600">
								Cargando…
							</li>
						) : items.length === 0 ? (
							<li className="px-3 py-6 text-center text-xs text-brand-600">
								No hay notificaciones recientes.
							</li>
						) : (
							items.map((n) => (
								<li
									key={n.id_notificacion}
									className="border-b border-mist/80 last:border-0"
								>
									<Link
										to="/notificaciones"
										onClick={() => setOpen(false)}
										className="block px-3 py-2.5 transition-colors hover:bg-cloud"
									>
										<p className="line-clamp-2 text-xs font-medium text-brand-900">
											{n.titulo}
										</p>
										<p className="mt-0.5 text-[10px] text-brand-600">
											{formatTime(n.fecha_creacion)}
										</p>
									</Link>
								</li>
							))
						)}
					</ul>
					<div className="sticky bottom-0 border-t border-mist bg-paper px-2 py-2">
						<Link
							to="/notificaciones"
							onClick={() => setOpen(false)}
							className="block w-full rounded-xl bg-teal-800 py-2 text-center text-xs font-semibold text-white transition hover:bg-teal-900"
						>
							Mostrar todas las notificaciones
						</Link>
					</div>
				</div>
			)}
		</div>
	);
};

export default NotificationBellDropdown;
