import { Menu } from "lucide-react";
import NotificationBellDropdown from "./NotificationBellDropdown";
import UserAccountMenu from "./UserAccountMenu";

type TopbarProps = {
	onToggleSidebar: () => void;
	fullName?: string | null;
	role?: string | null;
	onLogout?: () => void;
	unreadCount: number;
};

const Topbar = ({
	onToggleSidebar,
	fullName,
	role,
	onLogout,
	unreadCount,
}: TopbarProps) => {
	return (
		<header className="sticky top-0 z-30 border-b border-mist bg-paper">
			<div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-6">
				<button
					type="button"
					onClick={onToggleSidebar}
					className="rounded-lg p-2 text-brand-800 hover:bg-cloud lg:hidden"
					aria-label="Abrir menú"
				>
					<Menu className="h-5 w-5" />
				</button>
				<div className="min-w-0 flex-1" />
				<div className="flex items-center gap-1 sm:gap-2">
					<NotificationBellDropdown unreadCount={unreadCount} />
					<UserAccountMenu
						fullName={fullName}
						role={role}
						onLogout={onLogout}
					/>
				</div>
			</div>
		</header>
	);
};

export default Topbar;
