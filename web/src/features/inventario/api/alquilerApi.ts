import { baseApi } from "../../../app/api/baseApi";

export type AlquilerContrato = {
  id_contrato: string;
  nombre: string;
  descripcion?: string | null;
  periodo: "Mensual" | "Anual" | "Unico";
  monto: number;
  estado: "Pendiente" | "Pagado" | "Vencido";
  fecha_vencimiento: string;
  creado_en: string;
  actualizado_en: string | null;
};

export type AlquilerPago = {
  id_pago: string;
  id_contrato: string;
  nombre_contrato?: string;
  fecha_pago: string;
  fecha_proximo_pago?: string | null;
  monto: number;
  metodo: "Efectivo" | "Transferencia" | "PagoMovil" | "Zelle" | "Otro";
  referencia?: string | null;
  creado_en: string;
};

export type CreateContratoPayload = {
  nombre: string;
  descripcion?: string;
  periodo?: "Mensual" | "Anual" | "Unico";
  monto: number;
  fecha_vencimiento: string;
  estado?: "Pendiente" | "Pagado" | "Vencido";
};

export type UpdateContratoPayload = {
  nombre?: string;
  descripcion?: string | null;
  periodo?: "Mensual" | "Anual" | "Unico";
  monto?: number;
  fecha_vencimiento?: string;
  estado?: "Pendiente" | "Pagado" | "Vencido";
};

export type RegistrarPagoAlquilerPayload = {
  fecha_pago: string;
  fecha_proximo_pago: string;
  monto: number;
  metodo?: "Efectivo" | "Transferencia" | "PagoMovil" | "Zelle" | "Otro";
  referencia?: string;
};

export type UpdatePagoAlquilerPayload = {
  fecha_pago?: string;
  fecha_proximo_pago?: string;
  monto?: number;
  metodo?: "Efectivo" | "Transferencia" | "PagoMovil" | "Zelle" | "Otro";
  referencia?: string;
};

export const alquilerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Contratos
    getContratos: builder.query<AlquilerContrato[], void>({
      query: () => "/alquiler/contratos",
      providesTags: ["AlquilerContrato"],
    }),

    getContrato: builder.query<AlquilerContrato, string>({
      query: (idContrato) => `/alquiler/contratos/${idContrato}`,
      providesTags: (_, __, arg) => [
        "AlquilerContrato",
        { type: "AlquilerContrato", id: arg },
      ],
    }),

    createContrato: builder.mutation<AlquilerContrato, CreateContratoPayload>({
      query: (payload) => ({
        url: "/alquiler/contratos",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["AlquilerContrato"],
    }),

    updateContrato: builder.mutation<
      AlquilerContrato,
      { id: string; payload: UpdateContratoPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/alquiler/contratos/${id}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (_, __, arg) => [
        "AlquilerContrato",
        { type: "AlquilerContrato", id: arg.id },
      ],
    }),

    deleteContrato: builder.mutation<{ message: string }, string>({
      query: (idContrato) => ({
        url: `/alquiler/contratos/${idContrato}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AlquilerContrato"],
    }),

    // Pagos
    getHistorialPagosAlquiler: builder.query<AlquilerPago[], void>({
      query: () => "/alquiler/pagos/historial",
      providesTags: ["AlquilerPago"],
    }),

    getPagosContrato: builder.query<AlquilerPago[], string>({
      query: (idContrato) => `/alquiler/contratos/${idContrato}/pagos`,
      providesTags: (_, __, arg) => [
        "AlquilerPago",
        { type: "AlquilerPago", id: arg },
      ],
    }),

    registrarPagoAlquiler: builder.mutation<
      AlquilerPago,
      { idContrato: string; payload: RegistrarPagoAlquilerPayload }
    >({
      query: ({ idContrato, payload }) => ({
        url: `/alquiler/contratos/${idContrato}/pagos`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["AlquilerPago", "AlquilerContrato"],
    }),

    updatePagoAlquiler: builder.mutation<
      AlquilerPago,
      { idPago: string; payload: UpdatePagoAlquilerPayload }
    >({
      query: ({ idPago, payload }) => ({
        url: `/alquiler/pagos/${idPago}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: ["AlquilerPago", "AlquilerContrato"],
    }),

    deletePagoAlquiler: builder.mutation<{ message: string }, string>({
      query: (idPago) => ({
        url: `/alquiler/pagos/${idPago}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AlquilerPago", "AlquilerContrato"],
    }),
  }),
});

export const {
  useGetContratosQuery,
  useGetContratoQuery,
  useCreateContratoMutation,
  useUpdateContratoMutation,
  useDeleteContratoMutation,
  useGetHistorialPagosAlquilerQuery,
  useGetPagosContratoQuery,
  useRegistrarPagoAlquilerMutation,
  useUpdatePagoAlquilerMutation,
  useDeletePagoAlquilerMutation,
} = alquilerApi;
