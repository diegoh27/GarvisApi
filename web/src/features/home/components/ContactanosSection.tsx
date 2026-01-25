import { MapPin, Instagram, Facebook, Mail } from "lucide-react";

const ContactanosSection = () => {
	// Coordenadas exactas para el mapa de Google Maps
	const mapLat = "10.288436";
	const mapLng = "-67.627249";
	// URL de embed de Google Maps usando coordenadas
	const mapEmbedUrl = `https://www.google.com/maps?q=${mapLat},${mapLng}&output=embed&zoom=15`;

	return (
		<section
			id="contactanos"
			className="flex min-h-screen items-center justify-center bg-white px-6 py-12 md:py-16 lg:py-20"
		>
			<div className="mx-auto w-full max-w-7xl">
				<div className="grid gap-8 md:grid-cols-2 lg:gap-12">
					{/* Columna izquierda - Tarjeta de contacto */}
					<div className="mx-auto w-full max-w-md rounded-2xl bg-[#E0F2F1] p-8 shadow-lg md:mx-0 md:max-w-none">
						<h2 className="mb-4 text-3xl font-bold text-[#1C837F] md:text-4xl">
							CONTÁCTANOS
						</h2>
						<p className="mb-6 text-base text-[#4A5568] md:text-lg">
							Puedes escribirnos a través de nuestras redes sociales.
						</p>

						<div className="space-y-4">
							{/* Dirección */}
							<div className="flex items-center gap-4">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1C837F]">
									<MapPin className="h-5 w-5 text-white" />
								</div>
								<div className="flex-1">
									<p className="text-sm font-medium text-[#4A5568] md:text-base">
										Urbanización Caña de Azúcar, Sector 1, Casa Nro. 6, a 50 Mts. del Seguro Social,
										El limón
									</p>
								</div>
							</div>

							{/* WhatsApp */}
							<a
								href="https://wa.me/584124238603"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-4 transition-opacity hover:opacity-80"
							>
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1C837F]">
									<svg
										className="h-5 w-5 text-white"
										fill="currentColor"
										viewBox="0 0 24 24"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
									</svg>
								</div>
								<div className="flex-1">
									<p className="text-sm font-medium text-[#4A5568] md:text-base">
										+58 412-423-86-03
									</p>
								</div>
							</a>

							{/* Instagram */}
							<a
								href="https://instagram.com/unidadecografiagarbis"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-4 transition-opacity hover:opacity-80"
							>
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1C837F]">
									<Instagram className="h-5 w-5 text-white" />
								</div>
								<div className="flex-1">
									<p className="text-sm font-medium text-[#4A5568] md:text-base">
										@unidadecografiagarbis
									</p>
								</div>
							</a>

							{/* Facebook */}
							<a
								href="https://facebook.com/unidadecografiagarbis"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-4 transition-opacity hover:opacity-80"
							>
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1C837F]">
									<Facebook className="h-5 w-5 text-white" />
								</div>
								<div className="flex-1">
									<p className="text-sm font-medium text-[#4A5568] md:text-base">
										Unidad de Ecografía Garbis
									</p>
								</div>
							</a>

							{/* Correo electrónico */}
							<a
								href="mailto:unidadecografiagarbis1@gmail.com"
								className="flex items-center gap-4 transition-opacity hover:opacity-80"
							>
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1C837F]">
									<Mail className="h-5 w-5 text-white" />
								</div>
								<div className="flex-1">
									<p className="text-sm font-medium text-[#4A5568] md:text-base">
										unidadecografiagarbis1@gmail.com
									</p>
								</div>
							</a>
						</div>
					</div>

					{/* Columna derecha - Ubícanos y Horario */}
					<div className="mx-auto w-full max-w-md space-y-8 md:mx-0 md:max-w-none">
						{/* Ubícanos */}
						<div>
							<h3 className="mb-4 text-2xl font-bold text-[#1C837F] md:text-3xl">
								Ubícanos
							</h3>
							<p className="mb-2 text-base text-[#4A5568] md:text-lg">
								Urbanización Caña de Azúcar Sector 1, Casa Nro. 6
							</p>
							<p className="mb-6 text-sm text-[#4A5568] md:text-base">
								Punto de referencia: 50 Mts. del Seguro Social, El limón
							</p>

							{/* Mapa de Google - Rectangular */}
							<div className="mx-auto w-full overflow-hidden rounded-2xl shadow-lg">
								<iframe
									src={mapEmbedUrl}
									width="100%"
									height="400"
									style={{ border: 0 }}
									allowFullScreen
									loading="lazy"
									referrerPolicy="no-referrer-when-downgrade"
									className="w-full"
								/>
							</div>
						</div>

						{/* Horario */}
						<div>
							<h3 className="mb-4 text-2xl font-bold text-[#1C837F] md:text-3xl">Horario</h3>
							<p className="text-base text-[#4A5568] md:text-lg">
								Trabajamos de Lunes a viernes
							</p>
							<p className="text-base font-semibold text-[#1C837F] md:text-lg">
								De 8:00 a 11:00 am
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default ContactanosSection;
