import { EmailVerificationBanner, useAuth } from "../../../shared";
import DashboardAdmin from "../components/DashboardAdmin";
import DashboardEspecialista from "../components/DashboardEspecialista";
import DashboardModerador from "../components/DashboardModerador";

/**
 * Dashboard compartido por todos los roles. Cada rol ve su propia vista:
 * - Admin: accesos rápidos (sin llamar APIs de especialista/moderador).
 * - Moderador: resumen de pagos, disponibilidades, resultados y acciones rápidas.
 * - Especialista: próxima cita, resumen del día, citas por resultado y por verificación de pago.
 * - Paciente: se puede añadir vista propia más adelante.
 */
const DashboardPage = () => {
	const { user } = useAuth();

	let content = <DashboardEspecialista />;
	if (user?.rol === "admin") {
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
