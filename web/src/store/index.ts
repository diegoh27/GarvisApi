import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import { baseApi } from "../app/api/baseApi";
// Asegura que los endpoints inyectados (inventario, etc.) estén registrados al iniciar
import "../features/inventario/api/productosApi.ts";
import "../features/inventario/api/entesLegalesApi.ts";
import "../features/inventario/api/nominaApi.ts";
import "../features/inventario/api/alquilerApi.ts";

const store = configureStore({
	reducer: {
		auth: authReducer,
		[baseApi.reducerPath]: baseApi.reducer,
	},
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware().concat(baseApi.middleware),
});

type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;

export type { RootState, AppDispatch };
export { store };
