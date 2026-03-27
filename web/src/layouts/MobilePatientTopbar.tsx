import { Bell, UserCircle } from "lucide-react";
import { Link } from "react-router-dom";

type MobilePatientTopbarProps = {
	fullName?: string | null;
	unreadCount?: number;
};

const MobilePatientTopbar = ({ fullName, unreadCount = 0 }: MobilePatientTopbarProps) => {
	const initials = fullName
		? fullName
				.split(" ")
				.map((w) => w[0])
				.join("")
				.slice(0, 2)
				.toUpperCase()
		: "";

	return (
		<header className="fixed top-0 w-full z-50 bg-paper/80 backdrop-blur-xl shadow-sm shadow-brand-900/5">
			<div className="flex justify-between items-center px-5 py-3 w-full">
				<div className="flex items-center gap-3">
					{/* Avatar */}
					<div className="w-10 h-10 rounded-full overflow-hidden bg-brand-200 ring-2 ring-brand-800/10 flex items-center justify-center">
						{initials ? (
							<span className="text-sm font-bold text-brand-800">{initials}</span>
						) : (
							<UserCircle className="h-6 w-6 text-brand-600" />
						)}
					</div>
					<div>
						<h1 className="text-brand-900 font-extrabold tracking-tighter font-headline text-lg leading-tight">
							Garvis
						</h1>
						<p className="text-[9px] uppercase tracking-widest text-brand-600 font-semibold -mt-0.5">
							Clinical Curator
						</p>
					</div>
				</div>
				<Link
					to="/notificaciones"
					className="p-2 rounded-xl text-brand-800 hover:bg-brand-100/50 transition-colors active:scale-95 duration-200 relative"
				>
					<Bell className="h-5 w-5" />
					{unreadCount > 0 && (
						<span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
							{unreadCount > 99 ? "99+" : unreadCount}
						</span>
					)}
				</Link>
			</div>
		</header>
	);
};

export default MobilePatientTopbar;
