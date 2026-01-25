import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

type PasswordFieldProps = {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
};

const PasswordField = ({
	value,
	onChange,
	placeholder,
	className,
}: PasswordFieldProps) => {
	const [show, setShow] = useState(false);

	return (
		<div className="relative">
			<input
				type={show ? "text" : "password"}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				className={className}
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
	);
};

export default PasswordField;
