const { pool } = require("../db");
const crypto = require("crypto");

/**
 * Lista todas las cuentas de pago guardadas de un paciente.
 * @param {string} id_paciente
 * @returns {Promise<Array>}
 */
const listPagosGuardadosController = async (id_paciente) => {
	const [rows] = await pool.query(
		`SELECT id_guardado, id_paciente, alias, banco_origen, cedula_pagador, telefono_pagador, creado_en
		 FROM paciente_pago_guardado
		 WHERE id_paciente = ?
		 ORDER BY creado_en DESC`,
		[id_paciente],
	);
	return rows;
};

/**
 * Guarda una nueva cuenta de pago para el paciente.
 * Si ya existe una combinación idéntica (paciente + banco + cedula + telefono), la ignora (no duplica).
 * @param {{ id_paciente: string, alias?: string, banco_origen: string, cedula_pagador: string, telefono_pagador: string }} params
 * @returns {Promise<{ inserted: boolean, id_guardado: string }>}
 */
const savePagoGuardadoController = async ({
	id_paciente,
	alias,
	banco_origen,
	cedula_pagador,
	telefono_pagador,
}) => {
	// Verificar si ya existe exactamente esta combinación
	const [existing] = await pool.query(
		`SELECT id_guardado FROM paciente_pago_guardado
		 WHERE id_paciente = ? AND banco_origen = ? AND cedula_pagador = ? AND telefono_pagador = ?
		 LIMIT 1`,
		[id_paciente, banco_origen, cedula_pagador, telefono_pagador],
	);

	if (existing.length > 0) {
		// Ya existe — no duplicar
		return { inserted: false, id_guardado: existing[0].id_guardado };
	}

	const id_guardado = crypto.randomUUID();
	await pool.query(
		`INSERT INTO paciente_pago_guardado (id_guardado, id_paciente, alias, banco_origen, cedula_pagador, telefono_pagador)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		[
			id_guardado,
			id_paciente,
			alias?.trim() || null,
			banco_origen,
			cedula_pagador,
			telefono_pagador,
		],
	);

	return { inserted: true, id_guardado };
};

module.exports = {
	listPagosGuardadosController,
	savePagoGuardadoController,
};
