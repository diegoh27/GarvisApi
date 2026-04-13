import { useEffect, useMemo, useState } from "react";
import { useGetEcosByEspecialistaQuery } from "../../ecos/ecosApi";
import { useGetDolarOficialQuery } from "../../dolar/dolarApi";
import {
	useLazyGetDatosPorCedulaQuery,
	useLazyBuscarRepresentadoPorNombreQuery,
	useGetOcupacionEspecialistaQuery,
	useCrearRepresentadoPorCedulaTitularMutation,
} from "../api/comisionesApi";
import {
	calculateRIF,
	formatNombreApellido,
	validarRangoCedula,
	MENSAJE_RANGO_CEDULA,
	toDateKey,
} from "../../../shared";
import { sanitizeMonto, validarMonto } from "../utils/validation";
import {
	HORA_OPTIONS,
	METODOS_API,
	slotsOverlap,
	defaultFechaCita,
	idsCoinciden,
} from "../utils/citaMostradorUtils";

export type CitaMostradorSavePayload = {
	id_especialista: string;
	id_eco: string;
	fecha_cita: string;
	hora_cita: string;
	metodo: "Efectivo" | "Transferencia" | "PagoMovil" | "Zelle" | "Otro";
	monto: number;
	tasa_dia_bcv: number;
	nombre: string;
	apellido: string;
	cedula: string;
	rif?: string;
	referencia?: string;
	id_paciente?: string;
	id_representado?: string;
};

type UseCitaMostradorFormOptions = {
	onSave: (payload: CitaMostradorSavePayload) => Promise<void>;
};

export function useCitaMostradorForm({ onSave }: UseCitaMostradorFormOptions) {
	const [form, setForm] = useState({
		id_especialista: "",
		id_eco: "",
		fecha_cita: defaultFechaCita(),
		hora_cita: "08:00:00",
		metodo: "Transferencia" as "Efectivo" | "Transferencia" | "PagoMovil" | "Zelle" | "Otro",
		monto: "",
		tasa_dia_bcv: "",
		nombre: "",
		apellido: "",
		tipo_cedula: "V",
		cedula: "",
		rif: "",
		referencia: "",
	});
	const [error, setError] = useState("");
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [mensajeCargaAnterior, setMensajeCargaAnterior] = useState<string | null>(null);
	/** Tras “Cargar paciente”: hay datos en sistema para esta cédula (UI página: solo lectura). */
	const [pacienteIdentificadoEnSistema, setPacienteIdentificadoEnSistema] = useState(false);
	const [vincularRepresentado, setVincularRepresentado] = useState<{
		id_paciente: string;
		id_representado: string;
	} | null>(null);
	const [vincularCitaAlTitular, setVincularCitaAlTitular] = useState(false);
	const [searchRepNombre, setSearchRepNombre] = useState("");
	const [searchRepApellido, setSearchRepApellido] = useState("");
	const [resultadosRep, setResultadosRep] = useState<
		Array<{
			id_representado: string;
			id_paciente: string;
			nombre: string;
			apellido: string;
			titular_cedula: string;
			titular_nombre: string;
			titular_apellido: string;
		}>
	>([]);
	const [buscarRep, { isFetching: loadingBuscarRep }] = useLazyBuscarRepresentadoPorNombreQuery();
	const [crearRepresentado, { isLoading: loadingCrearRep }] = useCrearRepresentadoPorCedulaTitularMutation();

	const [showCrearRepresentadoForm, setShowCrearRepresentadoForm] = useState(false);
	const [repForm, setRepForm] = useState({
		cedula_titular: "",
		nombre_titular: "",
		apellido_titular: "",
		genero_titular: "" as "" | "Masculino" | "Femenino",
		fecha_nacimiento_titular: "",
		nombre: "",
		apellido: "",
		fecha_nacimiento: "",
		genero: "" as "" | "Masculino" | "Femenino",
		parentesco: "",
		tipo_cedula_rep: "V" as "V" | "E" | "J" | "P" | "G",
		cedula_rep: "",
	});
	const [repFormErrors, setRepFormErrors] = useState<Record<string, string>>({});
	const [titularYaRegistrado, setTitularYaRegistrado] = useState<{ nombre: string; apellido: string } | null>(
		null,
	);

	/** Solo si el método no es Transferencia/PagoMovil: editar monto en USD o en Bs (internamente se guarda USD para el API). */
	const [monedaRegistro, setMonedaRegistro] = useState<"usd" | "bs">("usd");

	const [getDatosPorCedula, { isFetching: loadingDatosPorCedula }] = useLazyGetDatosPorCedulaQuery();

	const { data: dolarOficial, isLoading: loadingDolar } = useGetDolarOficialQuery();

	useEffect(() => {
		if (!form.tasa_dia_bcv && dolarOficial?.promedio) {
			setForm((prev) => ({
				...prev,
				tasa_dia_bcv: String(dolarOficial.promedio),
			}));
		}
	}, [dolarOficial, form.tasa_dia_bcv]);

	const { data: ecos = [], isLoading: loadingEcos } = useGetEcosByEspecialistaQuery(form.id_especialista, {
		skip: !form.id_especialista,
	});

	const { data: ocupacionData, isLoading: loadingOcupacion } = useGetOcupacionEspecialistaQuery(
		{ id_especialista: form.id_especialista, fecha: form.fecha_cita },
		{ skip: !form.id_especialista || !form.fecha_cita },
	);
	const ocupados = ocupacionData?.ocupados ?? [];

	const horaOcupada = useMemo(
		() => (slot: string) => ocupados.some((o) => slotsOverlap(o, slot)),
		[ocupados],
	);

	const selectedEco = useMemo(
		() => ecos.find((eco) => idsCoinciden(eco.id_eco, form.id_eco)),
		[ecos, form.id_eco],
	);

	const isMetodoEnBs = form.metodo === "Transferencia" || form.metodo === "PagoMovil";

	useEffect(() => {
		if (!selectedEco) return;

		const ecoPrecioUsd = Number(selectedEco.precio || 0);
		if (!Number.isFinite(ecoPrecioUsd) || ecoPrecioUsd <= 0) return;

		if (isMetodoEnBs) {
			const tasa = Number(form.tasa_dia_bcv);
			if (!Number.isFinite(tasa) || tasa <= 0) return;
			const calculadoBs = (ecoPrecioUsd * tasa).toFixed(2);
			setForm((prev) => ({ ...prev, monto: calculadoBs }));
			return;
		}

		setForm((prev) => ({ ...prev, monto: ecoPrecioUsd.toFixed(2) }));
	}, [selectedEco, isMetodoEnBs, form.tasa_dia_bcv]);

	useEffect(() => {
		setForm((prev) => ({
			...prev,
			id_eco: "",
		}));
	}, [form.id_especialista]);

	useEffect(() => {
		setForm((prev) => ({
			...prev,
			rif: calculateRIF(prev.tipo_cedula, prev.cedula),
		}));
	}, [form.tipo_cedula, form.cedula]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		const nextValue = name === "monto" ? sanitizeMonto(value) : value;
		setForm((prev) => ({ ...prev, [name]: nextValue }));
		setError("");
		setMensajeCargaAnterior(null);
		if (name in fieldErrors) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
		if (name === "cedula" || name === "tipo_cedula") {
			setVincularRepresentado(null);
			setPacienteIdentificadoEnSistema(false);
		}
	};

	/** Métodos en USD (Efectivo, Zelle, Otro): el usuario escribe Bs y se traduce a USD en `form.monto` para el backend. */
	const setMontoRegistroDesdeBs = (raw: string) => {
		const cleaned = sanitizeMonto(raw);
		if (cleaned === "" || cleaned === ".") {
			setForm((prev) => ({ ...prev, monto: "" }));
			setFieldErrors((prev) => ({ ...prev, monto: "" }));
			return;
		}
		const tasa =
			Number(form.tasa_dia_bcv) > 0
				? Number(form.tasa_dia_bcv)
				: Number(dolarOficial?.promedio) > 0
					? Number(dolarOficial.promedio)
					: 0;
		if (!Number.isFinite(tasa) || tasa <= 0) return;
		const bs = Number(cleaned);
		if (!Number.isFinite(bs)) return;
		const usd = (bs / tasa).toFixed(2);
		setForm((prev) => ({ ...prev, monto: usd }));
		setError("");
		setMensajeCargaAnterior(null);
		setFieldErrors((prev) => ({ ...prev, monto: "" }));
	};

	const cedulaCompleta = `${form.tipo_cedula}${form.cedula}`.trim();
	const puedeCargarAnterior = form.cedula.trim().length >= 6 && validarRangoCedula(form.cedula);

	const parseTitularCedula = (titularCedula: string) => {
		const s = String(titularCedula || "").trim();
		if (/^[VE]\d+/i.test(s))
			return { tipo: s[0].toUpperCase() as "V" | "E", numero: s.slice(1).replace(/\D/g, "") };
		return { tipo: "V" as const, numero: s.replace(/\D/g, "") };
	};

	const handleBuscarRepresentadoPorNombre = async () => {
		const nom = searchRepNombre.trim();
		const ape = searchRepApellido.trim();
		if (!nom && !ape) return;
		setResultadosRep([]);
		try {
			const list = await buscarRep({ nombre: nom || undefined, apellido: ape || undefined }).unwrap();
			setResultadosRep(list);
			if (list.length === 0)
				setMensajeCargaAnterior("No se encontró ningún representado con ese nombre o apellido.");
			else setMensajeCargaAnterior(null);
		} catch {
			setMensajeCargaAnterior("No se pudo buscar; intenta de nuevo.");
		}
	};

	const handleSeleccionarRepresentado = (
		rep: {
			id_representado: string;
			id_paciente: string;
			nombre: string;
			apellido: string;
			titular_cedula: string;
			titular_nombre: string;
			titular_apellido: string;
		},
	) => {
		const { tipo, numero } = parseTitularCedula(rep.titular_cedula);
		setForm((prev) => ({
			...prev,
			nombre: rep.nombre,
			apellido: rep.apellido,
			tipo_cedula: tipo,
			cedula: numero,
			rif: calculateRIF(tipo, numero),
		}));
		setPacienteIdentificadoEnSistema(true);
		setVincularRepresentado({ id_paciente: rep.id_paciente, id_representado: rep.id_representado });
		setVincularCitaAlTitular(true);
		setResultadosRep([]);
		setSearchRepNombre("");
		setSearchRepApellido("");
		setMensajeCargaAnterior(
			`Representado "${rep.nombre} ${rep.apellido}" seleccionado. Se usará la cédula del titular (${rep.titular_nombre} ${rep.titular_apellido}) para el pago. La cita aparecerá en Mis citas del titular.`,
		);
		setFieldErrors((prev) => ({ ...prev, nombre: "", apellido: "", cedula: "" }));
	};

	const handleAbrirCrearRepresentado = () => {
		setShowCrearRepresentadoForm(true);
		setTitularYaRegistrado(null);
		setRepForm((prev) => ({
			...prev,
			cedula_titular: cedulaCompleta || prev.cedula_titular,
			nombre_titular: form.nombre?.trim() || prev.nombre_titular,
			apellido_titular: form.apellido?.trim() || prev.apellido_titular,
		}));
		setRepFormErrors({});
	};

	const handleVerificarTitular = async () => {
		const cedula = repForm.cedula_titular.trim();
		if (!cedula || cedula.length < 6) return;
		setTitularYaRegistrado(null);
		try {
			const { paciente } = await getDatosPorCedula(cedula).unwrap();
			const tienePaciente = paciente && (paciente.nombre || paciente.apellido);
			if (tienePaciente) {
				setTitularYaRegistrado({
					nombre: paciente!.nombre || "",
					apellido: paciente!.apellido || "",
				});
			} else {
				setTitularYaRegistrado(null);
			}
		} catch {
			setTitularYaRegistrado(null);
		}
	};

	const quiereAltaTitular =
		!titularYaRegistrado && (repForm.nombre_titular.trim() || repForm.apellido_titular.trim());

	const validateRepForm = (): boolean => {
		const err: Record<string, string> = {};
		if (!repForm.cedula_titular.trim()) err.cedula_titular = "La cédula del titular es obligatoria.";
		if (quiereAltaTitular) {
			if (!repForm.nombre_titular.trim()) err.nombre_titular = "Nombre del titular obligatorio (titular no registrado).";
			if (!repForm.apellido_titular.trim()) err.apellido_titular = "Apellido del titular obligatorio (titular no registrado).";
			if (!repForm.genero_titular) err.genero_titular = "Género del titular obligatorio (titular no registrado).";
			else if (!["Masculino", "Femenino"].includes(repForm.genero_titular)) err.genero_titular = "Género no válido.";
			if (!repForm.fecha_nacimiento_titular) err.fecha_nacimiento_titular = "Fecha de nacimiento del titular obligatoria (titular no registrado).";
			else {
				const hoy = new Date();
				const f = new Date(repForm.fecha_nacimiento_titular);
				if (f.getTime() > hoy.getTime()) err.fecha_nacimiento_titular = "La fecha de nacimiento no puede ser futura.";
				else {
					let edad = hoy.getFullYear() - f.getFullYear();
					const mesDiff = hoy.getMonth() - f.getMonth();
					if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < f.getDate())) edad -= 1;
					if (edad < 18) err.fecha_nacimiento_titular = "El titular debe ser mayor de edad (18 años).";
				}
			}
		}
		if (!repForm.nombre.trim()) err.nombre = "El nombre es obligatorio.";
		if (!repForm.apellido.trim()) err.apellido = "El apellido es obligatorio.";
		if (!repForm.fecha_nacimiento) err.fecha_nacimiento = "La fecha de nacimiento es obligatoria.";
		else if (new Date(repForm.fecha_nacimiento).getTime() > new Date().getTime())
			err.fecha_nacimiento = "La fecha de nacimiento no puede ser futura.";
		if (!repForm.genero) err.genero = "El género es obligatorio.";
		else if (!["Masculino", "Femenino"].includes(repForm.genero)) err.genero = "Género no válido.";
		if (repForm.cedula_rep.trim() && !/^\d+$/.test(repForm.cedula_rep.trim())) err.cedula_rep = "Solo números.";
		else if (repForm.cedula_rep.trim() && !validarRangoCedula(repForm.cedula_rep)) err.cedula_rep = MENSAJE_RANGO_CEDULA;
		setRepFormErrors(err);
		return Object.keys(err).length === 0;
	};

	const handleCrearRepresentadoSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validateRepForm() || loadingCrearRep) return;
		try {
			const cedulaRep = repForm.cedula_rep.trim()
				? `${repForm.tipo_cedula_rep}${repForm.cedula_rep.trim()}`
				: undefined;
			const data = await crearRepresentado({
				cedula_titular: repForm.cedula_titular.trim(),
				nombre: formatNombreApellido(repForm.nombre),
				apellido: formatNombreApellido(repForm.apellido),
				fecha_nacimiento: repForm.fecha_nacimiento,
				genero: repForm.genero as "Masculino" | "Femenino",
				parentesco: repForm.parentesco.trim() || undefined,
				cedula: cedulaRep ?? null,
				...(repForm.nombre_titular.trim() &&
				repForm.apellido_titular.trim() &&
				repForm.genero_titular &&
				repForm.fecha_nacimiento_titular
					? {
							nombre_titular: formatNombreApellido(repForm.nombre_titular),
							apellido_titular: formatNombreApellido(repForm.apellido_titular),
							genero_titular: repForm.genero_titular as "Masculino" | "Femenino",
							fecha_nacimiento_titular: repForm.fecha_nacimiento_titular,
						}
					: {}),
			}).unwrap();
			const { tipo, numero } = parseTitularCedula(data.titular_cedula);
			setForm((prev) => ({
				...prev,
				nombre: data.nombre,
				apellido: data.apellido,
				tipo_cedula: tipo,
				cedula: numero,
				rif: calculateRIF(tipo, numero),
			}));
			setPacienteIdentificadoEnSistema(true);
			setVincularRepresentado({ id_paciente: data.id_paciente, id_representado: data.id_representado });
			setVincularCitaAlTitular(true);
			setShowCrearRepresentadoForm(false);
			setRepForm({
				cedula_titular: "",
				nombre_titular: "",
				apellido_titular: "",
				genero_titular: "",
				fecha_nacimiento_titular: "",
				nombre: "",
				apellido: "",
				fecha_nacimiento: "",
				genero: "",
				parentesco: "",
				tipo_cedula_rep: "V",
				cedula_rep: "",
			});
			setRepFormErrors({});
			const repNombre = `${data.nombre} ${data.apellido}`.trim();
			const titularNombre =
				data.titular_nombre != null && data.titular_apellido != null
					? `${data.titular_nombre} ${data.titular_apellido}`
					: null;
			const msgTitularCreado = titularNombre
				? `Cuando ${titularNombre} (cédula ${data.titular_cedula}) se registre podrá reclamar sus citas y representados. `
				: "";
			const pacienteTexto = titularNombre
				? `representado del paciente ${titularNombre} (cédula ${data.titular_cedula})`
				: `representado del titular (cédula ${data.titular_cedula})`;
			setMensajeCargaAnterior(
				`${msgTitularCreado}Cita para ${repNombre}, ${pacienteTexto}. La cita aparecerá en Mis citas del titular.`,
			);
			setFieldErrors((prev) => ({ ...prev, nombre: "", apellido: "", cedula: "" }));
		} catch (err: unknown) {
			const msg =
				typeof err === "object" && err !== null && "data" in err
					? (err as { data?: { message?: string } }).data?.message
					: "No se pudo crear el representado.";
			setRepFormErrors((prev) => ({ ...prev, _form: msg }));
		}
	};

	const handleCargarDatosAnteriores = async () => {
		const c = form.cedula.trim();
		if (c.length >= 5 && !validarRangoCedula(c)) {
			setMensajeCargaAnterior(MENSAJE_RANGO_CEDULA);
			return;
		}
		if (c.length > 0 && c.length < 6) {
			setMensajeCargaAnterior("Ingresa el número de cédula completo (mínimo 6 dígitos).");
			return;
		}
		if (!puedeCargarAnterior) return;
		setMensajeCargaAnterior(null);
		setVincularRepresentado(null);
		setVincularCitaAlTitular(false);
		setPacienteIdentificadoEnSistema(false);
		try {
			const { paciente, representado, mostrador } = await getDatosPorCedula(cedulaCompleta).unwrap();
			const tienePaciente = paciente && (paciente.nombre || paciente.apellido);
			const tieneRepresentado = representado && (representado.nombre || representado.apellido);
			const tieneMostrador = mostrador && (mostrador.nombre || mostrador.apellido);
			if (tienePaciente || tieneRepresentado || tieneMostrador) {
				const nombre =
					(tienePaciente ? paciente!.nombre : null) ||
					(tieneRepresentado ? representado!.nombre : null) ||
					(tieneMostrador ? mostrador!.nombre : null) ||
					"";
				const apellido =
					(tienePaciente ? paciente!.apellido : null) ||
					(tieneRepresentado ? representado!.apellido : null) ||
					(tieneMostrador ? mostrador!.apellido : null) ||
					"";
				const rif =
					tieneMostrador && mostrador!.rif
						? mostrador!.rif
						: tienePaciente && paciente!.rif
							? paciente!.rif
							: undefined;
				setForm((prev) => ({
					...prev,
					nombre: nombre || prev.nombre,
					apellido: apellido || prev.apellido,
					rif: rif ?? prev.rif,
				}));
				setFieldErrors((prev) => ({ ...prev, nombre: "", apellido: "" }));
				setPacienteIdentificadoEnSistema(true);
				if (tieneRepresentado) {
					setVincularRepresentado({
						id_paciente: representado!.id_paciente,
						id_representado: representado!.id_representado,
					});
					setVincularCitaAlTitular(true);
				}
				const partes = [];
				if (tienePaciente) partes.push("paciente registrado");
				if (tieneRepresentado) partes.push("representado");
				if (tieneMostrador) partes.push("cita de mostrador anterior");
				setMensajeCargaAnterior(
					`Datos cargados (${partes.join(", ")}). Puedes editarlos y registrar la nueva cita.${tieneRepresentado ? " Si marcas «Vincular al titular», la cita aparecerá en Mis citas del representado." : ""}`,
				);
			} else {
				setPacienteIdentificadoEnSistema(false);
				setMensajeCargaAnterior(
					"No se encontró ningún paciente registrado, representado ni cita de mostrador previa con esta cédula.",
				);
			}
		} catch {
			setMensajeCargaAnterior("No se pudo cargar; intenta de nuevo.");
		}
	};

	const validateForm = (): boolean => {
		const err: Record<string, string> = {};
		if (!form.id_especialista?.trim()) err.id_especialista = "Selecciona un especialista.";
		if (!form.id_eco?.trim()) err.id_eco = "Selecciona un eco.";
		if (!form.fecha_cita?.trim()) err.fecha_cita = "La fecha es obligatoria.";
		else {
			const f = new Date(form.fecha_cita);
			if (Number.isNaN(f.getTime())) err.fecha_cita = "Fecha inválida.";
		}
		if (!form.hora_cita?.trim()) err.hora_cita = "La hora es obligatoria.";
		if (!form.nombre?.trim()) err.nombre = "El nombre es obligatorio.";
		else if (form.nombre.trim().length > 36) err.nombre = "Máximo 36 caracteres.";
		if (!form.apellido?.trim()) err.apellido = "El apellido es obligatorio.";
		else if (form.apellido.trim().length > 36) err.apellido = "Máximo 36 caracteres.";
		if (!form.cedula?.trim() && !vincularRepresentado) err.cedula = "La cédula es obligatoria (o busca un representado por nombre).";
		else if (form.cedula?.trim() && !/^\d+$/.test(form.cedula.trim())) err.cedula = "Solo números.";
		else if (form.cedula?.trim() && !validarRangoCedula(form.cedula)) err.cedula = MENSAJE_RANGO_CEDULA;
		const errMonto = validarMonto(form.monto);
		if (errMonto) err.monto = errMonto;
		if (isMetodoEnBs) {
			const tasa = Number(form.tasa_dia_bcv);
			if (!form.tasa_dia_bcv?.trim()) err.tasa_dia_bcv = "La tasa BCV es obligatoria para este método.";
			else if (!Number.isFinite(tasa) || tasa <= 0) err.tasa_dia_bcv = "La tasa BCV debe ser mayor a 0.";
		}
		if (form.referencia.trim().length > 80) err.referencia = "Máximo 80 caracteres.";
		setFieldErrors(err);
		if (Object.keys(err).length > 0) {
			setError(Object.values(err)[0]);
			return false;
		}
		setError("");
		return true;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validateForm()) return;

		const monto = Number(form.monto);
		const tasa = Number(form.tasa_dia_bcv);
		const tasaFinal =
			Number.isFinite(tasa) && tasa > 0
				? tasa
				: Number(dolarOficial?.promedio) > 0
					? Number(dolarOficial?.promedio)
					: 1;

		await onSave({
			id_especialista: form.id_especialista,
			id_eco: form.id_eco,
			fecha_cita: form.fecha_cita,
			hora_cita: form.hora_cita.trim().padEnd(8, ":00").slice(0, 8),
			metodo: form.metodo,
			monto,
			tasa_dia_bcv: tasaFinal,
			nombre: formatNombreApellido(form.nombre),
			apellido: formatNombreApellido(form.apellido),
			cedula: `${form.tipo_cedula}${form.cedula}`.trim(),
			rif: form.rif.trim() || undefined,
			referencia: form.referencia.trim() || undefined,
			...(vincularCitaAlTitular && vincularRepresentado
				? { id_paciente: vincularRepresentado.id_paciente, id_representado: vincularRepresentado.id_representado }
				: {}),
		});
	};

	const inputError = "border-red-500 focus:border-red-500 focus:ring-red-500/30";

	return {
		form,
		setForm,
		fieldErrors,
		error,
		mensajeCargaAnterior,
		pacienteIdentificadoEnSistema,
		vincularRepresentado,
		vincularCitaAlTitular,
		setVincularCitaAlTitular,
		searchRepNombre,
		setSearchRepNombre,
		searchRepApellido,
		setSearchRepApellido,
		resultadosRep,
		loadingBuscarRep,
		loadingCrearRep,
		showCrearRepresentadoForm,
		setShowCrearRepresentadoForm,
		repForm,
		setRepForm,
		repFormErrors,
		setRepFormErrors,
		titularYaRegistrado,
		setTitularYaRegistrado,
		loadingDatosPorCedula,
		dolarOficial,
		loadingDolar,
		ecos,
		loadingEcos,
		loadingOcupacion,
		horaOcupada,
		selectedEco,
		isMetodoEnBs,
		monedaRegistro,
		setMonedaRegistro,
		setMontoRegistroDesdeBs,
		handleChange,
		handleBuscarRepresentadoPorNombre,
		handleSeleccionarRepresentado,
		handleAbrirCrearRepresentado,
		handleVerificarTitular,
		handleCrearRepresentadoSubmit,
		handleCargarDatosAnteriores,
		validateRepForm,
		handleSubmit,
		quiereAltaTitular,
		cedulaCompleta,
		puedeCargarAnterior,
		parseTitularCedula,
		HORA_OPTIONS,
		METODOS_API,
		inputError,
	};
}
