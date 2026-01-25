import { Link } from "react-router-dom";
import { PageShell } from "../../../shared";

const NotFoundPage = () => {
	return (
		<div className="space-y-4">
			<PageShell title="404" description="Ruta no encontrada." />
			<Link className="btn btn-primary" to="/">
				Volver al inicio
			</Link>
		</div>
	);
};

export default NotFoundPage;
