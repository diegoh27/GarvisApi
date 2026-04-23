import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, LogOut, Settings, UserCircle } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
	admin: "Administrador",
	moderador: "Moderador",
	especialista: "Especialista",
	paciente: "Paciente",
};

type UserAccountMenuProps = {
	fullName?: string | null;
	role?: string | null;
	onLogout?: () => void;
	/** Compact: smaller text, for mobile header */
	compact?: boolean;
};

const UserAccountMenu = ({
	fullName,
	role,
	onLogout,
	compact = false,
}: UserAccountMenuProps) => {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);

	const initials = fullName
		? fullName
				.split(/\s+/)
				.filter(Boolean)
				.map((w) => w[0])
				.join("")
				.slice(0, 2)
				.toUpperCase()
		: "";

	const roleLabel = role ? ROLE_LABEL[role] ?? role : "Usuario";

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
		<div className="relative" ref={rootRef}>
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex items-center gap-2 rounded-xl py-1 pr-1 pl-1 transition-colors hover:bg-cloud"
				aria-expanded={open}
				aria-haspopup="true"
			>
				<span className="relative inline-flex shrink-0">
					<div
						className={`flex shrink-0 items-center justify-center rounded-full bg-brand-700 text-paper ring-2 ring-white ${
							compact ? "h-9 w-9" : "h-10 w-10"
						}`}
					>
						{initials ? (
							<span className="text-base font-bold">{initials}</span>
						) : (
							<UserCircle className={compact ? "h-5 w-5" : "h-6 w-6"} />
						)}
					</div>
					<span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white shadow ring-2 ring-white">
						<ChevronDown className="h-3 w-3" aria-hidden />
					</span>
				</span>
				{fullName != null && (
					<div
						className={`hidden min-w-0 text-left sm:block ${compact ? "max-w-[140px]" : ""}`}
					>
						<p
							className={`font-semibold text-brand-900 ${compact ? "text-sm" : "text-sm"}`}
						>
							{fullName}
						</p>
						<p className="text-[10px] font-medium uppercase tracking-tight text-brand-600">
							{roleLabel}
						</p>
					</div>
				)}
			</button>

			{open && (
				<div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-mist bg-paper py-1 shadow-lg">
					<Link
						to="/configuracion"
						onClick={() => setOpen(false)}
						className="flex items-center gap-2 px-3 py-2.5 text-base text-brand-900 transition hover:bg-cloud"
					>
						<Settings className="h-4 w-4 shrink-0 text-brand-700" />
						Configuración de usuario
					</Link>
					{onLogout && (
						<button
							type="button"
							onClick={() => {
								setOpen(false);
								onLogout();
							}}
							className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-base text-red-700 transition hover:bg-red-50"
						>
							<LogOut className="h-4 w-4 shrink-0" />
							Salir / Cerrar sesión
						</button>
					)}
				</div>
			)}
		</div>
	);
};

export default UserAccountMenu;
