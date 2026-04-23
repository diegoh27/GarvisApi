import NotificationBellDropdown from "./NotificationBellDropdown";
import UserAccountMenu from "./UserAccountMenu";

type MobilePatientTopbarProps = {
	fullName?: string | null;
	unreadCount?: number;
	role?: string | null;
	onLogout?: () => void;
};

const MobilePatientTopbar = ({
	fullName,
	unreadCount = 0,
	role,
	onLogout,
}: MobilePatientTopbarProps) => {
	return (
		<header className="fixed top-0 z-50 w-full bg-paper/80 shadow-sm shadow-brand-900/5 backdrop-blur-xl">
			<div className="flex w-full items-center justify-between px-4 py-3 sm:px-5">
				<div className="flex min-w-0 items-center gap-3">
					<img
						src="/logo.png"
						alt="Garvis"
						className="h-8 w-auto max-w-[160px] object-contain object-left"
					/>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<NotificationBellDropdown unreadCount={unreadCount} compact />
					<UserAccountMenu
						fullName={fullName}
						role={role}
						onLogout={onLogout}
						compact
					/>
				</div>
			</div>
		</header>
	);
};

export default MobilePatientTopbar;
