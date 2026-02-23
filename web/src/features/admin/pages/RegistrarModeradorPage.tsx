import { PageShell } from "../../../shared";
import RegistrarModeradorForm from "../components/RegistrarModeradorForm";

const RegistrarModeradorPage = () => {
	return (
		<PageShell
			title="Registrar Moderador"
			description="Crea un nuevo moderador para el sistema"
		>
			<RegistrarModeradorForm />
		</PageShell>
	);
};

export default RegistrarModeradorPage;
