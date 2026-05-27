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
