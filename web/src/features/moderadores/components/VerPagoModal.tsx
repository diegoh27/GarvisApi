import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { PagoData } from "../moderadoresApi";
import { formatFechaHoraLocal } from "../../../shared";

type VerPagoModalProps = {
	pago: PagoData | null;
	error?: string | null;
	onClose: () => void;
	/** Si es true y el pago está pendiente, se muestran botones Aprobar/Rechazar (Verificación de pagos) */
	showAcciones?: boolean;
	id_cita?: string;
	onAprobar?: (id_cita: string) => void;
	onRechazar?: (id_cita: string) => void;
	isUpdating?: boolean;
};

const formatFecha = (value: string | null) => (value ? formatFechaHoraLocal(value) : "N/A");

const formatMonto = (monto: number | string) => {
	const num = typeof monto === "string" ? parseFloat(monto) : monto;
	// Formatear como VES (Bolívares) ya que los pagos se hacen en VES
	return `Bs. ${num.toLocaleString("es-VE", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
};

const formatUSD = (monto: number | string | null | undefined) => {
	if (monto === null || monto === undefined) return "N/A";
	const num = typeof monto === "string" ? parseFloat(monto) : monto;
	return `$${num.toLocaleString("es-VE", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
};

const VerPagoModal = ({
	pago,
	error,
	onClose,
	showAcciones = false,
	id_cita,
	onAprobar,
	onRechazar,
	isUpdating = false,
}: VerPagoModalProps) => {
	const estadoPago = pago ? Number(pago.estado_pago) : null;
	const puedeVerificar =
		showAcciones && id_cita && estadoPago === 0 && onAprobar && onRechazar;
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);
	const [zoom, setZoom] = useState(1);
	const [pan, setPan] = useState({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState(false);
	const dragStart = useRef({ x: 0, y: 0 });
	const panStart = useRef({ x: 0, y: 0 });

	useEffect(() => {
		if (isPreviewOpen) {
			setZoom(1);
			setPan({ x: 0, y: 0 });
		}
	}, [isPreviewOpen, pago?.imagen]);

	const handleZoomWheel = (event: React.WheelEvent<HTMLDivElement>) => {
		event.preventDefault();
		const delta = event.deltaY < 0 ? 0.1 : -0.1;
		setZoom((current) => {
			const next = Math.max(1, Math.min(4, Number((current + delta).toFixed(2))));
			if (next === 1) {
				setPan({ x: 0, y: 0 });
			}
			return next;
		});
	};

	const handleDragStart = (event: React.MouseEvent<HTMLDivElement>) => {
		if (zoom <= 1) return;
		setIsDragging(true);
		dragStart.current = { x: event.clientX, y: event.clientY };
		panStart.current = { x: pan.x, y: pan.y };
	};

	const handleDragMove = (event: React.MouseEvent<HTMLDivElement>) => {
		if (!isDragging) return;
		const deltaX = event.clientX - dragStart.current.x;
		const deltaY = event.clientY - dragStart.current.y;
		setPan({ x: panStart.current.x + deltaX, y: panStart.current.y + deltaY });
	};

	const handleDragEnd = () => {
		setIsDragging(false);
	};
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="relative w-full max-w-lg rounded-xl bg-paper shadow-lg flex flex-col max-h-[85vh]">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-mist p-3 flex-shrink-0">
					<h2 className="text-base font-semibold text-brand-900">Detalles del pago</h2>
					<button
						onClick={onClose}
						className="rounded-lg p-1 text-brand-800 hover:bg-cloud"
						aria-label="Cerrar"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Content - Scrollable */}
				<div className="overflow-y-auto flex-1 p-4">
					{error ? (
						<div className="text-center py-8">
							<p className="text-sm text-red-600">{error}</p>
						</div>
					) : !pago ? (
						<div className="text-center py-8">
							<p className="text-sm text-brand-800">Cargando información del pago...</p>
						</div>
					) : (
						<div className="space-y-3">
							{/* Información básica */}
							<div className="grid gap-3 sm:grid-cols-2">
								<div>
									<p className="text-xs font-semibold text-brand-700">Método de pago</p>
									<p className="mt-0.5 text-sm text-brand-900">{pago.metodo}</p>
								</div>
								<div>
									<p className="text-xs font-semibold text-brand-700">Referencia</p>
									<p className="mt-0.5 text-sm text-brand-900">{pago.referencia}</p>
								</div>
								<div>
									<p className="text-xs font-semibold text-brand-700">Estado</p>
									<p className="mt-0.5">
										<span
											className={`inline-flex rounded-full px-2 py-0.5 text-xs ${estadoPago === 0
												? "bg-amber-400 text-brand-900"
												: estadoPago === 1
													? "bg-brand-700 text-paper"
													: "bg-red-500 text-paper"
												}`}
										>
											{estadoPago === 0
												? "Pendiente"
												: estadoPago === 1
													? "Aprobado"
													: "Rechazado"}
										</span>
									</p>
								</div>
							</div>

							{/* Información de precios */}
							<div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
								<p className="mb-2 text-xs font-semibold text-emerald-900">Información de pago</p>
								<div className="grid gap-2 sm:grid-cols-2">
									<div>
										<p className="text-xs font-medium text-emerald-700">Precio del eco (USD)</p>
										<p className="mt-0.5 text-sm font-bold text-emerald-900">
											{formatUSD(pago.eco_precio)}
										</p>
										{pago.eco_nombre && (
											<p className="mt-0.5 text-xs text-emerald-600">{pago.eco_nombre}</p>
										)}
									</div>
									<div>
										<p className="text-xs font-medium text-emerald-700">Monto pagado (VES)</p>
										<p className="mt-0.5 text-sm font-bold text-emerald-900">
											{formatMonto(pago.monto)}
										</p>
										<p className="mt-0.5 text-xs text-emerald-600">Monto recibido</p>
									</div>
									<div>
										<p className="text-xs font-medium text-emerald-700">Tasa del día</p>
										<p className="mt-0.5 text-sm font-bold text-emerald-900">
											{pago.tasa_dia_bcv != null &&
												pago.tasa_dia_bcv !== "" &&
												Number(pago.tasa_dia_bcv) > 0
												? formatMonto(
													typeof pago.tasa_dia_bcv === "string"
														? parseFloat(pago.tasa_dia_bcv)
														: pago.tasa_dia_bcv
												)
												: "No registrada"}
										</p>
										<p className="mt-0.5 text-xs text-emerald-600">Tasa BCV al momento del pago</p>
									</div>
								</div>
							</div>

							{/* Información bancaria */}
							<div className="grid gap-3 sm:grid-cols-2">
								<div>
									<p className="text-xs font-semibold text-brand-700">Banco origen</p>
									<p className="mt-0.5 text-sm text-brand-900">{pago.banco_origen}</p>
								</div>
								<div>
									<p className="text-xs font-semibold text-brand-700">Banco destino</p>
									<p className="mt-0.5 text-sm text-brand-900">{pago.banco_destino}</p>
								</div>
							</div>

							{/* Información del pagador */}
							<div className="grid gap-3 sm:grid-cols-2">
								<div>
									<p className="text-xs font-semibold text-brand-700">Cédula del pagador</p>
									<p className="mt-0.5 text-sm text-brand-900">{pago.cedula_pagador}</p>
								</div>
								<div>
									<p className="text-xs font-semibold text-brand-700">RIF del paciente</p>
									<p className="mt-0.5 text-sm text-brand-900">
										{pago.paciente_rif || pago.paciente_cedula || "N/A"}
									</p>
								</div>
								<div>
									<p className="text-xs font-semibold text-brand-700">Teléfono del pagador</p>
									<p className="mt-0.5 text-sm text-brand-900">{pago.telefono_pagador}</p>
								</div>
							</div>

							{/* Fechas */}
							<div className="grid gap-3 sm:grid-cols-2">
								<div>
									<p className="text-xs font-semibold text-brand-700">Fecha de pago</p>
									<p className="mt-0.5 text-sm text-brand-900">{formatFecha(pago.fecha_pago)}</p>
								</div>
								{pago.fecha_validacion && (
									<div>
										<p className="text-xs font-semibold text-brand-700">Fecha de validación</p>
										<p className="mt-0.5 text-sm text-brand-900">
											{formatFecha(pago.fecha_validacion)}
										</p>
									</div>
								)}
							</div>

							{/* Validado por */}
							{pago.validado_por_nombre && (
								<div>
									<p className="text-xs font-semibold text-brand-700">Validado por</p>
									<p className="mt-0.5 text-sm text-brand-900">
										{pago.validado_por_nombre} {pago.validado_por_apellido}
									</p>
								</div>
							)}

							{/* Imagen del comprobante */}
							<div>
								<p className="text-xs font-semibold text-brand-700 mb-1.5">Comprobante de pago</p>
								<div className="rounded-lg border border-mist overflow-hidden">
									<img
										src={pago.imagen}
										alt="Comprobante de pago"
										className="w-full h-auto object-contain max-h-64 cursor-zoom-in"
										onClick={() => setIsPreviewOpen(true)}
										onError={(e) => {
											(e.target as HTMLImageElement).src =
												"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%236b7280' font-family='sans-serif' font-size='16'%3EImagen no disponible%3C/text%3E%3C/svg%3E";
										}}
									/>
								</div>
								<div className="mt-2 flex justify-end">
									<button
										type="button"
										onClick={() => setIsPreviewOpen(true)}
										className="rounded-lg border border-brand-700 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-cloud"
									>
										Ver en grande
									</button>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="border-t border-mist p-3 flex flex-wrap items-center justify-end gap-2 flex-shrink-0">
					{puedeVerificar && (
						<>
							<button
								type="button"
								onClick={() => onAprobar(id_cita)}
								disabled={isUpdating}
								className="rounded-lg bg-brand-700 px-4 py-1.5 text-sm font-medium text-paper hover:bg-brand-800 disabled:opacity-50"
							>
								{isUpdating ? "Procesando..." : "Aprobar pago"}
							</button>
							<button
								type="button"
								onClick={() => onRechazar(id_cita)}
								disabled={isUpdating}
								className="rounded-lg border border-red-500 bg-paper px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
							>
								Rechazar
							</button>
						</>
					)}
					<button
						onClick={onClose}
						className="rounded-lg bg-brand-700 px-4 py-1.5 text-sm font-medium text-paper hover:bg-brand-800"
					>
						Cerrar
					</button>
				</div>
			</div>
			{isPreviewOpen && pago?.imagen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
					<div className="relative w-full max-w-5xl">
						<button
							type="button"
							onClick={() => setIsPreviewOpen(false)}
							className="absolute -top-10 right-0 rounded-full bg-paper p-2 text-brand-800 shadow hover:bg-cloud"
							aria-label="Cerrar vista ampliada"
						>
							<X className="h-5 w-5" />
						</button>
						<div
							className="rounded-xl bg-paper p-3"
							onWheel={handleZoomWheel}
						>
							<div
								className={
									`flex max-h-[80vh] w-full items-center justify-center overflow-auto ${zoom > 1 ? "cursor-grab" : ""
									}`
								}
								onMouseDown={handleDragStart}
								onMouseMove={handleDragMove}
								onMouseUp={handleDragEnd}
								onMouseLeave={handleDragEnd}
							>
								<img
									src={pago.imagen}
									alt="Comprobante de pago en grande"
									className={
										`max-h-none max-w-none ${isDragging ? "cursor-grabbing" : ""}`
									}
									style={{
										transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
									}}
								/>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default VerPagoModal;
