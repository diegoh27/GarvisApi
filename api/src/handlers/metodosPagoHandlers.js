const { uploadMulterFileToLocal } = require("../utils/uploadToLocal");
const { pool } = require("../db");
const {
	listMetodosPagoController,
	createMetodoPagoController,
	getMetodoPagoByIdController,
	updateMetodoPagoController,
	updateEstadoMetodoPagoController,
	deleteMetodoPagoController,
} = require("../controllers/metodosPagoControllers");

const normalizeMoneda = (value = "") =>
	String(value || "")
		.trim()
		.toUpperCase();

const normalizeTipoBs = (value = "") => {
	const raw = String(value || "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "");
	if (raw === "transferencia") return "Transferencia";
	if (raw === "pagomovil") return "PagoMovil";
	if (raw === "efectivobs") return "EfectivoBs";
	return null;
};

/** Tipos permitidos en checkout (BS/USD); debe alinearse con pagos.metodo y citas/asignar */
const normalizeTipoCheckoutDisponible = (value = "") => {
	const raw = String(value || "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "");
	if (!raw) return null;
	const bs = {
		transferencia: "Transferencia",
		pagomovil: "PagoMovil",
		efectivobs: "EfectivoBs",
	};
	const usd = {
		zelle: "Zelle",
		binance: "Binance",
		paypal: "PayPal",
		efectivousd: "EfectivoUSD",
		otro: "Otro",
	};
	if (bs[raw]) return { moneda: "BS", tipo: bs[raw] };
	if (usd[raw]) return { moneda: "USD", tipo: usd[raw] };
	return null;
};

const firstNonEmpty = (...values) => {
	for (const value of values) {
		if (value === undefined || value === null) continue;
		const normalized = String(value).trim();
		if (normalized) return normalized;
	}
	return null;
};

const listMetodosPagoHandler = async (req, res) => {
	try {
		const soloActivos =
			String(req.query.activos || "").toLowerCase() === "true";
		const data = await listMetodosPagoController({ soloActivos });
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (error) {
		console.error("Error en listMetodosPagoHandler:", error);
		return res.status(500).json({
			ok: false,
			message: "Error al listar métodos de pago",
		});
	}
};

const listMetodosPagoDisponiblesHandler = async (_req, res) => {
	try {
		const data = await listMetodosPagoController({ soloActivos: true });

		const filtered = data.filter((item) => {
			const moneda = normalizeMoneda(item.moneda);
			const n = normalizeTipoCheckoutDisponible(item.tipo_pago);
			return Boolean(n && moneda === n.moneda);
		});

		return res.status(200).json({
			ok: true,
			data: filtered,
		});
	} catch (error) {
		console.error("Error en listMetodosPagoDisponiblesHandler:", error);
		return res.status(500).json({
			ok: false,
			message: "Error al listar métodos de pago disponibles",
		});
	}
};

const createMetodoPagoHandler = async (req, res) => {
	try {
		const body = req.body || {};
		const {
			nombre,
			banco_codigo,
			banco_nombre,
			tipo_pago,
			moneda,
			correo,
			telefono,
			numero_cuenta,
		} = body;

		if (!req.file) {
			return res.status(400).json({
				ok: false,
				message: "La imagen del método de pago es requerida",
			});
		}

		if (!nombre || !String(nombre).trim()) {
			return res.status(400).json({
				ok: false,
				message: "El nombre del método es requerido",
			});
		}

		if (!banco_codigo || !String(banco_codigo).trim()) {
			return res.status(400).json({
				ok: false,
				message: "Debe seleccionar un banco",
			});
		}

		if (!banco_nombre || !String(banco_nombre).trim()) {
			return res.status(400).json({
				ok: false,
				message: "Nombre de banco inválido",
			});
		}

		const monedaValue = normalizeMoneda(moneda);
		if (!["BS", "USD"].includes(monedaValue)) {
			return res.status(400).json({
				ok: false,
				message: "La moneda debe ser BS o USD",
			});
		}

		let tipoPagoValue = String(tipo_pago || "").trim();
		let titularNombreValue = null;
		const titularIdentificacionRaw = firstNonEmpty(
			body.titular_identificacion,
			body.titularIdentificacion,
			body.identificacion,
			body.cedula,
		);
		const identificacionTipoRaw = firstNonEmpty(
			body.titular_identificacion_tipo,
			body.titularIdentificacionTipo,
			body.identificacion_tipo,
			body.identificacionTipo,
		);
		const identificacionNumeroRaw = firstNonEmpty(
			body.titular_identificacion_numero,
			body.titularIdentificacionNumero,
			body.identificacion_numero,
			body.identificacionNumero,
		);

		const identificacionTipoValue = identificacionTipoRaw
			? String(identificacionTipoRaw).trim().toUpperCase()
			: "";
		const identificacionNumeroValue = identificacionNumeroRaw
			? String(identificacionNumeroRaw).replace(/\D/g, "").trim()
			: "";

		let titularIdentificacionValue = titularIdentificacionRaw
			? String(titularIdentificacionRaw).trim().toUpperCase()
			: null;

		if (
			!titularIdentificacionValue &&
			identificacionTipoValue &&
			identificacionNumeroValue
		) {
			titularIdentificacionValue = `${identificacionTipoValue}${identificacionNumeroValue}`;
		}
		let correoValue = correo ? String(correo).trim() : null;
		let telefonoValue = telefono ? String(telefono).trim() : null;
		let numeroCuentaValue = numero_cuenta ? String(numero_cuenta).trim() : null;

		if (monedaValue === "BS") {
			const tipoBs = normalizeTipoBs(tipoPagoValue);
			if (!tipoBs) {
				return res.status(400).json({
					ok: false,
					message:
						"Para BS solo se permite Transferencia, PagoMovil o EfectivoBs",
				});
			}
			tipoPagoValue = tipoBs;
			correoValue = null;

			if (!titularIdentificacionValue) {
				return res.status(400).json({
					ok: false,
					message: "Para BS debe indicar la identificación del titular",
				});
			}

			const regexIdentificacion = /^(V|E|J)\d{5,12}$/i;

			if (tipoPagoValue === "EfectivoBs") {
				telefonoValue = null;
				numeroCuentaValue = null;
			} else if (tipoPagoValue === "PagoMovil" && !telefonoValue) {
				return res.status(400).json({
					ok: false,
					message: "Para PagoMovil debe indicar un teléfono",
				});
			} else if (tipoPagoValue === "PagoMovil") {
				const telefonoDigits = telefonoValue.replace(/\D/g, "");
				if (telefonoDigits.length < 10 || telefonoDigits.length > 11) {
					return res.status(400).json({
						ok: false,
						message: "Para PagoMovil el teléfono debe ser válido",
					});
				}
				telefonoValue = telefonoDigits;
				numeroCuentaValue = null;
			}

			if (tipoPagoValue === "Transferencia" && !numeroCuentaValue) {
				return res.status(400).json({
					ok: false,
					message: "Para Transferencia debe indicar un número de cuenta",
				});
			}

			if (!regexIdentificacion.test(titularIdentificacionValue)) {
				return res.status(400).json({
					ok: false,
					message:
						"La identificación debe tener formato V/E/J seguido de números",
				});
			}

			if (tipoPagoValue === "Transferencia") {
				const cuentaDigits = numeroCuentaValue.replace(/\D/g, "");
				if (cuentaDigits.length !== 20) {
					return res.status(400).json({
						ok: false,
						message:
							"Para Transferencia el número de cuenta debe tener 20 dígitos",
					});
				}
				numeroCuentaValue = cuentaDigits;
				telefonoValue = null;
			}
		} else {
			if (!tipoPagoValue) {
				return res.status(400).json({
					ok: false,
					message: "Para USD debe indicar el tipo de pago",
				});
			}

			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!correoValue || !emailRegex.test(correoValue)) {
				return res.status(400).json({
					ok: false,
					message: "Para USD debe indicar un correo válido",
				});
			}

			titularNombreValue = null;
			titularIdentificacionValue = null;
			telefonoValue = null;
			numeroCuentaValue = null;
		}

		const uploadResult = await uploadMulterFileToLocal(
			req.file,
			"garbis/metodos-pago",
		);

		let creadoPor = firstNonEmpty(req.user?.id, req.user?.id_usuario);
		if (creadoPor) {
			const [userByIdRows] = await pool.execute(
				"SELECT id_usuario FROM usuario WHERE id_usuario = ? LIMIT 1",
				[creadoPor],
			);
			if (!userByIdRows.length) {
				creadoPor = null;
			}
		}

		if (!creadoPor && req.user?.correo) {
			const [userByCorreoRows] = await pool.execute(
				"SELECT id_usuario FROM usuario WHERE correo = ? LIMIT 1",
				[String(req.user.correo).trim()],
			);
			if (userByCorreoRows.length) {
				creadoPor = userByCorreoRows[0].id_usuario;
			}
		}

		if (!creadoPor) {
			return res.status(401).json({
				ok: false,
				message:
					"Sesión inválida para crear métodos de pago. Inicia sesión nuevamente.",
			});
		}

		const data = await createMetodoPagoController({
			nombre: String(nombre).trim(),
			banco_codigo: String(banco_codigo).trim(),
			banco_nombre: String(banco_nombre).trim(),
			tipo_pago: tipoPagoValue,
			moneda: monedaValue,
			titular_nombre: titularNombreValue,
			titular_identificacion: titularIdentificacionValue,
			correo: correoValue,
			telefono: telefonoValue,
			numero_cuenta: numeroCuentaValue,
			imagen_url: uploadResult.url,
			creado_por: creadoPor,
		});

		return res.status(201).json({
			ok: true,
			message: "Método de pago creado",
			data,
		});
	} catch (error) {
		if (error?.code === "ER_NO_REFERENCED_ROW_2") {
			return res.status(400).json({
				ok: false,
				message:
					"No se pudo asociar el método a un usuario válido. Inicia sesión nuevamente.",
			});
		}

		console.error("Error en createMetodoPagoHandler:", error);
		return res.status(500).json({
			ok: false,
			message: "Error al crear el método de pago",
		});
	}
};

const updateMetodoPagoHandler = async (req, res) => {
	try {
		const body = req.body || {};
		const { id } = req.params;

		const currentMetodo = await getMetodoPagoByIdController(id);
		if (!currentMetodo) {
			return res.status(404).json({
				ok: false,
				message: "Método de pago no encontrado",
			});
		}

		const nombre = firstNonEmpty(body.nombre, currentMetodo.nombre);
		const tipoPagoRaw = firstNonEmpty(body.tipo_pago, currentMetodo.tipo_pago);
		const monedaRaw = firstNonEmpty(body.moneda, currentMetodo.moneda);
		const bancoCodigoRaw = firstNonEmpty(
			body.banco_codigo,
			currentMetodo.banco_codigo,
		);
		const bancoNombreRaw = firstNonEmpty(
			body.banco_nombre,
			currentMetodo.banco_nombre,
		);

		if (!nombre) {
			return res
				.status(400)
				.json({ ok: false, message: "El nombre del método es requerido" });
		}

		if (!bancoCodigoRaw || !bancoNombreRaw) {
			return res
				.status(400)
				.json({ ok: false, message: "Debe indicar un banco válido" });
		}

		const monedaValue = normalizeMoneda(monedaRaw);
		if (!["BS", "USD"].includes(monedaValue)) {
			return res
				.status(400)
				.json({ ok: false, message: "La moneda debe ser BS o USD" });
		}

		let tipoPagoValue = String(tipoPagoRaw || "").trim();
		const titularIdentificacionRaw = firstNonEmpty(
			body.titular_identificacion,
			body.titularIdentificacion,
			body.identificacion,
			body.cedula,
			currentMetodo.titular_identificacion,
		);
		const identificacionTipoRaw = firstNonEmpty(
			body.titular_identificacion_tipo,
			body.titularIdentificacionTipo,
			body.identificacion_tipo,
			body.identificacionTipo,
		);
		const identificacionNumeroRaw = firstNonEmpty(
			body.titular_identificacion_numero,
			body.titularIdentificacionNumero,
			body.identificacion_numero,
			body.identificacionNumero,
		);

		let titularIdentificacionValue = titularIdentificacionRaw
			? String(titularIdentificacionRaw).trim().toUpperCase()
			: null;
		if (
			!titularIdentificacionValue &&
			identificacionTipoRaw &&
			identificacionNumeroRaw
		) {
			titularIdentificacionValue = `${String(identificacionTipoRaw).toUpperCase()}${String(
				identificacionNumeroRaw,
			)
				.replace(/\D/g, "")
				.trim()}`;
		}

		let correoValue = firstNonEmpty(body.correo, currentMetodo.correo);
		let telefonoValue = firstNonEmpty(body.telefono, currentMetodo.telefono);
		let numeroCuentaValue = firstNonEmpty(
			body.numero_cuenta,
			currentMetodo.numero_cuenta,
		);

		if (monedaValue === "BS") {
			const tipoBs = normalizeTipoBs(tipoPagoValue);
			if (!tipoBs) {
				return res
					.status(400)
					.json({
						ok: false,
						message:
							"Para BS solo se permite Transferencia, PagoMovil o EfectivoBs",
					});
			}
			tipoPagoValue = tipoBs;
			correoValue = null;

			if (!titularIdentificacionValue) {
				return res
					.status(400)
					.json({
						ok: false,
						message: "Para BS debe indicar la identificación del titular",
					});
			}

			const regexIdentificacion = /^(V|E|J)\d{5,12}$/i;
			if (!regexIdentificacion.test(titularIdentificacionValue)) {
				return res
					.status(400)
					.json({
						ok: false,
						message:
							"La identificación debe tener formato V/E/J seguido de números",
					});
			}

			if (tipoPagoValue === "EfectivoBs") {
				telefonoValue = null;
				numeroCuentaValue = null;
			} else if (tipoPagoValue === "PagoMovil") {
				if (!telefonoValue) {
					return res
						.status(400)
						.json({
							ok: false,
							message: "Para PagoMovil debe indicar un teléfono",
						});
				}
				const telefonoDigits = String(telefonoValue).replace(/\D/g, "");
				if (telefonoDigits.length < 10 || telefonoDigits.length > 11) {
					return res
						.status(400)
						.json({
							ok: false,
							message: "Para PagoMovil el teléfono debe ser válido",
						});
				}
				telefonoValue = telefonoDigits;
				numeroCuentaValue = null;
			}

			if (tipoPagoValue === "Transferencia") {
				if (!numeroCuentaValue) {
					return res
						.status(400)
						.json({
							ok: false,
							message: "Para Transferencia debe indicar un número de cuenta",
						});
				}
				const cuentaDigits = String(numeroCuentaValue).replace(/\D/g, "");
				if (cuentaDigits.length !== 20) {
					return res
						.status(400)
						.json({
							ok: false,
							message:
								"Para Transferencia el número de cuenta debe tener 20 dígitos",
						});
				}
				numeroCuentaValue = cuentaDigits;
				telefonoValue = null;
			}
		} else {
			if (!tipoPagoValue) {
				return res
					.status(400)
					.json({
						ok: false,
						message: "Para USD debe indicar el tipo de pago",
					});
			}
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!correoValue || !emailRegex.test(String(correoValue))) {
				return res
					.status(400)
					.json({
						ok: false,
						message: "Para USD debe indicar un correo válido",
					});
			}
			titularIdentificacionValue = null;
			telefonoValue = null;
			numeroCuentaValue = null;
		}

		let imagenUrl = currentMetodo.imagen_url;
		if (req.file) {
			const uploadResult = await uploadMulterFileToLocal(
				req.file,
				"garbis/metodos-pago",
			);
			imagenUrl = uploadResult.url;
		}

		const data = await updateMetodoPagoController({
			id_metodo_pago: id,
			nombre,
			banco_codigo: String(bancoCodigoRaw).trim(),
			banco_nombre: String(bancoNombreRaw).trim(),
			tipo_pago: tipoPagoValue,
			moneda: monedaValue,
			titular_nombre: null,
			titular_identificacion: titularIdentificacionValue,
			correo: correoValue,
			telefono: telefonoValue,
			numero_cuenta: numeroCuentaValue,
			imagen_url: imagenUrl,
		});

		return res
			.status(200)
			.json({ ok: true, message: "Método de pago actualizado", data });
	} catch (error) {
		if (error?.code === "METODO_PAGO_NOT_FOUND") {
			return res.status(404).json({ ok: false, message: error.message });
		}
		console.error("Error en updateMetodoPagoHandler:", error);
		return res
			.status(500)
			.json({ ok: false, message: "Error al actualizar el método de pago" });
	}
};

const updateEstadoMetodoPagoHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const { activo } = req.body;

		if (typeof activo !== "boolean") {
			return res.status(400).json({
				ok: false,
				message: "El estado activo debe ser booleano",
			});
		}

		const data = await updateEstadoMetodoPagoController({
			id_metodo_pago: id,
			activo,
		});

		return res.status(200).json({
			ok: true,
			message: "Estado actualizado",
			data,
		});
	} catch (error) {
		if (error?.code === "METODO_PAGO_NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: error.message,
			});
		}

		console.error("Error en updateEstadoMetodoPagoHandler:", error);
		return res.status(500).json({
			ok: false,
			message: "Error al actualizar el estado del método",
		});
	}
};

const deleteMetodoPagoHandler = async (req, res) => {
	try {
		await deleteMetodoPagoController(req.params.id);
		return res.status(200).json({
			ok: true,
			message: "Método de pago eliminado",
		});
	} catch (error) {
		if (error?.code === "METODO_PAGO_NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: error.message,
			});
		}

		console.error("Error en deleteMetodoPagoHandler:", error);
		return res.status(500).json({
			ok: false,
			message: "Error al eliminar el método de pago",
		});
	}
};

module.exports = {
	listMetodosPagoHandler,
	listMetodosPagoDisponiblesHandler,
	createMetodoPagoHandler,
	updateMetodoPagoHandler,
	updateEstadoMetodoPagoHandler,
	deleteMetodoPagoHandler,
};
