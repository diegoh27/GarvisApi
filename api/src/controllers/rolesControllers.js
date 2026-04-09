const { pool } = require("../db");

const SECCIONES_INVENTARIO = [
	"productos",
	"entes",
	"nomina",
	"alquiler",
	"comisiones",
	"facturacion",
];

const ensureTableModeradorPermisos = async () => {
	await pool.execute(`
    CREATE TABLE IF NOT EXISTS moderador_permisos_inventario (
      seccion VARCHAR(50) NOT NULL,
      permitido TINYINT(1) NOT NULL DEFAULT 1,
      PRIMARY KEY (seccion)
    ) ENGINE=InnoDB
  `);
	// Insertar filas por defecto si no existen
	for (const seccion of SECCIONES_INVENTARIO) {
		const permitido = seccion === "facturacion" ? 0 : 1;
		await pool.execute(
			"INSERT IGNORE INTO moderador_permisos_inventario (seccion, permitido) VALUES (?, ?)",
			[seccion, permitido],
		);
	}
};

/**
 * Devuelve permisos de inventario para el rol indicado.
 * - admin: todos true.
 * - moderador: lee de tabla moderador_permisos_inventario.
 * - otro: devuelve objeto vacío o todos false (el handler puede devolver 403).
 */
const getPermisosInventarioController = async (rol) => {
	if (rol === "admin") {
		return SECCIONES_INVENTARIO.reduce((acc, s) => ({ ...acc, [s]: true }), {});
	}
	if (rol !== "moderador") {
		return SECCIONES_INVENTARIO.reduce((acc, s) => ({ ...acc, [s]: false }), {});
	}
	await ensureTableModeradorPermisos();
	const [rows] = await pool.execute(
		"SELECT seccion, permitido FROM moderador_permisos_inventario",
	);
	const out = SECCIONES_INVENTARIO.reduce((acc, s) => ({ ...acc, [s]: false }), {});
	for (const row of rows) {
		if (SECCIONES_INVENTARIO.includes(row.seccion)) {
			out[row.seccion] = Number(row.permitido) === 1;
		}
	}
	return out;
};

/**
 * Actualiza permisos de inventario del moderador. Solo admin.
 * body: { productos: true, entes: true, nomina: true, alquiler: true, comisiones: true, facturacion: false }
 */
const updatePermisosInventarioModeradorController = async (payload) => {
	await ensureTableModeradorPermisos();
	for (const seccion of SECCIONES_INVENTARIO) {
		const permitido = payload[seccion] === true ? 1 : 0;
		await pool.execute(
			"INSERT INTO moderador_permisos_inventario (seccion, permitido) VALUES (?, ?) ON DUPLICATE KEY UPDATE permitido = VALUES(permitido)",
			[seccion, permitido],
		);
	}
	return getPermisosInventarioController("moderador");
};

/** Claves de visibilidad del menú lateral para el rol moderador (Home no se configura aquí). */
const SECCIONES_MENU_MODERADOR = [
	"calendario",
	"todas_las_citas",
	"verificacion_pagos",
	"disponibilidad_pendientes",
	"pacientes",
	"subir_resultados",
	"informes",
	"inventario",
	"finanzas",
	"registrar_especialista",
	"registrar_moderador",
	"especialidades",
	"ecos",
	"cita_mostrador",
];

const ensureTableModeradorPermisosMenu = async () => {
	await pool.execute(`
    CREATE TABLE IF NOT EXISTS moderador_permisos_menu (
      seccion VARCHAR(64) NOT NULL,
      permitido TINYINT(1) NOT NULL DEFAULT 1,
      PRIMARY KEY (seccion)
    ) ENGINE=InnoDB
  `);
	for (const seccion of SECCIONES_MENU_MODERADOR) {
		await pool.execute(
			"INSERT IGNORE INTO moderador_permisos_menu (seccion, permitido) VALUES (?, ?)",
			[seccion, 1],
		);
	}
};

/**
 * Permisos de ítems del menú para moderadores (persistidos en BD).
 * - admin: todos true (referencia; el admin no usa estos ítems en su propio menú).
 * - moderador: lee moderador_permisos_menu.
 */
const getPermisosMenuModeradorController = async (rol) => {
	if (rol === "admin") {
		return SECCIONES_MENU_MODERADOR.reduce((acc, s) => ({ ...acc, [s]: true }), {});
	}
	if (rol !== "moderador") {
		return SECCIONES_MENU_MODERADOR.reduce((acc, s) => ({ ...acc, [s]: false }), {});
	}
	await ensureTableModeradorPermisosMenu();
	const [rows] = await pool.execute(
		"SELECT seccion, permitido FROM moderador_permisos_menu",
	);
	const out = SECCIONES_MENU_MODERADOR.reduce((acc, s) => ({ ...acc, [s]: true }), {});
	for (const row of rows) {
		if (SECCIONES_MENU_MODERADOR.includes(row.seccion)) {
			out[row.seccion] = Number(row.permitido) === 1;
		}
	}
	return out;
};

const updatePermisosMenuModeradorController = async (payload) => {
	await ensureTableModeradorPermisosMenu();
	for (const seccion of SECCIONES_MENU_MODERADOR) {
		const permitido = payload[seccion] === true ? 1 : 0;
		await pool.execute(
			"INSERT INTO moderador_permisos_menu (seccion, permitido) VALUES (?, ?) ON DUPLICATE KEY UPDATE permitido = VALUES(permitido)",
			[seccion, permitido],
		);
	}
	return getPermisosMenuModeradorController("moderador");
};

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
	getPermisosInventarioController,
	updatePermisosInventarioModeradorController,
	getPermisosMenuModeradorController,
	updatePermisosMenuModeradorController,
};
