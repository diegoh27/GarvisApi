import { X } from "lucide-react";
import type { CitaData } from "../moderadoresApi";

type VerCitaModalProps = {
	cita: CitaData | null;
	error?: string | null;
	onClose: () => void;
	hideSensitiveData?: boolean; // Si es true, oculta RIF, precios, y datos de pago
};

const formatFecha = (value: string | null) => {
	if (!value) return "N/A";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString("es-VE", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
};

const formatFechaHora = (value: string | null) => {
	if (!value) return "N/A";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString("es-VE", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
};

const formatHora = (value: string) => {
	if (!value) return "";
	const [hourStr, minuteStr = "00"] = value.split(":");
	const hour = Number(hourStr);
	if (Number.isNaN(hour)) return value;
	const period = hour >= 12 ? "PM" : "AM";
	const hour12 = hour % 12 === 0 ? 12 : hour % 12;
	return `${hour12}:${minuteStr} ${period}`;
};

const formatMonto = (monto: number | string | null) => {
	if (monto === null || monto === undefined) return "N/A";
	const num = typeof monto === "string" ? parseFloat(monto) : monto;
	if (Number.isNaN(num)) return "N/A";
	return new Intl.NumberFormat("es-VE", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
	}).format(num);
};

const getEstadoCitaLabel = (estado: number) => {
	switch (estado) {
		case 0:
			return "Pendiente";
		case 1:
			return "Confirmada";
		case 2:
			return "Cancelada";
		case 3:
			return "Atendida";
		default:
			return "Desconocido";
	}
};

const getEstadoPagoLabel = (estado: number) => {
	switch (estado) {
		case 0:
			return "Pendiente";
		case 1:
			return "Pagado";
		case 2:
			return "Rechazado";
		default:
			return "Desconocido";
	}
};

const VerCitaModal = ({ cita, error, onClose, hideSensitiveData = false }: VerCitaModalProps) => {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-paper shadow-lg">
				{/* Header */}
				<div className="sticky top-0 z-10 flex items-center justify-between border-b border-mist bg-paper p-4">
					<h2 className="text-lg font-semibold text-brand-900">Detalles de la cita</h2>
					<button
						onClick={onClose}
						className="rounded-lg p-1 text-brand-800 hover:bg-cloud"
						aria-label="Cerrar"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Content */}
				<div className="p-6">
					{error ? (
						<div className="text-center py-8">
							<p className="text-sm text-red-600">{error}</p>
						</div>
					) : !cita ? (
						<div className="text-center py-8">
							<p className="text-sm text-brand-800">Cargando información de la cita...</p>
						</div>
					) : (
						<div className="space-y-6">
							{/* ID de la cita */}
							<div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
								<p className="text-xs font-semibold text-brand-700">ID de la cita</p>
								<p className="mt-1 break-all text-sm font-mono text-brand-900">{cita.id_cita}</p>
							</div>

							{/* Información básica de la cita */}
							<div>
								<h3 className="mb-3 text-sm font-semibold text-brand-900">Información de la cita</h3>
								<div className="grid gap-4 sm:grid-cols-2">
									<div>
										<p className="text-xs font-semibold text-brand-700">Fecha</p>
										<p className="mt-1 text-sm text-brand-900">{formatFecha(cita.fecha_cita)}</p>
									</div>
									<div>
										<p className="text-xs font-semibold text-brand-700">Hora</p>
										<p className="mt-1 text-sm text-brand-900">{formatHora(cita.hora_cita)}</p>
									</div>
									<div>
										<p className="text-xs font-semibold text-brand-700">Estado de la cita</p>
										<p className="mt-1">
											<span
												className={`inline-flex rounded-full px-2 py-1 text-xs ${
													cita.estado_cita === 0
														? "bg-amber-400 text-brand-900"
														: cita.estado_cita === 1
															? "bg-brand-700 text-paper"
															: cita.estado_cita === 2
																? "bg-red-500 text-paper"
																: "bg-sky-500 text-paper"
												}`}
											>
												{getEstadoCitaLabel(cita.estado_cita)}
											</span>
										</p>
									</div>
									{!hideSensitiveData && (
										<div>
											<p className="text-xs font-semibold text-brand-700">Estado del pago</p>
											<p className="mt-1">
												<span
													className={`inline-flex rounded-full px-2 py-1 text-xs ${
														cita.estado_pago === 0
															? "bg-amber-400 text-brand-900"
															: cita.estado_pago === 1
																? "bg-brand-700 text-paper"
																: "bg-red-500 text-paper"
													}`}
												>
													{getEstadoPagoLabel(cita.estado_pago)}
												</span>
											</p>
										</div>
									)}
									<div>
										<p className="text-xs font-semibold text-brand-700">Orden</p>
										<p className="mt-1 text-sm text-brand-900">{cita.orden}</p>
									</div>
									<div>
										<p className="text-xs font-semibold text-brand-700">Fecha de creación</p>
										<p className="mt-1 text-sm text-brand-900">
											{formatFechaHora(cita.creada_en)}
										</p>
									</div>
								</div>
							</div>

							{/* Información del paciente */}
							<div>
								<h3 className="mb-3 text-sm font-semibold text-brand-900">Paciente</h3>
								<div className="grid gap-4 sm:grid-cols-2">
									<div>
										<p className="text-xs font-semibold text-brand-700">Nombre completo</p>
										<p className="mt-1 text-sm text-brand-900">
											{cita.paciente_nombre} {cita.paciente_apellido}
										</p>
									</div>
									<div>
										<p className="text-xs font-semibold text-brand-700">Cédula</p>
										<p className="mt-1 text-sm text-brand-900">{cita.paciente_cedula}</p>
									</div>
									{!hideSensitiveData && (
										<div>
											<p className="text-xs font-semibold text-brand-700">RIF</p>
											<p className="mt-1 text-sm text-brand-900">
												{cita.paciente_rif || "N/A"}
											</p>
										</div>
									)}
									<div>
										<p className="text-xs font-semibold text-brand-700">Teléfono</p>
										<p className="mt-1 text-sm text-brand-900">{cita.paciente_telefono}</p>
									</div>
									<div>
										<p className="text-xs font-semibold text-brand-700">Correo</p>
										<p className="mt-1 text-sm text-brand-900">{cita.paciente_correo || "N/A"}</p>
									</div>
									{cita.paciente_fecha_nacimiento && (
										<div>
											<p className="text-xs font-semibold text-brand-700">Fecha de nacimiento</p>
											<p className="mt-1 text-sm text-brand-900">
												{formatFecha(cita.paciente_fecha_nacimiento)}
											</p>
										</div>
									)}
									{cita.paciente_tipo_sangre && (
										<div>
											<p className="text-xs font-semibold text-brand-700">Tipo de sangre</p>
											<p className="mt-1 text-sm text-brand-900">{cita.paciente_tipo_sangre}</p>
										</div>
									)}
									{cita.paciente_contacto_nombre && (
										<div>
											<p className="text-xs font-semibold text-brand-700">
												Contacto de emergencia
											</p>
											<p className="mt-1 text-sm text-brand-900">
												{cita.paciente_contacto_nombre}
												{cita.paciente_contacto_telefono &&
													` - ${cita.paciente_contacto_telefono}`}
											</p>
										</div>
									)}
								</div>
							</div>

							{/* Información del representado (si existe) */}
							{cita.representado_nombre && (
								<div>
									<h3 className="mb-3 text-sm font-semibold text-brand-900">Representado</h3>
									<div className="grid gap-4 sm:grid-cols-2">
										<div>
											<p className="text-xs font-semibold text-brand-700">Nombre completo</p>
											<p className="mt-1 text-sm text-brand-900">
												{cita.representado_nombre} {cita.representado_apellido}
											</p>
										</div>
										<div>
											<p className="text-xs font-semibold text-brand-700">Cédula</p>
											<p className="mt-1 text-sm text-brand-900">{cita.representado_cedula}</p>
										</div>
										{cita.representado_fecha_nacimiento && (
											<div>
												<p className="text-xs font-semibold text-brand-700">
													Fecha de nacimiento
												</p>
												<p className="mt-1 text-sm text-brand-900">
													{formatFecha(cita.representado_fecha_nacimiento)}
												</p>
											</div>
										)}
										{cita.representado_parentesco && (
											<div>
												<p className="text-xs font-semibold text-brand-700">Parentesco</p>
												<p className="mt-1 text-sm text-brand-900">
													{cita.representado_parentesco}
												</p>
											</div>
										)}
									</div>
								</div>
							)}

							{/* Información del especialista */}
							<div>
								<h3 className="mb-3 text-sm font-semibold text-brand-900">Especialista</h3>
								<div className="grid gap-4 sm:grid-cols-2">
									<div>
										<p className="text-xs font-semibold text-brand-700">Nombre completo</p>
										<p className="mt-1 text-sm text-brand-900">
											{cita.especialista_nombre} {cita.especialista_apellido}
										</p>
									</div>
									<div>
										<p className="text-xs font-semibold text-brand-700">Cédula</p>
										<p className="mt-1 text-sm text-brand-900">{cita.especialista_cedula}</p>
									</div>
									<div>
										<p className="text-xs font-semibold text-brand-700">Teléfono</p>
										<p className="mt-1 text-sm text-brand-900">{cita.especialista_telefono}</p>
									</div>
									<div>
										<p className="text-xs font-semibold text-brand-700">Correo</p>
										<p className="mt-1 text-sm text-brand-900">{cita.especialista_correo || "N/A"}</p>
									</div>
									<div>
										<p className="text-xs font-semibold text-brand-700">Especialidad</p>
										<p className="mt-1 text-sm text-brand-900">{cita.especialidad_nombre}</p>
									</div>
									{cita.especialista_codigo_colegiatura && (
										<div>
											<p className="text-xs font-semibold text-brand-700">
												Código de colegiatura
											</p>
											<p className="mt-1 text-sm text-brand-900">
												{cita.especialista_codigo_colegiatura}
											</p>
										</div>
									)}
								</div>
							</div>

							{/* Información del eco */}
							<div>
								<h3 className="mb-3 text-sm font-semibold text-brand-900">Eco</h3>
								<div className="grid gap-4 sm:grid-cols-2">
									<div>
										<p className="text-xs font-semibold text-brand-700">Nombre</p>
										<p className="mt-1 text-sm text-brand-900">{cita.eco_nombre}</p>
									</div>
									{!hideSensitiveData && cita.eco_precio && (
										<div>
											<p className="text-xs font-semibold text-brand-700">Precio</p>
											<p className="mt-1 text-sm text-brand-900">
												{formatMonto(cita.eco_precio)}
											</p>
										</div>
									)}
									{cita.eco_duracion_min && (
										<div>
											<p className="text-xs font-semibold text-brand-700">Duración</p>
											<p className="mt-1 text-sm text-brand-900">
												{cita.eco_duracion_min} minutos
											</p>
										</div>
									)}
								</div>
							</div>

							{/* Información del pago (si existe) - Solo para moderadores */}
							{!hideSensitiveData && cita.pago_id_pago && (
								<div>
									<h3 className="mb-3 text-sm font-semibold text-brand-900">Información del pago</h3>
									<div className="space-y-4">
										<div className="grid gap-4 sm:grid-cols-2">
											<div>
												<p className="text-xs font-semibold text-brand-700">Método de pago</p>
												<p className="mt-1 text-sm text-brand-900">{cita.pago_metodo}</p>
											</div>
											<div>
												<p className="text-xs font-semibold text-brand-700">Monto</p>
												<p className="mt-1 text-sm font-semibold text-brand-900">
													{formatMonto(cita.pago_monto)}
												</p>
											</div>
											<div>
												<p className="text-xs font-semibold text-brand-700">Referencia</p>
												<p className="mt-1 text-sm text-brand-900">{cita.pago_referencia}</p>
											</div>
											<div>
												<p className="text-xs font-semibold text-brand-700">Estado</p>
												<p className="mt-1">
													<span
														className={`inline-flex rounded-full px-2 py-1 text-xs ${
															cita.pago_estado_pago === 0
																? "bg-amber-400 text-brand-900"
																: cita.pago_estado_pago === 1
																	? "bg-brand-700 text-paper"
																	: "bg-red-500 text-paper"
														}`}
													>
														{getEstadoPagoLabel(cita.pago_estado_pago)}
													</span>
												</p>
											</div>
											<div>
												<p className="text-xs font-semibold text-brand-700">Banco origen</p>
												<p className="mt-1 text-sm text-brand-900">{cita.pago_banco_origen}</p>
											</div>
											<div>
												<p className="text-xs font-semibold text-brand-700">Banco destino</p>
												<p className="mt-1 text-sm text-brand-900">{cita.pago_banco_destino}</p>
											</div>
											<div>
												<p className="text-xs font-semibold text-brand-700">Cédula del pagador</p>
												<p className="mt-1 text-sm text-brand-900">{cita.pago_cedula_pagador}</p>
											</div>
											<div>
												<p className="text-xs font-semibold text-brand-700">
													Teléfono del pagador
												</p>
												<p className="mt-1 text-sm text-brand-900">{cita.pago_telefono_pagador}</p>
											</div>
											<div>
												<p className="text-xs font-semibold text-brand-700">Fecha de pago</p>
												<p className="mt-1 text-sm text-brand-900">
													{formatFechaHora(cita.pago_fecha_pago)}
												</p>
											</div>
											{cita.pago_fecha_validacion && (
												<div>
													<p className="text-xs font-semibold text-brand-700">
														Fecha de validación
													</p>
													<p className="mt-1 text-sm text-brand-900">
														{formatFechaHora(cita.pago_fecha_validacion)}
													</p>
												</div>
											)}
											{cita.pago_validado_por_nombre && (
												<div>
													<p className="text-xs font-semibold text-brand-700">Validado por</p>
													<p className="mt-1 text-sm text-brand-900">
														{cita.pago_validado_por_nombre} {cita.pago_validado_por_apellido}
													</p>
												</div>
											)}
										</div>
										{cita.pago_imagen && (
											<div>
												<p className="text-xs font-semibold text-brand-700 mb-2">
													Comprobante de pago
												</p>
												<div className="rounded-lg border border-mist overflow-hidden">
													<img
														src={cita.pago_imagen}
														alt="Comprobante de pago"
														className="w-full h-auto object-contain max-h-96"
														onError={(e) => {
															(e.target as HTMLImageElement).src =
																"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%236b7280' font-family='sans-serif' font-size='16'%3EImagen no disponible%3C/text%3E%3C/svg%3E";
														}}
													/>
												</div>
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="sticky bottom-0 border-t border-mist bg-paper p-4 flex justify-end">
					<button
						onClick={onClose}
						className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper hover:bg-brand-800"
					>
						Cerrar
					</button>
				</div>
			</div>
		</div>
	);
};

export default VerCitaModal;
