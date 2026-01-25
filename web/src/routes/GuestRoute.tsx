import { Navigate } from "react-router-dom";
import { getAuthedHome, useAuth } from "../shared";

type GuestRouteProps = {
	children: JSX.Element;
};

const GuestRoute = ({ children }: GuestRouteProps) => {
	const { token, user } = useAuth();

	if (token) {
		return <Navigate to={getAuthedHome(user?.rol)} replace />;
	}

	return children;
};

export default GuestRoute;
