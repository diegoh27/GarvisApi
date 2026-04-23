import { type ReactNode } from "react";

type PageShellProps = {
	title: string;
	description?: string;
	children?: ReactNode;
	/** Oculta el bloque de título/descripción (p. ej. cuando la página define su propia cabecera). */
	hideHeader?: boolean;
};

const PageShell = ({ title, description, children, hideHeader }: PageShellProps) => {
	return (
		<div className="space-y-6">
			{!hideHeader ? (
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold text-brand-900">{title}</h1>
					{description ? (
						<p className="text-base text-brand-800">{description}</p>
					) : null}
				</div>
			) : null}
			{children}
		</div>
	);
};

export default PageShell;
