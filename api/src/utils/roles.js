const getRolIdByName = async (conn, nombre) => {
	const [rows] = await conn.execute(
		"SELECT id_rol FROM roles WHERE nombre = ? LIMIT 1",
		[nombre],
	);
	if (!rows.length) {
		const err = new Error(`Rol ${nombre} no existe`);
		err.code = "ROL_NOT_FOUND";
		throw err;
	}
	return rows[0].id_rol;
};

module.exports = { getRolIdByName };
