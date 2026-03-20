const validarFechaNacimiento = (fechaString) => {
	if (!fechaString) {
		return { valid: false, message: "La fecha de nacimiento es requerida" };
	}

	const fechaNac = new Date(fechaString);
	if (Number.isNaN(fechaNac.getTime())) {
		return { valid: false, message: "La fecha de nacimiento es inválida" };
	}

	const hoy = new Date();
	if (fechaNac.getTime() > hoy.getTime()) {
		return { valid: false, message: "La fecha de nacimiento no puede ser futura" };
	}

	const hace100Anos = new Date();
	hace100Anos.setFullYear(hoy.getFullYear() - 100);

	if (fechaNac.getTime() < hace100Anos.getTime()) {
		return {
			valid: false,
			message: "La fecha de nacimiento no puede ser mayor a 100 años",
		};
	}

	return { valid: true, value: fechaString };
};

module.exports = {
	validarFechaNacimiento,
};
