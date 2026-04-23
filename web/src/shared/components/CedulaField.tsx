import type { TipoCedula } from "../utils/cedulaDisplay";
import { CEDULA_TIPOS, parseCedulaDisplay } from "../utils/cedulaDisplay";

export type CedulaFieldProps = {
  /** Valor: solo número o "V12345678" */
  value: string;
  /** Cambio: (tipo, numero) - el numero es solo dígitos */
  onChange: (tipo: TipoCedula, numero: string) => void;
  label?: React.ReactNode;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  onBlur?: () => void;
  /** Clase del contenedor del flex (select + input) */
  inputClassName?: string;
  selectClassName?: string;
  /** Máximo de dígitos en el número (por defecto 8) */
  maxLength?: number;
};

export function CedulaField({
  value,
  onChange,
  label,
  error,
  placeholder = "Número de cédula",
  required,
  disabled,
  onBlur,
  inputClassName = "",
  selectClassName = "",
  maxLength = 8,
}: CedulaFieldProps) {
  const { tipo, numero } = parseCedulaDisplay(value);

  const handleTipoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const t = e.target.value as TipoCedula;
    if (CEDULA_TIPOS.includes(t)) onChange(t, numero);
  };

  const handleNumeroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, maxLength);
    onChange(tipo, v);
  };

  const baseInput =
    "rounded-lg border px-3 py-2 text-base outline-none focus:border-brand-500";
  const errorInput = error ? "border-red-500" : "border-brand-300 bg-paper";

  return (
    <div>
      {label != null && (
        <label className="mb-1 block text-base font-medium text-brand-700">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <select
          value={tipo}
          onChange={handleTipoChange}
          onBlur={onBlur}
          disabled={disabled}
          className={`w-20 ${baseInput} ${errorInput} ${selectClassName}`.trim()}
          aria-label="Tipo de cédula"
        >
          {CEDULA_TIPOS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          type="text"
          inputMode="numeric"
          value={numero}
          onChange={handleNumeroChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          className={`flex-1 ${baseInput} ${errorInput} ${inputClassName}`.trim()}
          aria-label="Número de cédula"
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
