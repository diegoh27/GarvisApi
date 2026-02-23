import { NavLink } from "react-router-dom";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
	label: string;
	to: string;
	icon: LucideIcon;
	badge?: number;
};

type SidebarProps = {
	navItems: NavItem[];
	isOpen: boolean;
	onClose: () => void;
};

const linkClass = ({ isActive }: { isActive: boolean }) =>
	`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive ? "bg-brand-700 text-paper" : "text-brand-900 hover:bg-cloud"
	}`;

const Sidebar = ({ navItems, isOpen, onClose }: SidebarProps) => {
	return (
		<aside
			className={`fixed left-0 top-0 z-50 h-screen w-56 border-r border-mist bg-paper transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
				}`}
		>
			<div className="flex h-full flex-col">
				<div className="flex items-center justify-between px-5 py-6">
					<img
						src="/logo.png"
						alt="Logo"
						className="h-10 w-auto object-contain"
					/>
					<button
						onClick={onClose}
						className="lg:hidden rounded-lg p-1 text-brand-800 hover:bg-cloud"
						aria-label="Cerrar menú"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
				<nav className="flex-1 overflow-y-auto px-3 pb-4 text-sm">
					{navItems.map((item) => (
						<NavLink
							key={item.to}
							to={item.to}
							className={linkClass}
							onClick={() => {
								if (window.innerWidth < 1024) {
									onClose();
								}
							}}
						>
							<item.icon className="h-4 w-4 text-brand-800" />
							<span className="flex-1">{item.label}</span>
							{item.badge && item.badge > 0 ? (
								<span className="ml-auto inline-flex min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-paper">
									{item.badge > 99 ? "99+" : item.badge}
								</span>
							) : null}
						</NavLink>
					))}
				</nav>
			</div>
		</aside>
	);
};

export type { NavItem, SidebarProps };
export default Sidebar;
