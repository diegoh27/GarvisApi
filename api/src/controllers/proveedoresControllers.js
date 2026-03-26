const { pool } = require("../db");
const crypto = require("crypto");

// ==========================================
// PROVEEDORES
// ==========================================

/**
 * Lista todos los proveedores
 */
const listProveedoresController = async () => {
	const sql = `
		SELECT 
			id_proveedor,
			nombre,
			rif,
			telefono,
			correo,
			direccion,
			contacto_nombre,
			activo,
			creado_en,
			actualizado_en
		FROM inv_proveedor
		ORDER BY nombre ASC
	`;
	const [rows] = await pool.execute(sql);
	return rows;
};

/**
 * Obtiene un proveedor por id
 */
const getProveedorController = async (id_proveedor) => {
	const [rows] = await pool.execute(
		"SELECT * FROM inv_proveedor WHERE id_proveedor = ? LIMIT 1",
		[id_proveedor],
	);
	if (!rows.length) {
		const err = new Error("Proveedor no encontrado");
		err.code = "PROVEEDOR_NOT_FOUND";
		throw err;
	}
	return rows[0];
};

/**
 * Crea un proveedor
 */
const createProveedorController = async ({
	nombre,
	rif,
	telefono,
	correo,
	direccion,
	contacto_nombre,
	activo = 1,
}) => {
	// Validar que no exista otro proveedor con el mismo nombre
	const [existing] = await pool.execute(
		"SELECT id_proveedor FROM inv_proveedor WHERE nombre = ? LIMIT 1",
		[nombre.trim()],
	);
	if (existing.length > 0) {
		const err = new Error("Ya existe un proveedor con ese nombre");
		err.code = "DUPLICATE_NAME";
		throw err;
	}

	const id_proveedor = crypto.randomUUID();
	const sql = `
		INSERT INTO inv_proveedor (id_proveedor, nombre, rif, telefono, correo, direccion, contacto_nombre, activo)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`;
	await pool.execute(sql, [
		id_proveedor,
		nombre.trim(),
		rif || null,
		telefono || null,
		correo || null,
		direccion || null,
		contacto_nombre || null,
		activo ? 1 : 0,
	]);

	return {
		id_proveedor,
		nombre: nombre.trim(),
		rif: rif || null,
		telefono: telefono || null,
		correo: correo || null,
		direccion: direccion || null,
		contacto_nombre: contacto_nombre || null,
		activo: activo ? 1 : 0,
		creado_en: new Date(),
		actualizado_en: null,
	};
};

/**
 * Actualiza un proveedor
 */
const updateProveedorController = async ({
	id_proveedor,
	nombre,
	rif,
	telefono,
	correo,
	direccion,
	contacto_nombre,
	activo,
}) => {
	const [existing] = await pool.execute(
		"SELECT id_proveedor FROM inv_proveedor WHERE id_proveedor = ? LIMIT 1",
		[id_proveedor],
	);
	if (!existing.length) {
		const err = new Error("Proveedor no encontrado");
		err.code = "PROVEEDOR_NOT_FOUND";
		throw err;
	}

	if (nombre !== undefined) {
		const [duplicate] = await pool.execute(
			"SELECT id_proveedor FROM inv_proveedor WHERE nombre = ? AND id_proveedor != ? LIMIT 1",
			[nombre.trim(), id_proveedor],
		);
		if (duplicate.length > 0) {
			const err = new Error("Ya existe otro proveedor con ese nombre");
			err.code = "DUPLICATE_NAME";
			throw err;
		}
	}

	const updates = [];
	const values = [];
	if (nombre !== undefined) {
		updates.push("nombre = ?");
		values.push(nombre.trim());
	}
	if (rif !== undefined) {
		updates.push("rif = ?");
		values.push(rif || null);
	}
	if (telefono !== undefined) {
		updates.push("telefono = ?");
		values.push(telefono || null);
	}
	if (correo !== undefined) {
		updates.push("correo = ?");
		values.push(correo || null);
	}
	if (direccion !== undefined) {
		updates.push("direccion = ?");
		values.push(direccion || null);
	}
	if (contacto_nombre !== undefined) {
		updates.push("contacto_nombre = ?");
		values.push(contacto_nombre || null);
	}
	if (activo !== undefined) {
		updates.push("activo = ?");
		values.push(activo ? 1 : 0);
	}

	if (updates.length === 0) {
		const [row] = await pool.execute(
			"SELECT * FROM inv_proveedor WHERE id_proveedor = ?",
			[id_proveedor],
		);
		return row[0];
	}

	updates.push("actualizado_en = CURRENT_TIMESTAMP");
	values.push(id_proveedor);
	const sql = `UPDATE inv_proveedor SET ${updates.join(", ")} WHERE id_proveedor = ?`;
	await pool.execute(sql, values);

	const [row] = await pool.execute(
		"SELECT * FROM inv_proveedor WHERE id_proveedor = ?",
		[id_proveedor],
	);
	return row[0];
};

/**
 * Elimina un proveedor (solo si no tiene notas de compra asociadas)
 */
const deleteProveedorController = async (id_proveedor) => {
	const [existing] = await pool.execute(
		"SELECT id_proveedor, nombre FROM inv_proveedor WHERE id_proveedor = ? LIMIT 1",
		[id_proveedor],
	);
	if (!existing.length) {
		const err = new Error("Proveedor no encontrado");
		err.code = "PROVEEDOR_NOT_FOUND";
		throw err;
	}

	// Verificar que no tenga notas de compra asociadas
	const [compras] = await pool.execute(
		"SELECT id_nota_compra FROM inv_nota_compra WHERE id_proveedor = ? LIMIT 1",
		[id_proveedor],
	);
	if (compras.length > 0) {
		const err = new Error(
			"No se puede eliminar el proveedor porque tiene compras asociadas. Puede desactivarlo en su lugar.",
		);
		err.code = "PROVEEDOR_HAS_COMPRAS";
		throw err;
	}

	await pool.execute("DELETE FROM inv_proveedor WHERE id_proveedor = ?", [
		id_proveedor,
	]);

	return { message: "Proveedor eliminado correctamente" };
};

module.exports = {
	listProveedoresController,
	getProveedorController,
	createProveedorController,
	updateProveedorController,
	deleteProveedorController,
};
