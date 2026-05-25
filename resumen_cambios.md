# Instrucciones para Aplicar Cambios y Refactorizaciones de Citas

Este documento contiene el resumen detallado de los cambios y correcciones lógicas realizados hoy en el **Sistema Garbis (Frontend y Backend)**. Está diseñado como un prompt instruccional completo para que otra rama o desarrollador pueda aplicar los cambios exactamente en los mismos archivos.

*(Nota: Este resumen excluye todas las configuraciones locales de red e IP dinámica, conteniendo únicamente las correcciones de lógica, datos y UI).*

---

## 📋 Resumen de Mejoras y Bugs Corregidos
1. **Bloqueo de Horas y Fechas Pasadas**: Impide agendar citas de mostrador en el pasado. En el frontend se deshabilitan las fechas anteriores y las horas del día de hoy que ya transcurrieron. En el backend se valida y bloquea con error `400/409`.
2. **Ocultar Horarios ya Reservados**: Los horarios ya ocupados no se muestran en el selector (desaparecen), mientras que los horarios pasados del día de hoy se muestran pero deshabilitados.
3. **Autocompletar Teléfono y Guardado Permanente**: Al buscar un paciente en mostrador se autocompleta su teléfono. Si el moderador lo modifica, al hacer clic en "Siguiente" un modal de SweetAlert2 pregunta si desea actualizarlo permanentemente en su perfil.
4. **Corrección en "Todas las Citas"**:
   * **Teléfono**: Filtra números de ceros (`"0000000000"`) para mostrar en su lugar "Telf: No registrado".
   * **Referencia**: Corrige la columna para que muestre el código de referencia de pago (`cita.pago_referencia`) en lugar del ID de la cita.
5. **Resolución de Conflicto 409 en Registro**: Se corrigió el error de entrada duplicada (`ER_DUP_ENTRY`) que ocurría debido a colisiones en la generación de correos ficticios secuenciales para mostrador (`paciente.mostrador{N}`). Ahora se genera un correo dummy único basado en la cédula: `paciente.mostrador.${cedulaFull}@mostrador.com`.
6. **Filtro de Médicos Inactivos**: Modificación en el endpoint `/medicos` para excluir especialistas desactivados (`u.activo = 1`), evitando que aparezcan en los selectores de citas.
7. **Vinculación de Cita a Usuario Real**: Modificación en la creación de citas para que se vincule la cita directamente al `id_usuario` real del paciente (si está registrado) en lugar de usar siempre el ID dummy de mostrador, permitiendo recuperar su teléfono real en los listados e historiales.

---

## 🛠️ Especificaciones de Cambios por Archivo

### 1. Backend (`api`)

#### 📂 Archivo: `api/src/controllers/citasControllers.js`

* **Modificación 1 (Obtener teléfono en Cédula)**: En la función `getDatosPorCedulaController`, añade `u.telefono` al SELECT de `pacienteRows`:
```javascript
// Antes:
`SELECT u.nombre, u.apellido, u.cedula, p.rif, p.id_paciente ...`

// Después:
`SELECT u.nombre, u.apellido, u.cedula, u.telefono, p.rif, p.id_paciente ...`
```

* **Modificación 2 (Controlador para actualizar teléfono)**: Añade la función controladora de actualización al final del archivo:
```javascript
const updatePacientePhoneMostradorController = async (id_paciente, telefono) => {
	const telefonoTrim = String(telefono || "").trim();
	if (!telefonoTrim) {
		const err = new Error("El teléfono no puede estar vacío");
		err.code = "INVALID_PHONE";
		throw err;
	}
	const [result] = await pool.execute(
		"UPDATE usuario SET telefono = ? WHERE id_usuario = ?",
		[telefonoTrim, id_paciente]
	);
	return { updated: result.affectedRows > 0 };
};

// Exportar al final del archivo:
module.exports = {
    // ...
    updatePacientePhoneMostradorController,
};
```

* **Modificación 3 (Validación de fechas/horas y vinculación a ID real)**: En `createCitaMostradorController`, añade la validación del tiempo de la cita y la vinculación directa de `id_paciente` si es un usuario registrado:
```javascript
// Dentro de createCitaMostradorController:
// ── REGLA 1: Validación de fechas y horas pasadas
if (!fecha_cita) {
    const err = new Error("La fecha de la cita es requerida.");
    err.code = "INVALID_DATE";
    throw err;
}
const rawHora = String(hora_cita || "").trim() || new Date().toTimeString().slice(0, 8);
const horaFinal = /^\d{1,2}:\d{2}(:\d{2})?$/.test(rawHora)
    ? String(rawHora).trim().padEnd(8, ":00").slice(0, 8)
    : rawHora;

const hoy = new Date();
const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

if (fecha_cita < hoyStr) {
    const err = new Error("No se pueden agendar citas en fechas pasadas.");
    err.code = "PAST_DATE";
    throw err;
}
if (fecha_cita === hoyStr) {
    const currentHoraStr = hoy.toTimeString().slice(0, 8);
    if (horaFinal <= currentHoraStr) {
        const err = new Error("No se pueden agendar citas en horas que ya han transcurrido hoy.");
        err.code = "PAST_TIME";
        throw err;
    }
}

// ── Modificación de Vinculación de Paciente Real:
let id_paciente = null;
let id_representado_final = null;
if (id_paciente_titular) {
    if (id_representado) {
        const [repRows] = await conn.execute(
            `SELECT id_representado, id_paciente FROM representado WHERE id_representado = ? LIMIT 1`,
            [id_representado],
        );
        if (repRows.length) {
            const repPaciente = repRows[0].id_paciente;
            if (repPaciente === MOSTRADOR_PACIENTE_ID) {
                await ensureMostradorPacienteBase(conn);
                id_paciente = MOSTRADOR_PACIENTE_ID;
                id_representado_final = id_representado;
            } else if (repPaciente === id_paciente_titular) {
                id_paciente = id_paciente_titular;
                id_representado_final = id_representado;
            }
        }
    } else {
        // Vinculación directa al paciente real (para que guarde su teléfono y aparezca en su panel)
        id_paciente = id_paciente_titular;
    }
}
if (id_paciente == null) {
    id_paciente = await ensureMostradorPacienteBase(conn);
}
```

* **Modificación 4 (Evitar colisión 409 al registrar correo)**: En `crearPacienteMostradorController`, reemplaza la lógica secuencial por un correo único basado en la cédula:
```javascript
// Reemplazar:
const [countRows] = await conn.execute(
    "SELECT COUNT(*) AS total FROM usuario WHERE correo LIKE '%@mostrador.com'",
);
const n = (countRows[0]?.total ?? 0) + 1;
const correo = `paciente.mostrador${n}@mostrador.com`;

// Por:
const correo = `paciente.mostrador.${cedulaFull}@mostrador.com`;
```

---

#### 📂 Archivo: `api/src/handlers/citasHandlers.js`

Añade el controlador handler para actualizar el teléfono:
```javascript
const { updatePacientePhoneMostradorController } = require("../controllers/citasControllers");

const updatePacientePhoneMostradorHandler = async (req, res) => {
	try {
		const { id_paciente, telefono } = req.body;
		if (!id_paciente || !telefono) {
			return res.status(400).json({ ok: false, message: "ID del paciente y teléfono son obligatorios." });
		}
		const result = await updatePacientePhoneMostradorController(id_paciente, telefono);
		return res.status(200).json({ ok: true, data: result });
	} catch (err) {
		console.error("updatePacientePhoneMostradorHandler error:", err);
		return res.status(500).json({ ok: false, message: "Error al actualizar el teléfono." });
	}
};

// Exportar y registrar en module.exports:
module.exports = {
    // ...
    updatePacientePhoneMostradorHandler,
};
```

---

#### 📂 Archivo: `api/src/routes/citasRoutes.js`

Registra la ruta `PATCH` para actualizar el teléfono del paciente:
```javascript
const { updatePacientePhoneMostradorHandler } = require("../handlers/citasHandlers");

// Dentro de las rutas de citas:
citasRoutes.patch("/mostrador/telefono", updatePacientePhoneMostradorHandler);
```

---

#### 📂 Archivo: `api/src/controllers/especialistasControllers.js`

* **Modificación (Ocultar médicos inactivos)**: En `listEspecialistasController`, cambia la condición SQL para filtrar los médicos que estén activos:
```javascript
// Reemplazar:
WHERE 1=1

// Por:
WHERE u.activo = 1
```

---

### 2. Frontend (`web`)

#### 📂 Archivo: `web/src/features/citas/citasApi.ts`

Añade la mutación para actualizar el teléfono en la API de RTK Query:
```typescript
// Dentro de endpoints en citasApi:
updatePacientePhoneMostrador: builder.mutation<
    { updated: boolean },
    { id_paciente: string; telefono: string }
>({
    query: (body) => ({
        url: "/citas/mostrador/telefono",
        method: "PATCH",
        body,
    }),
    transformResponse: (response: { ok: boolean; data: { updated: boolean } }) => response.data,
    invalidatesTags: ["Citas"],
}),

// Exportar el hook generado:
export const {
    // ...
    useUpdatePacientePhoneMostradorMutation,
} = citasApi;
```

---

#### 📂 Archivo: `web/src/features/inventario/hooks/useCitaMostradorForm.ts`

* **Modificación 1 (Autocompletar teléfono y almacenar original)**:
```typescript
// Declarar estados:
const [originalPhone, setOriginalPhone] = useState("");
const [idPacienteWeb, setIdPacienteWeb] = useState<string | null>(null);

// En handleCargarDatosAnteriores:
const telefono = (tienePaciente && paciente!.telefono ? paciente!.telefono : null) || "";
setOriginalPhone(telefono);
setForm((prev) => ({
    ...prev,
    nombre: nombre || prev.nombre,
    apellido: apellido || prev.apellido,
    telefono: telefono || prev.telefono,
    rif: rif ?? prev.rif,
}));
if (tienePaciente && paciente!.id_paciente) {
    setIdPacienteWeb(paciente!.id_paciente);
}
```

* **Modificación 2 (Pasar el ID resuelto del paciente en handleSubmit)**:
```typescript
await onSave({
    // ...
    cedula: `${form.tipo_cedula}${form.cedula}`.trim(),
    rif: form.rif.trim() || undefined,
    referencia: form.referencia.trim() || undefined,
    // Pasar id_paciente del usuario real
    ...(vincularCitaAlTitular && vincularRepresentado
        ? { id_paciente: vincularRepresentado.id_paciente, id_representado: vincularRepresentado.id_representado }
        : idPacienteWeb && !vincularRepresentado
            ? { id_paciente: idPacienteWeb }
            : form.id_paciente_resolved
                ? { id_paciente: form.id_paciente_resolved }
                : {}),
});
```

* **Exportaciones del hook**: Asegúrate de retornar `idPacienteWeb`, `originalPhone`, `setOriginalPhone` del hook `useCitaMostradorForm`.

---

#### 📂 Archivo: `web/src/features/inventario/pages/CitaMostradorPage.tsx`

* **Modificación 1 (Importar mutación de actualización de teléfono)**:
```typescript
import { useUpdatePacientePhoneMostradorMutation } from "../../citas/citasApi";
// Dentro del componente:
const [updatePhone] = useUpdatePacientePhoneMostradorMutation();
```

* **Modificación 2 (Calendario: Bloqueo de días anteriores)**:
En la generación de celdas o rendering del calendario, desactiva la selección si es del pasado:
```typescript
// Obtener fecha de hoy en formato YYYY-MM-DD local
const hoy = new Date();
const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

// Deshabilitar celdas anteriores:
const isPastDate = cell.iso < hoyStr;
```

* **Modificación 3 (Slots: Ocultar reservados y deshabilitar horas pasadas de hoy)**:
En la visualización de los slots de horas (por ejemplo, en morningSlots / afternoonSlots):
```typescript
// Ocultar ocupados usando la función de disponibilidad:
const slotsVisibles = slots.filter(o => horaDisponible(o.value));

// Deshabilitar si es hoy y la hora ya pasó:
const esHoy = form.fecha_cita === hoyStr;
const currentHoraStr = new Date().toTimeString().slice(0, 8); // HH:MM:SS
const isPastTime = esHoy && (o.value <= currentHoraStr);
// Elemento queda: disabled={isPastTime}
```

* **Modificación 4 (Modal SweetAlert2 al hacer clic en Siguiente)**:
En la función `validatePaso(p)` (cuando `p === 1`):
```typescript
// Modal de confirmación para cambiar el teléfono si hay uno guardado en BD y se modificó
if (idPacienteWeb && form.telefono !== originalPhone && form.telefono?.trim()) {
    const confirmPhone = await Swal.fire({
        title: '¿Actualizar teléfono?',
        text: '¿Deseas actualizar el número de teléfono del usuario en su perfil permanente?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, actualizar',
        cancelButtonText: 'No, dejar el anterior',
        confirmButtonColor: '#006965',
    });

    if (confirmPhone.isConfirmed) {
        try {
            await updatePhone({ id_paciente: idPacienteWeb, telefono: form.telefono }).unwrap();
            setOriginalPhone(form.telefono);
        } catch (e) {
            await Swal.fire({ icon: "error", title: "Error", text: "No se pudo actualizar el teléfono." });
            return false;
        }
    } else {
        setForm(prev => ({ ...prev, telefono: originalPhone }));
    }
}
```

---

#### 📂 Archivo: `web/src/features/moderadores/pages/TodasLasCitasPage.tsx`

* **Modificación 1 (Filtro de Teléfonos Vacíos o en Cero)**:
```typescript
// Reemplazar renderizado de teléfono por condicional seguro:
<p className="text-sm text-zinc-400">
    {cita.paciente_telefono && 
     cita.paciente_telefono !== "00000000" && 
     cita.paciente_telefono !== "0000000000" && 
     cita.paciente_telefono !== "00000000000" &&
     cita.paciente_telefono.replace(/0/g, '') !== '' 
        ? `Telf: ${cita.paciente_telefono}` 
        : "Telf: No registrado"}
</p>
```

* **Modificación 2 (Mostrar referencia de pago en lugar de ID de cita)**:
```typescript
// Reemplazar:
Ref. cita: {cita.id_cita}

// Por:
Ref. pago: {cita.pago_referencia || "N/A"}
```
