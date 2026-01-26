import { PageShell } from "../../../shared";
import { EcosList } from "../components";

const EcosPage = () => {
	return (
		<PageShell
			title="Ecos"
			description="Gestión de tipos de ecos y sus precios."
		>
			<EcosList />
		</PageShell>
	);
};

export default EcosPage;
