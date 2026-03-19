# Registro de Actualizaciones Visuales y de Experiencia de Usuario (UX/UI)

Este documento registrará paso a paso las modificaciones realizadas en la interfaz gráfica del sitio web, con el propósito de simplificar y modernizar la estructura visual desde una perspectiva UX/UI para el proyecto de la universidad.

## Reglas del Rediseño
- **Minimalismo y modernidad:** Interfaces más limpias, usables e intuitivas.
- **Respeto absoluto por el Backend y Arquitectura:** No se modifican los procesos, ni la estructura de carpetas/archivos ya establecida en el servidor o cliente, solo se redefine visualmente.
- **Enfoque Creciente:** Los componentes se abordan y documentan de forma individual para mantener control visual sobre cada sección.

---

## Historial de Cambios

### [19-Marzo-2026] - Inicialización del Rediseño
- **Sección:** Setup del Proyecto Universitario.
- **Acción:** Se establece este archivo `CHANGELOG_UI.md` como el registro oficial e inmutable de los cambios de Experiencia de Usuario (UX) e Interfaz (UI).
- **Justificación Académica:** Establecer trazabilidad en las decisiones de diseño desde el día 1, documentando "el porqué" detrás de cada simplificación visual o agregado moderno para la defensa del proyecto.

### [19-Marzo-2026] - Rediseño de Disponibilidad Pendientes
- **Sección:** `/disponibilidad/pendientes`
- **Componentes modificados:** `DisponibilidadPendientesPage`, `FiltrosDisponibilidadPendientes`, `DisponibilidadPendienteCard`, `FiltroFechaCard`.
- **Acción:** Reestructuración visual hacia un diseño minimalista premium. Se reemplazaron bordes fuertes por elevación suave (shadow-sm, backdrop-blur) y estética Glassmorphism. Se agruparon las acciones masivas en una barra flotante (`sticky top-4`) para mejor accesibilidad.
- **Justificación Académica:** Se redujo drásticamente la carga cognitiva del usuario al interactuar con los filtros y la tabla. El uso de jerarquía visual (fuentes semibold y badges coloridos) facilita el escaneo rápido de médicos y estados, mientras que los botones secundarios de rechazo toman un estilo _outline_ para no competir con el llamado a la acción principal ("Aprobar").

### [19-Marzo-2026] - Ajustes v2: Compactación de Interfaz
- **Sección:** `/disponibilidad/pendientes`
- **Acciones:**
  1. Compresión severa de la barra de filtros (de 7 bloques verticales a 2 filas horizontales).
  2. Simplificación del "card" de eliminación masiva hacia una sola franja de advertencia.
  3. Reorganización lógica de la barra sticky de selección, dividiendo con un separador visual los "Controles de Grupo" de las "Acciones Ejecutables".
- **Justificación Académica:** Cumplir con la Ley de Hick (reduciendo el tiempo de toma de decisiones frente a acciones masivas) al optimizar el espacio vertical útil (`above the fold`) para que la tabla principal sea el foco único de atención visual, eliminando texto redundante a favor de tooltips (`title=" "`).

### [19-Marzo-2026] - Ajustes v3: Optimización Extrema de Tarjetas (Cards)
- **Sección:** `/disponibilidad/pendientes`
- **Componente:** `DisponibilidadPendienteCard`
- **Acciones:**
  1. Transformación radical del layout: de una caja de bloque alta (`flex-col`) a una franja horizontal super-compacta (pseudo-tabla).
  2. Alineación de "Fecha", "Hora" y "Eco" en una sola línea inline separada por divisores visuales cortos.
  3. Redimensionamiento de los botones de acción y alineación estrecha a la derecha. Ajustes tipográficos finos (ej. `text-[10px] uppercase font-bold tracking-wider`) para mantener la elegancia en los Badges.
- **Justificación Académica:** Reducción del recorrido visual (Eye-Tracking F-Pattern) al simplificar el escaneo de múltiples registros. Al tener una altura fija drásticamente menor, se incrementa la densidad de información en el "viewport", permitiendo al usuario procesar muchas más solicitudes simultáneas por pantalla sin requerir desplazamiento continuo (mitigando el _scroll fatigue_).

### [19-Marzo-2026] - Ajustes v4: Transición a Layout de 2 Columnas (Sidebar)
- **Sección:** `/disponibilidad/pendientes`
- **Componentes:** `DisponibilidadPendientesPage` y `FiltrosDisponibilidadPendientes`
- **Acciones:**
  1. Cambio estructural global de apilamiento vertical a Flexbox de 2 columnas (`xl:flex-row`).
  2. Implementación de un **Panel Lateral Derecho (Sidebar)** fijado (`sticky`) de 72 rem de ancho para albergar los controles de filtrado.
  3. Rediseño del componente de Filtros para una orientación 100% vertical, integrando tipografía de etiquetas en versión miniatura y estandarizando los anchos de inputs.
- **Justificación Académica:** Alineación con buenas prácticas de interfaces de escritorio para paneles de control hiper-densos (Datatables/Dashboards). Mover controles persistentes hacia la derecha aprovecha la zona visual periférica, y al usar `position: sticky`, el usuario no pierde el contexto de búsqueda cruzada mientras desciende por la lista principal.

### [19-Marzo-2026] - Ajustes v5: Consolidación de Acciones Masivas
- **Sección:** `/disponibilidad/pendientes`
- **Componente:** `DisponibilidadPendientesPage`
- **Acciones:**
  1. Fusión estructural paramétrica de dos barras flotantes ("Eliminar en Lote" y "Selección Masiva") dentro de un único contenedor unificado visualmente con el fondo de marca (`bg-brand-50/50`).
  2. Implementación de renderizado condicional inteligente: las opciones de selección desaparecen cuando la página no contiene datos (evitando clicks muertos), mientras que las acciones de eliminación global ("Eliminar pasada") permanecen accesibles de forma persistente.
- **Justificación Académica:** Aplicación del principio de *Agrupamiento por Proximidad y Región Común (Leyes de Gestalt)*: al agrupar funciones operacionales idénticas (Batch Actions) bajo un mismo contenedor y color de fondo, se reduce dramáticamente la carga cognitiva. El cerebro lo procesa como un único "Centro de Mando" en lugar de dos herramientas competidoras.
