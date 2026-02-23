const { pool } = require("../db");
const { createNotificacionController } = require("./notificacionesControllers");
const { formatFechaCita, formatHoraCita } = require("../utils/citaEmails");

// Obtener datos del pago por id_cita (para mostrador usa RIF/cédula de cita_mostrador)
const getPagoByCitaController = async (id_cita) => {
	const sql = `
    SELECT
      p.id_pago,
      p.id_cita,
      p.id_paciente,
      p.metodo,
      p.imagen,
      p.banco_origen,
      p.banco_destino,
      p.monto,
      p.cedula_pagador,
      p.telefono_pagador,
      p.referencia,
      p.estado_pago,
      p.fecha_pago,
      p.fecha_validacion,
      p.validado_por,
      p.tasa_dia_bcv,
      u.nombre AS validado_por_nombre,
      u.apellido AS validado_por_apellido,
      COALESCE(NULLIF(TRIM(cm.rif), ''), pac.rif) AS paciente_rif,
      COALESCE(NULLIF(TRIM(cm.cedula), ''), u_pac.cedula) AS paciente_cedula,
      e.precio AS eco_precio,
      e.nombre AS eco_nombre
    FROM pagos p
    LEFT JOIN usuario u ON u.id_usuario = p.validado_por
    LEFT JOIN paciente pac ON pac.id_paciente = p.id_paciente
    LEFT JOIN usuario u_pac ON u_pac.id_usuario = p.id_paciente
    LEFT JOIN cita c ON c.id_cita = p.id_cita
    LEFT JOIN cita_mostrador cm ON cm.id_cita = p.id_cita
    LEFT JOIN eco e ON e.id_eco = c.id_eco
    WHERE p.id_cita = ?
    LIMIT 1
  `;
	const [rows] = await pool.execute(sql, [id_cita]);
	return rows.length > 0 ? rows[0] : null;
};

// Actualizar pago rechazado (corregir comprobante)
const updatePagoController = async (id_cita, pagoData) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// Verificar que el pago existe y está rechazado
		const [rows] = await conn.execute(
			`SELECT p.id_pago, p.estado_pago, c.estado_cita, c.id_paciente, c.id_representado
       FROM pagos p
       INNER JOIN cita c ON c.id_cita = p.id_cita
       WHERE p.id_cita = ?
       FOR UPDATE`,
			[id_cita],
		);

		if (!rows.length) {
			const err = new Error("Pago no encontrado");
			err.code = "NOT_FOUND";
			throw err;
		}

		const pago = rows[0];

		// Solo permitir editar pagos rechazados
		if (pago.estado_pago !== 2) {
			const err = new Error("Solo se pueden corregir pagos rechazados");
			err.code = "INVALID_STATE";
			throw err;
		}

		// No permitir editar pagos de citas canceladas
		if (pago.estado_cita === 2) {
			const err = new Error(
				"No se puede corregir el pago de una cita cancelada",
			);
			err.code = "INVALID_STATE";
			throw err;
		}

		// Construir UPDATE dinámico
		const campos = [];
		const valores = [];

		if (pagoData.metodo !== undefined) {
			campos.push("metodo = ?");
			valores.push(pagoData.metodo);
		}
		if (pagoData.imagen !== undefined) {
			campos.push("imagen = ?");
			valores.push(pagoData.imagen);
		}
		if (pagoData.banco_origen !== undefined) {
			campos.push("banco_origen = ?");
			valores.push(pagoData.banco_origen);
		}
		if (pagoData.banco_destino !== undefined) {
			campos.push("banco_destino = ?");
			valores.push(pagoData.banco_destino);
		}
		if (pagoData.monto !== undefined) {
			campos.push("monto = ?");
			valores.push(pagoData.monto);
		}
		if (pagoData.cedula_pagador !== undefined) {
			campos.push("cedula_pagador = ?");
			valores.push(pagoData.cedula_pagador);
		}
		if (pagoData.telefono_pagador !== undefined) {
			campos.push("telefono_pagador = ?");
			valores.push(pagoData.telefono_pagador);
		}
		if (pagoData.referencia !== undefined) {
			campos.push("referencia = ?");
			valores.push(pagoData.referencia);
		}

		// Siempre resetear estado_pago a 0 (pendiente) y limpiar validación
		campos.push("estado_pago = 0");
		campos.push("fecha_validacion = NULL");
		campos.push("validado_por = NULL");
		campos.push("fecha_pago = CURRENT_TIMESTAMP");

		valores.push(id_cita);

		await conn.execute(
			`UPDATE pagos SET ${campos.join(", ")} WHERE id_cita = ?`,
			valores,
		);

		// También resetear estado_pago en la tabla cita
		await conn.execute("UPDATE cita SET estado_pago = 0 WHERE id_cita = ?", [
			id_cita,
		]);

		await conn.commit();

		// Notificar a admin y moderador: el paciente volvió a enviar el pago rechazado
		try {
			const [citaRows] = await pool.execute(
				`SELECT c.fecha_cita, c.hora_cita, u.nombre AS paciente_nombre, u.apellido AS paciente_apellido, e.nombre AS eco_nombre
         FROM cita c
         INNER JOIN usuario u ON u.id_usuario = c.id_paciente
         LEFT JOIN eco e ON e.id_eco = c.id_eco
         WHERE c.id_cita = ?`,
				[id_cita],
			);
			if (citaRows.length > 0) {
				const c = citaRows[0];
				const pacienteNombre = [c.paciente_nombre, c.paciente_apellido].filter(Boolean).join(" ") || "Paciente";
				const fecha = formatFechaCita(c.fecha_cita);
				const hora = formatHoraCita(c.hora_cita);
				const ecoNombre = c.eco_nombre ? ` (${c.eco_nombre})` : "";
				let mensaje = `El paciente ${pacienteNombre} volvió a enviar el pago que había sido rechazado para la cita del ${fecha} a las ${hora}${ecoNombre}. Revisa pagos pendientes.`;
				if (mensaje.length > 255) mensaje = `${mensaje.slice(0, 252)}...`;

				const [adminModRows] = await pool.execute(
					`SELECT u.id_usuario FROM usuario u
           INNER JOIN roles r ON r.id_rol = u.id_rol
           WHERE r.nombre IN ('admin', 'moderador') AND u.activo = 1`,
				);
				for (const row of adminModRows) {
					try {
						await createNotificacionController({
							id_usuario: row.id_usuario,
							titulo: "Pago reenviado por paciente",
							mensaje,
							tipo: "pago_reenviado",
						});
					} catch (e) {
						console.error("Error creando notificación pago reenviado:", e);
					}
				}
			}
		} catch (err) {
			console.error("Error notificando admin/moderador de pago reenviado:", err);
		}

		return { id_cita, estado_pago: 0 };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

module.exports = {
	getPagoByCitaController,
	updatePagoController,
};
