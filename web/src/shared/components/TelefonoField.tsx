import type { TelefonoPrefix } from "../utils/telefonoDisplay";
import {
	TELEFONO_PREFIXES,
	parseTelefonoDisplay,
	validarNumeroTelefono,
	MENSAJE_TELEFONO_REQUERIDO,
	MENSAJE_TELEFONO_7_DIGITOS,
} from "../utils/telefonoDisplay";

export type TelefonoFieldProps = {
	/** Valor completo: "04121234567" o solo "1234567" */
	value: string;
	/** Cambio: (prefijo, numero) - numero son 7 dígitos */
	onChange: (prefijo: TelefonoPrefix, numero: string) => void;
	label?: React.ReactNode;
	error?: string;
	placeholder?: string;
	required?: boolean;
	disabled?: boolean;
	onBlur?: () => void;
	inputClassName?: string;
	selectClassName?: string;
};

const NUMERO_LENGTH = 7;

export function TelefonoField({
	value,
	onChange,
	label,
	error,
	placeholder = "1234567",
	required,
	disabled,
	onBlur,
	inputClassName = "",
	selectClassName = "",
}: TelefonoFieldProps) {
	const { prefix, number } = parseTelefonoDisplay(value);

	const handlePrefixChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const p = e.target.value as TelefonoPrefix;
		if (TELEFONO_PREFIXES.includes(p)) onChange(p, number);
	};

	const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const v = e.target.value.replace(/\D/g, "").slice(0, NUMERO_LENGTH);
		onChange(prefix, v);
	};

	const baseInput =
		"rounded-lg border px-3 py-2 text-base outline-none focus:border-brand-500";
	const errorInput = error ? "border-red-500" : "border-brand-300 bg-paper";

	return (
		<div className="min-w-0">
			{label != null && (
				<label className="mb-1 block text-base font-medium text-brand-700">
					{label}
				</label>
			)}
			<div className="flex min-w-0 gap-2">
				<select
					value={prefix}
					onChange={handlePrefixChange}
					onBlur={onBlur}
					disabled={disabled}
					className={`w-20 shrink-0 sm:w-24 ${baseInput} ${errorInput} ${selectClassName}`.trim()}
					aria-label="Prefijo telefónico"
				>
					{TELEFONO_PREFIXES.map((p) => (
						<option key={p} value={p}>
							{p}
						</option>
					))}
				</select>
				<input
					type="tel"
					inputMode="numeric"
					value={number}
					onChange={handleNumberChange}
					onBlur={onBlur}
					placeholder={placeholder}
					required={required}
					disabled={disabled}
					maxLength={NUMERO_LENGTH}
					className={`min-w-0 flex-1 ${baseInput} ${errorInput} ${inputClassName}`.trim()}
					aria-label="Número de teléfono (7 dígitos)"
				/>
			</div>
			{error && <p className="mt-1 text-sm text-red-500">{error}</p>}
		</div>
	);
}

export {
	validarNumeroTelefono,
	MENSAJE_TELEFONO_REQUERIDO,
	MENSAJE_TELEFONO_7_DIGITOS,
};
