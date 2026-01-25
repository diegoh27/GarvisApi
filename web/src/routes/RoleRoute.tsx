import { Navigate } from "react-router-dom";
import { getAuthedHome, useAuth } from "../shared";

type RoleRouteProps = {
	allowed: string[];
	children: JSX.Element;
};

const RoleRoute = ({ allowed, children }: RoleRouteProps) => {
	const { token, user } = useAuth();

	if (!token) {
		return <Navigate to="/auth/login" replace />;
	}

	if (!user?.rol || !allowed.includes(user.rol)) {
		return <Navigate to={getAuthedHome(user?.rol)} replace />;
	}

	return children;
};

export default RoleRoute;
