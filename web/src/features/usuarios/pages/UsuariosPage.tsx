import { useState, useMemo, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { PageShell } from "../../../shared";
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
import { Edit, X, Check, ChevronDown } from "lucide-react";

const formatFecha = (value: string | null) => {
	if (!value) return "N/A";
	const dateKey = value.includes("T") ? value.split("T")[0] : value.slice(0, 10);
	const date = new Date(`${dateKey}T00:00:00`);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString("es-VE", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
};

const UsuariosPage = () => {
	const [filtroRol, setFiltroRol] = useState<string>("todos");
	const [filtroEstado, setFiltroEstado] = useState<string>("todos");
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

	const rolesUnicos = useMemo(() => {
		const roles = new Set(usuarios.map((u) => u.rol));
		return Array.from(roles).sort();
	}, [usuarios]);

	return (
		<PageShell
			title="Usuarios"
			description="Gestiona todos los usuarios del sistema: especialistas, moderadores y pacientes."
		>
			<div className="space-y-4">
				{/* Filtros */}
				<div className="rounded-lg border border-brand-300 bg-paper p-4">
					<div className="flex flex-col gap-3 sm:flex-row">
						<select
							value={filtroRol}
							onChange={(e) => setFiltroRol(e.target.value)}
							className="h-10 rounded-lg border border-mist bg-cloud px-4 text-sm text-brand-900 outline-none focus:border-brand-700"
						>
							<option value="todos">Todos los roles</option>
							{rolesUnicos.map((rol) => (
								<option key={rol} value={rol}>
									{rol.charAt(0).toUpperCase() + rol.slice(1)}
								</option>
							))}
						</select>
						<select
							value={filtroEstado}
							onChange={(e) => setFiltroEstado(e.target.value)}
							className="h-10 rounded-lg border border-mist bg-cloud px-4 text-sm text-brand-900 outline-none focus:border-brand-700"
						>
							<option value="todos">Todos los estados</option>
							<option value="1">Activos</option>
							<option value="0">Desactivados</option>
						</select>
						<input
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Buscar por cédula, nombre, apellido o correo..."
							className="h-10 flex-1 rounded-lg border border-mist bg-cloud px-4 text-sm text-brand-900 outline-none focus:border-brand-700"
						/>
					</div>
				</div>
				{/* Lista de usuarios */}
				<div className="rounded-lg border border-brand-200 bg-paper">
					{isLoading ? (
						<div className="p-8 text-center text-brand-600">
							Cargando usuarios...
						</div>
					) : filteredUsuarios.length === 0 ? (
						<div className="p-8 text-center text-brand-600">
							No se encontraron usuarios con los filtros seleccionados.
						</div>
					) : (
						<>
							{/* Versión tabla - solo escritorio/tablet */}
							<div className="hidden md:block overflow-x-auto">
								<table className="min-w-[900px] w-full">
									<thead className="bg-cloud border-b border-mist">
										<tr>
											<th className="px-4 py-3 text-left text-xs font-semibold text-brand-900">
												Nombre
											</th>
											<th className="px-4 py-3 text-left text-xs font-semibold text-brand-900">
												Cédula
											</th>
											<th className="px-4 py-3 text-left text-xs font-semibold text-brand-900">
												Correo
											</th>
											<th className="px-4 py-3 text-left text-xs font-semibold text-brand-900">
												Rol
											</th>
											<th className="px-4 py-3 text-left text-xs font-semibold text-brand-900">
												Estado
											</th>
											<th className="px-4 py-3 text-left text-xs font-semibold text-brand-900">
												Fecha registro
											</th>
											<th className="px-4 py-3 text-center text-xs font-semibold text-brand-900">
												Acciones
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-mist">
										{paginatedUsuarios.map((usuario) => (
											<tr key={usuario.id_usuario} className="hover:bg-cloud/50">
												<td className="px-4 py-3 text-sm text-brand-900">
													{usuario.nombre} {usuario.apellido}
												</td>
												<td className="px-4 py-3 text-sm text-brand-800">
													{usuario.cedula}
												</td>
												<td className="px-4 py-3 text-sm text-brand-800">
													{usuario.correo}
												</td>
												<td className="px-4 py-3 text-sm text-brand-800">
													<span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-medium text-brand-700">
														{usuario.rol.charAt(0).toUpperCase() + usuario.rol.slice(1)}
													</span>
												</td>
												<td className="px-4 py-3 text-sm">
													{usuario.activo === 1 ? (
														<span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
															Activo
														</span>
													) : (
														<span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
															Desactivado
														</span>
													)}
												</td>
												<td className="px-4 py-3 text-sm text-brand-800">
													{formatFecha(usuario.fecha_registro)}
												</td>
												<td className="px-4 py-3">
													<div className="flex items-center justify-center gap-2">
														<button
															type="button"
															onClick={() => handleEdit(usuario)}
															className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50 transition-colors"
															title="Editar"
														>
															<Edit className="h-4 w-4" />
														</button>
														<button
															type="button"
															onClick={() => handleToggleActive(usuario)}
															disabled={isToggling}
															className={`rounded-lg p-1.5 transition-colors ${usuario.activo === 1
																? "text-red-600 hover:bg-red-50"
																: "text-green-600 hover:bg-green-50"
																}`}
															title={usuario.activo === 1 ? "Desactivar" : "Activar"}
														>
															{usuario.activo === 1 ? (
																<X className="h-4 w-4" />
															) : (
																<Check className="h-4 w-4" />
															)}
														</button>
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							{/* Versión cards - solo móvil */}
							<div className="block divide-y divide-mist md:hidden">
								{paginatedUsuarios.map((usuario) => (
									<div
										key={usuario.id_usuario}
										className="p-4 space-y-2 hover:bg-cloud/60 transition-colors"
									>
										<div className="flex items-start justify-between gap-3">
											<div>
												<p className="text-sm font-semibold text-brand-900">
													{usuario.nombre} {usuario.apellido}
												</p>
												<p className="text-xs text-brand-700">
													CI: <span className="font-medium">{usuario.cedula}</span>
												</p>
												<p className="text-xs text-brand-700 truncate max-w-[230px]">
													Correo:{" "}
													<span className="font-medium break-all">{usuario.correo}</span>
												</p>
											</div>
											<div className="flex flex-col items-end gap-1">
												<span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700">
													{usuario.rol.charAt(0).toUpperCase() + usuario.rol.slice(1)}
												</span>
												{usuario.activo === 1 ? (
													<span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
														Activo
													</span>
												) : (
													<span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
														Desactivado
													</span>
												)}
											</div>
										</div>

										<div className="flex items-center justify-between pt-1">
											<p className="text-[11px] text-brand-700">
												Registrado:{" "}
												<span className="font-medium">
													{formatFecha(usuario.fecha_registro)}
												</span>
											</p>
											<div className="flex items-center gap-2">
												<button
													type="button"
													onClick={() => handleEdit(usuario)}
													className="rounded-full border border-mist bg-paper p-1.5 text-brand-600 hover:bg-brand-50 transition-colors"
													title="Editar"
												>
													<Edit className="h-4 w-4" />
												</button>
												<button
													type="button"
													onClick={() => handleToggleActive(usuario)}
													disabled={isToggling}
													className={`rounded-full border border-mist bg-paper p-1.5 transition-colors ${usuario.activo === 1
														? "text-red-600 hover:bg-red-50"
														: "text-green-600 hover:bg-green-50"
														}`}
													title={usuario.activo === 1 ? "Desactivar" : "Activar"}
												>
													{usuario.activo === 1 ? (
														<X className="h-4 w-4" />
													) : (
														<Check className="h-4 w-4" />
													)}
												</button>
											</div>
										</div>
									</div>
								))}
							</div>

							{/* Paginación */}
							{filteredUsuarios.length > itemsPerPage && (
								<div className="flex flex-col gap-2 border-t border-mist bg-cloud px-4 py-3 text-xs text-brand-800 sm:flex-row sm:items-center sm:justify-between">
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
											className="rounded-full border border-mist bg-paper px-3 py-1.5 text-xs text-brand-800 transition-colors hover:bg-cloud disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Anterior
										</button>
										<span>
											Página {currentPage} de {totalPages}
										</span>
										<button
											type="button"
											onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
											disabled={currentPage >= totalPages}
											className="rounded-full border border-mist bg-paper px-3 py-1.5 text-xs text-brand-800 transition-colors hover:bg-cloud disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Siguiente
										</button>
									</div>
								</div>
							)}
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
		</PageShell >
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

	const [form, setForm] = useState({
		nombre: usuario.nombre,
		apellido: usuario.apellido,
		genero: usuario.genero as "Masculino" | "Femenino",
		cedula: usuario.cedula,
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
		if (isEspecialista) {
			const porcentajeValue = Number(form.porcentaje);
			if (Number.isNaN(porcentajeValue) || porcentajeValue < 0 || porcentajeValue > 100) {
				Swal.fire({
					icon: "warning",
					title: "Porcentaje inválido",
					text: "El porcentaje debe estar entre 0 y 100.",
				});
				return;
			}
			const { rif, porcentaje, ...rest } = form;
			const payload = { ...rest, porcentaje: porcentajeValue };
			onSave(payload);
			return;
		}
		if (isPaciente) {
			const { porcentaje, id_especialidad, id_ecos, ...rest } = form;
			onSave(rest);
			return;
		}
		const { porcentaje, id_especialidad, id_ecos, rif, ...rest } = form;
		onSave(rest);
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
							<label className="mb-1 block text-sm font-medium text-brand-700">
								Nombre <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								required
								value={form.nombre}
								onChange={(e) => setForm({ ...form, nombre: e.target.value })}
								className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
							/>
						</div>
						<div>
							<label className="mb-1 block text-sm font-medium text-brand-700">
								Apellido <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								required
								value={form.apellido}
								onChange={(e) => setForm({ ...form, apellido: e.target.value })}
								className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
							/>
						</div>
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						<div>
							<label className="mb-1 block text-sm font-medium text-brand-700">
								Cédula <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								required
								value={form.cedula}
								onChange={(e) => setForm({ ...form, cedula: e.target.value })}
								className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
							/>
						</div>
						<div>
							<label className="mb-1 block text-sm font-medium text-brand-700">
								Género <span className="text-red-500">*</span>
							</label>
							<select
								required
								value={form.genero}
								onChange={(e) =>
									setForm({ ...form, genero: e.target.value as typeof form.genero })
								}
								className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
							>
								<option value="Masculino">Masculino</option>
								<option value="Femenino">Femenino</option>
							</select>
						</div>
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						<div>
							<label className="mb-1 block text-sm font-medium text-brand-700">
								Correo <span className="text-red-500">*</span>
							</label>
							<input
								type="email"
								required
								value={form.correo}
								onChange={(e) => setForm({ ...form, correo: e.target.value })}
								className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
							/>
						</div>
						<div>
							<label className="mb-1 block text-sm font-medium text-brand-700">
								Teléfono <span className="text-red-500">*</span>
							</label>
							<input
								type="tel"
								required
								value={form.telefono}
								onChange={(e) => setForm({ ...form, telefono: e.target.value })}
								className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
							/>
						</div>
					</div>
					{isPaciente && (
						<div>
							<label className="mb-1 block text-sm font-medium text-brand-700">
								RIF
							</label>
							<input
								type="text"
								value={form.rif}
								onChange={(e) => setForm({ ...form, rif: e.target.value })}
								className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
								placeholder="Ej: J-12345678-9"
							/>
						</div>
					)}
					<div>
						<label className="mb-1 block text-sm font-medium text-brand-700">
							Fecha de nacimiento
						</label>
						<input
							type="date"
							value={form.fecha_nacimiento}
							onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })}
							className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
						/>
					</div>


					{/* Campos adicionales para especialistas */}
					{isEspecialista && (
						<>
							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<label className="mb-1 block text-sm font-medium text-brand-700">
										Especialidad <span className="text-red-500">*</span>
									</label>
									<select
										required
										disabled={loadingEspecialidades || loadingEspecialista}
										value={form.id_especialidad}
										onChange={(e) => setForm({ ...form, id_especialidad: e.target.value })}
										className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500 disabled:opacity-50"
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
								<label className="mb-1 block text-sm font-medium text-brand-700">
									Porcentaje para especialista <span className="text-red-500">*</span>
								</label>
								<input
									type="number"
									min={0}
									max={100}
									step="0.01"
									value={form.porcentaje}
									onChange={(e) => setForm({ ...form, porcentaje: e.target.value })}
									className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
									placeholder="Ej: 35"
								/>
							</div>
							<div>
								<label className="mb-1 block text-sm font-medium text-brand-700">
									Ecos <span className="text-red-500">*</span>
								</label>
								<div className="relative" ref={ecosDropdownRef}>
									<button
										type="button"
										ref={ecosButtonRef}
										onClick={handleToggleDropdown}
										disabled={loadingEcos}
										className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-left text-sm outline-none focus:border-brand-500 disabled:opacity-50 flex items-center justify-between"
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
												<div className="p-3 text-sm text-brand-600">Cargando ecos...</div>
											) : ecos.filter((eco) => eco.activo === 1).length === 0 ? (
												<div className="p-3 text-sm text-brand-600">No hay ecos disponibles</div>
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
																	className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-brand-50 transition-colors ${isSelected ? "bg-brand-50" : ""
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
							className="flex-1 rounded-lg border border-brand-300 bg-paper px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={isLoading}
							className="flex-1 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-brand-800 disabled:opacity-50"
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
