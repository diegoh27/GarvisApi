import { EmailVerificationBanner, useAuth } from "../../../shared";
import DashboardAdmin from "../components/DashboardAdmin";
import DashboardEspecialista from "../components/DashboardEspecialista";
import DashboardModerador from "../components/DashboardModerador";
import DashboardPaciente from "../components/DashboardPaciente";

/**
 * Dashboard por rol: paciente, especialista, moderador, admin.
 */
const DashboardPage = () => {
	const { user } = useAuth();

	let content = <DashboardEspecialista />;
	if (user?.rol === "paciente") {
		content = <DashboardPaciente />;
	} else if (user?.rol === "admin") {
		content = <DashboardAdmin />;
	} else if (user?.rol === "moderador") {
		content = <DashboardModerador />;
	}

	return (
		<div className="space-y-6">
			<EmailVerificationBanner />
			{content}
		</div>
	);
};

export default DashboardPage;
