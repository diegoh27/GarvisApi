const getHomeByRole = (role?: string | null) => {
	switch (role) {
		case "paciente":
			return "/dashboard";
		case "especialista":
			return "/dashboard";
		case "admin":
		case "moderador":
			return "/dashboard";
		default:
			return "/";
	}
};

const getAuthedHome = (role?: string | null) => {
	if (!role) {
		return "/dashboard";
	}
	return getHomeByRole(role);
};

export { getHomeByRole, getAuthedHome };
