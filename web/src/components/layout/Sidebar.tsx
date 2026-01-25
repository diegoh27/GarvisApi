import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

type NavItem = {
	label: string;
	to: string;
	icon: LucideIcon;
};

type SidebarProps = {
	navItems: NavItem[];
};

const linkClass = ({ isActive }: { isActive: boolean }) =>
	`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
		isActive ? "bg-brand-700 text-paper" : "text-brand-900 hover:bg-cloud"
	}`;

const Sidebar = ({ navItems }: SidebarProps) => {
	return (
		<aside className="w-56 border-r border-mist bg-paper">
			<div className="px-5 py-6 text-lg font-semibold text-brand-900">LOGO</div>
			<nav className="menu px-3 text-sm">
				{navItems.map((item) => (
					<NavLink key={item.to} to={item.to} className={linkClass}>
						<item.icon className="h-4 w-4 text-brand-800" />
						<span>{item.label}</span>
					</NavLink>
				))}
			</nav>
		</aside>
	);
};

export type { NavItem };
export default Sidebar;
