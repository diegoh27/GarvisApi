# 📋 Instrucciones de Cambios y Refactorizaciones Adicionales (Citas de Mostrador)

Este documento contiene el resumen detallado de los últimos cambios y optimizaciones de UI, interacción y robustez realizados en el módulo de **Citas de Mostrador (Frontend)**. Está diseñado como un prompt instruccional complementario para que otra rama o desarrollador pueda aplicarlos exactamente en los mismos archivos.

---

## 🛠️ Resumen de Mejoras Adicionales Realizadas

### 1. Campo de Referencia: Restricción a Solo Números
* **El Problema**: El input de `Referencia` en el Paso 4 permitía ingresar texto libre (letras, espacios y caracteres especiales), lo cual es susceptible a errores humanos, ya que las referencias de pago bancarias son puramente numéricas.
* **La Solución**:
  * En [CitaMostradorPage.tsx](file:///c:/Users/USER/Desktop/www/GarvisApi/web/src/features/inventario/pages/CitaMostradorPage.tsx), se modificó el `onChange` del input `referencia` para interceptar la entrada de texto y limpiarla utilizando una expresión regular que remueve cualquier carácter no numérico (`replace(/\D/g, "")`). Esto garantiza que el usuario solo pueda escribir dígitos en dicho campo.

### 2. Bloqueo de Registros Prematuros (Navegación y Enter en Inputs)
* **El Problema**: 
  1. Al presionar "Siguiente" en el Paso 3, React reutilizaba el mismo nodo del DOM del botón para el botón "Confirmar cita ✓" del Paso 4. Si el usuario daba doble clic rápido, el segundo clic activaba accidentalmente el botón de confirmar, registrando la cita de inmediato.
  2. Si el usuario presionaba "Enter" en el teclado mientras escribía en cualquier caja de texto (Cédula, Nombre Completo, Teléfono, etc.) en los Pasos 1, 2 o 3, el comportamiento por defecto de los formularios de HTML forzaba un `submit` del formulario completo, registrando la cita antes de tiempo.
* **La Solución**:
  * **Claves Únicas de Botones**: En [CitaMostradorPage.tsx](file:///c:/Users/USER/Desktop/www/GarvisApi/web/src/features/inventario/pages/CitaMostradorPage.tsx), se añadieron propiedades `key` únicas a cada botón en la barra de navegación inferior (`key="btn-next"` y `key="btn-submit"`). Esto obliga a React a desmontar físicamente el botón viejo y montar uno nuevo al pasar al Paso 4, evitando la propagación de clics rápidos y eventos de teclado residuales.
  * **Intercepción Estricta de Submit**: Se modificó `onFormSubmit` agregando la validación: `if (paso !== 4) return;`. Si se intenta enviar el formulario (por presionar Enter en cualquier input) en los Pasos 1, 2 o 3, el evento queda anulado de inmediato y no se registra la cita.

### 3. Limpieza Completa al Registrar con Éxito y al Cargar la Vista
* **El Problema**: Al recargar la página o al terminar de agendar con éxito a un paciente, los datos anteriormente escritos (médicos, estudios, montos, teléfono, búsquedas de representados) permanecían cargados en el estado, lo cual entorpecía el registro del siguiente paciente.
* **La Solución**:
  * **Método de Reseteo (`resetForm`)**: En [useCitaMostradorForm.ts](file:///c:/Users/USER/Desktop/www/GarvisApi/web/src/features/inventario/hooks/useCitaMostradorForm.ts), se creó un método centralizado `resetForm` que reestablece todos los estados del formulario, búsquedas, alertas de cita activa, teléfono original y representados a su estado en blanco inicial.
  * **Reseteo en el Montaje**: Se añadió un `useEffect` con dependencias vacías `[]` para invocar `resetForm` en cuanto la vista de Cita Mostrador se monta por primera vez.
  * **Reseteo Post-Confirmación**: En [CitaMostradorPage.tsx](file:///c:/Users/USER/Desktop/www/GarvisApi/web/src/features/inventario/pages/CitaMostradorPage.tsx), se modificó el bloque de éxito de `crearCitaMostrador` para que, al cerrarse el modal exitoso de SweetAlert, invoque automáticamente `resetForm()` y setee `paso` a `1`, dejando la pantalla completamente limpia para el siguiente paciente.

---

## 📋 Código y Archivos a Modificar

### 1. `web/src/features/inventario/api/comisionesApi.ts`
> [!IMPORTANT]
> Debes actualizar el tipado de TypeScript del objeto `paciente` en la query `getDatosPorCedula` para declarar la propiedad `telefono` (que ahora retorna el backend) y evitar errores de compilación.

```diff
 		getDatosPorCedula: builder.query<
 			{
-				paciente: { id_paciente: string | null; nombre: string; apellido: string; cedula: string; rif: string } | null;
+				paciente: { id_paciente: string | null; nombre: string; apellido: string; cedula: string; telefono?: string; rif: string } | null;
 				representado: { id_representado: string; id_paciente: string; nombre: string; apellido: string; cedula: string } | null;
 				mostrador: { nombre: string; apellido: string; cedula: string; rif: string } | null;
 				citaActiva: boolean;
 			},
 			string
 		>({
 			query: (cedula) =>
 				`/citas/mostrador/datos-por-cedula?cedula=${encodeURIComponent(cedula)}`,
 			transformResponse: (
 				response: {
 					ok: boolean;
 					data: {
-						paciente: { id_paciente: string | null; nombre: string; apellido: string; cedula: string; rif: string } | null;
+						paciente: { id_paciente: string | null; nombre: string; apellido: string; cedula: string; telefono?: string; rif: string } | null;
 						representado: { id_representado: string; id_paciente: string; nombre: string; apellido: string; cedula: string } | null;
 						mostrador: { nombre: string; apellido: string; cedula: string; rif: string } | null;
 						citaActiva: boolean;
 					};
 				},
 			) => response.data,
 		}),
```

---

### 2. `web/src/features/inventario/hooks/useCitaMostradorForm.ts`
Implementa la función `resetForm` y el hook de inicialización para limpiar el estado al montar el hook y expórtala en el objeto retornado.

```typescript
	// Al final del hook, justo antes del return:
	const resetForm = () => {
		setForm({
			id_especialista: "",
			id_eco: "",
			fecha_cita: defaultFechaCita(),
			telefono: "",
			hora_cita: getCurrentSlot(),
			metodo: "Transferencia",
			monto: "",
			tasa_dia_bcv: dolarOficial?.promedio ? String(dolarOficial.promedio) : "",
			nombre: "",
			apellido: "",
			tipo_cedula: "V",
			cedula: "",
			rif: "",
			referencia: "",
			id_paciente_resolved: "",
		});
		setError("");
		setFieldErrors({});
		setMensajeCargaAnterior(null);
		setPacienteIdentificadoEnSistema(false);
		setIdPacienteWeb(null);
		setOriginalPhone("");
		setCitaActivaError(null);
		setVincularRepresentado(null);
		setVincularCitaAlTitular(false);
		setSearchRepNombre("");
		setSearchRepApellido("");
		setResultadosRep([]);
		setShowCrearRepresentadoForm(false);
	};

	useEffect(() => {
		resetForm();
	}, []);
```

No olvides agregar `resetForm` en el return del hook:
```diff
 	return {
 		form,
 		setForm,
 		fieldErrors,
 		error,
        // ... otros campos
 		handleSubmit,
+		resetForm,
 		quiereAltaTitular,
```

---

### 3. `web/src/features/inventario/pages/CitaMostradorPage.tsx`

#### A) En el objeto desestructurado de `useCitaMostradorForm` añade la función `resetForm`:
```diff
 		validateRepForm,
 		handleSubmit,
+		resetForm,
 		puedeCargarAnterior,
 		HORA_OPTIONS,
 		inputError,
 	} = useCitaMostradorForm({
```

#### B) En el callback `onSave` (dentro de la llamada a `useCitaMostradorForm`), limpia el formulario tras guardar con éxito:
```diff
 	} = useCitaMostradorForm({
 		onSave: async (p) => {
 			try {
 				await crearCitaMostrador(p).unwrap();
 				await Swal.fire({
 					icon: "success",
 					title: "Cita registrada",
 					text: "La cita de mostrador quedó registrada como pagada y atendida.",
 					timer: 2200,
 					showConfirmButton: false,
 				});
+				resetForm();
+				setPaso(1);
 			} catch (err: unknown) {
```

#### C) Evita envíos automáticos del formulario en pasos previos a la confirmación:
```typescript
	const onFormSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (paso !== 4) {
			return; // Bloquea el envío si se presiona Enter en un input en los pasos 1, 2 o 3
		}
		aplicarNombreCompletoAlForm();
		handleSubmit(e);
	};
```

#### D) Restringe el input de Referencia a Solo Dígitos:
```diff
 							<div>
 								<label className={labelBase}>Referencia</label>
 								<input
 									type="text"
 									name="referencia"
 									value={form.referencia}
-									onChange={handleChange}
+									onChange={(e) => {
+										const val = e.target.value.replace(/\D/g, "");
+										handleChange({
+											target: { name: "referencia", value: val },
+										} as any);
+									}}
 									maxLength={80}
 									className={`${inputBase} ${fieldErrors.referencia ? inputError : ""}`}
 									placeholder="Número de referencia"
 								/>
 							</div>
```

#### E) Añade claves únicas a los botones inferiores para evitar reutilización del DOM en el Stepper:
```diff
 					{paso < 4 ? (
 						<button
+							key="btn-next"
 							type="button"
 							onClick={() => void handleNext()}
 							disabled={isCreatingPatient || (paso === 1 && !!citaActivaError)}
 							className="flex items-center gap-2 rounded-2xl px-8 py-3 text-base font-bold text-white shadow-md transition disabled:opacity-60"
 							style={{ backgroundColor: PRIMARY }}
 						>
 							{isCreatingPatient ? "Procesando…" : "Siguiente"} <ChevronRight className="h-4 w-4" />
 						</button>
 					) : (
 						<button
+							key="btn-submit"
 							type="submit"
 							form="form-cita-mostrador"
 							disabled={isSaving || !!citaActivaError}
 							className="shrink-0 rounded-2xl px-8 py-3 text-base font-bold text-white shadow-md disabled:opacity-60"
 							style={{ backgroundColor: PRIMARY }}
 						>
 							{isSaving ? "Guardando…" : "Confirmar cita ✓"}
 						</button>
 					)}
```
