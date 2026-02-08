import { baseApi } from "../../app/api/baseApi";

type UpdatePagoPayload = {
	id_cita: string;
	metodo?: string;
	imagen?: string;
	banco_origen?: string;
	banco_destino?: string;
	monto?: string;
	cedula_pagador?: string;
	telefono_pagador?: string;
	referencia?: string;
};

const pagosApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		updatePago: builder.mutation<
			{ id_cita: string; estado_pago: number },
			UpdatePagoPayload
		>({
			query: ({ id_cita, ...body }) => ({
				url: `/pagos/cita/${id_cita}`,
				method: "PATCH",
				body,
			}),
			invalidatesTags: ["Citas"],
		}),
	}),
	overrideExisting: false,
});

export const { useUpdatePagoMutation } = pagosApi;
export { pagosApi };
