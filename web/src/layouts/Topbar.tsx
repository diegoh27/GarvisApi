import { LogOut, Menu, UserCircle } from "lucide-react";

type TopbarProps = {
	onToggleSidebar: () => void;
	fullName?: string | null;
	role?: string | null;
	onLogout?: () => void;
};

const Topbar = ({ onToggleSidebar, fullName, role, onLogout }: TopbarProps) => {
	return (
		<header className="sticky top-0 z-30 border-b border-mist bg-paper">
			<div className="flex items-center justify-between px-4 py-3 sm:px-6">
				<button
					onClick={onToggleSidebar}
					className="lg:hidden rounded-lg p-2 text-brand-800 hover:bg-cloud"
					aria-label="Abrir menú"
				>
					<Menu className="h-5 w-5" />
				</button>
				<div className="flex-1" />
				<div className="flex items-center gap-3">
					{fullName != null && (
						<div className="flex items-center gap-2 text-sm">
							<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-paper">
								<UserCircle className="h-5 w-5" />
							</div>
							<div className="hidden text-right sm:block">
								<p className="text-xs font-semibold text-brand-900">{fullName}</p>
								<p className="text-xs text-brand-600">{role ?? "rol"}</p>
							</div>
						</div>
					)}
					{onLogout && (
						<button
							type="button"
							onClick={onLogout}
							className="flex items-center gap-2 rounded-lg border border-brand-700 px-3 py-2 text-sm font-medium text-brand-800 transition-colors hover:bg-cloud"
						>
							<LogOut className="h-4 w-4" />
							<span className="hidden sm:inline">Salir</span>
						</button>
					)}
				</div>
			</div>
		</header>
	);
};

export default Topbar;
