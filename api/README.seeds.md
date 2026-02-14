# Seeds y flujo de inicialización (Garvis API)

Este documento explica:
- cómo arranca la API y cuándo corre la inicialización,
- cómo forzar reinicio de base de datos,
- qué datos exactos crean los seeds.

## Flujo de arranque

Al iniciar la API (`npm start`), el flujo en `index.js` es:
1. `deleteDatabaseOnStartup()`
2. `testConnection()`
3. `initDatabase()`
4. `runMigrations()`
5. `startCleanupDisponibilidad()`
6. levantar servidor Express

### ¿Cuándo se borra/recrea la base?

Se controla por variables de entorno:
- `RESET_DATABASE_ON_STARTUP=true`: intenta hacer `DROP + CREATE` de la DB al arrancar.
- `ALLOW_DB_RESET_IN_PRODUCTION=true`: solo necesario si además `NODE_ENV=production` y realmente quieres permitir ese borrado.

Comportamiento seguro por defecto:
- si `RESET_DATABASE_ON_STARTUP=false` (o no está): no borra nada.
- si `NODE_ENV=production` y `ALLOW_DB_RESET_IN_PRODUCTION!=true`: no borra nada.

### ¿Cuándo corre el seeder?

`initDatabase()` solo corre seeds si la base está vacía (sin tablas).
Si ya existen tablas, salta inicialización.

## Variables recomendadas

En `.env.example`:
- `RESET_DATABASE_ON_STARTUP=false`
- `ALLOW_DB_RESET_IN_PRODUCTION=false`

Para entorno local de pruebas (reseteo automático):
- `NODE_ENV=development`
- `RESET_DATABASE_ON_STARTUP=true`
- `ALLOW_DB_RESET_IN_PRODUCTION=false`

## Resumen de datos semilla

## 1) Roles
Se crean (si no existen):
- `admin`
- `moderador`
- `especialista`
- `paciente`

## 2) Usuarios base (8)
Contraseña por defecto para todos: `test123`

### Administradores
- `admin1@garvis.com`
- `admin2@garvis.com`

Nota: en seed actual, estos dos se crean con `genero = "Otro"`.

### Moderadores
- `moderador1@garvis.com`
- `moderador2@garvis.com`

### Pacientes
- `paciente1@garvis.com`
- `paciente2@garvis.com`

### Especialistas
- `especialista1@garvis.com`
- `especialista2@garvis.com`

## 3) Especialidades y ecos
- Especialidades:
  - Cardiología
  - Radiología
- Ecos:
  - Eco Doppler (`precio=100`, `duracion_min=30`)
  - Eco Abdomen (`precio=120`, `duracion_min=40`)
- Asignaciones especialista-eco:
  - Especialista 1 -> Eco Doppler
  - Especialista 2 -> Eco Abdomen

## 4) Paciente y representado
- 2 filas en `paciente`
- 2 filas en `representado` (uno por paciente)

## 5) Disponibilidad y citas
- 2 bloques de `disponibilidad` aprobados
- 2 `cita` atendidas y pagadas (`estado_cita=3`, `estado_pago=1`):
  - 1 cita origen `web`
  - 1 cita origen `mostrador`
- 1 fila en `cita_mostrador` para la cita de mostrador

## 6) Pagos de cita
- 2 filas en `pagos`
  - pago 1: `PagoMovil`, referencia `REF-TEST-PAGO-001`
  - pago 2: `Zelle`, referencia `REF-TEST-PAGO-002`
- tasa usada en seed extendido: `tasaDia = 36`

## 7) Resultados, informes, notificaciones
- 2 `resultado`
- 2 `informe`
- 2 `notificacion`

## 8) Inventario
- 2 productos (`inv_producto`):
  - Gel conductor
  - Guantes
- 2 compras (`inv_producto_compra`)
- 2 ajustes (`inv_producto_ajuste`)

## 9) Entes legales y obligaciones
- 2 entes (`leg_ente`):
  - SENIAT
  - Alcaldía
- 2 obligaciones (`leg_obligacion`):
  - IVA
  - Aseo urbano
- 2 pagos (`leg_pago`)

## 10) Nómina
- 2 empleados (`nom_empleado`)
- 2 pagos de nómina (`nom_pago`)

## 11) Alquiler
- 2 contratos (`alq_contrato`)
- 2 pagos (`alq_pago`)

## 12) Comisiones especialistas
- 2 filas en `esp_comision`:
  - 1 `Pagada` (monto 20)
  - 1 `Pendiente` (monto 30)

## 13) Facturación (`fac_movimiento`)
Se insertan 10 movimientos de prueba:
- 1 ingreso `CITA_PAGO`
- 1 egreso `ESP_COMISION`
- 2 egresos `INV_COMPRA`
- 2 egresos `LEG_PAGO`
- 2 egresos `NOM_PAGO`
- 2 egresos `ALQ_PAGO`

## Comandos útiles

Desde carpeta `api/`:
- Iniciar API: `npm start`
- Ejecutar init manual: `node src/utils/initDatabase.js`

Si quieres reset total al arrancar:
1. poner `RESET_DATABASE_ON_STARTUP=true` en `.env`
2. iniciar API (`npm start`)
3. volver a `false` al terminar pruebas

## Observaciones importantes

- `initDatabase()` no sobreescribe datos si ya hay tablas; solo inicializa en DB vacía.
- El reset por variables hace `DROP + CREATE` de la base indicada por `DB_NAME`.
- En producción, el reset queda bloqueado salvo habilitación explícita con `ALLOW_DB_RESET_IN_PRODUCTION=true`.
