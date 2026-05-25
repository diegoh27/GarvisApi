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
