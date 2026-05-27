# Resumen de Cambios Realizados y Prompt de Reproducción

Este documento contiene un resumen detallado de todos los cambios realizados para corregir el error de validación de unidades (mayúsculas/minúsculas en "rollo" y "metro"), la actualización del badge dinámico de unidades en la edición de insumos, y la integración del consumo automático de inventario para citas de mostrador. 

También incluye el **Prompt listo para copiar** que puedes utilizar en otra rama o sesión para aplicar estos cambios de manera idéntica.

---

## 📋 Prompt para Aplicar los Cambios (Copiar y Pegar)

> Por favor, aplica los siguientes cambios técnicos en la rama actual:
>
> 1. **Corrección de Unidad Dinámica en Formulario de Edición de Insumos (`EditarProductoModal.tsx`)**:
>    - Importa las funciones `pluralizarUnidad` y `formatUnidad` desde `../../../../utils/pluralizar`.
>    - Modifica el badge verde estático que está hardcodeado como `"UNIDADES"` en el input de factor de conversión para que use `{pluralizarUnidad(formData.unidad_consumo || "Unidad", Number(formData.factor_conversion) || 1)}`.
>    - Modifica el bloque del "Ejemplo visual" para que use `formatUnidad(Number(formData.factor_conversion) || 1, formData.unidad_consumo || 'Unidad')` en lugar de la concatenación simple.
> 
> 2. **Añadir Unidad en Modal de Creación (`CrearProductoModal.tsx`)**:
>    - Añade `"Metro"` al listado de `UNIDADES_MEDIDA`.
>    - Elimina los espacios de más de `"Galón  "` dejándolo como `"Galón"`.
> 
> 3. **Validación Flexible de Unidades en el Backend (`productosHandlers.js`)**:
>    - En `api/src/handlers/productosHandlers.js`, expande la lista `UNIDADES_MEDIDA` para incluir singular, plural y abreviaciones comunes de todas las unidades del frontend (ej: `"Rollo"`, `"Rollos"`, `"Metro"`, `"Metros"`, `"ml"`, `"g"`, `"kg"`, `"Docena"`, `"Docenas"`, etc.).
>    - Modifica las comprobaciones en `createProductoHandler` y `updateProductoHandler` para que la validación sea **insensible a mayúsculas/minúsculas** aplicando `.trim().toLowerCase()` a los valores recibidos y comparándolos contra la lista también en minúsculas.
> 
> 4. **Consumo de Inventario en Citas de Mostrador (`citasControllers.js`)**:
>    - En `api/src/controllers/citasControllers.js`, dentro de `createCitaMostradorController`, inserta la lógica de descuento automático de inventario justo antes del `await conn.commit();` (después del insert de `esp_comision`).
>    - La lógica debe:
>      - Consultar los insumos requeridos en `inv_eco_insumo` para el `id_eco` de la cita.
>      - Para cada insumo, restar la cantidad del `stock_base_total` e incrementar el `consumo_actual` en la tabla `inv_producto`.
>      - Insertar el registro de consumo en la tabla `inv_cita_consumo`.
>      - Registrar el movimiento de `SALIDA` en la auditoría de `inv_kardex` referenciando el `id_cita` y `usuarioValido`.
> 
> 5. **Corrección de Lógica Financiera en Comisiones de Especialistas (`espComisionControllers.js`)**:
>    - En `api/src/controllers/espComisionControllers.js`, tanto en `pagarComisionController` como en `editarPagoComisionController`, cambia la fórmula de `montoIngresoUsd`.
>    - En lugar de restar `montoComisionUsd` de `comision.eco_precio` (lo cual generaba $0 de ganancia y reducía el ingreso reportado), asígnale directamente el precio total del examen: `const montoIngresoUsd = round2(Number(comision.eco_precio || 0));`.
>    - Esto asegura que el total pagado por el paciente ($20) sea registrado como el **Ingreso** bruto en facturación, y la comisión ($10) sea el **Egreso**, permitiendo al sistema computar la ganancia neta correcta de la clínica ($10, o el 50%) en el balance final.
> 
> 6. **Borradores y Plantillas Rápidas con Soporte Personalizado (`InformeFormModal.tsx`)**:
>    - En `web/src/features/especialista/components/InformeFormModal.tsx`, agrega los estados de react `customPlantillas` y un `useEffect` para cargar desde `localStorage` al iniciar.
>    - Implementa un botón elegante "Guardar borrador actual" al lado del título de la sección que pregunte por el nombre (vía SweetAlert2 input) y guarde el texto actual de reseña/recomendaciones en `localStorage`.
>    - Implementa una interfaz de "píldoras" (pills) interactivas en verde esmeralda con un botón de eliminar (icono de cruz) que borra de `localStorage` de forma segura.
>    - Al hacer clic en cualquier píldora de borrador, pregunta si desea "Reemplazar todo" o "Añadir al final" del texto existente.

---

## 🛠️ Detalles de los Cambios y Código Exacto

A continuación se detalla el código exacto modificado en cada uno de los archivos:

### 1. Frontend: Edición de Insumos
* **Archivo**: `web/src/features/inventario/components/productos/EditarProductoModal.tsx`
* **Cambio**: Importar las utilidades de pluralización y cambiar el badge y texto de ayuda estáticos por dinámicos.

```diff
  import { useState, useEffect } from "react";
  import { useUpdateProductoMutation, useGetProductoQuery } from "../../api";
  import { X, Save, Edit2, Info, Bell } from "lucide-react";
+ import { pluralizarUnidad, formatUnidad } from "../../../../utils/pluralizar";
```

```diff
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0.0001"
                  value={formData.factor_conversion}
                  onChange={(e) => setFormData({ ...formData, factor_conversion: e.target.value })}
                  className={`${inputClassName} pr-24`}
                  placeholder="Ej: 100"
                  required
                />
-               <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-50 text-teal-700 text-[10px] font-bold px-2 py-1 rounded">
-                 UNIDADES
-               </div>
+               <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-50 text-teal-700 text-[10px] font-bold px-2 py-1 rounded uppercase">
+                 {pluralizarUnidad(formData.unidad_consumo || "Unidad", Number(formData.factor_conversion) || 1)}
+               </div>
              </div>
            </div>

            {/* Helper Mágico */}
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-4 flex gap-3">
              <div className="text-teal-600 mt-0.5">
                <Info size={20} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-base font-bold text-[#006965]">Ejemplo visual:</span>
                <p className="text-base font-medium text-teal-800/80 leading-relaxed">
-                 1 <span className="font-bold">{formData.unidad_compra || 'Caja'}</span> equivale a <span className="font-bold">{formData.factor_conversion || '100'} {formData.unidad_consumo || 'Pares'}</span>. El sistema descontará "<span className="font-bold">{formData.unidad_consumo || 'Pares'}</span>" automáticamente.
+                 1 <span className="font-bold">{formData.unidad_compra || 'Caja'}</span> equivale a <span className="font-bold">{formatUnidad(Number(formData.factor_conversion) || 1, formData.unidad_consumo || 'Unidad')}</span>. El sistema descontará "<span className="font-bold">{formData.unidad_consumo || 'Unidad'}</span>" automáticamente.
                </p>
              </div>
            </div>
```

---

### 2. Frontend: Creación de Insumos
* **Archivo**: `web/src/features/inventario/components/productos/CrearProductoModal.tsx`
* **Cambio**: Agregar "Metro" a las opciones de consumo y limpiar espacios en Galón.

```diff
   const UNIDADES_MEDIDA = [
     "Litro", "Mililitro", 
-    "Par", "Unidad", "Kit", "Pieza", "Sobre", "Kilo", "Gramo","Lata","Bolsa","Ampolla","Frasco","Miligramo"
+    "Par", "Unidad", "Kit", "Pieza", "Sobre", "Kilo", "Gramo","Lata","Bolsa","Ampolla","Frasco","Miligramo", "Metro"
   ].sort();
 
   const UNIDADES_MEDIDA_MAYOR = [
-    "Barril", "Galón  ", "Metro cúbico", "Docena", "Millar", "Bulto", "Caja", "Tonelada", "Saco", "Rollo", "Resma", "Pallet", "Detal"
+    "Barril", "Galón", "Metro cúbico", "Docena", "Millar", "Bulto", "Caja", "Tonelada", "Saco", "Rollo", "Resma", "Pallet", "Detal"
   ].sort();
```

---

### 3. Backend: Validación de Unidades
* **Archivo**: `api/src/handlers/productosHandlers.js`
* **Cambio**: Ampliar lista de unidades soportadas y validar sin importar mayúsculas/minúsculas.

```diff
 const UNIDADES_MEDIDA = [
-	"Bulto", "Caja", "Detal", "Galón", "Gramo", "Kilo", "Kit", 
-	"Litro", "Mililitro", "Paquete", "Par", "Pieza", "Sobre", "Unidad"
+	// Singular / Mayor
+	"Barril", "Galón", "Metro cúbico", "Docena", "Millar", "Bulto", "Caja", "Tonelada", "Saco", "Rollo", "Resma", "Pallet", "Detal",
+	// Singular / Menor
+	"Litro", "Mililitro", "Par", "Unidad", "Kit", "Pieza", "Sobre", "Kilo", "Gramo", "Lata", "Bolsa", "Ampolla", "Frasco", "Miligramo", "Metro",
+	// Plural / Mayor
+	"Barriles", "Galones", "Metros cúbicos", "Docenas", "Millares", "Bultos", "Cajas", "Toneladas", "Sacos", "Rollos", "Resmas", "Pallets", "Detales",
+	// Plural / Menor
+	"Litros", "Mililitros", "Pares", "Unidades", "Kits", "Piezas", "Sobres", "Kilos", "Gramos", "Latas", "Bolsas", "Ampollas", "Frascos", "Miligramos", "Metros",
+	// Abreviaciones comunes
+	"ml", "g", "kg", "mg", "m", "l"
 ];
```

*(En `createProductoHandler` y `updateProductoHandler`)*:
```diff
-		if (unidad_compra && !UNIDADES_MEDIDA.includes(unidad_compra)) {
-			return res.status(400).json({
-				ok: false,
-				message: "Unidad de compra no válida",
-			});
-		}
-		if (unidad_consumo && !UNIDADES_MEDIDA.includes(unidad_consumo)) {
-			return res.status(400).json({
-				ok: false,
-				message: "Unidad de consumo no válida",
-			});
-		}
+		const lowercasedUnits = UNIDADES_MEDIDA.map(u => u.trim().toLowerCase());
+		if (unidad_compra && !lowercasedUnits.includes(unidad_compra.trim().toLowerCase())) {
+			return res.status(400).json({
+				ok: false,
+				message: "Unidad de compra no válida",
+			});
+		}
+		if (unidad_consumo && !lowercasedUnits.includes(unidad_consumo.trim().toLowerCase())) {
+			return res.status(400).json({
+				ok: false,
+				message: "Unidad de consumo no válida",
+			});
+		}
```

---

### 4. Backend: Consumo Automático en Citas de Mostrador
* **Archivo**: `api/src/controllers/citasControllers.js`
* **Cambio**: Ejecutar el bloque de descuento e inserciones de inventario y Kardex antes de confirmar la transacción de creación de la cita mostrador.

*(Dentro de `createCitaMostradorController`)*:
```diff
		await conn.execute(
			`INSERT INTO esp_comision
				(id_comision, id_cita, id_especialista, porcentaje, monto, estado, fecha_creacion, fecha_pago, id_usuario)
			VALUES
				(?, ?, ?, ?, ?, 'Pendiente', NOW(), NULL, ?)`,
			[
				id_comision,
				id_cita,
				id_especialista,
				porcentaje,
				montoComision,
				usuarioValido,
			],
		);

+		// ── CONSUMO DE INVENTARIO ──
+		// Como la cita de mostrador se registra como atendida (estado_cita = 3) inmediatamente,
+		// debemos generar el consumo de inventario de sus insumos correspondientes.
+		const [insumos] = await conn.execute(
+			`SELECT ei.id_producto, ei.cantidad, p.stock_base_total, p.consumo_actual, p.factor_conversion
+			 FROM inv_eco_insumo ei
+			 INNER JOIN inv_producto p ON p.id_producto = ei.id_producto
+			 WHERE ei.id_eco = ?
+			 FOR UPDATE`,
+			[id_eco]
+		);
+
+		for (const ins of insumos) {
+			const cantidadDescontar = Number(ins.cantidad);
+			const stockBase = Number(ins.stock_base_total);
+			const consumoActual = Number(ins.consumo_actual || 0);
+
+			let nuevoConsumo = consumoActual + cantidadDescontar;
+			let nuevoStock = stockBase - cantidadDescontar;
+
+			// 1) Actualizar stock base y consumo en el producto
+			await conn.execute(
+				"UPDATE inv_producto SET stock_base_total = ?, consumo_actual = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id_producto = ?",
+				[nuevoStock, nuevoConsumo, ins.id_producto]
+			);
+
+			// 2) Registrar consumo global de la cita
+			const id_consumo = crypto.randomUUID();
+			await conn.execute(
+				"INSERT INTO inv_cita_consumo (id_consumo, id_cita, id_producto, cantidad) VALUES (?, ?, ?, ?)",
+				[id_consumo, id_cita, ins.id_producto, cantidadDescontar]
+			);
+
+			// 3) Registrar movimiento en el Kardex
+			const id_kardex = crypto.randomUUID();
+			await conn.execute(
+				`INSERT INTO inv_kardex 
+				(id_kardex, id_producto, tipo_movimiento, cantidad, stock_anterior, stock_posterior, referencia_tipo, referencia_id, id_usuario, observaciones)
+				VALUES (?, ?, 'SALIDA', ?, ?, ?, 'CITA', ?, ?, ?)`,
+				[
+					id_kardex,
+					ins.id_producto,
+					cantidadDescontar,
+					stockBase,
+					nuevoStock,
+					id_cita,
+					usuarioValido,
+					`Consumo cita mostrador: ${cantidadDescontar} unidades base`
+				]
+			);
+		}

		await conn.commit();
```

---

### 5. Backend: Lógica Financiera de Comisiones
* **Archivo**: `api/src/controllers/espComisionControllers.js`
* **Cambio**: Modificar la asignación de `montoIngresoUsd` en `pagarComisionController` y `editarPagoComisionController` para que registre el costo total del examen en lugar de restar la comisión.

*(En `pagarComisionController` y `editarPagoComisionController`)*:
```diff
		const tasaDia = await getTodayBcvRate();
 
 		const montoComisionUsd = round2(Number(comision.monto || 0));
-		const montoIngresoUsd = round2(
-			Math.max(0, Number(comision.eco_precio || 0) - montoComisionUsd),
-		);
+		const montoIngresoUsd = round2(Number(comision.eco_precio || 0));
 
		const tasaDia = await getTodayBcvRate();
 
 		const montoComisionUsd = round2(Number(comision.monto || 0));
-		const montoIngresoUsd = round2(
-			Math.max(0, Number(comision.eco_precio || 0) - montoComisionUsd),
-		);
+		const montoIngresoUsd = round2(Number(comision.eco_precio || 0));
 
 		const normalizedEgreso = normalizeUsdAmounts({
```

---

*(Definición de states/helpers y types en el componente)*:
```tsx
type PlantillaItem = {
	label: string;
	reseña: string;
	recomendaciones: string;
};
```

*(Declaraciones e Handlers dentro del componente)*:
```tsx
	const [customPlantillas, setCustomPlantillas] = useState<Record<string, PlantillaItem>>({});

	// Cargar plantillas personalizadas de localStorage en el montaje
	useEffect(() => {
		try {
			const stored = localStorage.getItem("garvis_custom_templates");
			if (stored) {
				setCustomPlantillas(JSON.parse(stored));
			}
		} catch (e) {
			console.error("Error al cargar plantillas de localStorage:", e);
		}
	}, []);

	const handleSaveTemplate = async () => {
		if (!reseña.trim()) {
			await Swal.fire({
				title: "Reseña vacía",
				text: "Por favor escribe algo en la reseña para poder guardarla como borrador.",
				icon: "warning",
				confirmButtonColor: "#1C837F",
			});
			return;
		}

		const { value: templateName } = await Swal.fire({
			title: "Guardar borrador",
			text: "Guarda la reseña y recomendaciones actuales como una plantilla reusable.",
			input: "text",
			inputLabel: "Nombre de tu borrador/plantilla",
			inputPlaceholder: "Ej: Eco Abdomen - Hígado Graso",
			showCancelButton: true,
			confirmButtonColor: "#1C837F",
			cancelButtonColor: "#d33",
			confirmButtonText: "Guardar",
			cancelButtonText: "Cancelar",
			inputValidator: (value) => {
				if (!value || !value.trim()) {
					return "¡Debes ingresar un nombre para la plantilla!";
				}
			}
		});

		if (templateName) {
			const key = `custom_${Date.now()}`;
			const newTemplate: PlantillaItem = {
				label: templateName.trim(),
				reseña: reseña.trim(),
				recomendaciones: recomendaciones.trim()
			};
			const updated = {
				...customPlantillas,
				[key]: newTemplate
			};
			setCustomPlantillas(updated);
			localStorage.setItem("garvis_custom_templates", JSON.stringify(updated));

			await Swal.fire({
				title: "¡Guardado!",
				text: `Tu borrador "${templateName}" ha sido guardado de forma segura en tu navegador.`,
				icon: "success",
				confirmButtonColor: "#1C837F"
			});
		}
	};

	const handleDeleteTemplate = async (key: string, e: React.MouseEvent) => {
		e.stopPropagation(); // Evitar que haga clic en el botón de cargar al borrar
		const template = customPlantillas[key];
		if (!template) return;

		const result = await Swal.fire({
			title: "¿Eliminar borrador?",
			text: `¿Estás seguro de que deseas eliminar permanentemente el borrador "${template.label}"?`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#d33",
			cancelButtonColor: "#1C837F",
			confirmButtonText: "Sí, eliminar",
			cancelButtonText: "Cancelar"
		});

		if (result.isConfirmed) {
			const updated = { ...customPlantillas };
			delete updated[key];
			setCustomPlantillas(updated);
			localStorage.setItem("garvis_custom_templates", JSON.stringify(updated));

			await Swal.fire({
				title: "Eliminado",
				text: "El borrador ha sido eliminado.",
				icon: "success",
				confirmButtonColor: "#1C837F"
			});
		}
	};
```

*(En la sección JSX del formulario, debajo de la sección de Recomendaciones)*:
```tsx
							{/* Borradores Rápidos (Plantillas) */}
							<div className="rounded-xl border border-brand-800/10 bg-brand-800/5 p-5 mt-4">
								<div className="flex items-center justify-between flex-wrap gap-2">
									<div>
										<label className="block text-base font-semibold text-brand-900">
											Borradores y Plantillas
										</label>
										<p className="mt-1 text-sm text-brand-700">
											Selecciona una plantilla para cargarla o guarda lo que has escrito actualmente como un nuevo borrador.
										</p>
									</div>
									<button
										type="button"
										onClick={handleSaveTemplate}
										className="rounded-lg bg-[#1C837F] px-3.5 py-1.5 text-xs font-bold text-paper transition-all hover:bg-[#156461] hover:shadow-sm flex items-center gap-1.5"
									>
										<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
										</svg>
										Guardar borrador actual
									</button>
								</div>

								{/* List of templates */}
								<div className="mt-4">
									{Object.keys(customPlantillas).length === 0 ? (
										<p className="text-xs text-brand-700 italic bg-white/50 rounded-lg p-3 border border-dashed border-mist">
											No tienes borradores guardados aún. Escribe en la reseña y presiona "Guardar borrador actual" arriba.
										</p>
									) : (
										<div className="flex flex-wrap gap-2">
											{Object.keys(customPlantillas).map((key) => {
												const t = customPlantillas[key];
												return (
													<div
														key={key}
														className="inline-flex items-center rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 pl-3 pr-2 py-1.5 text-sm font-medium transition-all hover:bg-emerald-100/80 gap-1.5"
													>
														<button
															type="button"
															onClick={() => {
																Swal.fire({
																	title: "¿Cómo deseas aplicar este borrador?",
																	text: `Se aplicará tu plantilla personalizada: "${t.label}"`,
																	icon: "question",
																	showDenyButton: true,
																	showCancelButton: true,
																	confirmButtonColor: "#1C837F",
																	denyButtonColor: "#3085d6",
																	confirmButtonText: "Reemplazar todo",
																	denyButtonText: "Añadir al final",
																	cancelButtonText: "Cancelar"
																}).then((result) => {
																	if (result.isConfirmed) {
																		setReseña(t.reseña);
																		setRecomendaciones(t.recomendaciones);
																	} else if (result.isDenied) {
																		setReseña(prev => prev ? `${prev}\n\n${t.reseña}` : t.reseña);
																		setRecomendaciones(prev => prev ? `${prev}\n\n${t.recomendaciones}` : t.recomendaciones);
																	}
																});
															}}
															className="flex items-center gap-1.5 text-left focus:outline-none"
														>
															<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
															</svg>
															<span>{t.label}</span>
														</button>
														<button
															type="button"
															onClick={(e) => handleDeleteTemplate(key, e)}
															className="rounded p-0.5 text-emerald-600 hover:bg-emerald-200 hover:text-emerald-900 transition-colors ml-1"
															title="Eliminar borrador"
														>
															<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
															</svg>
														</button>
													</div>
												);
											})}
										</div>
									)}
								</div>
							</div>
```
```


```

