import { NavLink } from "react-router-dom";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
	label: string;
	to: string;
	icon: LucideIcon;
};

type SidebarProps = {
	navItems: NavItem[];
	isOpen: boolean;
	onClose: () => void;
};

const linkClass = ({ isActive }: { isActive: boolean }) =>
	`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
		isActive ? "bg-brand-700 text-paper" : "text-brand-900 hover:bg-cloud"
	}`;

const Sidebar = ({ navItems, isOpen, onClose }: SidebarProps) => {
	return (
		<aside
			className={`fixed left-0 top-0 z-50 min-h-screen w-56 border-r border-mist bg-paper transition-transform duration-300 ease-in-out lg:relative lg:z-auto lg:translate-x-0 ${
				isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
			}`}
		>
			<div className="flex h-full min-h-screen flex-col">
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
				<nav className="flex-1 px-3 pb-6 text-sm">
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
							<span>{item.label}</span>
						</NavLink>
					))}
				</nav>
			</div>
		</aside>
	);
};

export type { NavItem };
export default Sidebar;
