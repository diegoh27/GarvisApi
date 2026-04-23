const {
	listPagosGuardadosController,
	savePagoGuardadoController,
} = require("../controllers/pagosGuardadosControllers");
const { pool } = require("../db");

/**
 * GET /pagos-guardados/:id_paciente
 * Devuelve todas las cuentas de pago guardadas del paciente autenticado.
 * Solo el propio paciente puede ver sus cuentas.
 */
const listPagosGuardadosHandler = async (req, res) => {
	try {
		const { id_paciente } = req.params;

		// Seguridad: solo el propio paciente puede listar sus cuentas
		if (req.user?.id !== id_paciente) {
			return res.status(403).json({
				ok: false,
				message: "No autorizado para consultar cuentas de otro paciente",
			});
		}

		const data = await listPagosGuardadosController(id_paciente);
		return res.status(200).json({ ok: true, data });
	} catch (err) {
		console.error("Error al listar pagos guardados:", err);
		return res.status(500).json({ ok: false, message: "Error interno" });
	}
};

/**
 * DELETE /pagos-guardados/:id_guardado
 * Elimina una cuenta guardada del paciente autenticado.
 */
const deletePagoGuardadoHandler = async (req, res) => {
	try {
		const { id_guardado } = req.params;
		const id_paciente = req.user?.id;

		if (!id_paciente) {
			return res.status(401).json({ ok: false, message: "No autenticado" });
		}

		const [rows] = await pool.query(
			"SELECT id_paciente FROM paciente_pago_guardado WHERE id_guardado = ?",
			[id_guardado],
		);

		if (!rows.length) {
			return res.status(404).json({ ok: false, message: "Cuenta no encontrada" });
		}

		if (rows[0].id_paciente !== id_paciente) {
			return res.status(403).json({ ok: false, message: "No autorizado" });
		}

		await pool.query(
			"DELETE FROM paciente_pago_guardado WHERE id_guardado = ?",
			[id_guardado],
		);

		return res.status(200).json({ ok: true, message: "Cuenta eliminada" });
	} catch (err) {
		console.error("Error al eliminar pago guardado:", err);
		return res.status(500).json({ ok: false, message: "Error interno" });
	}
};

module.exports = { listPagosGuardadosHandler, deletePagoGuardadoHandler };
