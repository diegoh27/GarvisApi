import { X } from "lucide-react";
import type { PagoData } from "../moderadoresApi";

type VerPagoModalProps = {
	pago: PagoData | null;
	error?: string | null;
	onClose: () => void;
};

const formatFecha = (value: string | null) => {
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

const formatMonto = (monto: number | string) => {
	const num = typeof monto === "string" ? parseFloat(monto) : monto;
	return new Intl.NumberFormat("es-VE", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
	}).format(num);
};

const VerPagoModal = ({ pago, error, onClose }: VerPagoModalProps) => {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="relative w-full max-w-2xl rounded-2xl bg-paper shadow-lg">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-mist p-4">
					<h2 className="text-lg font-semibold text-brand-900">Detalles del pago</h2>
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
					) : !pago ? (
						<div className="text-center py-8">
							<p className="text-sm text-brand-800">Cargando información del pago...</p>
						</div>
					) : (
						<div className="space-y-4">
							{/* Información básica */}
							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<p className="text-xs font-semibold text-brand-700">Método de pago</p>
									<p className="mt-1 text-sm text-brand-900">{pago.metodo}</p>
								</div>
								<div>
									<p className="text-xs font-semibold text-brand-700">Monto</p>
									<p className="mt-1 text-sm font-semibold text-brand-900">
										{formatMonto(pago.monto)}
									</p>
								</div>
								<div>
									<p className="text-xs font-semibold text-brand-700">Referencia</p>
									<p className="mt-1 text-sm text-brand-900">{pago.referencia}</p>
								</div>
								<div>
									<p className="text-xs font-semibold text-brand-700">Estado</p>
									<p className="mt-1">
										<span
											className={`inline-flex rounded-full px-2 py-1 text-xs ${
												pago.estado_pago === 0
													? "bg-amber-400 text-brand-900"
													: pago.estado_pago === 1
														? "bg-brand-700 text-paper"
														: "bg-red-500 text-paper"
											}`}
										>
											{pago.estado_pago === 0
												? "Pendiente"
												: pago.estado_pago === 1
													? "Aprobado"
													: "Rechazado"}
										</span>
									</p>
								</div>
							</div>

							{/* Información bancaria */}
							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<p className="text-xs font-semibold text-brand-700">Banco origen</p>
									<p className="mt-1 text-sm text-brand-900">{pago.banco_origen}</p>
								</div>
								<div>
									<p className="text-xs font-semibold text-brand-700">Banco destino</p>
									<p className="mt-1 text-sm text-brand-900">{pago.banco_destino}</p>
								</div>
							</div>

							{/* Información del pagador */}
							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<p className="text-xs font-semibold text-brand-700">Cédula del pagador</p>
									<p className="mt-1 text-sm text-brand-900">{pago.cedula_pagador}</p>
								</div>
								<div>
									<p className="text-xs font-semibold text-brand-700">RIF del paciente</p>
									<p className="mt-1 text-sm text-brand-900">
										{pago.paciente_rif || "N/A"}
									</p>
								</div>
								<div>
									<p className="text-xs font-semibold text-brand-700">Teléfono del pagador</p>
									<p className="mt-1 text-sm text-brand-900">{pago.telefono_pagador}</p>
								</div>
							</div>

							{/* Fechas */}
							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<p className="text-xs font-semibold text-brand-700">Fecha de pago</p>
									<p className="mt-1 text-sm text-brand-900">{formatFecha(pago.fecha_pago)}</p>
								</div>
								{pago.fecha_validacion && (
									<div>
										<p className="text-xs font-semibold text-brand-700">Fecha de validación</p>
										<p className="mt-1 text-sm text-brand-900">
											{formatFecha(pago.fecha_validacion)}
										</p>
									</div>
								)}
							</div>

							{/* Validado por */}
							{pago.validado_por_nombre && (
								<div>
									<p className="text-xs font-semibold text-brand-700">Validado por</p>
									<p className="mt-1 text-sm text-brand-900">
										{pago.validado_por_nombre} {pago.validado_por_apellido}
									</p>
								</div>
							)}

							{/* Imagen del comprobante */}
							<div>
								<p className="text-xs font-semibold text-brand-700 mb-2">Comprobante de pago</p>
								<div className="rounded-lg border border-mist overflow-hidden">
									<img
										src={pago.imagen}
										alt="Comprobante de pago"
										className="w-full h-auto object-contain max-h-96"
										onError={(e) => {
											(e.target as HTMLImageElement).src =
												"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%236b7280' font-family='sans-serif' font-size='16'%3EImagen no disponible%3C/text%3E%3C/svg%3E";
										}}
									/>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="border-t border-mist p-4 flex justify-end">
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

export default VerPagoModal;
