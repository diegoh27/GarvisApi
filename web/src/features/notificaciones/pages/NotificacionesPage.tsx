import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { baseApi } from "../../../app/api/baseApi";
import { EmailVerificationBanner, PageShell, formatFechaHoraLocal } from "../../../shared";
import { Bell, CheckCircle, FileCheck, FileText, MailOpen } from "lucide-react";
import {
  type Notificacion,
  useGetMisNotificacionesQuery,
  useMarkNotificacionLeidaMutation,
} from "../notificacionesApi";

const formatFecha = (value: string) => formatFechaHoraLocal(value);

const getNotificacionMeta = (
  n: Notificacion
): { icon: React.ReactNode; link?: { to: string; label: string } } => {
  switch (n.tipo) {
    case "resultados_disponibles":
      return {
        icon: <FileText className="h-4 w-4 shrink-0 text-sky-600" />,
        link: { to: "/citas", label: "Ir a mis citas" },
      };
    case "informe_disponible":
      return {
        icon: <FileCheck className="h-4 w-4 shrink-0 text-violet-600" />,
        link: { to: "/citas", label: "Ir a mis citas" },
      };
    case "pago_reenviado":
      return {
        icon: <FileText className="h-4 w-4 shrink-0 text-amber-600" />,
        link: { to: "/pagos", label: "Revisar pagos" },
      };
    default:
      return {
        icon: n.leida ? (
          <MailOpen className="h-4 w-4 shrink-0 text-brand-700" />
        ) : (
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
        ),
      };
  }
};

const NotificacionesPage = () => {
  const dispatch = useDispatch();
  const {
    data: notificaciones = [],
    isLoading,
    error,
  } = useGetMisNotificacionesQuery(
    { limit: 100 },
    {
      pollingInterval: 15000,
      refetchOnFocus: true,
    },
  );
  const [markLeida, { isLoading: marking }] = useMarkNotificacionLeidaMutation();

  return (
    <PageShell
      title="Notificaciones"
      description="Alertas y mensajes recientes del sistema."
    >
      <div className="space-y-4">
        <EmailVerificationBanner />
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
            {notificaciones.map((n) => {
              const meta = getNotificacionMeta(n);
              return (
                <div
                  key={n.id_notificacion}
                  className={`rounded-xl border p-4 ${n.leida
                    ? "border-mist bg-cloud"
                    : "border-brand-200 bg-brand-50/60"
                    }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {meta.icon}
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
                      {meta.link && (
                        <Link
                          to={meta.link.to}
                          onClick={() => {
                            if (meta.link?.to === "/citas") {
                              dispatch(baseApi.util.invalidateTags(["Citas"]));
                            }
                          }}
                          className="mt-2 inline-block text-xs font-medium text-brand-700 underline hover:text-brand-800"
                        >
                          {meta.link.label} →
                        </Link>
                      )}
                    </div>
                    {n.leida ? null : (
                      <button
                        type="button"
                        onClick={() => markLeida({ id: n.id_notificacion })}
                        disabled={marking}
                        className="shrink-0 rounded-lg border border-brand-600 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Marcar como leida
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </PageShell>
  );
};

export default NotificacionesPage;
