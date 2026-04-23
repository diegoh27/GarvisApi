import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useResendVerificationMutation } from "../../features/auth";
import { useGetPacienteSelfQuery } from "../../features/usuarios/usuariosApi";

const EmailVerificationBanner = () => {
  const { user } = useAuth();
  const isPaciente = user?.rol === "paciente";
  const { data: pacienteSelf } = useGetPacienteSelfQuery(undefined, {
    skip: !isPaciente,
  });
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendVerification, { isLoading: isResending }] =
    useResendVerificationMutation();

  const isEmailVerified = !isPaciente
    ? true
    : Number(pacienteSelf?.email_verificado) === 1;

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!user?.correo || resendCooldown > 0 || isResending) return;
    try {
      await resendVerification({ correo: user.correo }).unwrap();
      setResendCooldown(60);
    } catch (err) {
      setResendCooldown(60);
    }
  };

  if (!isPaciente || isEmailVerified) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-base text-yellow-900">
      <span>Debe verificar su correo para poder reservar una cita y desbloquear todas las funcionalidades.</span>
      <button
        type="button"
        onClick={handleResend}
        disabled={isResending || resendCooldown > 0}
        className="rounded-lg border border-yellow-400 bg-yellow-200 px-3 py-1.5 text-sm font-semibold text-yellow-900 transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {resendCooldown > 0
          ? `Reenviar (${resendCooldown}s)`
          : "Reenviar correo"}
      </button>
    </div>
  );
};

export default EmailVerificationBanner;
