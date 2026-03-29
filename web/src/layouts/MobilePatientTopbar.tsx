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
					<div className="min-w-0">
						<h1 className="font-headline text-lg font-extrabold leading-tight tracking-tighter text-brand-900">
							Garvis
						</h1>
						<p className="-mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-brand-600">
							Clinical Curator
						</p>
					</div>
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
