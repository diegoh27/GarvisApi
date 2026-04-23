type ContactoPaciente = {
	name: string;
	telefono?: string | null;
	cedula?: string | null;
	correo?: string | null;
	tipo_sangre?: string | null;
	contacto_nombre?: string | null;
	contacto_telefono?: string | null;
};

type ContactoModalProps = {
	contactoPaciente: ContactoPaciente;
	onClose: () => void;
};

const ContactoModal = ({ contactoPaciente, onClose }: ContactoModalProps) => (
	<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8">
		<div className="w-full max-w-lg overflow-hidden rounded-2xl bg-paper shadow-xl">
			<div className="flex items-center justify-between border-b border-mist px-6 py-4">
				<div>
					<h3 className="text-base font-semibold text-brand-900">
						Contacto de {contactoPaciente.name}
					</h3>
					<p className="text-sm text-brand-800">
						Información clínica y de emergencia.
					</p>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="rounded-full border border-mist px-3 py-1 text-sm text-brand-800"
				>
					Cerrar
				</button>
			</div>
			<div className="space-y-3 p-6 text-sm text-brand-800">
				<div className="rounded-xl bg-cloud p-3">
					<p className="font-semibold text-brand-900">Teléfono</p>
					<p>{contactoPaciente.telefono || "No disponible"}</p>
				</div>
				<div className="rounded-xl bg-cloud p-3">
					<p className="font-semibold text-brand-900">Cédula</p>
					<p>{contactoPaciente.cedula || "No disponible"}</p>
				</div>
				<div className="rounded-xl bg-cloud p-3">
					<p className="font-semibold text-brand-900">Correo</p>
					<p>{contactoPaciente.correo || "No disponible"}</p>
				</div>
				<div className="rounded-xl bg-cloud p-3">
					<p className="font-semibold text-brand-900">Tipo de sangre</p>
					<p>{contactoPaciente.tipo_sangre || "No disponible"}</p>
				</div>
				<div className="rounded-xl bg-cloud p-3">
					<p className="font-semibold text-brand-900">Contacto de emergencia</p>
					<p>{contactoPaciente.contacto_nombre || "No disponible"}</p>
					<p>{contactoPaciente.contacto_telefono || ""}</p>
				</div>
			</div>
		</div>
	</div>
);

export type { ContactoPaciente };
export default ContactoModal;
