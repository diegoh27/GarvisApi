import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

type PasswordFieldProps = {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
	label?: string;
	required?: boolean;
};

const PasswordField = ({
	value,
	onChange,
	placeholder,
	className,
	label,
	required,
}: PasswordFieldProps) => {
	const [show, setShow] = useState(false);

	return (
		<div>
			{label && (
				<label className="mb-1 block text-base font-medium text-brand-700">
					{label} {required && <span className="text-red-500">*</span>}
				</label>
			)}
			<div className="relative">
				<input
					type={show ? "text" : "password"}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					placeholder={placeholder}
					required={required}
					className={className || "h-11 w-full rounded-lg border border-brand-300 bg-paper px-3 text-base outline-none focus:border-brand-500"}
				/>
				<button
					type="button"
					onClick={() => setShow((prev) => !prev)}
					className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-800"
					aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
				>
					{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
				</button>
			</div>
		</div>
	);
};

export default PasswordField;
