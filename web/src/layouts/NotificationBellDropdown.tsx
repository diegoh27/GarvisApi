import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth, formatFechaHoraLocal } from "../shared";
import { useDispatch } from "react-redux";
import { baseApi } from "../app/api/baseApi";
import { useNavigate } from "react-router-dom";
import { 
	useGetMisNotificacionesQuery, 
	useMarkNotificacionLeidaMutation,
	useMarkTodasNotificacionesLeidasMutation
} from "../features/notificaciones/notificacionesApi";
import { getNotificacionMeta } from "../features/notificaciones/pages/NotificacionesPage";

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
	const navigate = useNavigate();
	const dispatch = useDispatch();
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);

	const { data: items = [], isLoading } = useGetMisNotificacionesQuery(
		{ limit: 10, solo_no_leidas: true },
		{ skip: !token, pollingInterval: 20000, refetchOnFocus: true },
	);
	const [markLeida] = useMarkNotificacionLeidaMutation();
	const [markTodas, { isLoading: markingTodas }] = useMarkTodasNotificacionesLeidasMutation();

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
					<div className="flex items-center justify-between border-b border-mist px-3 py-2">
						<p className="text-xs font-semibold text-brand-900">Notificaciones</p>
						<button
							type="button"
							onClick={() => markTodas()}
							disabled={markingTodas || unreadCount === 0}
							className="text-[10px] font-medium text-brand-700 hover:text-brand-900 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Marcar todas leídas
						</button>
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
							items.map((n) => {
								const meta = getNotificacionMeta(n);
								const isClickable = !!meta.link;
								return (
									<li
										key={n.id_notificacion}
										className={`border-b border-mist/80 last:border-0 ${n.leida ? "bg-white" : "bg-brand-50/50"}`}
									>
										<div
											onClick={() => {
												setOpen(false);
												if (!n.leida) {
													markLeida({ id: n.id_notificacion });
												}
												if (meta.link?.to) {
													if (meta.link.to.includes("/citas")) {
														dispatch(baseApi.util.invalidateTags(["Citas"]));
													}
													navigate(meta.link.to);
												} else {
													navigate("/notificaciones");
												}
											}}
											className="block px-3 py-2.5 transition-colors hover:bg-cloud cursor-pointer"
										>
											<p className="line-clamp-2 text-xs font-medium text-brand-900">
												{n.titulo}
											</p>
											<p className="mt-0.5 text-[10px] text-brand-600">
												{formatTime(n.fecha_creacion)}
											</p>
										</div>
									</li>
								);
							})
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
