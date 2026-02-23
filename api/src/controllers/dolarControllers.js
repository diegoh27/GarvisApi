const axios = require("axios");

const getDolarOficialController = async () => {
	try {
		const response = await axios.get("https://ve.dolarapi.com/v1/dolares/oficial", {
			timeout: 5000, // 5 segundos de timeout
		});

		const data = response.data;

		// Validar que la respuesta tenga la estructura esperada
		if (!data || typeof data.promedio !== "number") {
			throw new Error("Respuesta inválida de la API del dólar");
		}

		return {
			fuente: data.fuente || "oficial",
			nombre: data.nombre || "Oficial",
			compra: data.compra,
			venta: data.venta,
			promedio: data.promedio,
			fechaActualizacion: data.fechaActualizacion,
		};
	} catch (err) {
		// Si hay error, lanzar con código específico
		if (err.response) {
			// Error de respuesta HTTP
			const error = new Error("Error al obtener la tasa del dólar desde la API");
			error.code = "API_ERROR";
			error.status = err.response.status;
			throw error;
		} else if (err.request) {
			// Error de conexión
			const error = new Error("No se pudo conectar con la API del dólar");
			error.code = "CONNECTION_ERROR";
			throw error;
		} else {
			// Otro error
			const error = new Error(err.message || "Error desconocido al obtener la tasa del dólar");
			error.code = "UNKNOWN_ERROR";
			throw error;
		}
	}
};

module.exports = {
	getDolarOficialController,
};
