import { PageShell } from "../../../shared";
import RegistrarEspecialistaForm from "../components/RegistrarEspecialistaForm";

const RegistrarEspecialistaPage = () => {
	return (
		<PageShell
			title="Registrar nuevo especialista"
			description="Completa el formulario para registrar un nuevo especialista en el sistema."
		>
			<RegistrarEspecialistaForm />
		</PageShell>
	);
};

export default RegistrarEspecialistaPage;
