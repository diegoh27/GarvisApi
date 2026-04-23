const { pool } = require("../db");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getRolIdByName } = require("../utils/roles");
const { sendEmail } = require("../utils/email");
const {
	getVerificationEmailHtml,
	getVerificationEmailText,
	getPasswordResetEmailHtml,
	getPasswordResetEmailText,
} = require("../utils/htmlEmail");

const EMAIL_VERIFICATION_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_MINUTES = 60;

const normalizeBaseUrl = (value, fallback) => {
	const raw = value || fallback;
	return raw ? raw.replace(/\/+$/g, "") : "";
};

const getAppBaseUrl = () =>
	normalizeBaseUrl(process.env.APP_BASE_URL, "http://localhost:3001");

const getWebBaseUrl = () =>
	normalizeBaseUrl(
		process.env.WEB_BASE_URL || process.env.FRONTEND_URL,
		getAppBaseUrl(),
	);

const createTokenPair = () => {
	const token = crypto.randomBytes(32).toString("hex");
	const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
	return { token, tokenHash };
};

const buildVerifyEmailLink = (token) => {
	const baseUrl = getAppBaseUrl();
	return `${baseUrl}/auth/verify?token=${encodeURIComponent(token)}`;
};

const buildResetPasswordLink = (token) => {
	const baseUrl = getWebBaseUrl();
	return `${baseUrl}/auth/reset?token=${encodeURIComponent(token)}`;
};

const registerPaciente = async (payload) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// Validar duplicados antes de insertar
		// 1. Verificar correo duplicado
		const [correoExists] = await conn.execute(
			"SELECT id_usuario FROM usuario WHERE correo = ? LIMIT 1",
			[payload.correo],
		);
		if (correoExists.length > 0) {
			const err = new Error("Ya existe un usuario con este correo electrónico");
			err.code = "DUPLICATE_EMAIL";
			throw err;
		}

		// 2. Verificar cédula duplicada
		const [cedulaExists] = await conn.execute(
			"SELECT id_usuario, correo FROM usuario WHERE cedula = ? LIMIT 1",
			[payload.cedula],
		);
		if (cedulaExists.length > 0) {
			const existingUser = cedulaExists[0];
			// Si el usuario existente tiene email @mostrador.com, "upgradearlo" al correo real
			if (existingUser.correo && existingUser.correo.endsWith("@mostrador.com")) {
				const hashedPw = await bcrypt.hash(payload.contrasena, 10);
				await conn.execute(
					`UPDATE usuario SET correo = ?, contrasena = ?, telefono = ?, nombre = ?, apellido = ?, genero = ?, fecha_nacimiento = ? WHERE id_usuario = ?`,
					[
						payload.correo,
						hashedPw,
						payload.telefono,
						payload.nombre,
						payload.apellido,
						payload.genero,
						payload.fecha_nacimiento,
						existingUser.id_usuario,
					],
				);
				// Actualizar paciente también
				const rifFinal = payload.rif || payload.cedula;
				await conn.execute(
					`UPDATE paciente SET tipo_sangre = ?, descripcion = ?, direccion = ?, rif = ? WHERE id_paciente = ?`,
					[
						payload.tipo_sangre,
						payload.descripcion,
						payload.direccion ?? null,
						rifFinal,
						existingUser.id_usuario,
					],
				);

				// Crear verificación de email
				const { token, tokenHash } = createTokenPair();
				await conn.execute(
					`INSERT INTO email_verificacion
						(id_verificacion, id_paciente, token_hash, expires_at)
					 VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))`,
					[
						crypto.randomUUID(),
						existingUser.id_usuario,
						tokenHash,
						EMAIL_VERIFICATION_TTL_HOURS,
					],
				);

				await conn.commit();

				const verifyLink = buildVerifyEmailLink(token);
				const subject = "¡Bienvenido a Garbis! Verifica tu correo";
				const html = getVerificationEmailHtml({
					tipo: "welcome",
					nombre: payload.nombre,
					verifyLink,
					ttlHours: EMAIL_VERIFICATION_TTL_HOURS,
				});
				const text = getVerificationEmailText({
					tipo: "welcome",
					nombre: payload.nombre,
					verifyLink,
					ttlHours: EMAIL_VERIFICATION_TTL_HOURS,
				});
				try {
					await sendEmail({ to: payload.correo, subject, html, text });
				} catch (emailErr) {
					console.error("Error enviando verificacion de correo (upgrade mostrador):", emailErr);
				}

				return {
					id_usuario: existingUser.id_usuario,
					id_paciente: existingUser.id_usuario,
					nombre: payload.nombre,
					apellido: payload.apellido,
					correo: payload.correo,
					telefono: payload.telefono,
				};
			}
			const err = new Error("Ya existe un usuario con esta cédula");
			err.code = "DUPLICATE_CEDULA";
			throw err;
		}

		// 2b. Verificar teléfono duplicado
		if (payload.telefono) {
			const [telefonoExists] = await conn.execute(
				"SELECT id_usuario FROM usuario WHERE telefono = ? LIMIT 1",
				[payload.telefono],
			);
			if (telefonoExists.length > 0) {
				const err = new Error("Ya existe un usuario con este número de teléfono");
				err.code = "DUPLICATE_TELEFONO";
				throw err;
			}
		}

		// 3. Determinar RIF final:
		//    - Si el frontend envía un RIF, usarlo.
		//    - Si no envía RIF, usar la cédula como fallback.
		const rifFinal = payload.rif || payload.cedula;

		//    Verificar RIF duplicado usando rifFinal
		if (rifFinal) {
			const [rifExists] = await conn.execute(
				"SELECT id_paciente FROM paciente WHERE rif = ? LIMIT 1",
				[rifFinal],
			);
			if (rifExists.length > 0) {
				const err = new Error("Ya existe un paciente con este RIF");
				err.code = "DUPLICATE_RIF";
				throw err;
			}
		}

		// 4. Verificar nombre + apellido duplicado
		const [nombreApellidoExists] = await conn.execute(
			"SELECT id_usuario FROM usuario WHERE nombre = ? AND apellido = ? LIMIT 1",
			[payload.nombre, payload.apellido],
		);
		if (nombreApellidoExists.length > 0) {
			const err = new Error("Ya existe un usuario con este nombre y apellido");
			err.code = "DUPLICATE_NAME";
			throw err;
		}

		const id_usuario = crypto.randomUUID();
		const id_rol = await getRolIdByName(conn, "paciente");
		const hashedPassword = await bcrypt.hash(payload.contrasena, 10);

		const sqlUsuario = `
			INSERT INTO usuario
				(id_usuario, nombre, apellido, genero, cedula, correo, telefono, contrasena, activo, fecha_nacimiento, id_rol)
			VALUES
				(?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
		`;

		await conn.execute(sqlUsuario, [
			id_usuario,
			payload.nombre,
			payload.apellido,
			payload.genero,
			payload.cedula,
			payload.correo,
			payload.telefono,
			hashedPassword,
			payload.fecha_nacimiento,
			id_rol,
		]);

		const sqlPaciente = `
			INSERT INTO paciente
				(id_paciente, tipo_sangre, descripcion, direccion, rif, email_verificado, contacto_emergencia_nombre, contacto_emergencia_telefono)
			VALUES
				(?, ?, ?, ?, ?, 0, ?, ?)
		`;

		await conn.execute(sqlPaciente, [
			id_usuario,
			payload.tipo_sangre,
			payload.descripcion,
			payload.direccion ?? null,
			rifFinal,
			payload.contacto_emergencia_nombre ?? null,
			payload.contacto_emergencia_telefono ?? null,
		]);

		const { token, tokenHash } = createTokenPair();
		await conn.execute(
			`INSERT INTO email_verificacion
        (id_verificacion, id_paciente, token_hash, expires_at)
       VALUES
        (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))`,
			[
				crypto.randomUUID(),
				id_usuario,
				tokenHash,
				EMAIL_VERIFICATION_TTL_HOURS,
			],
		);

		await conn.commit();

		const verifyLink = buildVerifyEmailLink(token);
		const subject = "¡Bienvenido a Garbis! Verifica tu correo";
		const html = getVerificationEmailHtml({
			tipo: "welcome",
			nombre: payload.nombre,
			verifyLink,
			ttlHours: EMAIL_VERIFICATION_TTL_HOURS,
		});
		const text = getVerificationEmailText({
			tipo: "welcome",
			nombre: payload.nombre,
			verifyLink,
			ttlHours: EMAIL_VERIFICATION_TTL_HOURS,
		});

		try {
			await sendEmail({
				to: payload.correo,
				subject,
				html,
				text,
			});
		} catch (emailErr) {
			console.error("Error enviando verificacion de correo:", emailErr);
		}

		return {
			id_usuario,
			id_paciente: id_usuario,
			nombre: payload.nombre,
			apellido: payload.apellido,
			correo: payload.correo,
			telefono: payload.telefono,
		};
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

const loginUser = async ({ correo, contrasena }) => {
	const sql = `
		SELECT
			u.id_usuario,
			u.nombre,
			u.apellido,
			u.correo,
			u.contrasena,
			r.nombre AS rol,
			p.email_verificado AS paciente_email_verificado
		FROM usuario u
		INNER JOIN roles r ON r.id_rol = u.id_rol
		LEFT JOIN paciente p ON p.id_paciente = u.id_usuario
		WHERE u.correo = ? AND u.activo = 1
		LIMIT 1
	`;

	const [rows] = await pool.execute(sql, [correo]);
	if (!rows.length) {
		const err = new Error("Credenciales inválidas");
		err.code = "INVALID_CREDENTIALS";
		throw err;
	}

	const user = rows[0];

	const ok = await bcrypt.compare(contrasena, user.contrasena);
	if (!ok) {
		const err = new Error("Credenciales inválidas");
		err.code = "INVALID_CREDENTIALS";
		throw err;
	}

	if (!process.env.JWT_SECRET) {
		const err = new Error("JWT_SECRET no configurado");
		err.code = "JWT_SECRET_MISSING";
		throw err;
	}

	const token = jwt.sign(
		{
			id: user.id_usuario,
			rol: user.rol,
			correo: user.correo,
		},
		process.env.JWT_SECRET,
		{ expiresIn: "7d" },
	);

	return {
		token,
		user: {
			id_usuario: user.id_usuario,
			nombre: user.nombre,
			apellido: user.apellido,
			correo: user.correo,
			rol: user.rol,
		},
	};
};

const verifyEmail = async ({ token }) => {
	if (!token) {
		const err = new Error("Token requerido");
		err.code = "TOKEN_REQUIRED";
		throw err;
	}

	const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		const [rows] = await conn.execute(
			`SELECT id_verificacion, id_paciente, used_at, expires_at
       FROM email_verificacion
       WHERE token_hash = ?
       LIMIT 1
       FOR UPDATE`,
			[tokenHash],
		);

		if (!rows.length) {
			const err = new Error("Token invalido");
			err.code = "TOKEN_INVALID";
			throw err;
		}

		const record = rows[0];
		if (record.used_at) {
			const err = new Error("Token ya utilizado");
			err.code = "TOKEN_USED";
			throw err;
		}

		if (record.expires_at && new Date(record.expires_at) < new Date()) {
			const err = new Error("Token expirado");
			err.code = "TOKEN_EXPIRED";
			throw err;
		}

		await conn.execute(
			"UPDATE email_verificacion SET used_at = NOW() WHERE id_verificacion = ?",
			[record.id_verificacion],
		);
		await conn.execute(
			"UPDATE paciente SET email_verificado = 1, fecha_verificacion = NOW() WHERE id_paciente = ?",
			[record.id_paciente],
		);

		await conn.commit();
		return { id_usuario: record.id_paciente };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

const resendVerificationEmail = async ({ correo }) => {
	if (!correo) {
		const err = new Error("correo es requerido");
		err.code = "EMAIL_REQUIRED";
		throw err;
	}

	const [rows] = await pool.execute(
		`SELECT u.id_usuario, u.nombre, u.correo, p.email_verificado
     FROM usuario u
     INNER JOIN paciente p ON p.id_paciente = u.id_usuario
     WHERE u.correo = ?
     LIMIT 1`,
		[correo],
	);

	if (!rows.length) {
		return { ok: true };
	}

	const user = rows[0];
	if (Number(user.email_verificado)) {
		return { ok: true };
	}

	const { token, tokenHash } = createTokenPair();
	await pool.execute(
		`INSERT INTO email_verificacion
      (id_verificacion, id_paciente, token_hash, expires_at)
     VALUES
      (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))`,
		[
			crypto.randomUUID(),
			user.id_usuario,
			tokenHash,
			EMAIL_VERIFICATION_TTL_HOURS,
		],
	);

	const verifyLink = buildVerifyEmailLink(token);
	const subject = "Garbis: verifica tu cuenta de correo";
	const html = getVerificationEmailHtml({
		tipo: "reminder",
		nombre: user.nombre,
		verifyLink,
		ttlHours: EMAIL_VERIFICATION_TTL_HOURS,
	});
	const text = getVerificationEmailText({
		tipo: "reminder",
		nombre: user.nombre,
		verifyLink,
		ttlHours: EMAIL_VERIFICATION_TTL_HOURS,
	});

	try {
		await sendEmail({
			to: user.correo,
			subject,
			html,
			text,
		});
	} catch (emailErr) {
		console.error("Error reenviando verificacion de correo:", emailErr);
	}

	return { ok: true };
};

const PASSWORD_RESET_COOLDOWN_MINUTES = 1;

const isValidEmail = (email) => {
	if (!email || typeof email !== "string") return false;
	const trimmed = email.trim();
	if (trimmed.length < 5) return false;
	const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return re.test(trimmed);
};

const requestPasswordReset = async ({ correo }) => {
	if (!isValidEmail(correo)) {
		return { ok: true };
	}

	const [rows] = await pool.execute(
		"SELECT id_usuario, nombre, correo, activo FROM usuario WHERE correo = ? LIMIT 1",
		[correo.trim()],
	);

	if (!rows.length || !rows[0].activo) {
		const err = new Error("Lo sentimos, no pudimos encontrar tu cuenta.");
		err.code = "USER_NOT_FOUND";
		throw err;
	}

	const user = rows[0];

	const [recentRows] = await pool.execute(
		`SELECT created_at FROM password_reset 
     WHERE id_usuario = ? 
     ORDER BY created_at DESC 
     LIMIT 1`,
		[user.id_usuario],
	);
	if (recentRows.length > 0) {
		const lastCreated = new Date(recentRows[0].created_at);
		const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
		if (lastCreated > oneMinuteAgo) {
			return { ok: true, rateLimited: true };
		}
	}

	const { token, tokenHash } = createTokenPair();
	await pool.execute(
		`INSERT INTO password_reset
      (id_reset, id_usuario, token_hash, expires_at)
     VALUES
      (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
		[
			crypto.randomUUID(),
			user.id_usuario,
			tokenHash,
			PASSWORD_RESET_TTL_MINUTES,
		],
	);

	const resetLink = buildResetPasswordLink(token);
	const subject = "Recuperar contraseña - Garbis Online";
	const html = getPasswordResetEmailHtml({
		nombre: user.nombre,
		resetLink,
		ttlMinutes: PASSWORD_RESET_TTL_MINUTES,
	});
	const text = getPasswordResetEmailText({
		nombre: user.nombre,
		resetLink,
		ttlMinutes: PASSWORD_RESET_TTL_MINUTES,
	});

	try {
		await sendEmail({
			to: user.correo,
			subject,
			html,
			text,
		});
	} catch (emailErr) {
		console.error("Error enviando recuperacion de contrasena:", emailErr);
	}

	return { ok: true };
};

const resetPassword = async ({ token, contrasena }) => {
	if (!token || !contrasena) {
		const err = new Error("Token y contrasena son requeridos");
		err.code = "RESET_REQUIRED";
		throw err;
	}

	const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		const [rows] = await conn.execute(
			`SELECT id_reset, id_usuario, used_at, expires_at
       FROM password_reset
       WHERE token_hash = ?
       LIMIT 1
       FOR UPDATE`,
			[tokenHash],
		);

		if (!rows.length) {
			const err = new Error("Token invalido");
			err.code = "TOKEN_INVALID";
			throw err;
		}

		const record = rows[0];
		if (record.used_at) {
			const err = new Error("Token ya utilizado");
			err.code = "TOKEN_USED";
			throw err;
		}

		if (record.expires_at && new Date(record.expires_at) < new Date()) {
			const err = new Error("Token expirado");
			err.code = "TOKEN_EXPIRED";
			throw err;
		}

		const hashedPassword = await bcrypt.hash(contrasena, 10);
		await conn.execute(
			"UPDATE usuario SET contrasena = ? WHERE id_usuario = ?",
			[hashedPassword, record.id_usuario],
		);
		await conn.execute(
			"UPDATE password_reset SET used_at = NOW() WHERE id_reset = ?",
			[record.id_reset],
		);

		await conn.commit();
		return { id_usuario: record.id_usuario };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

module.exports = {
	registerPaciente,
	loginUser,
	verifyEmail,
	resendVerificationEmail,
	requestPasswordReset,
	resetPassword,
	getWebBaseUrl,
};
