import { PageShell } from "../../../shared";
import { Bell, CheckCircle, MailOpen } from "lucide-react";
import {
  useGetMisNotificacionesQuery,
  useMarkNotificacionLeidaMutation,
} from "../notificacionesApi";

const formatFecha = (value: string) => {
  if (!value) return "";
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

const NotificacionesPage = () => {
  const {
    data: notificaciones = [],
    isLoading,
    error,
  } = useGetMisNotificacionesQuery({
    limit: 100,
  });
  const [markLeida, { isLoading: marking }] = useMarkNotificacionLeidaMutation();

  return (
    <PageShell
      title="Notificaciones"
      description="Alertas y mensajes recientes del sistema."
    >
      <div className="rounded-2xl bg-paper p-5 shadow-sm">
        {error ? (
          <div className="flex items-center gap-2 text-sm text-red-700">
            <Bell className="h-4 w-4" />
            No se pudieron cargar las notificaciones.
          </div>
        ) : isLoading ? (
          <p className="text-sm text-brand-800">Cargando notificaciones...</p>
        ) : notificaciones.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-brand-800">
            <Bell className="h-4 w-4" />
            Sin notificaciones por ahora.
          </div>
        ) : (
          <div className="space-y-3">
            {notificaciones.map((n) => (
              <div
                key={n.id_notificacion}
                className={`rounded-xl border p-4 ${n.leida
                  ? "border-mist bg-cloud"
                  : "border-brand-200 bg-brand-50/60"
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {n.leida ? (
                        <MailOpen className="h-4 w-4 text-brand-700" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                      )}
                      <p className="text-sm font-semibold text-brand-900">
                        {n.titulo}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-brand-800">
                      {n.mensaje}
                    </p>
                    <p className="mt-2 text-xs text-brand-600">
                      {formatFecha(n.fecha_creacion)}
                    </p>
                  </div>
                  {n.leida ? null : (
                    <button
                      type="button"
                      onClick={() => markLeida({ id: n.id_notificacion })}
                      disabled={marking}
                      className="rounded-lg border border-brand-600 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Marcar como leida
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default NotificacionesPage;
