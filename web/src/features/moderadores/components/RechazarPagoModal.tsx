import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";

type RechazarPagoModalProps = {
  onClose: () => void;
  onConfirm: (motivo: string) => void;
  isLoading?: boolean;
  nombrePaciente?: string;
};

const RechazarPagoModal = ({
  onClose,
  onConfirm,
  isLoading = false,
  nombrePaciente,
}: RechazarPagoModalProps) => {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const motivoTrimmed = motivo.trim();
    if (!motivoTrimmed) {
      setError("Debe ingresar un motivo para el rechazo");
      return;
    }

    if (motivoTrimmed.length < 10) {
      setError("El motivo debe tener al menos 10 caracteres");
      return;
    }

    if (motivoTrimmed.length > 255) {
      setError("El motivo no puede exceder 255 caracteres");
      return;
    }

    setError("");
    onConfirm(motivoTrimmed);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
            <h2 className="text-xl font-semibold text-gray-800">
              Rechazar Pago
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {nombrePaciente && (
              <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
                <p className="text-base text-yellow-800">
                  Está por rechazar el pago de{" "}
                  <span className="font-semibold">{nombrePaciente}</span>.
                  El paciente recibirá una notificación con el motivo del rechazo.
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="motivo"
                className="block text-base font-medium text-gray-700 mb-2"
              >
                Motivo del rechazo <span className="text-red-500">*</span>
              </label>
              <textarea
                id="motivo"
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value);
                  setError("");
                }}
                disabled={isLoading}
                placeholder="Ej: El comprobante de pago no es legible, la referencia no coincide, etc."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100 disabled:cursor-not-allowed"
                rows={5}
                maxLength={255}
              />
              <div className="flex items-center justify-between mt-1">
                {error && (
                  <p className="text-base text-red-600">{error}</p>
                )}
                <p className="text-sm text-gray-500 ml-auto">
                  {motivo.length}/255 caracteres
                </p>
              </div>
            </div>

            <div className="rounded-md bg-gray-50 border border-gray-200 p-3">
              <p className="text-sm text-gray-600">
                <strong>Nota:</strong> El paciente podrá corregir y volver a enviar
                el comprobante de pago desde su panel de citas.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !motivo.trim()}
              className="rounded-lg bg-red-600 px-4 py-2 text-base font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Rechazando..." : "Rechazar Pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RechazarPagoModal;
