import { useState, useMemo, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { PageShell, CedulaField, parseCedulaDisplay, TelefonoField, calculateRIF, formatFechaLocal } from "../../../shared";
import {
	useListUsersQuery,
	useUpdateUserMutation,
	useUpdateEspecialistaMutation,
	useUpdatePacienteMutation,
	useGetEspecialistaByIdQuery,
	useGetPacienteByIdQuery,
	useSetUserActiveMutation,
	type Usuario,
} from "../usuariosApi";
import { useGetEcosQuery, useGetEcosByEspecialistaQuery } from "../../ecos/ecosApi";
import { useGetEspecialidadesQuery } from "../../especialidades/especialidadesApi";
import { Edit, X, Check, ChevronDown, Search } from "lucide-react";

const formatFecha = (value: string | null) => (value ? formatFechaLocal(value) : "N/A");

const ROLE_TABS = [
	{ label: "Administradores", value: "admin" },
	{ label: "Especialistas", value: "especialista" },
	{ label: "Moderadores", value: "moderador" },
	{ label: "Pacientes", value: "paciente" },
] as const;

const AVATAR_RING = [
	"bg-brand-100 text-brand-900",
	"bg-mint/60 text-brand-900",
	"bg-ice/70 text-brand-800",
	"bg-cloud text-brand-800",
];

function userInitials(nombre: string, apellido: string) {
	const a = nombre?.trim().charAt(0) ?? "";
	const b = apellido?.trim().charAt(0) ?? "";
	return `${a}${b}`.toUpperCase() || "?";
}

function getRolColor(rol: string) {
	switch (rol.toLowerCase()) {
		case "admin":
		case "administrador": return "text-rose-500";
		case "especialista": return "text-violet-500";
		case "moderador": return "text-amber-500";
		case "paciente": return "text-slate-500";
		default: return "text-brand-500";
	}
}

const UsuariosPage = () => {
	const [filtroRol, setFiltroRol] = useState<string>("todos");
	const [filtroEstado, setFiltroEstado] = useState<string>("1");
	const [query, setQuery] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const itemsPerPage = 10;

	const { data: usuariosData, isLoading, refetch } = useListUsersQuery({
		rol: filtroRol !== "todos" ? filtroRol : undefined,
		activo: filtroEstado !== "todos" ? Number(filtroEstado) : undefined,
		q: query.trim() || undefined,
	});

	const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
	const [updateEspecialista, { isLoading: isUpdatingEspecialista }] = useUpdateEspecialistaMutation();
	const [updatePaciente, { isLoading: isUpdatingPaciente }] = useUpdatePacienteMutation();
	const [setUserActive, { isLoading: isToggling }] = useSetUserActiveMutation();

	// Asegurar que usuarios sea siempre un array
	const usuarios = Array.isArray(usuariosData) ? usuariosData : [];

	// Los filtros ya se aplican en el backend, así que usamos directamente usuarios
	const filteredUsuarios = usuarios;

	// Paginación
	const totalPages = Math.max(1, Math.ceil(filteredUsuarios.length / itemsPerPage));
	const paginatedUsuarios = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return filteredUsuarios.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredUsuarios, currentPage, itemsPerPage]);

	// Resetear página cuando cambian los filtros
	useEffect(() => {
		setCurrentPage(1);
	}, [filtroRol, filtroEstado, query]);

	const handleToggleActive = async (usuario: Usuario) => {
		const newEstado = usuario.activo === 1 ? 0 : 1;
		const accion = newEstado === 1 ? "activar" : "desactivar";

		const result = await Swal.fire({
			title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} usuario?`,
			text: `¿Estás seguro de que deseas ${accion} a ${usuario.nombre} ${usuario.apellido}?`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#3085d6",
			cancelButtonColor: "#d33",
			confirmButtonText: `Sí, ${accion}`,
			cancelButtonText: "Cancelar",
		});

		if (result.isConfirmed) {
			try {
				await setUserActive({
					id: usuario.id_usuario,
					activo: newEstado,
				}).unwrap();
				await Swal.fire({
					icon: "success",
					title: "Usuario actualizado",
					text: `El usuario ha sido ${accion}do exitosamente.`,
					timer: 2000,
					showConfirmButton: false,
				});
				refetch();
			} catch (error: any) {
				Swal.fire({
					icon: "error",
					title: "Error",
					text: error?.data?.message || "No se pudo actualizar el usuario",
				});
			}
		}
	};

	const handleEdit = (usuario: Usuario) => {
		setSelectedUser(usuario);
		setIsEditModalOpen(true);
	};

	const handleSaveEdit = async (formData: {
		nombre: string;
		apellido: string;
		genero: "Masculino" | "Femenino";
		cedula: string;
		correo: string;
		telefono: string;
		fecha_nacimiento: string;
		id_especialidad?: string;
		porcentaje?: number;
		id_ecos?: string[];
		rif?: string;
	}) => {
		if (!selectedUser) return;

		const isEspecialista = selectedUser.rol === "especialista";
		const isPaciente = selectedUser.rol === "paciente";

		try {
			if (isEspecialista) {
				await updateEspecialista({
					id: selectedUser.id_usuario,
					payload: formData,
				}).unwrap();
			} else if (isPaciente) {
				await updatePaciente({
					id: selectedUser.id_usuario,
					payload: formData,
				}).unwrap();
			} else {
				await updateUser({
					id: selectedUser.id_usuario,
					payload: formData,
				}).unwrap();
			}
			await Swal.fire({
				icon: "success",
				title: "Usuario actualizado",
				text: "Los datos del usuario han sido actualizados exitosamente.",
				timer: 2000,
				showConfirmButton: false,
			});
			setIsEditModalOpen(false);
			setSelectedUser(null);
			refetch();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudo actualizar el usuario",
			});
		}
	};

	const sectionHeading =
		filtroRol === "todos"
			? "Todos los usuarios"
			: `${ROLE_TABS.find((t) => t.value === filtroRol)?.label ?? "Usuarios"}`;

	const estadoSuffix =
		filtroEstado === "1" ? " — activos" : filtroEstado === "0" ? " — desactivados" : "";

	return (
		<PageShell hideHeader title="Gestión de Usuarios">
			<div className="space-y-8">
				{/* Cabecera + búsqueda + filtro estado */}
				<div className="space-y-6">
					<div>
						<h2 className="font-headline text-3xl font-extrabold tracking-tight text-brand-900 sm:text-4xl">
							Gestión de Usuarios
						</h2>
						<p className="mt-2 max-w-2xl text-base text-brand-800 sm:text-base">
							Administra el acceso al sistema: personal, especialistas, moderadores y pacientes. Busca por
							cédula, nombre, apellido o correo y filtra por estado.
						</p>
					</div>
					<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<div className="relative w-full lg:max-w-md">
							<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" />
							<input
								type="text"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Buscar por cédula, nombre, apellido o correo..."
								className="h-11 w-full rounded-full border border-mist bg-paper pl-10 pr-4 text-base text-brand-900 shadow-sm outline-none transition-shadow placeholder:text-brand-600/70 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/25"
							/>
						</div>
						<div className="flex flex-wrap items-center gap-3">
							<label className="sr-only" htmlFor="filtro-estado-usuarios">
								Estado
							</label>
							<select
								id="filtro-estado-usuarios"
								value={filtroEstado}
								onChange={(e) => setFiltroEstado(e.target.value)}
								className="h-11 rounded-xl border border-mist bg-paper px-4 text-base font-medium text-brand-900 shadow-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/25"
							>
								<option value="todos">Todos los estados</option>
								<option value="1">Activos</option>
								<option value="0">Desactivados</option>
							</select>
						</div>
					</div>
				</div>

				{/* Pestañas por rol */}
				<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
					<div className="flex w-full gap-1 rounded-2xl border-color-brand-900 border-2 bg-brand-700 p-1 sm:w-fit">
						{ROLE_TABS.map((tab) => {
							const active = filtroRol === tab.value;
							return (
								<button
									key={tab.value}
									type="button"
									onClick={() => setFiltroRol(tab.value)}
									className={`flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-all sm:flex-none sm:px-6 sm:text-base ${active
										? "bg-paper text-brand-800 shadow-sm"
										: "text-white/75 hover:bg-paper/60 hover:text-brand-900"
										}`}
								>
									{tab.label}
								</button>
							);
						})}
					</div>
					{filtroRol !== "todos" ? (
						<button
							type="button"
							onClick={() => setFiltroRol("todos")}
							className="text-base font-semibold text-white underline-offset-2 hover:text-white hover:underline bg-brand-700 px-4 py-2 rounded-xl"
						>
							Ver todos los roles
						</button>
					) : null}
				</div>

				{/* Lista tipo tarjetas-fila */}
				<div className="rounded-2xl border border-mist bg-paper p-6 shadow-sm sm:rounded-[1.75rem] sm:p-8">
					<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
						<h3 className="font-headline flex items-center gap-3 text-lg font-bold text-brand-900 sm:text-xl">
							<span className="h-8 w-1.5 shrink-0 rounded-full bg-brand-700" aria-hidden />
							<span>
								{sectionHeading}
								{estadoSuffix}
							</span>
						</h3>
					</div>

					{isLoading ? (
						<div className="rounded-2xl border border-mist bg-cloud/40 px-6 py-16 text-center text-base font-medium text-brand-800">
							Cargando usuarios...
						</div>
					) : filteredUsuarios.length === 0 ? (
						<div className="rounded-2xl border border-mist bg-cloud/40 px-6 py-16 text-center text-base font-medium text-brand-800">
							No se encontraron usuarios con los filtros seleccionados.
						</div>
					) : (
						<>
							<div className="mb-4 hidden gap-2 px-4 text-[10px] font-bold uppercase tracking-widest text-brand-700/60 lg:grid lg:grid-cols-12 lg:items-center">
								<div className="col-span-3">Nombre</div>
								<div className="col-span-2">Cédula</div>
								<div className="col-span-2">Correo</div>
								<div className="col-span-1">Rol</div>
								<div className="col-span-1 text-center">Estado</div>
								<div className="col-span-2">Fecha registro</div>
								<div className="col-span-1 text-right">Acciones</div>
							</div>

							<div className="space-y-3">
								{paginatedUsuarios.map((usuario, idx) => {
									const ring = AVATAR_RING[idx % AVATAR_RING.length];
									const rolLabel = usuario.rol.charAt(0).toUpperCase() + usuario.rol.slice(1);
									return (
										<div
											key={usuario.id_usuario}
											className="rounded-2xl border border-mist bg-paper p-4 shadow-sm transition-all hover:border-brand-300/50 hover:shadow-md"
										>
											{/* Desktop grid */}
											<div className="hidden items-center gap-2 lg:grid lg:grid-cols-12 lg:px-2">
												<div className="col-span-3 flex min-w-0 items-center gap-3">
													<div
														className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${ring}`}
													>
														{userInitials(usuario.nombre, usuario.apellido)}
													</div>
													<div className="min-w-0">
														<p className="truncate font-bold text-brand-900">
															{usuario.nombre} {usuario.apellido}
														</p>
														<p className="truncate text-sm text-brand-800/70">{rolLabel}</p>
													</div>
												</div>
												<div className="col-span-2 font-mono text-base text-brand-800">
													{usuario.cedula}
												</div>
												<div className="col-span-2 truncate text-base text-brand-800" title={usuario.correo}>
													{usuario.correo}
												</div>
												<div className="col-span-1">
													<span className={`text-sm font-bold ${getRolColor(usuario.rol)}`}>
														{rolLabel}
													</span>
												</div>
												<div className="col-span-1 flex justify-center">
													{usuario.activo === 1 ? (
														<span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
															<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
															Activo
														</span>
													) : (
														<span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-red-600">
															<span className="h-1.5 w-1.5 rounded-full bg-red-500" />
															Desactivado
														</span>
													)}
												</div>
												<div className="col-span-2 text-base text-brand-800">
													{formatFecha(usuario.fecha_registro)}
												</div>
												<div className="col-span-1 flex justify-end gap-1">
													<button
														type="button"
														onClick={() => handleEdit(usuario)}
														className="rounded-lg p-2 text-brand-600 transition-colors hover:bg-brand-100 hover:text-brand-900"
														title="Editar"
													>
														<Edit className="h-4 w-4" />
													</button>
													<button
														type="button"
														onClick={() => handleToggleActive(usuario)}
														disabled={isToggling}
														className={`rounded-lg p-2 transition-colors disabled:opacity-50 ${usuario.activo === 1
															? "text-brand-600 hover:bg-red-50 hover:text-red-600"
															: "text-brand-600 hover:bg-brand-100 hover:text-brand-800"
															}`}
														title={usuario.activo === 1 ? "Desactivar" : "Activar"}
													>
														{usuario.activo === 1 ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
													</button>
												</div>
											</div>

											{/* Mobile / tablet stack */}
											<div className="flex flex-col gap-3 lg:hidden">
												<div className="flex items-start gap-3">
													<div
														className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold ${ring}`}
													>
														{userInitials(usuario.nombre, usuario.apellido)}
													</div>
													<div className="min-w-0 flex-1">
														<p className="font-bold text-brand-900">
															{usuario.nombre} {usuario.apellido}
														</p>
														<p className="text-sm text-brand-800/80">Cédula: {usuario.cedula}</p>
														<p className="break-all text-sm text-brand-800">{usuario.correo}</p>
														<div className="mt-2 flex flex-wrap items-center gap-2">
															<span className={`text-[11px] font-bold ${getRolColor(usuario.rol)}`}>
																{rolLabel}
															</span>
															{usuario.activo === 1 ? (
																<span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-emerald-600">
																	<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
																	Activo
																</span>
															) : (
																<span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-red-600">
																	<span className="h-1.5 w-1.5 rounded-full bg-red-500" />
																	Desactivado
																</span>
															)}
														</div>
														<p className="mt-1 text-[11px] text-brand-800/70">
															Fecha registro: {formatFecha(usuario.fecha_registro)}
														</p>
													</div>
												</div>
												<div className="flex justify-end gap-1 border-t border-mist pt-3">
													<button
														type="button"
														onClick={() => handleEdit(usuario)}
														className="rounded-lg p-2 text-brand-600 hover:bg-brand-100 hover:text-brand-900"
														title="Editar"
													>
														<Edit className="h-4 w-4" />
													</button>
													<button
														type="button"
														onClick={() => handleToggleActive(usuario)}
														disabled={isToggling}
														className={`rounded-lg p-2 disabled:opacity-50 ${usuario.activo === 1
															? "text-brand-600 hover:bg-red-50 hover:text-red-600"
															: "text-brand-600 hover:bg-brand-100 hover:text-brand-800"
															}`}
														title={usuario.activo === 1 ? "Desactivar" : "Activar"}
													>
														{usuario.activo === 1 ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
													</button>
												</div>
											</div>
										</div>
									);
								})}
							</div>

							{filteredUsuarios.length > itemsPerPage ? (
								<div className="mt-8 flex flex-col gap-3 border-t border-mist pt-6 text-sm text-brand-800 sm:flex-row sm:items-center sm:justify-between">
									<p>
										Mostrando{" "}
										{paginatedUsuarios.length > 0
											? (currentPage - 1) * itemsPerPage + 1
											: 0}{" "}
										- {Math.min(currentPage * itemsPerPage, filteredUsuarios.length)} de{" "}
										{filteredUsuarios.length} usuarios
									</p>
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
											disabled={currentPage === 1}
											className="rounded-full border border-mist bg-paper px-3 py-1.5 text-sm font-medium text-brand-900 transition-colors hover:bg-cloud disabled:cursor-not-allowed disabled:opacity-50"
										>
											Anterior
										</button>
										<span className="text-brand-900">
											Página {currentPage} de {totalPages}
										</span>
										<button
											type="button"
											onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
											disabled={currentPage >= totalPages}
											className="rounded-full border border-mist bg-paper px-3 py-1.5 text-sm font-medium text-brand-900 transition-colors hover:bg-cloud disabled:cursor-not-allowed disabled:opacity-50"
										>
											Siguiente
										</button>
									</div>
								</div>
							) : null}
						</>
					)}
				</div>

				{/* Modal de edición */}
				{isEditModalOpen && selectedUser && (
					<EditUserModal
						usuario={selectedUser}
						onClose={() => {
							setIsEditModalOpen(false);
							setSelectedUser(null);
						}}
						onSave={handleSaveEdit}
						isLoading={isUpdating || isUpdatingEspecialista || isUpdatingPaciente}
					/>
				)}
			</div>
		</PageShell>
	);
};

type EditUserModalProps = {
	usuario: Usuario;
	onClose: () => void;
	onSave: (data: {
		nombre: string;
		apellido: string;
		genero: "Masculino" | "Femenino";
		cedula: string;
		correo: string;
		telefono: string;
		fecha_nacimiento: string;
		id_especialidad?: string;
		porcentaje?: number;
		id_ecos?: string[];
		rif?: string;
	}) => void;
	isLoading: boolean;
};

const EditUserModal = ({ usuario, onClose, onSave, isLoading }: EditUserModalProps) => {
	const isEspecialista = usuario.rol === "especialista";
	const isPaciente = usuario.rol === "paciente";

	// Obtener información adicional del especialista
	const { data: especialistaData, isLoading: loadingEspecialista } = useGetEspecialistaByIdQuery(
		usuario.id_usuario,
		{ skip: !isEspecialista }
	);
	const { data: pacienteData } = useGetPacienteByIdQuery(
		usuario.id_usuario,
		{ skip: !isPaciente }
	);

	// Obtener ecos asignados y todos los ecos disponibles
	const { data: ecosAsignados = [], isLoading: loadingEcosAsignados } =
		useGetEcosByEspecialistaQuery(usuario.id_usuario, { skip: !isEspecialista });
	const { data: todosEcos = [], isLoading: loadingTodosEcos } = useGetEcosQuery(undefined, { skip: !isEspecialista });
	const { data: especialidades = [], isLoading: loadingEspecialidades } =
		useGetEspecialidadesQuery(undefined, { skip: !isEspecialista });

	const [isEcosDropdownOpen, setIsEcosDropdownOpen] = useState(false);
	const [dropdownPosition, setDropdownPosition] = useState<"bottom" | "top">("bottom");
	const ecosDropdownRef = useRef<HTMLDivElement>(null);
	const ecosButtonRef = useRef<HTMLButtonElement>(null);
	const [fieldErrors, setFieldErrors] = useState<{ fecha_nacimiento?: string; porcentaje?: string; cedula?: string; telefono?: string }>({});

	const validateFechaNacimiento = (value: string): string => {
		if (!value || !value.trim()) return "La fecha de nacimiento es requerida";
		const fechaNac = new Date(value);
		const hoy = new Date();
		hoy.setHours(23, 59, 59, 999);

		if (fechaNac.getTime() > hoy.getTime()) {
			return "La fecha de nacimiento no puede ser futura";
		}

		const hace100Anos = new Date();
		hace100Anos.setFullYear(hoy.getFullYear() - 100);
		if (fechaNac.getTime() < hace100Anos.getTime()) {
			return "La fecha de nacimiento no puede ser mayor a 100 años";
		}

		const edad = hoy.getFullYear() - fechaNac.getFullYear();
		const mesDiff = hoy.getMonth() - fechaNac.getMonth();
		const diaDiff = hoy.getDate() - fechaNac.getDate();
		const yaCumplioEsteAnio = mesDiff > 0 || (mesDiff === 0 && diaDiff >= 0);
		const edadReal = yaCumplioEsteAnio ? edad : edad - 1;
		if (edadReal < 18) return "El usuario debe ser mayor de edad (18 años o más)";
		return "";
	};

	const parsedCedula = parseCedulaDisplay(usuario.cedula);
	const [form, setForm] = useState({
		nombre: usuario.nombre,
		apellido: usuario.apellido,
		genero: usuario.genero as "Masculino" | "Femenino",
		tipo_cedula: parsedCedula.tipo,
		cedula: parsedCedula.numero,
		correo: usuario.correo,
		telefono: usuario.telefono,
		fecha_nacimiento: usuario.fecha_nacimiento
			? usuario.fecha_nacimiento.includes("T")
				? usuario.fecha_nacimiento.split("T")[0]
				: usuario.fecha_nacimiento.slice(0, 10)
			: "",
		id_especialidad: "",
		porcentaje: "",
		id_ecos: [] as string[],
		rif: "",
	});

	// Limpiar errores de campo al cambiar de usuario
	useEffect(() => {
		setFieldErrors({});
	}, [usuario.id_usuario]);

	// Cargar datos del especialista cuando estén disponibles
	useEffect(() => {
		if (isEspecialista && especialistaData) {
			setForm((prev) => ({
				...prev,
				id_especialidad: especialistaData.id_especialidad || "",
				porcentaje:
					especialistaData.porcentaje !== undefined &&
						especialistaData.porcentaje !== null
						? String(especialistaData.porcentaje)
						: "",
			}));
		}
	}, [isEspecialista, especialistaData]);

	useEffect(() => {
		if (isPaciente && pacienteData) {
			setForm((prev) => ({
				...prev,
				rif: pacienteData.rif || "",
			}));
		}
	}, [isPaciente, pacienteData]);

	// Cargar ecos asignados cuando estén disponibles
	useEffect(() => {
		if (isEspecialista && ecosAsignados.length > 0) {
			setForm((prev) => ({
				...prev,
				id_ecos: ecosAsignados.map((eco) => eco.id_eco),
			}));
		}
	}, [isEspecialista, ecosAsignados]);

	// Cerrar dropdown al hacer click fuera
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				ecosDropdownRef.current &&
				!ecosDropdownRef.current.contains(event.target as Node)
			) {
				setIsEcosDropdownOpen(false);
			}
		};

		if (isEcosDropdownOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isEcosDropdownOpen]);

	const toggleEco = (idEco: string) => {
		const isSelected = form.id_ecos.includes(idEco);
		if (isSelected) {
			setForm((prev) => ({
				...prev,
				id_ecos: prev.id_ecos.filter((id) => id !== idEco),
			}));
		} else {
			setForm((prev) => ({
				...prev,
				id_ecos: [...prev.id_ecos, idEco],
			}));
		}
	};

	const handleToggleDropdown = () => {
		if (!isEcosDropdownOpen && ecosButtonRef.current) {
			const rect = ecosButtonRef.current.getBoundingClientRect();
			const spaceBelow = window.innerHeight - rect.bottom;
			const spaceAbove = rect.top;
			const dropdownHeight = 240;

			if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
				setDropdownPosition("top");
			} else {
				setDropdownPosition("bottom");
			}
		}
		setIsEcosDropdownOpen(!isEcosDropdownOpen);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const errors: { fecha_nacimiento?: string; porcentaje?: string; cedula?: string; telefono?: string } = {};

		const errFecha = validateFechaNacimiento(form.fecha_nacimiento);
		if (errFecha) errors.fecha_nacimiento = errFecha;

		if (!form.cedula || form.cedula.length < 7 || form.cedula.length > 8) {
			errors.cedula = "La cédula debe tener 7 u 8 dígitos";
		}

		if (!form.telefono || form.telefono.replace(/\D/g, "").length !== 11) {
			errors.telefono = "El teléfono debe tener 11 dígitos";
		}

		if (isEspecialista) {
			const porcentajeValue = Number(form.porcentaje);
			if (
				form.porcentaje === "" ||
				Number.isNaN(porcentajeValue) ||
				porcentajeValue < 0 ||
				porcentajeValue > 100
			) {
				errors.porcentaje = "El porcentaje es requerido y debe estar entre 0 y 100.";
			}
		}

		if (Object.keys(errors).length > 0) {
			setFieldErrors(errors);
			return;
		}

		setFieldErrors({});

		if (isEspecialista) {
			const { tipo_cedula, rif, porcentaje, ...rest } = form;
			const payload = { ...rest, cedula: `${form.tipo_cedula}${form.cedula}`, porcentaje: Number(form.porcentaje) };
			onSave(payload);
			return;
		}
		if (isPaciente) {
			const { tipo_cedula, porcentaje, id_especialidad, id_ecos, ...rest } = form;
			onSave({ ...rest, cedula: `${form.tipo_cedula}${form.cedula}`, rif: form.rif });
			return;
		}
		const { tipo_cedula, porcentaje, id_especialidad, id_ecos, rif, ...rest } = form;
		onSave({ ...rest, cedula: `${form.tipo_cedula}${form.cedula}` });
	};
	const ecos = todosEcos;
	const loadingEcos = loadingTodosEcos || loadingEcosAsignados;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
			<div className="w-full max-w-sm sm:max-w-2xl rounded-lg bg-paper shadow-lg max-h-[90vh] overflow-y-auto">
				<div className="border-b border-mist p-3 sm:p-4">
					<h2 className="text-lg font-semibold text-brand-900">
						Editar usuario: {usuario.nombre} {usuario.apellido}
					</h2>
				</div>
				<form onSubmit={handleSubmit} className="p-3 space-y-4 sm:p-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div>
							<label className="mb-1 block text-base font-medium text-brand-700">
								Nombre <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								required
								value={form.nombre}
								onChange={(e) => setForm({ ...form, nombre: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "") })}
								className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-base outline-none focus:border-brand-500"
							/>
						</div>
						<div>
							<label className="mb-1 block text-base font-medium text-brand-700">
								Apellido <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								required
								value={form.apellido}
								onChange={(e) => setForm({ ...form, apellido: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "") })}
								className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-base outline-none focus:border-brand-500"
							/>
						</div>
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						<div>
							<CedulaField
								label={
									<>
										Cédula <span className="text-red-500">*</span>
									</>
								}
								value={`${form.tipo_cedula}${form.cedula}`}
								onChange={(tipo, numero) => {
									const rifCalculado = isPaciente ? calculateRIF(tipo, numero) : undefined;
									setForm((f) => ({
										...f,
										tipo_cedula: tipo,
										cedula: numero,
										...(rifCalculado !== undefined ? { rif: rifCalculado } : {}),
									}));
								}}
								required
								inputClassName={`h-10 rounded-lg bg-paper text-base ${fieldErrors.cedula ? "border-red-500" : "border-brand-300"}`}
								selectClassName={`h-10 rounded-lg bg-paper text-base ${fieldErrors.cedula ? "border-red-500" : "border-brand-300"}`}
							/>
							{fieldErrors.cedula && (
								<p className="mt-1 text-sm text-red-500">{fieldErrors.cedula}</p>
							)}
						</div>
						<div>
							<label className="mb-1 block text-base font-medium text-brand-700">
								Género <span className="text-red-500">*</span>
							</label>
							<select
								required
								value={form.genero}
								onChange={(e) =>
									setForm({ ...form, genero: e.target.value as typeof form.genero })
								}
								className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-base outline-none focus:border-brand-500"
							>
								<option value="Masculino">Masculino</option>
								<option value="Femenino">Femenino</option>
							</select>
						</div>
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						<div>
							<label className="mb-1 block text-base font-medium text-brand-700">
								Correo <span className="text-red-500">*</span>
							</label>
							<input
								type="email"
								required
								value={form.correo}
								onChange={(e) => setForm({ ...form, correo: e.target.value })}
								className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-base outline-none focus:border-brand-500"
							/>
						</div>
						<div>
							<TelefonoField
								label={
									<>
										Teléfono <span className="text-red-500">*</span>
									</>
								}
								value={form.telefono}
								onChange={(prefijo, numero) =>
									setForm((f) => ({ ...f, telefono: prefijo + numero }))
								}
								required
								inputClassName={`h-10 rounded-lg bg-paper text-base ${fieldErrors.telefono ? "border-red-500" : "border-brand-300"}`}
								selectClassName={`h-10 rounded-lg bg-paper text-base ${fieldErrors.telefono ? "border-red-500" : "border-brand-300"}`}
							/>
							{fieldErrors.telefono && (
								<p className="mt-1 text-sm text-red-500">{fieldErrors.telefono}</p>
							)}
						</div>
					</div>
					{isPaciente && (
						<div>
							<label className="mb-1 block text-base font-medium text-brand-700">
								RIF
							</label>
							<input
								type="text"
								value={form.rif}
								onChange={(e) => setForm({ ...form, rif: e.target.value })}
								className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-base outline-none focus:border-brand-500"
								placeholder="Ej: J-12345678-9"
							/>
						</div>
					)}
					<div>
						<label className="mb-1 block text-base font-medium text-brand-700">
							Fecha de nacimiento <span className="text-red-500">*</span>
						</label>
						<input
							type="date"
							required
							value={form.fecha_nacimiento}
							onChange={(e) => {
								setForm({ ...form, fecha_nacimiento: e.target.value });
								if (fieldErrors.fecha_nacimiento) setFieldErrors((p) => ({ ...p, fecha_nacimiento: undefined }));
							}}
							className={`h-10 w-full rounded-lg border bg-paper px-3 text-base outline-none focus:border-brand-500 ${fieldErrors.fecha_nacimiento ? "border-red-500" : "border-brand-300"}`}
						/>
						{fieldErrors.fecha_nacimiento && (
							<p className="mt-1 text-sm text-red-500">{fieldErrors.fecha_nacimiento}</p>
						)}
					</div>


					{/* Campos adicionales para especialistas */}
					{isEspecialista && (
						<>
							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<label className="mb-1 block text-base font-medium text-brand-700">
										Especialidad <span className="text-red-500">*</span>
									</label>
									<select
										required
										disabled={loadingEspecialidades || loadingEspecialista}
										value={form.id_especialidad}
										onChange={(e) => setForm({ ...form, id_especialidad: e.target.value })}
										className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-base outline-none focus:border-brand-500 disabled:opacity-50"
									>
										<option value="">
											{loadingEspecialidades || loadingEspecialista
												? "Cargando..."
												: "Selecciona una especialidad"}
										</option>
										{especialidades.map((esp) => (
											<option key={esp.id_especialidad} value={esp.id_especialidad}>
												{esp.nombre}
											</option>
										))}
									</select>
								</div>
							</div>
							<div>
								<label className="mb-1 block text-base font-medium text-brand-700">
									Porcentaje para especialista <span className="text-red-500">*</span>
								</label>
								<input
									type="number"
									min={0}
									max={100}
									step="0.01"
									value={form.porcentaje}
									onChange={(e) => {
										setForm({ ...form, porcentaje: e.target.value });
										if (fieldErrors.porcentaje) setFieldErrors((p) => ({ ...p, porcentaje: undefined }));
									}}
									className={`h-10 w-full rounded-lg border bg-paper px-3 text-base outline-none focus:border-brand-500 ${fieldErrors.porcentaje ? "border-red-500" : "border-brand-300"}`}
									placeholder="Ej: 35"
								/>
								{fieldErrors.porcentaje && (
									<p className="mt-1 text-sm text-red-500">{fieldErrors.porcentaje}</p>
								)}
							</div>
							<div>
								<label className="mb-1 block text-base font-medium text-brand-700">
									Ecos <span className="text-red-500">*</span>
								</label>
								<div className="relative" ref={ecosDropdownRef}>
									<button
										type="button"
										ref={ecosButtonRef}
										onClick={handleToggleDropdown}
										disabled={loadingEcos}
										className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-left text-base outline-none focus:border-brand-500 disabled:opacity-50 flex items-center justify-between"
									>
										<span className="truncate">
											{loadingEcos
												? "Cargando ecos..."
												: form.id_ecos.length === 0
													? "Selecciona los ecos"
													: form.id_ecos.length === 1
														? "1 eco seleccionado"
														: `${form.id_ecos.length} ecos seleccionados`}
										</span>
										<ChevronDown
											className={`h-4 w-4 text-brand-600 transition-transform ${isEcosDropdownOpen ? "rotate-180" : ""
												}`}
										/>
									</button>
									{isEcosDropdownOpen && (
										<div
											className={`absolute z-50 w-full rounded-lg border border-brand-300 bg-paper shadow-lg max-h-60 overflow-auto ${dropdownPosition === "top" ? "bottom-full mb-1" : "top-full mt-1"
												}`}
										>
											{loadingEcos ? (
												<div className="p-3 text-base text-brand-600">Cargando ecos...</div>
											) : ecos.filter((eco) => eco.activo === 1).length === 0 ? (
												<div className="p-3 text-base text-brand-600">No hay ecos disponibles</div>
											) : (
												<div className="p-1">
													{ecos
														.filter((eco) => eco.activo === 1)
														.map((eco) => {
															const isSelected = form.id_ecos.includes(eco.id_eco);
															return (
																<button
																	key={eco.id_eco}
																	type="button"
																	onClick={() => toggleEco(eco.id_eco)}
																	className={`w-full flex items-center gap-2 px-3 py-2 text-base rounded-md hover:bg-brand-50 transition-colors ${isSelected ? "bg-brand-50" : ""
																		}`}
																>
																	<div
																		className={`flex h-4 w-4 items-center justify-center rounded border ${isSelected
																			? "border-brand-700 bg-brand-700"
																			: "border-brand-300 bg-paper"
																			}`}
																	>
																		{isSelected && <Check className="h-3 w-3 text-paper" />}
																	</div>
																	<span className="flex-1 text-left">{eco.nombre}</span>
																</button>
															);
														})}
												</div>
											)}
										</div>
									)}
								</div>
							</div>
						</>
					)}

					<div className="flex gap-3 pt-4">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 rounded-lg border border-brand-300 bg-paper px-4 py-2 text-base font-medium text-brand-700 transition-colors hover:bg-brand-50"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={isLoading}
							className="flex-1 rounded-lg bg-brand-700 px-4 py-2 text-base font-medium text-paper transition-colors hover:bg-brand-800 disabled:opacity-50"
						>
							{isLoading ? "Guardando..." : "Guardar cambios"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default UsuariosPage;
