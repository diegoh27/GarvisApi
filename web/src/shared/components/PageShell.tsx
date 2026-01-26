import { type ReactNode } from "react";

type PageShellProps = {
	title: string;
	description?: string;
	children?: ReactNode;
};

const PageShell = ({ title, description, children }: PageShellProps) => {
	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<h1 className="text-2xl font-semibold text-brand-900">{title}</h1>
				{description ? (
					<p className="text-sm text-brand-800">{description}</p>
				) : null}
			</div>
			{children}
		</div>
	);
};

export default PageShell;
