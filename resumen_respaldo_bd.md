# 📋 Instrucciones de Cambios: Respaldo Manual de Base de Datos (Sistema Garvis)

Este documento contiene el resumen detallado y los códigos fuentes exactos de los cambios realizados para implementar la funcionalidad de **Respaldo Manual de la Base de Datos (MySQL)**. Está diseñado como un prompt instruccional para que se puedan aplicar exactamente los mismos archivos y configuraciones en cualquier otra rama o servidor de producción.

---

## 🛠️ Resumen del Módulo de Respaldos
1. **Seguridad Absoluta**: El endpoint del backend está protegido con los middlewares `authenticateToken` y `authorizeRoles("admin")` para garantizar que **solo** el Administrador pueda descargar el archivo.
2. **Nativo y Robusto**: No depende de utilidades externas del sistema (como `mysqldump`), eliminando fallas por variables de entorno o sistemas operativos. Genera de forma nativa en Node un volcado SQL estructurado con `DROP TABLE`, `CREATE TABLE` e inserciones de registros sanitizados.
3. **Interfaz Premium**: Tarjeta de interacción en la sección exclusiva de administración con alertas de seguridad (`ShieldAlert`) y spinner de carga dinámico (`Generando respaldo...`).

---

## 📋 Código y Archivos a Modificar / Crear

### 1. Servidor Backend (`api`)

#### [NEW] [backupController.js](file:///c:/Users/USER/Desktop/www/GarvisApi/api/src/controllers/backupController.js)
Crea este archivo en la ruta del backend para gestionar la lógica de exportación SQL nativa de MySQL.

```javascript
const { pool } = require("../db");
const { DB_NAME = "garvis" } = process.env;

const downloadBackup = async (req, res) => {
	try {
		// 1. Obtener la lista de tablas en la base de datos MySQL
		const [tables] = await pool.query(
			"SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ?",
			[DB_NAME]
		);

		if (!tables.length) {
			return res.status(404).json({
				ok: false,
				message: "No se encontraron tablas en la base de datos."
			});
		}

		let backupSql = "";
		backupSql += `-- ========================================================\n`;
		backupSql += `-- Respaldo Manual de Base de Datos - Sistema Garvis\n`;
		backupSql += `-- Generado: ${new Date().toLocaleString()}\n`;
		backupSql += `-- Base de datos: ${DB_NAME}\n`;
		backupSql += `-- ========================================================\n\n`;
		backupSql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

		for (const row of tables) {
			const tableName = row.TABLE_NAME;

			// 2. Obtener el DDL (CREATE TABLE)
			const [createTableRows] = await pool.query(`SHOW CREATE TABLE \`${tableName}\``);
			if (createTableRows.length) {
				const createSql = createTableRows[0]["Create Table"];
				backupSql += `-- --------------------------------------------------------\n`;
				backupSql += `-- Esquema de la tabla: \`${tableName}\`\n`;
				backupSql += `-- --------------------------------------------------------\n`;
				backupSql += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
				backupSql += `${createSql};\n\n`;
			}

			// 3. Obtener los registros de la tabla
			const [dataRows] = await pool.query(`SELECT * FROM \`${tableName}\``);
			if (dataRows.length) {
				backupSql += `-- --------------------------------------------------------\n`;
				backupSql += `-- Registros de la tabla: \`${tableName}\`\n`;
				backupSql += `-- --------------------------------------------------------\n`;
				
				const columns = Object.keys(dataRows[0]).map(col => `\`${col}\``).join(", ");
				
				for (const item of dataRows) {
					const values = Object.values(item).map(val => escapeValue(val)).join(", ");
					backupSql += `INSERT INTO \`${tableName}\` (${columns}) VALUES (${values});\n`;
				}
				backupSql += `\n`;
			}
		}

		backupSql += `SET FOREIGN_KEY_CHECKS = 1;\n`;

		// 4. Configurar headers de descarga
		const dateStr = new Date().toISOString().slice(0, 10);
		const timestamp = Date.now();
		const filename = `garvis_respaldo_${dateStr}_${timestamp}.sql`;
		
		res.setHeader("Content-Type", "application/sql");
		res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
		
		return res.send(backupSql);
	} catch (error) {
		console.error("❌ Error generando el respaldo de base de datos:", error);
		return res.status(500).json({
			ok: false,
			message: "Error al generar el respaldo de la base de datos: " + error.message
		});
	}
};

function escapeValue(val) {
	if (val === null || val === undefined) return "NULL";
	if (typeof val === "number") return val.toString();
	if (typeof val === "boolean") return val ? "1" : "0";
	if (val instanceof Date) {
		// Formatear fecha en formato estándar MySQL 'YYYY-MM-DD HH:MM:SS'
		const pad = (n) => String(n).padStart(2, '0');
		const yyyy = val.getFullYear();
		const mm = pad(val.getMonth() + 1);
		const dd = pad(val.getDate());
		const hh = pad(val.getHours());
		const min = pad(val.getMinutes());
		const ss = pad(val.getSeconds());
		return `'${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}'`;
	}
	if (Buffer.isBuffer(val)) return `X'${val.toString('hex')}'`;
	
	// Escape de strings en SQL
	const escaped = val.toString()
		.replace(/\\/g, '\\\\')
		.replace(/'/g, "\\'")
		.replace(/\r/g, '\\r')
		.replace(/\n/g, '\\n');
	return `'${escaped}'`;
}

module.exports = { downloadBackup };
```

---

#### [NEW] [backupRoutes.js](file:///c:/Users/USER/Desktop/www/GarvisApi/api/src/routes/backupRoutes.js)
Crea las rutas correspondientes aplicando la seguridad requerida para el rol de `admin`.

```javascript
const { Router } = require("express");
const router = Router();
const { downloadBackup } = require("../controllers/backupController");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

router.get("/", authenticateToken, authorizeRoles("admin"), downloadBackup);

module.exports = router;
```

---

#### [MODIFY] [index.js](file:///c:/Users/USER/Desktop/www/GarvisApi/api/src/routes/index.js)
Registra el nuevo enrutador de respaldos en el enrutamiento central del backend.

```diff
 const rolesRoutes = require("./rolesRoutes");
 const dolarRoutes = require("./dolarRoutes");
+const backupRoutes = require("./backupRoutes");
 
 router.use("/medicos", medicosRoutes);
 // ...
 router.use("/roles", rolesRoutes);
 router.use("/dolar", dolarRoutes);
+router.use("/backup", backupRoutes);
```

---

### 2. Cliente Frontend (`web`)

#### [MODIFY] [AppLayout.tsx](file:///c:/Users/USER/Desktop/www/GarvisApi/web/src/layouts/AppLayout.tsx)
Importa el icono de base de datos de `lucide-react` y añade la opción en la barra lateral del administrador.

```diff
 	CreditCard,
 	Wallet,
 	Store,
+	Database,
 } from "lucide-react";
 // ...
 const navByRole: Record<string, NavItem[]> = {
 	admin: [
 		// ...
 		// Auditoría
 		{ label: "Auditoría de Eventos", to: "/auditoria", icon: ShieldAlert },
+		// Respaldo de BD
+		{ label: "Respaldo BD", to: "/admin/respaldo", icon: Database },
 	],
```

---

#### [NEW] [RespaldoPage.tsx](file:///c:/Users/USER/Desktop/www/GarvisApi/web/src/features/admin/pages/RespaldoPage.tsx)
Crea la vista premium para la descarga interactiva del respaldo SQL.

```typescript
import { useState } from "react";
import { Database, Download, ShieldAlert, CheckCircle } from "lucide-react";
import { PageShell } from "../../../shared";
import { getToken } from "../../../shared/utils/token";
import Swal from "sweetalert2";

const PRIMARY = "#006965";

const RespaldoPage = () => {
	const [isDownloading, setIsDownloading] = useState(false);
	const [success, setSuccess] = useState(false);

	const handleDownloadBackup = async () => {
		setIsDownloading(true);
		setSuccess(false);

		try {
			const baseUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";
			const token = getToken();

			if (!token) {
				throw new Error("Token de autenticación no encontrado.");
			}

			const response = await fetch(`${baseUrl.replace(/\/$/, "")}/backup`, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || "Error al generar el respaldo de la base de datos.");
			}

			const blob = await response.blob();
			
			// Detectar el nombre del archivo de los headers o generar uno
			const contentDisposition = response.headers.get("Content-Disposition");
			let filename = `garvis_respaldo_${new Date().toISOString().slice(0, 10)}.sql`;
			if (contentDisposition) {
				const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
				if (filenameMatch && filenameMatch[1]) {
					filename = filenameMatch[1];
				}
			}

			const downloadUrl = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = downloadUrl;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(downloadUrl);

			setSuccess(true);
			await Swal.fire({
				icon: "success",
				title: "Respaldo Descargado",
				text: "El archivo de respaldo SQL ha sido generado y descargado correctamente en su computadora.",
				confirmButtonColor: PRIMARY,
			});
		} catch (error: any) {
			console.error(error);
			await Swal.fire({
				icon: "error",
				title: "Error",
				text: error.message || "Ocurrió un error inesperado al intentar descargar el respaldo.",
				confirmButtonColor: PRIMARY,
			});
		} finally {
			setIsDownloading(false);
		}
	};

	return (
		<PageShell
			title="Respaldo de Base de Datos"
			description="Área exclusiva de administración para la gestión y exportación de la base de datos del sistema Garvis."
		>
			<div className="mx-auto max-w-3xl pt-6">
				<div className="overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-xl transition-all">
					{/* Header Accent */}
					<div className="h-2" style={{ backgroundColor: PRIMARY }} />
					
					<div className="p-8 md:p-12 flex flex-col items-center text-center">
						{/* Icon Container with dynamic animation */}
						<div className={`relative mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#006965]/10 text-[#006965] ${isDownloading ? 'animate-pulse' : ''}`}>
							<Database className="h-12 w-12" />
							{success && (
								<span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white border-4 border-white shadow-sm">
									<CheckCircle className="h-4 w-4" />
								</span>
							)}
						</div>

						<h2 className="text-2xl font-extrabold text-slate-800 tracking-tight sm:text-3xl mb-4">
							Exportación Manual de Base de Datos
						</h2>
						
						<p className="text-base text-slate-600 max-w-xl mb-8 leading-relaxed">
							Esta funcionalidad genera un volcado completo de la base de datos MySQL en formato SQL estándar. 
							Incluye tanto la estructura de tablas como todos los registros del sistema. 
							El archivo resultante se descargará directamente en su ordenador local.
						</p>

						{/* Security Alert banner */}
						<div className="w-full max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-5 mb-8 flex items-start gap-4 text-left">
							<ShieldAlert className="h-6 w-6 shrink-0 text-amber-600 mt-0.5" />
							<div>
								<h3 className="font-bold text-amber-900 text-base mb-1">
									Aviso de Seguridad de Datos
								</h3>
								<p className="text-sm text-amber-800 leading-relaxed">
									Los respaldos de la base de datos contienen información médica y personal sensible y confidencial 
									de los pacientes. Guarde este archivo únicamente en computadoras de confianza, y almacénelo en 
									un lugar seguro y preferiblemente cifrado.
								</p>
							</div>
						</div>

						{/* Action Button */}
						<button
							type="button"
							onClick={handleDownloadBackup}
							disabled={isDownloading}
							className="inline-flex items-center gap-3 rounded-2xl px-10 py-4 text-lg font-bold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50 select-none cursor-pointer"
							style={{ backgroundColor: PRIMARY }}
						>
							{isDownloading ? (
								<>
									<svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									Generando respaldo...
								</>
							) : (
								<>
									<Download className="h-5 w-5" />
									Descargar Respaldo (.sql)
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</PageShell>
	);
};

export default RespaldoPage;
```

---

#### [MODIFY] [index.ts](file:///c:/Users/USER/Desktop/www/GarvisApi/web/src/features/admin/index.ts)
Expón el nuevo componente para que pueda ser importado limpiamente en las rutas.

```diff
 export { default as RegistrarEspecialistaPage } from "./pages/RegistrarEspecialistaPage";
 export { default as RegistrarModeradorPage } from "./pages/RegistrarModeradorPage";
 export { default as MetodosPagoPage } from "./pages/MetodosPagoPage";
+export { default as RespaldoPage } from "./pages/RespaldoPage";
 export { RegistrarEspecialistaForm } from "./components";
```

---

#### [MODIFY] [App.tsx](file:///c:/Users/USER/Desktop/www/GarvisApi/web/src/app/App.tsx)
Importa y registra el ruteo protegido por `RoleRoute` para el Administrador.

```diff
 	RegistrarEspecialistaPage,
 	RegistrarModeradorPage,
 	MetodosPagoPage,
+	RespaldoPage,
 } from "../features/admin";
 // ...
 					<Route
 						path="admin/metodos-pago"
 						element={
 							<RoleRoute allowed={["admin"]}>
 								<MetodosPagoPage />
 							</RoleRoute>
 						}
 					/>
+					<Route
+						path="admin/respaldo"
+						element={
+							<RoleRoute allowed={["admin"]}>
+								<RespaldoPage />
+							</RoleRoute>
+						}
+					/>
```
