/**
 * Registro central de todos los endpoints inyectados en baseApi.
 * Importar este archivo una sola vez (p. ej. desde store) para que
 * injectEndpoints de cada feature se ejecute y los endpoints queden disponibles.
 *
 * Ventajas:
 * - Un solo lugar donde ver qué APIs existen (no olvidar imports).
 * - El store solo importa "../app/api" en lugar de N archivos por feature.
 */

// Auth y usuarios (baseApi se carga cuando el primer feature lo importa)
import "../../features/auth/authApi";
import "../../features/usuarios/usuariosApi";
import "../../features/admin/adminApi";
import "../../features/representados/representadosApi";
import "../../features/moderadores/moderadoresApi";
import "../../features/roles/rolesApi";

// Citas, disponibilidad, resultados, informes
import "../../features/citas/citasApi";
import "../../features/disponibilidad/disponibilidadApi";
import "../../features/resultados/resultadosApi";
import "../../features/especialista/informesApi";
import "../../features/especialista/especialistaApi";

// Inventario
import "../../features/inventario/api/productosApi";
import "../../features/inventario/api/entesLegalesApi";
import "../../features/inventario/api/nominaApi";
import "../../features/inventario/api/alquilerApi";
import "../../features/inventario/api/especialistasApi";
import "../../features/inventario/api/comisionesApi";
import "../../features/inventario/api/facturacionApi";
import "../../features/inventario/api/inventarioAuditoriaApi";

// Catálogos y soporte
import "../../features/ecos/ecosApi";
import "../../features/especialidades/especialidadesApi";
import "../../features/especialistas/especialistasApi";
import "../../features/dolar/dolarApi";
import "../../features/notificaciones/notificacionesApi";
import "../../features/pagos/pagosApi";

// Configuración
import "../../features/configuracion/configuracionApi";

// Dashboard y páginas base
import "../../features/dashboard/dashboardApi";
import "../../features/home/homeApi";
import "../../features/notfound/notfoundApi";

export { baseApi } from "./baseApi";
