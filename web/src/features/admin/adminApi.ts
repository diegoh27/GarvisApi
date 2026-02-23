import { baseApi } from "../../app/api/baseApi";

export type CrearEspecialistaPayload = {
	nombre: string;
	apellido: string;
	genero: "Masculino" | "Femenino";
	cedula: string;
	correo: string;
	telefono: string;
	contrasena: string;
	fecha_nacimiento: string;
	id_especialidad: string;
	porcentaje: number;
	codigo_colegiatura?: string;
	id_ecos?: string[]; // Array de IDs de ecos
};

export type CrearModeradorPayload = {
	nombre: string;
	apellido: string;
	correo: string;
	contrasena: string;
	genero: "Masculino" | "Femenino";
	cedula: string;
	telefono: string;
	fecha_nacimiento: string;
};

export type MetodoPago = {
	id_metodo_pago: string;
	nombre: string;
	banco_codigo: string;
	banco_nombre: string;
	tipo_pago: string;
	moneda: "BS" | "USD";
	titular_nombre: string | null;
	titular_identificacion: string | null;
	correo: string | null;
	telefono: string | null;
	numero_cuenta: string | null;
	imagen_url: string;
	activo: number;
	creado_por: string;
	creado_en: string;
	actualizado_en: string | null;
	creado_por_nombre?: string;
	creado_por_apellido?: string;
};

export type CrearMetodoPagoPayload = {
	nombre: string;
	banco_codigo: string;
	banco_nombre: string;
	tipo_pago: string;
	moneda: "BS" | "USD";
	titular_nombre?: string;
	titular_identificacion?: string;
	titular_identificacion_tipo?: "V" | "E" | "J";
	titular_identificacion_numero?: string;
	correo?: string;
	telefono?: string;
	numero_cuenta?: string;
	imagen: File;
};

const adminApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		crearEspecialista: builder.mutation<
			{
				id_usuario: string;
				id_especialista: string;
				nombre: string;
				apellido: string;
				correo: string;
				telefono: string;
				id_especialidad: string;
			},
			CrearEspecialistaPayload
		>({
			query: (body) => ({
				url: "/medicos",
				method: "POST",
				body,
			}),
		}),
		crearModerador: builder.mutation<
			{
				id_usuario: string;
				nombre: string;
				apellido: string;
				correo: string;
				telefono: string;
			},
			CrearModeradorPayload
		>({
			query: (body) => ({
				url: "/moderadores",
				method: "POST",
				body,
			}),
			transformResponse: (response: { ok: boolean; data: any }) => {
				return response.data;
			},
			invalidatesTags: ["Usuarios"],
		}),
		listMetodosPago: builder.query<MetodoPago[], { activos?: boolean } | void>({
			query: (params) => {
				const queryParams = new URLSearchParams();
				if (params?.activos !== undefined) {
					queryParams.append("activos", String(params.activos));
				}
				const qs = queryParams.toString();
				return `/metodos-pago${qs ? `?${qs}` : ""}`;
			},
			transformResponse: (response: { ok: boolean; data: MetodoPago[] }) =>
				response.data,
			providesTags: ["MetodosPago"],
		}),
		crearMetodoPago: builder.mutation<
			MetodoPago,
			CrearMetodoPagoPayload
		>({
			query: (payload) => {
				const formData = new FormData();
				formData.append("nombre", payload.nombre);
				formData.append("banco_codigo", payload.banco_codigo);
				formData.append("banco_nombre", payload.banco_nombre);
				formData.append("tipo_pago", payload.tipo_pago);
				formData.append("moneda", payload.moneda);
				if (payload.titular_nombre) {
					formData.append("titular_nombre", payload.titular_nombre);
				}
				if (payload.titular_identificacion) {
					formData.append(
						"titular_identificacion",
						payload.titular_identificacion,
					);
					formData.append(
						"titularIdentificacion",
						payload.titular_identificacion,
					);
				}
				if (payload.titular_identificacion_tipo) {
					formData.append(
						"titular_identificacion_tipo",
						payload.titular_identificacion_tipo,
					);
					formData.append(
						"titularIdentificacionTipo",
						payload.titular_identificacion_tipo,
					);
				}
				if (payload.titular_identificacion_numero) {
					formData.append(
						"titular_identificacion_numero",
						payload.titular_identificacion_numero,
					);
					formData.append(
						"titularIdentificacionNumero",
						payload.titular_identificacion_numero,
					);
				}
				if (payload.correo) {
					formData.append("correo", payload.correo);
				}
				if (payload.telefono) {
					formData.append("telefono", payload.telefono);
				}
				if (payload.numero_cuenta) {
					formData.append("numero_cuenta", payload.numero_cuenta);
				}
				formData.append("imagen", payload.imagen);

				return {
					url: "/metodos-pago",
					method: "POST",
					body: formData,
				};
			},
			transformResponse: (response: { ok: boolean; data: MetodoPago }) =>
				response.data,
			invalidatesTags: ["MetodosPago"],
		}),
		updateMetodoPago: builder.mutation<
			MetodoPago,
			{ id: string; payload: Partial<CrearMetodoPagoPayload> }
		>({
			query: ({ id, payload }) => {
				const formData = new FormData();
				if (payload.nombre) formData.append("nombre", payload.nombre);
				if (payload.banco_codigo) formData.append("banco_codigo", payload.banco_codigo);
				if (payload.banco_nombre) formData.append("banco_nombre", payload.banco_nombre);
				if (payload.tipo_pago) formData.append("tipo_pago", payload.tipo_pago);
				if (payload.moneda) formData.append("moneda", payload.moneda);
				if (payload.titular_identificacion) {
					formData.append("titular_identificacion", payload.titular_identificacion);
					formData.append("titularIdentificacion", payload.titular_identificacion);
				}
				if (payload.titular_identificacion_tipo) {
					formData.append("titular_identificacion_tipo", payload.titular_identificacion_tipo);
					formData.append("titularIdentificacionTipo", payload.titular_identificacion_tipo);
				}
				if (payload.titular_identificacion_numero) {
					formData.append("titular_identificacion_numero", payload.titular_identificacion_numero);
					formData.append("titularIdentificacionNumero", payload.titular_identificacion_numero);
				}
				if (payload.correo) formData.append("correo", payload.correo);
				if (payload.telefono) formData.append("telefono", payload.telefono);
				if (payload.numero_cuenta) formData.append("numero_cuenta", payload.numero_cuenta);
				if (payload.imagen) formData.append("imagen", payload.imagen);

				return {
					url: `/metodos-pago/${id}`,
					method: "PUT",
					body: formData,
				};
			},
			transformResponse: (response: { ok: boolean; data: MetodoPago }) =>
				response.data,
			invalidatesTags: ["MetodosPago"],
		}),
		updateEstadoMetodoPago: builder.mutation<
			MetodoPago,
			{ id: string; activo: boolean }
		>({
			query: ({ id, activo }) => ({
				url: `/metodos-pago/${id}/estado`,
				method: "PATCH",
				body: { activo },
			}),
			transformResponse: (response: { ok: boolean; data: MetodoPago }) =>
				response.data,
			invalidatesTags: ["MetodosPago"],
		}),
		deleteMetodoPago: builder.mutation<void, string>({
			query: (id) => ({
				url: `/metodos-pago/${id}`,
				method: "DELETE",
			}),
			invalidatesTags: ["MetodosPago"],
		}),
	}),
	overrideExisting: false,
});

export const {
	useCrearEspecialistaMutation,
	useCrearModeradorMutation,
	useListMetodosPagoQuery,
	useCrearMetodoPagoMutation,
	useUpdateMetodoPagoMutation,
	useUpdateEstadoMetodoPagoMutation,
	useDeleteMetodoPagoMutation,
} = adminApi;
