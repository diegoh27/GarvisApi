const { pool } = require("../db");

// Obtener datos del pago por id_cita
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
      pac.rif AS paciente_rif,
      u_pac.cedula AS paciente_cedula,
      e.precio AS eco_precio,
      e.nombre AS eco_nombre
    FROM pagos p
    LEFT JOIN usuario u ON u.id_usuario = p.validado_por
    LEFT JOIN paciente pac ON pac.id_paciente = p.id_paciente
    LEFT JOIN usuario u_pac ON u_pac.id_usuario = p.id_paciente
    LEFT JOIN cita c ON c.id_cita = p.id_cita
    LEFT JOIN eco e ON e.id_eco = c.id_eco
    WHERE p.id_cita = ?
    LIMIT 1
  `;
	const [rows] = await pool.execute(sql, [id_cita]);
	return rows.length > 0 ? rows[0] : null;
};

module.exports = {
	getPagoByCitaController,
};
