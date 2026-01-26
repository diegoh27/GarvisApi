import { Bell, LogOut, Menu, UserCircle } from "lucide-react";

type TopbarProps = {
	fullName?: string | null;
	role?: string | null;
	onLogout: () => void;
	onToggleSidebar: () => void;
};

const Topbar = ({ fullName, role, onLogout, onToggleSidebar }: TopbarProps) => {
	return (
		<header className="border-b border-mist bg-paper">
			<div className="flex items-center justify-between px-6 py-3">
				<button
					onClick={onToggleSidebar}
					className="lg:hidden rounded-lg p-2 text-brand-800 hover:bg-cloud"
					aria-label="Abrir menú"
				>
					<Menu className="h-5 w-5" />
				</button>
				<div className="flex items-center gap-3">
					<button className="btn btn-ghost btn-sm text-brand-800">
						<Bell className="h-4 w-4" />
					</button>
					<div className="flex items-center gap-2 text-sm">
						<div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-paper">
							<UserCircle className="h-5 w-5" />
						</div>
						<div className="hidden sm:block text-xs">
							<p className="text-brand-800">{role ?? "rol"}</p>
							<p className="font-semibold">{fullName ?? "Usuario"}</p>
						</div>
					</div>
					<button
						className="btn btn-outline btn-sm border-brand-700 text-brand-800"
						onClick={onLogout}
					>
						<LogOut className="h-4 w-4" />
						<span className="hidden sm:inline">Salir</span>
					</button>
				</div>
			</div>
		</header>
	);
};

export default Topbar;
