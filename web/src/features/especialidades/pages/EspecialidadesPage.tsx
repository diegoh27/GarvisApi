import { PageShell } from "../../../shared";
import { EspecialidadesList } from "../components";

const EspecialidadesPage = () => {
	return (
		<PageShell
			title="Especialidades"
			description="Catálogo de especialidades para el registro de especialistas."
		>
			<EspecialidadesList />
		</PageShell>
	);
};

export default EspecialidadesPage;
