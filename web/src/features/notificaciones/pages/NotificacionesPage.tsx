import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { baseApi } from "../../../app/api/baseApi";
import { EmailVerificationBanner, PageShell, formatFechaHoraLocal } from "../../../shared";
import { Bell, CheckCircle, FileCheck, FileText, MailOpen } from "lucide-react";
import {
  type Notificacion,
  useGetMisNotificacionesQuery,
  useMarkNotificacionLeidaMutation,
  useMarkTodasNotificacionesLeidasMutation,
} from "../notificacionesApi";

const formatFecha = (value: string) => formatFechaHoraLocal(value);

export const getNotificacionMeta = (
  n: Notificacion
): { icon: React.ReactNode; link?: { to: string; label: string } } => {
  const tipo = n.tipo || "";
  const tituloLc = n.titulo?.toLowerCase() || "";

  if (tipo === "resultados_disponibles" || tituloLc.includes("resultado")) {
    return {
      icon: <FileText className="h-4 w-4 shrink-0 text-sky-600" />,
      link: { to: "/citas?resultados=con_resultados", label: "Ver resultados en mis citas" },
    };
  }
  if (tipo === "informe_disponible" || tituloLc.includes("informe")) {
    return {
      icon: <FileCheck className="h-4 w-4 shrink-0 text-violet-600" />,
      link: { to: "/citas?resultados=con_resultados", label: "Ver informe en mis citas" },
    };
  }
  if (tipo === "pago_aprobado" || tituloLc.includes("pago aprobado")) {
    return {
      icon: <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />,
      link: { to: "/citas?pago=aprobado", label: "Ver cita en mis citas" },
    };
  }
  if (tipo === "cita_reservada" || tituloLc.includes("cita reservada")) {
    return {
      icon: <CheckCircle className="h-4 w-4 shrink-0 text-brand-600" />,
      link: { to: "/citas", label: "Ir a mis citas" },
    };
  }
  if (tipo === "pago_reenviado") {
    return {
      icon: <FileText className="h-4 w-4 shrink-0 text-amber-600" />,
      link: { to: "/pagos", label: "Revisar pagos" },
    };
  }
  
  return {
    icon: n.leida ? (
      <MailOpen className="h-4 w-4 shrink-0 text-brand-700" />
    ) : (
      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
    ),
  };
};

const NotificacionesPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
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
  const [markLeida] = useMarkNotificacionLeidaMutation();
  const [markTodas, { isLoading: markingTodas }] = useMarkTodasNotificacionesLeidasMutation();

  const unreadCount = notificaciones.filter(n => !n.leida).length;

  const handleNotificationClick = (n: Notificacion, meta: ReturnType<typeof getNotificacionMeta>) => {
    if (!n.leida) {
      markLeida({ id: n.id_notificacion });
    }
    if (meta.link?.to === "/citas") {
      dispatch(baseApi.util.invalidateTags(["Citas"]));
    }
    if (meta.link?.to) {
      navigate(meta.link.to);
    }
  };

  return (
    <PageShell
      title="Notificaciones"
      description="Alertas y mensajes recientes del sistema."
    >
      <div className="space-y-4">
        <EmailVerificationBanner />
        
        <div className="flex justify-end">
           <button
             type="button"
             onClick={() => markTodas()}
             disabled={markingTodas || unreadCount === 0}
             className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {markingTodas ? "Marcando..." : "Marcar todas como leídas"}
           </button>
        </div>

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
              const isClickable = !!meta.link;
              
              return (
                <div
                  key={n.id_notificacion}
                  onClick={isClickable ? () => handleNotificationClick(n, meta) : undefined}
                  className={`rounded-xl border p-4 transition-colors ${
                    isClickable ? "cursor-pointer hover:border-brand-300" : ""
                  } ${n.leida
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
                    </div>
                    {/* The separate link below is removed as per requested to make the entire zone clickable like Facebook */}
                    {n.leida ? null : (
                      <div className="shrink-0 rounded-lg border border-brand-200 bg-white px-2 py-1 text-[10px] sm:text-xs font-semibold text-brand-700 shadow-sm">
                        Nueva
                      </div>
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
