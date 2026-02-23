const {
	createCitaFromDisponibilidadController,
	asignarCitaCompletaController,
	listCitasByPacienteController,
	listCitasCompletasByPacienteController,
	listCitasByEspecialistaController,
	cancelCitaController,
	markCitaAtendidaController,
	listCitasPendientesPagoController,
	listCitasConPagosController,
	updateEstadoPagoController,
	listCitasByFechaController,
	getCitaByIdController,
	posponerCitaController,
	getAllCitasController,
	createCitaMostradorController,
	getOcupacionEspecialistaPorFechaController,
	getDatosPorCedulaController,
	buscarRepresentadoPorNombreController,
	getUltimoPacienteMostradorPorCedulaController,
	listCitasMostradorDisponiblesParaVincularController,
	vincularCitasMostradorController,
} = require("../controllers/citasControllers");
const { validarCedula } = require("../utils/validacionCedula");

const createCitaHandler = async (req, res) => {
	try {
		const { id_paciente, id_representado, id_eco, orden, id_disponibilidad } =
			req.body;

		const missing = [];
		if (!id_paciente) missing.push("id_paciente");
		if (!id_eco) missing.push("id_eco");
		if (!orden) missing.push("orden");
		if (!id_disponibilidad) missing.push("id_disponibilidad");

		if (missing.length) {
			return res.status(400).json({
				ok: false,
				message: "Faltan campos requeridos",
				missing,
			});
		}

		if (req.user?.id !== id_paciente) {
			return res.status(403).json({
				ok: false,
				message: "No autorizado para crear cita a otro paciente",
			});
		}

		const created = await createCitaFromDisponibilidadController({
			id_paciente,
			id_representado,
			id_eco,
			orden,
			id_disponibilidad,
		});

		return res.status(201).json({
			ok: true,
			message: "Cita creada",
			data: created,
		});
	} catch (err) {
		if (err?.code === "NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "EMAIL_NOT_VERIFIED") {
			return res.status(403).json({
				ok: false,
				message: err.message,
				code: "EMAIL_NOT_VERIFIED",
			});
		}
		if (err?.code === "INVALID_STATE") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "PAST_DATE") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "ER_DUP_ENTRY") {
			return res.status(409).json({
				ok: false,
				message: "La disponibilidad ya fue reservada",
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const listCitasByPacienteHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await listCitasByPacienteController(id);
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

/** Normaliza fecha a YYYY-MM-DD para evitar años erróneos (ej. 20260) en el cliente. */
function toDateOnly(val) {
	if (val == null) return val;
	if (typeof val === "string") {
		const s = val.trim();
		// No truncar antes de reemplazar: "20260-02-18" son 11 caracteres
		const part = s.includes("T") ? s.split("T")[0] : s;
		const fixed = part.replace(/^20260-(\d{2})-(\d{2})/, "2026-$1-$2").replace(/20260/g, "2026");
		const key = fixed.slice(0, 10);
		return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : val;
	}
	if (val instanceof Date && !Number.isNaN(val.getTime())) {
		let y = val.getFullYear();
		if (y === 20260 || (y > 9999 && y < 30000 && y % 10 === 0)) y = Math.floor(y / 10);
		if (y < 1000 || y > 9999) return null;
		const m = String(val.getMonth() + 1).padStart(2, "0");
		const d = String(val.getDate()).padStart(2, "0");
		return `${y}-${m}-${d}`;
	}
	return val;
}

const listMisCitasCompletasHandler = async (req, res) => {
	try {
		const id_paciente = req.user.id;
		const data = await listCitasCompletasByPacienteController(id_paciente);
		const normalized = Array.isArray(data)
			? data.map((row) => ({
					...row,
					fecha_cita: toDateOnly(row.fecha_cita),
					...(row.representado_fecha_nacimiento != null && {
						representado_fecha_nacimiento: toDateOnly(row.representado_fecha_nacimiento),
					}),
				}))
			: data;
		return res.status(200).json({
			ok: true,
			data: normalized,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const listCitasByEspecialistaHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await listCitasByEspecialistaController(id);
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const listCitasByEspecialistaSelfHandler = async (req, res) => {
	try {
		const id = req.user?.id;
		if (!id) {
			return res.status(401).json({
				ok: false,
				message: "Token inválido",
			});
		}
		const data = await listCitasByEspecialistaController(id);
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const cancelCitaHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const result = await cancelCitaController({ id_cita: id });
		return res.status(200).json({
			ok: true,
			message: "Cita cancelada",
			data: result,
		});
	} catch (err) {
		if (err?.code === "NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const markCitaAtendidaHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user?.id;
		const role = req.user?.rol;
		if (!userId) {
			return res.status(401).json({
				ok: false,
				message: "Token inválido",
			});
		}
		const data = await markCitaAtendidaController({
			id_cita: id,
			userId,
			role,
		});
		return res.status(200).json({
			ok: true,
			message: "Cita atendida",
			data,
		});
	} catch (err) {
		if (err?.code === "NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "FORBIDDEN") {
			return res.status(403).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "INVALID_STATE" || err?.code === "FUTURE_DATE") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const listCitasPendientesPagoHandler = async (req, res) => {
	try {
		const data = await listCitasPendientesPagoController();
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const listCitasConPagosHandler = async (req, res) => {
	try {
		const data = await listCitasConPagosController();
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const updateEstadoPagoHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const { estado_pago, motivo_rechazo } = req.body;
		const aprobado_por = req.user?.id;

		if (!aprobado_por) {
			return res.status(401).json({
				ok: false,
				message: "Token inválido",
			});
		}

		if (estado_pago === undefined || ![0, 1, 2].includes(Number(estado_pago))) {
			return res.status(400).json({
				ok: false,
				message:
					"estado_pago debe ser 0 (Pendiente), 1 (Aprobado) o 2 (Rechazado)",
			});
		}

		// Si se rechaza el pago, el motivo es obligatorio
		if (
			Number(estado_pago) === 2 &&
			(!motivo_rechazo || !motivo_rechazo.trim())
		) {
			return res.status(400).json({
				ok: false,
				message: "Debe proporcionar un motivo para el rechazo",
			});
		}
		if (
			Number(estado_pago) === 2 &&
			motivo_rechazo &&
			motivo_rechazo.trim().length > 255
		) {
			return res.status(400).json({
				ok: false,
				message: "El motivo no puede exceder 255 caracteres",
			});
		}

		const data = await updateEstadoPagoController({
			id_cita: id,
			estado_pago: Number(estado_pago),
			aprobado_por,
			motivo_rechazo: motivo_rechazo?.trim() || null,
		});

		return res.status(200).json({
			ok: true,
			message:
				estado_pago === 1
					? "Pago aprobado y cita confirmada"
					: estado_pago === 2
						? "Pago rechazado"
						: "Estado de pago actualizado",
			data,
		});
	} catch (err) {
		if (err?.code === "NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "INVALID_STATE") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const listCitasByFechaHandler = async (req, res) => {
	try {
		const { fecha } = req.query;
		if (!fecha) {
			return res.status(400).json({
				ok: false,
				message: "fecha es requerida",
			});
		}
		const data = await listCitasByFechaController(fecha);
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const getCitaByIdHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const { rol, id: id_usuario } = req.user; // Información del usuario autenticado (el campo es 'id' no 'id_usuario')

		if (!id) {
			return res.status(400).json({
				ok: false,
				message: "id es requerido",
			});
		}
		const data = await getCitaByIdController(id);
		if (!data) {
			return res.status(404).json({
				ok: false,
				message: "Cita no encontrada",
			});
		}

		// Si es especialista, solo puede ver sus propias citas
		// En la tabla cita, id_especialista hace referencia a especialista(id_especialista)
		// Y en la tabla especialista, id_especialista = id_usuario
		if (rol === "especialista") {
			// Convertir a string y comparar para evitar problemas de tipo
			const citaEspecialistaId = String(data.id_especialista || "").trim();
			const usuarioId = String(id_usuario || "").trim();

			if (citaEspecialistaId !== usuarioId) {
				console.log(
					"🔒 Acceso denegado - Especialista intentando ver cita de otro:",
					{
						usuarioId,
						citaEspecialistaId,
						citaId: id,
						rol,
						comparison: citaEspecialistaId === usuarioId,
					},
				);
				return res.status(403).json({
					ok: false,
					message:
						"No tienes permiso para ver esta cita. Esta cita pertenece a otro especialista.",
				});
			}
		} else if (rol === "paciente") {
			// Los pacientes solo pueden ver sus propias citas
			const citaPacienteId = String(data.id_paciente || "").trim();
			const usuarioId = String(id_usuario || "").trim();

			if (citaPacienteId !== usuarioId) {
				return res.status(403).json({
					ok: false,
					message:
						"No tienes permiso para ver esta cita. Esta cita pertenece a otro paciente.",
				});
			}
		}

		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const posponerCitaHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const { fecha_cita, hora_cita, id_especialista, id_disponibilidad } =
			req.body;

		const missing = [];
		if (!fecha_cita) missing.push("fecha_cita");
		if (!hora_cita) missing.push("hora_cita");

		if (missing.length) {
			return res.status(400).json({
				ok: false,
				message: "Faltan campos requeridos",
				missing,
			});
		}

		if (
			(id_especialista && !id_disponibilidad) ||
			(!id_especialista && id_disponibilidad)
		) {
			return res.status(400).json({
				ok: false,
				message:
					"Para cambiar de especialista debes enviar id_especialista e id_disponibilidad",
			});
		}

		// Validar formato de fecha (YYYY-MM-DD)
		if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_cita)) {
			return res.status(400).json({
				ok: false,
				message: "fecha_cita debe tener el formato YYYY-MM-DD",
			});
		}

		// Validar formato de hora (HH:MM:SS o HH:MM)
		if (!/^\d{2}:\d{2}(:\d{2})?$/.test(hora_cita)) {
			return res.status(400).json({
				ok: false,
				message: "hora_cita debe tener el formato HH:MM o HH:MM:SS",
			});
		}

		// Normalizar hora a HH:MM:SS
		const horaNormalizada =
			hora_cita.includes(":") && hora_cita.split(":").length === 2
				? `${hora_cita}:00`
				: hora_cita;

		const data = await posponerCitaController({
			id_cita: id,
			fecha_cita,
			hora_cita: horaNormalizada,
			id_especialista: id_especialista || null,
			id_disponibilidad: id_disponibilidad || null,
		});

		return res.status(200).json({
			ok: true,
			message: "Cita pospuesta exitosamente",
			data,
		});
	} catch (err) {
		if (err?.code === "NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "INVALID_STATE" || err?.code === "PAST_DATE") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const getAllCitasHandler = async (req, res) => {
	try {
		const data = await getAllCitasController();
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const asignarCitaCompletaHandler = async (req, res) => {
	try {
		const {
			id_paciente,
			id_representado,
			id_eco,
			id_especialista,
			id_disponibilidad,
			orden_medica, // URL de la orden médica subida
			metodo,
			imagen,
			banco_origen,
			banco_destino,
			monto,
			cedula_pagador,
			telefono_pagador,
			referencia,
		} = req.body;

		const missing = [];
		if (!id_paciente) missing.push("id_paciente");
		if (!id_eco) missing.push("id_eco");
		if (!id_especialista) missing.push("id_especialista");
		if (!id_disponibilidad) missing.push("id_disponibilidad");
		if (!metodo) missing.push("metodo");
		if (!banco_origen) missing.push("banco_origen");
		if (!banco_destino) missing.push("banco_destino");
		if (!monto) missing.push("monto");
		if (!cedula_pagador) missing.push("cedula_pagador");
		if (!telefono_pagador) missing.push("telefono_pagador");
		if (!referencia) missing.push("referencia");

		if (missing.length) {
			return res.status(400).json({
				ok: false,
				message: `Faltan campos requeridos: ${missing.join(", ")}`,
			});
		}

		if (!["Transferencia", "PagoMovil"].includes(String(metodo))) {
			return res.status(400).json({
				ok: false,
				message:
					"Para citas online el metodo debe ser Transferencia o PagoMovil",
			});
		}

		// Si es paciente, solo puede asignar cita para sí mismo
		if (req.user.rol === "paciente" && id_paciente !== req.user.id) {
			return res.status(403).json({
				ok: false,
				message: "Solo puede reservar cita para su propia cuenta",
			});
		}

		const data = await asignarCitaCompletaController({
			id_paciente,
			id_representado,
			id_eco,
			id_especialista,
			id_disponibilidad,
			orden: orden_medica || "", // Usar orden_medica como orden (URL de la orden médica)
			aprobado_por: req.user.rol === "paciente" ? null : req.user.id, // Paciente no aprueba; admin/moderador sí
			role: req.user.rol,
			metodo,
			imagen,
			banco_origen,
			banco_destino,
			monto,
			cedula_pagador,
			telefono_pagador,
			referencia,
		});

		return res.status(201).json({
			ok: true,
			message: "Cita asignada exitosamente con pago y resultado",
			data,
		});
	} catch (err) {
		if (err.code === "NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "EMAIL_NOT_VERIFIED") {
			return res.status(403).json({
				ok: false,
				message: err.message,
				code: "EMAIL_NOT_VERIFIED",
			});
		}
		if (err.code === "INVALID_STATE") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		if (err.code === "ECO_NOT_AVAILABLE") {
			return res.status(400).json({
				ok: false,
				message: err.message,
			});
		}
		console.error("Error al asignar cita completa:", err);
		return res.status(500).json({
			ok: false,
			message: "Error interno del servidor",
		});
	}
};

const createCitaMostradorHandler = async (req, res) => {
	try {
		const {
			id_especialista,
			id_eco,
			fecha_cita,
			hora_cita,
			metodo,
			monto,
			tasa_dia_bcv,
			nombre,
			apellido,
			cedula,
			rif,
			referencia,
			id_paciente,
			id_representado,
		} = req.body;

		const missing = [];
		if (!id_especialista) missing.push("id_especialista");
		if (!id_eco) missing.push("id_eco");
		if (!fecha_cita) missing.push("fecha_cita");
		if (!hora_cita) missing.push("hora_cita");
		if (!metodo) missing.push("metodo");
		if (!monto) missing.push("monto");
		if (!tasa_dia_bcv) missing.push("tasa_dia_bcv");
		if (!nombre) missing.push("nombre");
		if (!apellido) missing.push("apellido");
		const esRepresentadoSinCedula = id_paciente && id_representado && (!cedula || String(cedula).trim() === "");
		if (!cedula && !esRepresentadoSinCedula) missing.push("cedula");

		if (missing.length) {
			return res.status(400).json({
				ok: false,
				message: `Faltan campos requeridos: ${missing.join(", ")}`,
			});
		}

		if (
			!["Transferencia", "PagoMovil", "Efectivo", "Zelle", "Otro"].includes(
				String(metodo),
			)
		) {
			return res.status(400).json({
				ok: false,
				message:
					"Metodo invalido para mostrador. Valores permitidos: Transferencia, PagoMovil, Efectivo, Zelle, Otro",
			});
		}

		let cedulaNormalizada = "";
		if (cedula && String(cedula).trim() !== "") {
			const cedulaResult = validarCedula(cedula);
			if (!cedulaResult.valid) {
				return res.status(400).json({
					ok: false,
					message: cedulaResult.message,
				});
			}
			cedulaNormalizada = cedulaResult.value;
		}

		const data = await createCitaMostradorController({
			id_especialista,
			id_eco,
			fecha_cita,
			hora_cita,
			metodo,
			monto,
			tasa_dia_bcv,
			nombre,
			apellido,
			cedula: cedulaNormalizada,
			rif,
			id_usuario: req.user?.id,
			referencia,
			id_paciente: id_paciente || undefined,
			id_representado: id_representado || undefined,
		});

		return res.status(201).json({
			ok: true,
			message: "Cita de mostrador registrada",
			data,
		});
	} catch (err) {
		if (
			err?.code === "NOT_FOUND" ||
			err?.code === "INVALID_AMOUNT" ||
			err?.code === "INVALID_RATE" ||
			err?.code === "ECO_NOT_AVAILABLE"
		) {
			return res.status(400).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "CONFLICT_HORARIO") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "MISSING_CEDULA") {
			return res.status(400).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "ROL_NOT_FOUND") {
			return res.status(500).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "ER_DUP_ENTRY") {
			return res.status(409).json({
				ok: false,
				message: "La referencia de pago ya existe, intenta nuevamente",
			});
		}
		console.error("Error al crear cita de mostrador:", err);
		return res.status(500).json({
			ok: false,
			message: "Error interno del servidor",
		});
	}
};

const getOcupacionEspecialistaHandler = async (req, res) => {
	try {
		const id_especialista = req.query.id_especialista;
		const fecha = req.query.fecha;
		if (!id_especialista || !fecha) {
			return res.status(400).json({
				ok: false,
				message: "Se requieren id_especialista y fecha",
			});
		}
		const data = await getOcupacionEspecialistaPorFechaController(
			id_especialista,
			fecha,
		);
		return res.status(200).json({ ok: true, data });
	} catch (err) {
		console.error("Error al obtener ocupación especialista:", err);
		return res.status(500).json({
			ok: false,
			message: "Error interno del servidor",
		});
	}
};

const buscarRepresentadoPorNombreHandler = async (req, res) => {
	try {
		const nombre = req.query.nombre;
		const apellido = req.query.apellido;
		if (!nombre && !apellido) {
			return res.status(400).json({
				ok: false,
				message: "Indica al menos nombre o apellido para buscar.",
			});
		}
		const data = await buscarRepresentadoPorNombreController(
			nombre ? String(nombre).trim() : "",
			apellido ? String(apellido).trim() : "",
		);
		return res.status(200).json({ ok: true, data });
	} catch (err) {
		console.error("Error al buscar representado por nombre:", err);
		return res.status(500).json({
			ok: false,
			message: "Error interno del servidor",
		});
	}
};

const getDatosPorCedulaHandler = async (req, res) => {
	try {
		const cedulaRaw = req.query.cedula;
		if (!cedulaRaw || String(cedulaRaw).trim() === "") {
			return res.status(400).json({
				ok: false,
				message: "Se requiere el parámetro cedula",
			});
		}
		const cedulaResult = validarCedula(cedulaRaw);
		if (!cedulaResult.valid) {
			return res.status(400).json({
				ok: false,
				message: cedulaResult.message,
			});
		}
		const data = await getDatosPorCedulaController(cedulaResult.value);
		return res.status(200).json({ ok: true, data });
	} catch (err) {
		console.error("Error al obtener datos por cédula:", err);
		return res.status(500).json({
			ok: false,
			message: "Error interno del servidor",
		});
	}
};

const getUltimoPacienteMostradorHandler = async (req, res) => {
	try {
		const cedulaRaw = req.query.cedula;
		if (!cedulaRaw || String(cedulaRaw).trim() === "") {
			return res.status(400).json({
				ok: false,
				message: "Se requiere el parámetro cedula",
			});
		}
		const cedulaResult = validarCedula(cedulaRaw);
		if (!cedulaResult.valid) {
			return res.status(400).json({
				ok: false,
				message: cedulaResult.message,
			});
		}
		const data = await getUltimoPacienteMostradorPorCedulaController(
			cedulaResult.value,
		);
		return res.status(200).json({ ok: true, data });
	} catch (err) {
		console.error("Error al obtener último paciente mostrador:", err);
		return res.status(500).json({
			ok: false,
			message: "Error interno del servidor",
		});
	}
};

const listCitasMostradorDisponiblesParaVincularHandler = async (req, res) => {
	try {
		const cedulaRaw = req.query.cedula;
		if (!cedulaRaw || String(cedulaRaw).trim() === "") {
			return res.status(400).json({
				ok: false,
				message: "Se requiere el parámetro cedula",
			});
		}
		const cedulaResult = validarCedula(cedulaRaw);
		if (!cedulaResult.valid) {
			return res.status(400).json({
				ok: false,
				message: cedulaResult.message,
			});
		}
		const data =
			await listCitasMostradorDisponiblesParaVincularController(
				cedulaResult.value,
			);
		return res.status(200).json({ ok: true, data });
	} catch (err) {
		console.error("Error al listar citas mostrador disponibles:", err);
		return res.status(500).json({
			ok: false,
			message: "Error interno del servidor",
		});
	}
};

const vincularCitasMostradorHandler = async (req, res) => {
	try {
		const id_paciente = req.user?.id;
		if (!id_paciente) {
			return res.status(401).json({
				ok: false,
				message: "No autorizado",
			});
		}
		const { id_citas } = req.body;
		if (!Array.isArray(id_citas)) {
			return res.status(400).json({
				ok: false,
				message: "Se requiere body con id_citas (array de UUID)",
			});
		}
		const ids = id_citas.filter(
			(id) => typeof id === "string" && id.trim().length > 0,
		);
		const result = await vincularCitasMostradorController(id_paciente, ids);
		return res.status(200).json({
			ok: true,
			message:
				result.vinculadas > 0
					? `Se asociaron ${result.vinculadas} cita(s) a tu cuenta.`
					: result.message || "No se pudo asociar ninguna cita.",
			data: result,
		});
	} catch (err) {
		if (err?.code === "NOT_FOUND" || err?.code === "NO_CEDULA") {
			return res.status(400).json({
				ok: false,
				message: err.message,
			});
		}
		console.error("Error al vincular citas mostrador:", err);
		return res.status(500).json({
			ok: false,
			message: "Error interno del servidor",
		});
	}
};

module.exports = {
	createCitaHandler,
	asignarCitaCompletaHandler,
	listCitasByPacienteHandler,
	listMisCitasCompletasHandler,
	listCitasByEspecialistaHandler,
	listCitasByEspecialistaSelfHandler,
	cancelCitaHandler,
	markCitaAtendidaHandler,
	listCitasPendientesPagoHandler,
	listCitasConPagosHandler,
	updateEstadoPagoHandler,
	listCitasByFechaHandler,
	getCitaByIdHandler,
	posponerCitaHandler,
	getAllCitasHandler,
	createCitaMostradorHandler,
	getOcupacionEspecialistaHandler,
	getDatosPorCedulaHandler,
	buscarRepresentadoPorNombreHandler,
	getUltimoPacienteMostradorHandler,
	listCitasMostradorDisponiblesParaVincularHandler,
	vincularCitasMostradorHandler,
};
