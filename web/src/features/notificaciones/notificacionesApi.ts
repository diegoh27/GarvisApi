import { baseApi } from "../../app/api/baseApi";

type Notificacion = {
	id_notificacion: string;
	titulo: string;
	mensaje: string;
	tipo: string;
	leida: number;
	fecha_creacion: string;
};

type GetMisNotificacionesParams = {
	solo_no_leidas?: boolean;
	limit?: number;
};

const notificacionesApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getMisNotificaciones: builder.query<Notificacion[], GetMisNotificacionesParams | void>({
			query: (params) => ({
				url: "/notificaciones/mis",
				method: "GET",
				params,
			}),
			transformResponse: (response: { ok: boolean; data: Notificacion[] }) => response.data,
			providesTags: ["Notificaciones"],
		}),
		markNotificacionLeida: builder.mutation<
			{ ok: boolean; message: string },
			{ id: string }
		>({
			query: ({ id }) => ({
				url: `/notificaciones/${id}/leer`,
				method: "PATCH",
			}),
			invalidatesTags: ["Notificaciones"],
		}),
	}),
	overrideExisting: false,
});

export const { useGetMisNotificacionesQuery, useMarkNotificacionLeidaMutation } = notificacionesApi;
export type { Notificacion };
export { notificacionesApi };
