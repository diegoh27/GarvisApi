type QuickActionsModeradorProps = {
	citasPendientesPago: number;
	disponibilidadPendiente: number;
	citasSinResultado: number;
	showAdminLink?: boolean;
};

const QuickActionsModerador = ({
	citasPendientesPago,
	disponibilidadPendiente,
	citasSinResultado,
	showAdminLink = false,
}: QuickActionsModeradorProps) => (
	<div className="rounded-lg border border-brand-200 bg-paper p-4">
		<h2 className="mb-3 text-lg font-semibold text-brand-900">
			Acciones rápidas
		</h2>
		<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<a
				href="/pagos"
				className="rounded-lg border border-brand-300 bg-paper p-3 text-center transition-colors hover:bg-brand-50"
			>
				<div className="text-2xl font-bold text-brand-700">
					{citasPendientesPago}
				</div>
				<div className="text-sm text-brand-600">Verificar pagos</div>
			</a>
			<a
				href="/disponibilidad/pendientes"
				className="rounded-lg border border-brand-300 bg-paper p-3 text-center transition-colors hover:bg-brand-50"
			>
				<div className="text-2xl font-bold text-brand-700">
					{disponibilidadPendiente}
				</div>
				<div className="text-sm text-brand-600">
					Aprobar disponibilidades
				</div>
			</a>
			<a
				href="/resultados"
				className="rounded-lg border border-brand-300 bg-paper p-3 text-center transition-colors hover:bg-brand-50"
			>
				<div className="text-2xl font-bold text-brand-700">
					{citasSinResultado}
				</div>
				<div className="text-sm text-brand-600">Subir resultados</div>
			</a>
			<a
				href="/inventario"
				className="rounded-lg border border-brand-300 bg-paper p-3 text-center transition-colors hover:bg-brand-50"
			>
				<div className="text-2xl font-bold text-brand-700">📦</div>
				<div className="text-sm text-brand-600">Visualizar inventario</div>
			</a>
			{showAdminLink && (
				<a
					href="/admin/registrar-especialista"
					className="rounded-lg border border-brand-300 bg-paper p-3 text-center transition-colors hover:bg-brand-50"
				>
					<div className="text-2xl font-bold text-brand-700">+</div>
					<div className="text-sm text-brand-600">
						Registrar especialista
					</div>
				</a>
			)}
		</div>
	</div>
);

export default QuickActionsModerador;
