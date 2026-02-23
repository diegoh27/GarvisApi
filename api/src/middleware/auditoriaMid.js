const { pool } = require("../db");

// Rutas que NO se loguean (muy ruidosas o no relevantes)
const SKIP_PREFIXES = [
	"/uploads/",
	"/favicon",
	"/health",
	"/orthanc/study/", // evita loguear cada apertura del viewer
];

// Solo logueamos estos métodos HTTP
const LOGGED_METHODS = new Set(["POST", "GET", "PUT", "PATCH", "DELETE"]);

// Para GETs: solo logueamos rutas que realmente importan ver
const GET_LOG_PATHS = [
	"/auditoria",
	"/informes",
	"/usuarios",
	"/moderadores",
	"/pacientes",
	"/citas/todas",
	"/citas/especialista",
];

/**
 * Genera una descripción legible basada en método + ruta.
 * Normaliza los UUIDs/IDs en la ruta para que el mapa funcione bien.
 */
function buildAccion(method, rawPath) {
	// Normalizar IDs (UUID y numéricos) a :id
	const path = rawPath
		.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:id")
		.replace(/\/\d+/g, "/:id");

	const ACCIONES = {
		// Auth
		"POST /auth/login": "Inició sesión",
		"POST /auth/logout": "Cerró sesión",
		"POST /auth/register": "Registró un usuario",
		"POST /auth/forgot": "Solicitó recuperación de contraseña",
		// Citas
		"POST /citas": "Creó una cita",
		"DELETE /citas/:id": "Eliminó una cita",
		"PATCH /citas/:id": "Actualizó una cita",
		"PUT /citas/:id": "Actualizó una cita",
		"POST /citas/:id/cancelar": "Canceló una cita",
		"PATCH /citas/:id/atendida": "Marcó cita como atendida",
		// Resultados
		"POST /resultados/:id": "Subió resultado de cita",
		"DELETE /resultados/:id": "Eliminó resultado",
		"POST /orthanc/upload": "Subió estudio DICOM",
		"DELETE /orthanc/study/:id": "Eliminó estudio DICOM",
		// Usuarios
		"POST /users": "Creó un usuario",
		"PATCH /users/:id": "Actualizó usuario",
		"DELETE /users/:id": "Eliminó usuario",
		// Pacientes
		"POST /pacientes": "Creó un paciente",
		"PUT /pacientes/:id": "Actualizó paciente",
		"PATCH /pacientes/:id": "Actualizó paciente",
		"DELETE /pacientes/:id": "Eliminó paciente",
		// Moderadores
		"POST /moderadores": "Creó un moderador",
		"PUT /moderadores/:id": "Actualizó moderador",
		"DELETE /moderadores/:id": "Eliminó moderador",
		// Especialistas
		"POST /medicos": "Registró un especialista",
		"PUT /medicos/:id": "Actualizó especialista",
		"DELETE /medicos/:id": "Eliminó especialista",
		// Disponibilidad
		"POST /disponibilidad": "Creó disponibilidad",
		"PUT /disponibilidad/:id": "Actualizó disponibilidad",
		"DELETE /disponibilidad/:id": "Eliminó disponibilidad",
		"PATCH /disponibilidad/:id/aprobar": "Aprobó disponibilidad",
		"PATCH /disponibilidad/:id/rechazar": "Rechazó disponibilidad",
		// Pagos
		"POST /pagos": "Registró un pago",
		"PATCH /pagos/:id": "Actualizó estado de pago",
		// Inventario
		"POST /productos": "Creó un producto",
		"PUT /productos/:id": "Actualizó producto",
		"DELETE /productos/:id": "Eliminó producto",
		"POST /inventario/:id/compras": "Registró compra de inventario",
		"POST /inventario/:id/ajustes": "Aplicó ajuste de inventario",
		// Nómina
		"POST /empleados": "Registró empleado",
		"DELETE /empleados/:id": "Eliminó empleado",
		"POST /nomina": "Registró pago de nómina",
		// Alquiler
		"POST /alquiler": "Creó contrato de alquiler",
		"DELETE /alquiler/:id": "Eliminó contrato de alquiler",
		// Facturación
		"POST /facturacion": "Creó movimiento de facturación",
		// Informes
		"POST /informes": "Generó un informe",
		"DELETE /informes/:id": "Eliminó un informe",
		// Métodos de pago
		"POST /metodos-pago": "Creó método de pago",
		"PUT /metodos-pago/:id": "Actualizó método de pago",
		"DELETE /metodos-pago/:id": "Eliminó método de pago",
		// Ecos y especialidades
		"POST /ecos": "Creó un tipo de eco",
		"PUT /ecos/:id": "Actualizó eco",
		"DELETE /ecos/:id": "Eliminó eco",
		"POST /especialidades": "Creó especialidad",
		"DELETE /especialidades/:id": "Eliminó especialidad",
		// Configuración
		"PATCH /configuracion": "Actualizó configuración del sistema",
		// GETs importantes
		"GET /auditoria": "Consultó auditoría de eventos",
		"GET /usuarios": "Consultó lista de usuarios",
		"GET /moderadores": "Consultó lista de moderadores",
		"GET /informes": "Consultó informes",
		"GET /citas/todas": "Consultó todas las citas",
	};

	const key = `${method} ${path}`;
	if (ACCIONES[key]) return ACCIONES[key];

	// Fallback genérico
	const VERBO = {
		POST:   "Creó registro en",
		GET:    "Consultó",
		PUT:    "Actualizó registro en",
		PATCH:  "Modificó registro en",
		DELETE: "Eliminó registro en",
	};
	const segmento = path.split("/").filter(Boolean)[0] || "sistema";
	return `${VERBO[method] ?? method} /${segmento}`;
}

/**
 * Middleware global de auditoría.
 * Se engancha en res.finish para no bloquear la respuesta.
 */
const auditoriaMid = (req, res, next) => {
	const method = req.method.toUpperCase();

	// Filtrar métodos y rutas
	if (!LOGGED_METHODS.has(method)) return next();
	if (SKIP_PREFIXES.some((p) => req.path.startsWith(p))) return next();
	if (method === "GET" && !GET_LOG_PATHS.some((p) => req.path.startsWith(p))) return next();

	res.on("finish", () => {
		try {
			const user        = req.user || null;
			const statusCode  = res.statusCode;
			const estado      = statusCode >= 400 ? "fallo" : "exito";
			const ip          = (req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim() || null;
			const accion      = buildAccion(method, req.path);

			pool.execute(
				`INSERT INTO auditoria_eventos
				   (usuario_id, usuario_rol, metodo, ruta, accion, estado_http, estado, ip)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					user?.id_usuario ?? null,
					user?.rol        ?? null,
					method,
					req.path,
					accion,
					statusCode,
					estado,
					ip,
				],
			).catch((err) => {
				console.error("[Auditoria] Error al guardar evento:", err.message);
			});
		} catch {
			// silencioso — no interrumpir la respuesta
		}
	});

	next();
};

module.exports = { auditoriaMid };
