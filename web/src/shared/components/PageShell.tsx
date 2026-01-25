type PageShellProps = {
	title: string;
	description?: string;
};

const PageShell = ({ title, description }: PageShellProps) => {
	return (
		<section className="space-y-2">
			<h1 className="text-2xl font-bold">{title}</h1>
			{description ? (
				<p className="text-sm text-base-content/70">{description}</p>
			) : null}
		</section>
	);
};

export default PageShell;
