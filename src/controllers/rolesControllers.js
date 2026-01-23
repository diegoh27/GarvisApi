const { pool } = require("../db");

const listRolesController = async () => {
	const sql = `
    SELECT id_rol, nombre
    FROM roles
    ORDER BY nombre ASC
  `;
	const [rows] = await pool.execute(sql);
	return rows;
};

const getRolePermissionsController = () => {
	return {
		admin: [
			"usuarios:crear",
			"usuarios:editar",
			"usuarios:desactivar",
			"moderadores:crear",
			"especialistas:crear",
			"especialidades:crear",
			"citas:gestionar",
			"pagos:aprobar",
			"resultados:publicar",
		],
		moderador: [
			"especialistas:crear",
			"especialidades:crear",
			"citas:gestionar",
			"pagos:validar",
		],
		especialista: ["resultados:crear", "resultados:editar"],
		paciente: ["citas:crear", "pagos:crear", "resultados:ver"],
	};
};

module.exports = {
	listRolesController,
	getRolePermissionsController,
};
