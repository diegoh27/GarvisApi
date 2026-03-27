const {
	createDisponibilidadController,
	createDisponibilidadBatchController,
	createSolicitudMacroController,
	createSolicitudMacroManualController,
	listMisDisponibilidadController,
	listMisSolicitudesController,
	cancelSolicitudMacroController,
	approveSolicitudMacroController,
	rejectSolicitudMacroController,
	listPendientesController,
	listDisponibilidadesAdminController,
	approveDisponibilidadController,
	approveDisponibilidadBatchController,
	approveDisponibilidadPorCriteriosController,
	rejectDisponibilidadController,
	cancelDisponibilidadController,
	cancelDisponibilidadAdminController,
	cancelDisponibilidadBatchController,
	listPublicaController,
	listPublicaPorEcoController,
	listPublicaPorFechaController,
	closeDisponibilidadDiaController,
	listDisponibilidadesByFechaController,
	listDisponibilidadesByEspecialistaController,
	deleteDisponibilidadPasadaController,
	deleteDisponibilidadPorCriteriosController,
} = require("../controllers/disponibilidadControllers");

const parseTimeToMinutes = (timeStr) => {
	const [h, m, s] = timeStr.split(":").map(Number);
	if (Number.isNaN(h) || Number.isNaN(m)) return null;
	return h * 60 + m + (s ? s / 60 : 0);
};

const validateTimeBlock = (hora_inicio, hora_fin) => {
	const start = parseTimeToMinutes(hora_inicio);
	const end = parseTimeToMinutes(hora_fin);
	if (start === null || end === null)
		return { ok: false, message: "Hora inválida" };
	if (end <= start)
		return { ok: false, message: "hora_fin debe ser mayor que hora_inicio" };
	if (end - start !== 20) {
		return { ok: false, message: "La disponibilidad debe ser de 20 minutos" };
	}
	// Limitar rango diario (06:00 a 20:00)
	if (start < 6 * 60 || end > 20 * 60) {
		return {
			ok: false,
			message: "Horario fuera del rango permitido (06:00-20:00)",
		};
	}
	return { ok: true };
};

const parseDateKey = (value) => {
	if (!value || typeof value !== "string") return null;
	const date = new Date(`${value}T00:00:00`);
	if (Number.isNaN(date.getTime())) return null;
	return date;
};

const MAX_BATCH_RANGE_DAYS = 6;

const createDisponibilidadHandler = async (req, res) => {
	try {
		const { fecha, hora_inicio, hora_fin, id_eco } = req.body;
		if (!fecha || !hora_inicio || !hora_fin) {
			return res.status(400).json({
				ok: false,
				message: "fecha, hora_inicio y hora_fin son requeridos",
			});
		}
		const check = validateTimeBlock(hora_inicio, hora_fin);
		if (!check.ok) {
			return res.status(400).json({
				ok: false,
				message: check.message,
			});
		}

		const created = await createDisponibilidadController({
			id_especialista: req.user.id,
			fecha,
			hora_inicio,
			hora_fin,
			creado_por: req.user.id,
			id_eco: id_eco || null,
		});

		return res.status(201).json({
			ok: true,
			message: "Bloque propuesto",
			data: created,
		});
	} catch (err) {
		if (err?.code === "OVERLAP") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "ECO_NOT_FOUND") {
			return res.status(400).json({
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

const createDisponibilidadBatchHandler = async (req, res) => {
	try {
		const { bloques } = req.body;
		if (!Array.isArray(bloques) || bloques.length === 0) {
			return res.status(400).json({
				ok: false,
				message: "bloques debe ser un array con al menos un elemento",
			});
		}

		const fechas = bloques.map((b) => parseDateKey(b?.fecha));
		if (fechas.some((d) => d === null)) {
			return res.status(400).json({
				ok: false,
				message: "Fecha inválida en uno o más bloques",
			});
		}
		const timestamps = fechas.map((d) => d.getTime());
		const minTs = Math.min(...timestamps);
		const maxTs = Math.max(...timestamps);
		const diffDays = Math.floor((maxTs - minTs) / (1000 * 60 * 60 * 24)) + 1;
		if (diffDays > MAX_BATCH_RANGE_DAYS) {
			return res.status(400).json({
				ok: false,
				message: `El rango máximo permitido es de ${MAX_BATCH_RANGE_DAYS} días`,
			});
		}
		for (const b of bloques) {
			const check = validateTimeBlock(b.hora_inicio, b.hora_fin);
			if (!check.ok) {
				return res.status(400).json({
					ok: false,
					message: `${check.message} (${b.fecha} ${b.hora_inicio})`,
				});
			}
		}
		const result = await createDisponibilidadBatchController({
			id_especialista: req.user.id,
			creado_por: req.user.id,
			bloques,
		});
		return res.status(201).json({
			ok: true,
			message: `${result.creados} bloque${
				result.creados !== 1 ? "s" : ""
			} propuesto${result.creados !== 1 ? "s" : ""}`,
			data: result,
		});
	} catch (err) {
		if (err?.code === "OVERLAP") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "ECO_NOT_FOUND" || err?.code === "INVALID_INPUT") {
			return res.status(400).json({
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

const listMisDisponibilidadHandler = async (req, res) => {
	try {
		const { estado } = req.query;
		const parsedEstado = estado !== undefined ? Number(estado) : undefined;
		const data = await listMisDisponibilidadController({
			id_especialista: req.user.id,
			estado: Number.isNaN(parsedEstado) ? undefined : parsedEstado,
		});
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		if (err?.code === "RESERVED") {
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

const approveDisponibilidadBatchHandler = async (req, res) => {
	try {
		const { ids } = req.body;
		if (!Array.isArray(ids) || ids.length === 0) {
			return res.status(400).json({
				ok: false,
				message: "ids debe ser un array con al menos un id",
			});
		}
		const result = await approveDisponibilidadBatchController({
			ids,
			aprobado_por: req.user?.id ?? null,
		});
		const apr = result.aprobados ?? 0;
		const auto = result.rechazados_automatico ?? 0;
		let message;
		if (apr > 0 && auto > 0) {
			message = `${apr} bloque${apr !== 1 ? "s" : ""} aprobado${
				apr !== 1 ? "s" : ""
			}; ${auto} archivado${auto !== 1 ? "s" : ""} por conflicto en el mismo equipo`;
		} else if (auto > 0 && apr === 0) {
			message = `${auto} bloque${
				auto !== 1 ? "s" : ""
			} archivado${auto !== 1 ? "s" : ""}: el horario ya estaba ocupado por otro especialista en el mismo equipo`;
		} else {
			message = `${apr} bloque${apr !== 1 ? "s" : ""} aprobado${
				apr !== 1 ? "s" : ""
			}`;
		}
		return res.status(200).json({
			ok: true,
			message,
			data: result,
		});
	} catch (err) {
		if (err?.code === "NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		if (
			err?.code === "INVALID_STATE" ||
			err?.code === "OVERLAP" ||
			err?.code === "INVALID_INPUT"
		) {
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

const approveDisponibilidadPorCriteriosHandler = async (req, res) => {
	try {
		const {
			id_especialista,
			fecha_desde,
			fecha_hasta,
			hora_desde,
			hora_hasta,
		} = req.body;
		const result = await approveDisponibilidadPorCriteriosController({
			id_especialista: id_especialista || undefined,
			fecha_desde: fecha_desde || undefined,
			fecha_hasta: fecha_hasta || undefined,
			hora_desde: hora_desde || undefined,
			hora_hasta: hora_hasta || undefined,
			aprobado_por: req.user?.id ?? null,
		});
		const apr = result.aprobados ?? 0;
		const auto = result.rechazados_automatico ?? 0;
		let message;
		if (apr === 0 && auto === 0) {
			message = "No hay bloques pendientes que coincidan con los criterios";
		} else if (apr > 0 && auto > 0) {
			message = `${apr} bloque${apr !== 1 ? "s" : ""} aprobado${
				apr !== 1 ? "s" : ""
			}; ${auto} archivado${auto !== 1 ? "s" : ""} por conflicto en el mismo equipo`;
		} else if (auto > 0 && apr === 0) {
			message = `${auto} bloque${
				auto !== 1 ? "s" : ""
			} archivado${auto !== 1 ? "s" : ""}: el horario ya estaba ocupado por otro especialista en el mismo equipo`;
		} else {
			message = `${apr} bloque${apr !== 1 ? "s" : ""} aprobado${
				apr !== 1 ? "s" : ""
			}`;
		}
		return res.status(200).json({
			ok: true,
			message,
			data: result,
		});
	} catch (err) {
		if (
			err?.code === "NOT_FOUND" ||
			err?.code === "INVALID_STATE" ||
			err?.code === "OVERLAP" ||
			err?.code === "INVALID_INPUT"
		) {
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

const listPendientesHandler = async (req, res) => {
	try {
		const data = await listPendientesController();
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		if (err?.code === "RESERVED") {
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

const listDisponibilidadesAdminHandler = async (req, res) => {
	try {
		const { estado } = req.query;
		const parsedEstado = estado !== undefined ? Number(estado) : undefined;
		const data = await listDisponibilidadesAdminController({
			estado: Number.isNaN(parsedEstado) ? undefined : parsedEstado,
		});
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

const approveDisponibilidadHandler = async (req, res) => {
	try {
		const { id } = req.params;

		// Validar que el usuario esté autenticado y tenga un ID válido
		if (!req.user || !req.user.id) {
			return res.status(401).json({
				ok: false,
				message: "Usuario no autenticado",
			});
		}

		const result = await approveDisponibilidadController({
			id_disponibilidad: id,
			aprobado_por: req.user.id,
		});
		return res.status(200).json({
			ok: true,
			message: result.rechazo_automatico
				? result.message ||
					"El horario fue archivado como rechazado por conflicto con otro especialista en el mismo equipo."
				: "Bloque aprobado",
			data: result,
		});
	} catch (err) {
		if (err?.code === "NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "INVALID_STATE" || err?.code === "OVERLAP") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "USER_NOT_FOUND") {
			return res.status(400).json({
				ok: false,
				message: err.message,
			});
		}
		// Manejar error de foreign key constraint
		if (err?.code === "ER_NO_REFERENCED_ROW_2" || err?.errno === 1452) {
			return res.status(400).json({
				ok: false,
				message:
					"El usuario autenticado no existe en la base de datos. Por favor, inicia sesión nuevamente.",
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const rejectDisponibilidadHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const result = await rejectDisponibilidadController({
			id_disponibilidad: id,
			aprobado_por: req.user.id,
		});
		if (!result.updated) {
			return res.status(404).json({
				ok: false,
				message: "Disponibilidad no encontrada o ya procesada",
			});
		}
		return res.status(200).json({
			ok: true,
			message: "Bloque rechazado",
			data: result,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const cancelDisponibilidadHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const result = await cancelDisponibilidadController({
			id_disponibilidad: id,
			id_especialista: req.user.id,
		});
		if (!result.updated) {
			return res.status(404).json({
				ok: false,
				message: "Disponibilidad no encontrada o ya cancelada",
			});
		}
		return res.status(200).json({
			ok: true,
			message: "Bloque cancelado",
			data: result,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const cancelDisponibilidadAdminHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const result = await cancelDisponibilidadAdminController({
			id_disponibilidad: id,
		});
		if (!result.updated) {
			return res.status(404).json({
				ok: false,
				message: "Disponibilidad no encontrada o ya cancelada",
			});
		}
		return res.status(200).json({
			ok: true,
			message: "Bloque cancelado",
			data: result,
		});
	} catch (err) {
		if (err?.code === "RESERVED") {
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

const cancelDisponibilidadBatchHandler = async (req, res) => {
	try {
		const { ids } = req.body;
		const result = await cancelDisponibilidadBatchController({ ids });
		return res.status(200).json({
			ok: true,
			message: "Cancelación en lote completada",
			data: result,
		});
	} catch (err) {
		if (err?.code === "INVALID_INPUT") {
			return res.status(400).json({
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

const listPublicaHandler = async (req, res) => {
	try {
		const { id_especialista, id_eco, fecha } = req.query;
		if (id_eco) {
			const data = await listPublicaPorEcoController({ id_eco, fecha });
			return res.status(200).json({
				ok: true,
				data,
			});
		}
		// Date-only query: return all ecos with availability for that date
		if (fecha && !id_especialista) {
			const data = await listPublicaPorFechaController({ fecha });
			return res.status(200).json({
				ok: true,
				data,
			});
		}
		if (!id_especialista) {
			return res.status(400).json({
				ok: false,
				message: "id_especialista, id_eco o fecha es requerido",
			});
		}
		const data = await listPublicaController({ id_especialista, fecha });
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

const closeDisponibilidadDiaHandler = async (req, res) => {
	try {
		const { id_especialista, fecha } = req.body;
		if (!id_especialista || !fecha) {
			return res.status(400).json({
				ok: false,
				message: "id_especialista y fecha son requeridos",
			});
		}

		const result = await closeDisponibilidadDiaController({
			id_especialista,
			fecha,
			cerrado_por: req.user.id,
		});

		return res.status(200).json({
			ok: true,
			message: "Disponibilidad cerrada para el dia",
			data: result,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const listDisponibilidadesByFechaHandler = async (req, res) => {
	try {
		const { fecha } = req.query;
		if (!fecha) {
			return res.status(400).json({
				ok: false,
				message: "fecha es requerida",
			});
		}
		const data = await listDisponibilidadesByFechaController(fecha);
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

const listDisponibilidadesByEspecialistaHandler = async (req, res) => {
	try {
		const { id_especialista } = req.query;
		if (!id_especialista) {
			return res.status(400).json({
				ok: false,
				message: "id_especialista es requerido",
			});
		}
		const data =
			await listDisponibilidadesByEspecialistaController(id_especialista);
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

const deleteDisponibilidadPasadaHandler = async (req, res) => {
	try {
		const result = await deleteDisponibilidadPasadaController();
		return res.status(200).json({
			ok: true,
			message:
				result.eliminados === 0
					? "No hay disponibilidades pasadas sin citas para eliminar"
					: `Se eliminaron ${result.eliminados} bloque${
							result.eliminados !== 1 ? "s" : ""
						} de disponibilidad pasada (sin citas asignadas)`,
			data: result,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const deleteDisponibilidadPorCriteriosHandler = async (req, res) => {
	try {
		const {
			id_especialista,
			fecha_desde,
			fecha_hasta,
			hora_desde,
			hora_hasta,
		} = req.body;
		const result = await deleteDisponibilidadPorCriteriosController({
			id_especialista: id_especialista || undefined,
			fecha_desde: fecha_desde || undefined,
			fecha_hasta: fecha_hasta || undefined,
			hora_desde: hora_desde || undefined,
			hora_hasta: hora_hasta || undefined,
		});
		return res.status(200).json({
			ok: true,
			message:
				result.eliminados === 0
					? "No hay bloques que coincidan con los criterios (o todos tienen citas asignadas)"
					: `Se eliminaron ${result.eliminados} bloque${
							result.eliminados !== 1 ? "s" : ""
						} de disponibilidad`,
			data: result,
		});
	} catch (err) {
		if (err?.code === "INVALID_INPUT") {
			return res.status(400).json({
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

const createSolicitudMacroHandler = async (req, res) => {
	try {
		const {
			fecha_desde,
			fecha_hasta,
			hora_inicio,
			hora_fin,
			id_eco,
			id_ecos,
		} = req.body;
		if (!fecha_desde || !fecha_hasta || !hora_inicio || !hora_fin) {
			return res.status(400).json({
				ok: false,
				message: "fecha_desde, fecha_hasta, hora_inicio y hora_fin son requeridos",
			});
		}
		const data = await createSolicitudMacroController({
			id_especialista: req.user.id,
			fecha_desde,
			fecha_hasta,
			hora_inicio,
			hora_fin,
			id_eco: id_eco || null,
			id_ecos: Array.isArray(id_ecos) ? id_ecos : undefined,
			creado_por: req.user.id,
			es_manual: false,
		});
		return res.status(201).json({
			ok: true,
			message: "Solicitud de jornada registrada (pendiente de aprobación)",
			data,
		});
	} catch (err) {
		if (err?.code === "OVERLAP_SOLICITUD" || err?.code === "OVERLAP") {
			return res.status(409).json({ ok: false, message: err.message });
		}
		if (
			err?.code === "INVALID_INPUT" ||
			err?.code === "ECO_NOT_FOUND"
		) {
			return res.status(400).json({ ok: false, message: err.message });
		}
		console.error(err);
		return res.status(500).json({ ok: false, message: "Error interno" });
	}
};

const createSolicitudMacroManualHandler = async (req, res) => {
	try {
		const {
			id_especialista,
			fecha_desde,
			fecha_hasta,
			hora_inicio,
			hora_fin,
			id_eco,
			id_ecos,
		} = req.body;
		if (
			!id_especialista ||
			!fecha_desde ||
			!fecha_hasta ||
			!hora_inicio ||
			!hora_fin
		) {
			return res.status(400).json({
				ok: false,
				message:
					"id_especialista, fecha_desde, fecha_hasta, hora_inicio y hora_fin son requeridos",
			});
		}
		const data = await createSolicitudMacroManualController({
			id_especialista,
			fecha_desde,
			fecha_hasta,
			hora_inicio,
			hora_fin,
			id_eco: id_eco || null,
			id_ecos: Array.isArray(id_ecos) ? id_ecos : undefined,
			creado_por: req.user.id,
		});
		return res.status(201).json({
			ok: true,
			message: "Solicitud manual registrada",
			data,
		});
	} catch (err) {
		if (err?.code === "OVERLAP_SOLICITUD") {
			return res.status(409).json({ ok: false, message: err.message });
		}
		if (err?.code === "INVALID_INPUT" || err?.code === "ECO_NOT_FOUND") {
			return res.status(400).json({ ok: false, message: err.message });
		}
		console.error(err);
		return res.status(500).json({ ok: false, message: "Error interno" });
	}
};

const listMisSolicitudesHandler = async (req, res) => {
	try {
		const { estado } = req.query;
		const parsedEstado = estado !== undefined ? Number(estado) : undefined;
		const data = await listMisSolicitudesController({
			id_especialista: req.user.id,
			estado: Number.isNaN(parsedEstado) ? undefined : parsedEstado,
		});
		return res.status(200).json({ ok: true, data });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ ok: false, message: "Error interno" });
	}
};

const cancelSolicitudMacroHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await cancelSolicitudMacroController({
			id_solicitud: id,
			id_especialista: req.user.id,
		});
		return res.status(200).json({ ok: true, message: "Solicitud cancelada", data });
	} catch (err) {
		if (err?.code === "NOT_FOUND") {
			return res.status(404).json({ ok: false, message: err.message });
		}
		console.error(err);
		return res.status(500).json({ ok: false, message: "Error interno" });
	}
};

const approveSolicitudMacroHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const result = await approveSolicitudMacroController({
			id_solicitud: id,
			aprobado_por: req.user?.id ?? null,
		});
		return res.status(200).json({
			ok: true,
			message:
				result.bloques_creados > 0
					? `Se generaron ${result.bloques_creados} bloque(s) de 20 min; ${result.bloques_omitidos} omitido(s) por conflicto.`
					: `No se generaron bloques (${result.bloques_omitidos} tramos ya ocupados en el mismo equipo). La solicitud quedó procesada.`,
			data: result,
		});
	} catch (err) {
		if (err?.code === "NOT_FOUND") {
			return res.status(404).json({ ok: false, message: err.message });
		}
		if (err?.code === "INVALID_STATE") {
			return res.status(409).json({ ok: false, message: err.message });
		}
		console.error(err);
		return res.status(500).json({ ok: false, message: "Error interno" });
	}
};

const rejectSolicitudMacroHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await rejectSolicitudMacroController({
			id_solicitud: id,
			aprobado_por: req.user?.id ?? null,
		});
		return res.status(200).json({
			ok: true,
			message: "Solicitud rechazada",
			data,
		});
	} catch (err) {
		if (err?.code === "NOT_FOUND") {
			return res.status(404).json({ ok: false, message: err.message });
		}
		console.error(err);
		return res.status(500).json({ ok: false, message: "Error interno" });
	}
};

module.exports = {
	createDisponibilidadHandler,
	createDisponibilidadBatchHandler,
	createSolicitudMacroHandler,
	createSolicitudMacroManualHandler,
	listMisSolicitudesHandler,
	cancelSolicitudMacroHandler,
	approveSolicitudMacroHandler,
	rejectSolicitudMacroHandler,
	listMisDisponibilidadHandler,
	listPendientesHandler,
	listDisponibilidadesAdminHandler,
	approveDisponibilidadHandler,
	approveDisponibilidadBatchHandler,
	approveDisponibilidadPorCriteriosHandler,
	rejectDisponibilidadHandler,
	cancelDisponibilidadHandler,
	cancelDisponibilidadAdminHandler,
	cancelDisponibilidadBatchHandler,
	listPublicaHandler,
	closeDisponibilidadDiaHandler,
	listDisponibilidadesByFechaHandler,
	listDisponibilidadesByEspecialistaHandler,
	deleteDisponibilidadPasadaHandler,
	deleteDisponibilidadPorCriteriosHandler,
};
