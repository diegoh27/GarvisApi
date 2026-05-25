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
		console.warn("API Dolar falló, intentando usar última tasa registrada:", err.message);
		const { pool } = require("../db");
		try {
			const [rows] = await pool.execute(
				"SELECT tasa_dia_bcv, fecha FROM fac_movimiento WHERE tasa_dia_bcv > 0 ORDER BY creado_en DESC LIMIT 1"
			);
			if (rows.length > 0 && rows[0].tasa_dia_bcv) {
				return {
					fuente: "oficial (fallback local)",
					nombre: "Oficial",
					compra: rows[0].tasa_dia_bcv,
					venta: rows[0].tasa_dia_bcv,
					promedio: rows[0].tasa_dia_bcv,
					fechaActualizacion: rows[0].fecha || new Date().toISOString()
				};
			}
		} catch (dbError) {}

		// Si hay error y no hay fallback, lanzar con código específico
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
