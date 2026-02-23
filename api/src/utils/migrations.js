require("dotenv").config();
const { pool } = require("../db");
const fs = require("fs");
const path = require("path");

/**
 * Parsea el archivo SQL y extrae definiciones de tablas
 */
function parseTableDefinitions(sqlContent) {
	const tables = {};

	// Remover comentarios de línea (-- comentario) pero preservar estructura
	let cleanedSQL = sqlContent.replace(/--[^\n]*/g, "");

	// Buscar todas las definiciones CREATE TABLE usando regex más robusto
	const createTableRegex =
		/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?\s*\(/gi;
	const createTableMatches = [];
	let match;

	while ((match = createTableRegex.exec(cleanedSQL)) !== null) {
		const tableName = match[1];
		const createTableStart = match.index; // Inicio del CREATE TABLE
		const tableStart = match.index + match[0].length - 1; // Posición del paréntesis de apertura

		// Buscar el cierre del paréntesis que corresponde al inicio
		let parenCount = 1;
		let tableEnd = tableStart;
		let foundEnd = false;

		for (let i = tableStart + 1; i < cleanedSQL.length; i++) {
			if (cleanedSQL[i] === "(") parenCount++;
			if (cleanedSQL[i] === ")") parenCount--;
			if (parenCount === 0) {
				tableEnd = i;
				foundEnd = true;
				break;
			}
		}

		if (foundEnd) {
			const tableBody = cleanedSQL.substring(tableStart + 1, tableEnd);
			// Buscar el ENGINE=InnoDB después del paréntesis de cierre
			let fullDefinitionEnd = tableEnd + 1;
			const afterParen = cleanedSQL.substring(tableEnd + 1).trim();
			const engineMatch = afterParen.match(/^(ENGINE\s*=\s*\w+[^;]*);?/i);
			if (engineMatch) {
				fullDefinitionEnd = tableEnd + 1 + engineMatch[0].length;
			}
			// Guardar la definición completa del CREATE TABLE
			const fullDefinition = cleanedSQL
				.substring(createTableStart, fullDefinitionEnd)
				.trim();
			createTableMatches.push({ tableName, tableBody, fullDefinition });
		}
	}

	for (const { tableName, tableBody, fullDefinition } of createTableMatches) {
		// Dividir el cuerpo de la tabla en líneas y procesar
		const columns = {};
		const lines = tableBody.split("\n");
		let currentDefinition = "";
		let parenDepth = 0;
		let inString = false;
		let stringChar = null;

		for (let line of lines) {
			line = line.trim();
			if (!line) continue;

			// Contar paréntesis y manejar strings para evitar falsos positivos
			for (let i = 0; i < line.length; i++) {
				const char = line[i];
				const prevChar = i > 0 ? line[i - 1] : null;

				if (!inString && (char === '"' || char === "'" || char === "`")) {
					inString = true;
					stringChar = char;
				} else if (inString && char === stringChar && prevChar !== "\\") {
					inString = false;
					stringChar = null;
				} else if (!inString) {
					if (char === "(") parenDepth++;
					if (char === ")") parenDepth--;
				}
			}

			currentDefinition += (currentDefinition ? " " : "") + line;

			// Si estamos fuera de paréntesis y la línea termina con coma
			if (
				parenDepth === 0 &&
				!inString &&
				(line.endsWith(",") || /,\s*$/.test(line))
			) {
				// Verificar PRIMERO si es una constraint/key ANTES de intentar parsear como columna
				const trimmedDef = currentDefinition.trim();
				const upperCurrent = trimmedDef.toUpperCase();
				const isConstraint =
					upperCurrent.startsWith("PRIMARY KEY") ||
					upperCurrent.startsWith("UNIQUE KEY") ||
					upperCurrent.startsWith("KEY ") ||
					upperCurrent.startsWith("CONSTRAINT") ||
					upperCurrent.startsWith("FOREIGN KEY") ||
					upperCurrent.startsWith("INDEX") ||
					/^KEY\s+/.test(upperCurrent);

				if (!isConstraint) {
					// Intentar extraer definición de columna
					const colMatch = trimmedDef.match(/^`?(\w+)`?\s+(.+?)(?:,\s*)?$/);
					if (colMatch) {
						const colName = colMatch[1].trim();
						let colDef = colMatch[2].trim();

						// Remover coma final
						colDef = colDef.replace(/,\s*$/, "").trim();

						// Verificar nuevamente que no sea una constraint (por si acaso)
						const upperColDef = colDef.toUpperCase();
						const isColConstraint =
							upperColDef.startsWith("PRIMARY KEY") ||
							upperColDef.startsWith("UNIQUE KEY") ||
							upperColDef.startsWith("KEY ") ||
							upperColDef.startsWith("CONSTRAINT") ||
							upperColDef.startsWith("FOREIGN KEY") ||
							upperColDef.startsWith("INDEX");

						if (!isColConstraint) {
							// Extraer tipo de dato (puede incluir paréntesis como VARCHAR(255))
							const typeMatch = colDef.match(/^(\w+(?:\([^)]+\))?)/i);
							if (typeMatch) {
								// Extraer DEFAULT, puede incluir funciones como CURRENT_TIMESTAMP y ON UPDATE
								// IMPORTANTE: Si es "DEFAULT NULL", extraer "NULL" explícitamente
								let defaultValue = null;
								if (colDef.toUpperCase().includes("DEFAULT NULL")) {
									defaultValue = "NULL";
								} else {
									const defaultMatch = colDef.match(
										/DEFAULT\s+([^,\s]+(?:\([^)]+\))?)/i,
									);
									defaultValue = defaultMatch ? defaultMatch[1].trim() : null;
								}

								columns[colName] = {
									type: typeMatch[1].toUpperCase(),
									nullable: !colDef.includes("NOT NULL"),
									defaultValue: defaultValue,
									definition: colDef,
								};
							}
						}
					}
				}
				currentDefinition = "";
				parenDepth = 0;
				inString = false;
			}
		}

		// Procesar última definición si no terminó con coma (solo si es una columna)
		if (currentDefinition.trim() && parenDepth === 0) {
			const upperCurrent = currentDefinition.toUpperCase().trim();
			const isConstraint =
				upperCurrent.startsWith("PRIMARY KEY") ||
				upperCurrent.startsWith("UNIQUE KEY") ||
				upperCurrent.startsWith("KEY ") ||
				upperCurrent.startsWith("CONSTRAINT") ||
				upperCurrent.startsWith("FOREIGN KEY") ||
				upperCurrent.startsWith("INDEX") ||
				/^KEY\s+/.test(upperCurrent);

			if (!isConstraint) {
				const colMatch = currentDefinition.match(/^`?(\w+)`?\s+(.+?)$/);
				if (colMatch) {
					const colName = colMatch[1].trim();
					let colDef = colMatch[2].trim();
					const typeMatch = colDef.match(/^(\w+(?:\([^)]+\))?)/i);
					if (typeMatch) {
						// IMPORTANTE: Si es "DEFAULT NULL", extraer "NULL" explícitamente
						let defaultValue = null;
						if (colDef.toUpperCase().includes("DEFAULT NULL")) {
							defaultValue = "NULL";
						} else {
							const defaultMatch = colDef.match(
								/DEFAULT\s+([^,\s]+(?:\([^)]+\))?)/i,
							);
							defaultValue = defaultMatch ? defaultMatch[1].trim() : null;
						}

						columns[colName] = {
							type: typeMatch[1].toUpperCase(),
							nullable: !colDef.includes("NOT NULL"),
							defaultValue: defaultValue,
							definition: colDef,
						};
					}
				}
			}
		}

		tables[tableName] = { columns, fullDefinition };
	}

	return tables;
}

/**
 * Obtiene el esquema actual de la base de datos
 */
async function getCurrentSchema() {
	const dbName = process.env.DB_NAME || "garvis";
	const [tables] = await pool.execute(
		`SELECT TABLE_NAME 
		 FROM information_schema.TABLES 
		 WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
		[dbName],
	);

	const schema = {};

	for (const table of tables) {
		const tableName = table.TABLE_NAME;
		const [columns] = await pool.execute(
			`SELECT 
				COLUMN_NAME,
				COLUMN_TYPE,
				IS_NULLABLE,
				COLUMN_DEFAULT,
				COLUMN_KEY,
				EXTRA
			FROM information_schema.COLUMNS
			WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
			ORDER BY ORDINAL_POSITION`,
			[dbName, tableName],
		);

		schema[tableName] = {
			columns: {},
		};

		for (const col of columns) {
			schema[tableName].columns[col.COLUMN_NAME] = {
				type: col.COLUMN_TYPE.toUpperCase(),
				nullable: col.IS_NULLABLE === "YES",
				defaultValue: col.COLUMN_DEFAULT,
				isPrimary: col.COLUMN_KEY === "PRI",
				extra: col.EXTRA ? col.EXTRA.toUpperCase() : null,
			};
		}
	}

	return schema;
}

/**
 * Normaliza tipos de datos para comparación
 */
function normalizeType(type) {
	// Remover espacios y convertir a mayúsculas
	type = type.toUpperCase().trim();
	// Normalizar variaciones comunes
	type = type.replace(/INTEGER/i, "INT");
	type = type.replace(/DECIMAL\((\d+),(\d+)\)/i, "DECIMAL($1,$2)");
	return type;
}

/**
 * Compara tipos de datos (considerando variaciones)
 */
function typesMatch(expectedType, actualType) {
	const normalizedExpected = normalizeType(expectedType);
	const normalizedActual = normalizeType(actualType);

	// Comparación exacta
	if (normalizedExpected === normalizedActual) return true;

	// Comparación flexible para tipos similares
	// NOTA: VARCHAR y TEXT NO son compatibles - deben detectarse como diferentes
	// NOTA: TEXT, MEDIUMTEXT y LONGTEXT son tipos distintos y deben migrarse si cambian
	const typeMap = {
		TINYINT: ["TINYINT", "TINYINT(1)", "BOOLEAN"],
		INT: ["INT", "INTEGER", "INT(11)"],
		VARCHAR: (t) => t.startsWith("VARCHAR"),
		TIMESTAMP: ["TIMESTAMP", "DATETIME"],
	};

	// Verificar si son tipos compatibles
	// IMPORTANTE: VARCHAR y TEXT son diferentes, no deben considerarse compatibles
	if (
		normalizedExpected.includes("VARCHAR") &&
		normalizedActual.includes("TEXT")
	) {
		return false; // VARCHAR y TEXT son diferentes
	}
	if (
		normalizedExpected.includes("TEXT") &&
		normalizedActual.includes("VARCHAR")
	) {
		return false; // TEXT y VARCHAR son diferentes
	}

	for (const [key, values] of Object.entries(typeMap)) {
		if (normalizedExpected.includes(key)) {
			if (typeof values === "function") {
				return values(normalizedActual);
			}
			return values.some((v) => normalizedActual.includes(v));
		}
	}

	return false;
}

/**
 * Genera statements ALTER TABLE para las diferencias.
 * Retorna { preStatements: string[], alterStatements: string[] }.
 * preStatements: UPDATEs para rellenar NULLs antes de pasar una columna a NOT NULL.
 */
function generateAlterStatements(expectedSchema, currentSchema) {
	const preStatements = [];
	const alterStatements = [];

	for (const [tableName, expectedTable] of Object.entries(expectedSchema)) {
		if (!currentSchema[tableName]) {
			// Tabla no existe - generar CREATE TABLE completo
			if (expectedTable.fullDefinition) {
				alterStatements.push(expectedTable.fullDefinition + ";");
			}
			continue;
		}

		const currentTable = currentSchema[tableName];
		const tableAlterStatements = [];

		// Verificar columnas que faltan o son diferentes
		for (const [colName, expectedCol] of Object.entries(
			expectedTable.columns,
		)) {
			if (!currentTable.columns[colName]) {
				// Columna no existe, agregarla
				tableAlterStatements.push(
					`ADD COLUMN \`${colName}\` ${expectedCol.definition}`,
				);
			} else {
				const currentCol = currentTable.columns[colName];
				let needsModify = false;
				let modifyReasons = [];

				// Verificar si nullable cambió (true -> false: necesitamos UPDATE antes del MODIFY)
				const changingToNotNull = !expectedCol.nullable && currentCol.nullable;
				if (expectedCol.nullable !== currentCol.nullable) {
					needsModify = true;
					modifyReasons.push(
						`nullable: ${expectedCol.nullable} vs ${currentCol.nullable}`,
					);
				}

				// Verificar si el tipo cambió
				if (!typesMatch(expectedCol.type, currentCol.type)) {
					needsModify = true;
					modifyReasons.push(`tipo: ${expectedCol.type} vs ${currentCol.type}`);
				}

				// Verificar si DEFAULT cambió
				// IMPORTANTE: MySQL devuelve null cuando DEFAULT es NULL o cuando hay ON UPDATE CURRENT_TIMESTAMP
				let expectedDefault = expectedCol.defaultValue
					? expectedCol.defaultValue.toString().toUpperCase()
					: null;
				let currentDefault = currentCol.defaultValue
					? currentCol.defaultValue.toString().toUpperCase()
					: null;

				const hasOnUpdate =
					currentCol.extra &&
					currentCol.extra.includes("ON UPDATE CURRENT_TIMESTAMP");
				const expectedHasOnUpdate = expectedCol.definition
					.toUpperCase()
					.includes("ON UPDATE CURRENT_TIMESTAMP");

				if (
					expectedHasOnUpdate &&
					hasOnUpdate &&
					expectedDefault === "NULL" &&
					currentDefault === null
				) {
					expectedDefault = null;
					currentDefault = null;
				}

				const normalizeDefault = (val) => {
					if (!val || val === "NULL") return null;
					val = val.toUpperCase();
					if (val.includes("CURRENT_TIMESTAMP")) return "CURRENT_TIMESTAMP";
					if (/^0(\.0+)?$/.test(val)) return "0";
					if (/^\d+\.\d+$/.test(val)) return parseFloat(val).toString();
					return val;
				};

				const normalizedExpected = normalizeDefault(expectedDefault);
				const normalizedCurrent = normalizeDefault(currentDefault);

				if (normalizedExpected !== normalizedCurrent) {
					needsModify = true;
					modifyReasons.push(
						`default: ${normalizedExpected} vs ${normalizedCurrent}`,
					);
				}

				const currentHasOnUpdate = currentCol.extra
					? currentCol.extra.includes("ON UPDATE CURRENT_TIMESTAMP")
					: false;
				if (expectedHasOnUpdate !== currentHasOnUpdate) {
					needsModify = true;
					modifyReasons.push(
						`ON UPDATE: esperado=${expectedHasOnUpdate}, actual=${currentHasOnUpdate}, extra="${currentCol.extra}"`,
					);
				}

				if (needsModify) {
					if (modifyReasons.length > 0) {
						console.log(
							`   🔍 [DEBUG] ${tableName}.${colName}: ${modifyReasons.join(", ")}`,
						);
					}
					// Antes de MODIFY a NOT NULL: rellenar NULLs con el valor por defecto
					if (
						changingToNotNull &&
						expectedCol.defaultValue != null &&
						expectedCol.defaultValue !== "NULL"
					) {
						const def = String(expectedCol.defaultValue).trim().toUpperCase();
						let sqlDefault;
						if (def === "0" || /^0(\.0+)?$/.test(def)) {
							sqlDefault = "0";
						} else if (def.includes("CURRENT_TIMESTAMP")) {
							sqlDefault = "CURRENT_TIMESTAMP()";
						} else if (/^\d+(\.\d+)?$/.test(def)) {
							sqlDefault = def;
						} else {
							sqlDefault = `'${String(expectedCol.defaultValue).replace(/'/g, "''")}'`;
						}
						preStatements.push(
							`UPDATE \`${tableName}\` SET \`${colName}\` = ${sqlDefault} WHERE \`${colName}\` IS NULL;`,
						);
					}
					tableAlterStatements.push(
						`MODIFY COLUMN \`${colName}\` ${expectedCol.definition}`,
					);
				}
			}
		}

		if (tableAlterStatements.length > 0) {
			alterStatements.push(
				`ALTER TABLE \`${tableName}\` ${tableAlterStatements.join(", ")};`,
			);
		}
	}

	return { preStatements, alterStatements };
}

/**
 * Ejecuta las migraciones
 */
async function runMigrations() {
	try {
		console.log("\n🔄 Verificando migraciones de esquema...");

		// Leer el archivo SQL esperado
		const sqlPath = path.join(__dirname, "tables_without_db.sql");
		if (!fs.existsSync(sqlPath)) {
			console.log("⚠️  Archivo SQL no encontrado. Saltando migraciones.");
			return true;
		}

		console.log("📖 Leyendo archivo SQL...");
		const sqlContent = fs.readFileSync(sqlPath, "utf8");

		// Parsear esquema esperado
		console.log("🔍 Parseando definiciones de tablas...");
		let expectedSchema;
		try {
			expectedSchema = parseTableDefinitions(sqlContent);
			const tableCount = Object.keys(expectedSchema).length;
			console.log(
				`   ✅ Encontradas ${tableCount} tabla(s) en el esquema esperado`,
			);
			if (tableCount === 0) {
				console.warn(
					"   ⚠️  No se encontraron tablas. Verificando contenido del archivo...",
				);
				const createTableCount = (sqlContent.match(/CREATE TABLE/gi) || [])
					.length;
				console.log(
					`   📊 CREATE TABLE encontrados en archivo: ${createTableCount}`,
				);
				if (createTableCount > 0) {
					console.warn(
						"   ⚠️  El parser no está extrayendo las tablas correctamente.",
					);
				}
			}
		} catch (parseError) {
			console.error("❌ Error parseando el archivo SQL:", parseError.message);
			console.error("   Stack:", parseError.stack);
			return false;
		}

		// Obtener esquema actual
		console.log("🔍 Consultando esquema actual de la base de datos...");
		let currentSchema;
		try {
			currentSchema = await getCurrentSchema();
			console.log(
				`   ✅ Encontradas ${Object.keys(currentSchema).length} tabla(s) en la base de datos actual`,
			);
		} catch (schemaError) {
			console.error(
				"❌ Error consultando esquema actual:",
				schemaError.message,
			);
			return false;
		}

		// Generar statements ALTER y pre-statements (UPDATE para NULLs)
		console.log("🔍 Comparando esquemas y generando migraciones...");
		const { preStatements, alterStatements } = generateAlterStatements(
			expectedSchema,
			currentSchema,
		);
		console.log("   ✅ Comparación completada");

		const allStatements = [...preStatements, ...alterStatements];
		if (allStatements.length === 0) {
			console.log("✅ Esquema actualizado. No se requieren migraciones.\n");
			return true;
		}

		if (preStatements.length > 0) {
			console.log(
				`📝 Pre-migraciones (rellenar NULLs): ${preStatements.length}`,
			);
			preStatements.forEach((stmt, idx) => {
				console.log(`   ${idx + 1}. ${stmt.substring(0, 90)}...`);
			});
		}
		console.log(`📝 Migraciones ALTER: ${alterStatements.length}`);
		alterStatements.forEach((stmt, idx) => {
			console.log(`   ${idx + 1}. ${stmt.substring(0, 100)}...`);
		});

		// Ejecutar primero preStatements (UPDATE), luego alterStatements (ALTER)
		console.log("\n🔧 Aplicando migraciones...");
		let successCount = 0;
		let errorCount = 0;

		for (const statement of allStatements) {
			try {
				await pool.execute(statement);
				successCount++;
				console.log(`   ✅ ${statement.substring(0, 80)}...`);
			} catch (err) {
				errorCount++;
				// Mensaje de error más detallado
				let errorMsg = err.message;
				if (err.code === "ER_DATA_TOO_LONG") {
					errorMsg = `Datos existentes exceden el nuevo tamaño de columna. ${err.message}`;
				} else if (err.code === "ER_NO_REFERENCED_ROW_2") {
					errorMsg = `Violación de clave foránea. ${err.message}`;
				} else if (err.code === "ER_DUP_ENTRY") {
					errorMsg = `Entrada duplicada. ${err.message}`;
				}
				console.warn(`   ⚠️  Error: ${errorMsg.substring(0, 120)}`);
				// Continuar con las siguientes migraciones
			}
		}

		if (errorCount === 0) {
			console.log(
				`\n✅ Migraciones aplicadas exitosamente (${successCount} cambio(s))\n`,
			);
		} else {
			console.warn(
				`\n⚠️  Migraciones completadas con advertencias (${successCount} exitosas, ${errorCount} errores)\n`,
			);
		}

		return true;
	} catch (error) {
		console.error("❌ Error ejecutando migraciones:", error.message);
		console.error("   Stack:", error.stack);
		return false;
	}
}

module.exports = { runMigrations };
