import { useState } from "react";
import { flushSync } from "react-dom";
import { useAuth } from "../../../shared";
import { FormularioPago, type PagoFormData, type FormularioPagoInvalidField } from "../../../shared";
import { useAsignarCitaCompletaMutation } from "../../moderadores/moderadoresApi";
import { useResendVerificationMutation } from "../../auth";
import { useGetDolarOficialQuery } from "../../dolar/dolarApi";
import { getToken } from "../../../shared/utils/token";
import Swal from "sweetalert2";
import type { Eco } from "../../ecos/ecosApi";
import type { DisponibilidadPublicaPorEcoItem } from "../disponibilidadApi";
import type { Representado } from "../../representados/representadosApi";
import { formatFecha, formatHora, isSlotAtLeast2HoursFromNow } from "../utils/dateUtils";

const normalizeFecha = (fecha: string): string => {
	if (!fecha) return "";
	const fechaStr = fecha.slice(0, 10);
	if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) return fechaStr;
	return fechaStr;
};

type ReservarCitaParaMiFormProps = {
	block: DisponibilidadPublicaPorEcoItem;
	eco: Eco;
	representado?: Representado | null;
	onSuccess?: () => void;
	onClose: () => void;
	onBack?: () => void;
};

const ReservarCitaParaMiForm = ({
	block,
	eco,
	representado = null,
	onSuccess,
	onClose,
	onBack,
}: ReservarCitaParaMiFormProps) => {
	const { user } = useAuth();
	const [pagoData, setPagoData] = useState<PagoFormData>({
		metodo: "Transferencia",
		imagen: "",
		orden_medica: "",
		banco_origen: "",
		banco_destino: "",
		monto: "",
		cedula_pagador: "",
		telefono_pagador: "",
		referencia: "",
	});
	const [imagenComprimida, setImagenComprimida] = useState<File | null>(null);
	const [ordenMedicaComprimida, setOrdenMedicaComprimida] = useState<File | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [invalidFields, setInvalidFields] = useState<FormularioPagoInvalidField[]>([]);

	const [asignarCita, { isLoading: isAsignando }] = useAsignarCitaCompletaMutation();
	const [resendVerification, { isLoading: isResending }] =
		useResendVerificationMutation();
	const { data: dolarOficial } = useGetDolarOficialQuery();

	const handleReservar = async () => {
		const idPaciente = user?.id_usuario;
		if (!idPaciente) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: "Debe iniciar sesión para reservar",
			});
			return;
		}

		if (!isSlotAtLeast2HoursFromNow(block.fecha, block.hora_inicio)) {
			Swal.fire({
				icon: "warning",
				title: "Horario no disponible",
				text: "Solo se puede reservar con al menos 2 horas de anticipación. Elige otro horario.",
			});
			return;
		}

		const missing: FormularioPagoInvalidField[] = [];
		if (!pagoData.banco_origen) missing.push("banco_origen");
		if (!pagoData.banco_destino) missing.push("banco_destino");
		if (!pagoData.monto?.trim()) missing.push("monto");
		if (!pagoData.cedula_pagador?.replace(/\D/g, "").trim()) missing.push("cedula_pagador");
		if (!pagoData.telefono_pagador?.replace(/\D/g, "").trim()) missing.push("telefono_pagador");
		if (!pagoData.referencia?.trim()) missing.push("referencia");
		if (!pagoData.imagen && !imagenComprimida) missing.push("imagen");
		if (!pagoData.orden_medica && !ordenMedicaComprimida) missing.push("orden_medica");

		if (missing.length > 0) {
			flushSync(() => setInvalidFields(missing));
			Swal.fire({
				icon: "warning",
				title: "Campos incompletos",
				text: "Complete los campos marcados en rojo para continuar.",
			});
			return;
		}
		setInvalidFields([]);

		const precioUSD = Number(eco?.precio) || 0;
		const tasaBs = Number(dolarOficial?.promedio) || 0;
		const montoCalculadoBs =
			tasaBs > 0 ? Math.round(precioUSD * tasaBs * 100) / 100 : null;
		const montoIngresado = parseFloat(pagoData.monto) || 0;
		const confirmacion = await Swal.fire({
			icon: "question",
			title: "Confirmar monto a pagar",
			html: `
				<div class="text-left space-y-2 text-sm">
					<p><strong>Precio del eco:</strong> $${precioUSD.toFixed(2)} USD</p>
					${montoCalculadoBs !== null ? `<p><strong>Total en Bs (tasa BCV):</strong> ${montoCalculadoBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</p>` : ""}
					<p><strong>Monto que ingresó:</strong> ${montoIngresado.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</p>
				</div>
			`,
			showCancelButton: true,
			confirmButtonText: "Sí, reservar cita",
			cancelButtonText: "Cancelar",
			confirmButtonColor: "#1C837F",
		});
		if (!confirmacion.isConfirmed) return;

		setIsSubmitting(true);

		let imagenUrl = pagoData.imagen;
		if (imagenComprimida && !pagoData.imagen) {
			try {
				const token = getToken();
				const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
				const formData = new FormData();
				formData.append("comprobante", imagenComprimida);
				const response = await fetch(`${baseUrl}/pagos/upload-comprobante`, {
					method: "POST",
					headers: { Authorization: `Bearer ${token}` },
					body: formData,
				});
				if (!response.ok) {
					const err = await response.json();
					throw new Error(err.message || "Error al subir la imagen");
				}
				const data = await response.json();
				imagenUrl = data.data.url;
			} catch (err: unknown) {
				Swal.fire({
					icon: "error",
					title: "Error",
					text: err instanceof Error ? err.message : "No se pudo subir el comprobante",
				});
				setIsSubmitting(false);
				return;
			}
		}

		let ordenMedicaUrl = pagoData.orden_medica;
		if (ordenMedicaComprimida && !pagoData.orden_medica) {
			try {
				const token = getToken();
				const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
				const formData = new FormData();
				formData.append("orden_medica", ordenMedicaComprimida);
				const response = await fetch(`${baseUrl}/citas/upload-orden-medica`, {
					method: "POST",
					headers: { Authorization: `Bearer ${token}` },
					body: formData,
				});
				if (!response.ok) {
					const err = await response.json();
					throw new Error(err.message || "Error al subir la orden médica");
				}
				const data = await response.json();
				ordenMedicaUrl = data.data.url;
			} catch (err: unknown) {
				Swal.fire({
					icon: "error",
					title: "Error",
					text: err instanceof Error ? err.message : "No se pudo subir la orden médica",
				});
				setIsSubmitting(false);
				return;
			}
		}

		try {
			await asignarCita({
				id_paciente: idPaciente,
				id_representado: representado?.id_representado ?? null,
				id_eco: block.id_eco ?? eco.id_eco,
				id_especialista: block.id_especialista,
				id_disponibilidad: block.id_disponibilidad,
				orden_medica: ordenMedicaUrl,
				metodo: pagoData.metodo,
				imagen: imagenUrl,
				banco_origen: pagoData.banco_origen,
				banco_destino: pagoData.banco_destino,
				monto: parseFloat(pagoData.monto),
				cedula_pagador: pagoData.cedula_pagador,
				telefono_pagador: pagoData.telefono_pagador,
				referencia: pagoData.referencia,
			}).unwrap();

			await Swal.fire({
				icon: "success",
				title: "Cita reservada",
				text: "Se reportó el pago y se generó la cita. Un moderador verificará el pago.",
				timer: 2500,
				showConfirmButton: false,
			});
			onSuccess?.();
			onClose();
		} catch (err: unknown) {
			const errData =
				typeof err === "object" && err !== null && "data" in err
					? (err as { data?: { message?: string; code?: string } }).data
					: undefined;
			const message = errData?.message || "No se pudo reservar la cita";

			if (errData?.code === "EMAIL_NOT_VERIFIED") {
				const result = await Swal.fire({
					icon: "warning",
					title: "Cuenta sin verificar",
					text: message,
					showCancelButton: true,
					confirmButtonText: "Reenviar correo",
					cancelButtonText: "Cerrar",
				});

				if (result.isConfirmed && user?.correo) {
					try {
						await resendVerification({ correo: user.correo }).unwrap();
						await Swal.fire({
							icon: "success",
							title: "Correo enviado",
							text: "Te reenviamos el correo de verificacion.",
						});
					} catch (resendErr) {
						const resendMessage =
							typeof resendErr === "object" &&
								resendErr !== null &&
								"data" in resendErr
								? (resendErr as { data?: { message?: string } }).data
									?.message
								: "No se pudo reenviar el correo";
						await Swal.fire({
							icon: "error",
							title: "Error",
							text: resendMessage,
						});
					}
				}
				return;
			}

			Swal.fire({
				icon: "error",
				title: "Error",
				text: message,
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const isLoading = isAsignando || isSubmitting || isResending;

	return (
		<>
			<div className="flex-1 overflow-y-auto p-6">
				<div className="mb-4 rounded-lg border border-brand-200 bg-brand-50 p-3 space-y-1">
					{representado && (
						<p className="text-sm font-medium text-brand-900">
							Cita para: {representado.nombre} {representado.apellido}
							{representado.parentesco ? ` (${representado.parentesco})` : ""}
						</p>
					)}
					<p className="text-sm font-medium text-brand-900">
						{formatFecha(normalizeFecha(block.fecha))} a las{" "}
						{formatHora(block.hora_inicio)}
					</p>
					<p className="text-sm text-brand-600">
						{block.especialista_nombre} {block.especialista_apellido} •{" "}
						{block.especialidad_nombre} • {eco.nombre}
					</p>
				</div>

				<FormularioPago
					precioEcoUSD={eco.precio ?? null}
					onChange={(data) => {
						setPagoData(data);
						setInvalidFields([]);
					}}
					invalidFields={invalidFields}
					onImageReady={setImagenComprimida}
					onOrdenMedicaReady={setOrdenMedicaComprimida}
					autoUpload={false}
					isLoading={isLoading}
					disabled={isLoading}
				/>
			</div>

			<div className="flex items-center justify-between gap-3 border-t border-mist p-4">
				<div>
					{onBack && (
						<button
							type="button"
							onClick={onBack}
							className="rounded-lg border border-brand-300 bg-paper px-4 py-2 text-sm font-medium text-brand-800 transition-colors hover:bg-cloud"
							disabled={isLoading}
						>
							← Volver
						</button>
					)}
				</div>
				<div className="flex items-center gap-3 ml-auto">
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg border border-brand-300 bg-paper px-4 py-2 text-sm font-medium text-brand-800 transition-colors hover:bg-cloud"
						disabled={isLoading}
					>
						Cancelar
					</button>
					<button
						type="button"
						onClick={handleReservar}
						disabled={isLoading}
						className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isLoading ? "Reservando..." : "Reservar cita"}
					</button>
				</div>
			</div>
		</>
	);
};

export default ReservarCitaParaMiForm;
