-- =========================
-- Script SQL para crear todas las tablas (ACTUALIZADO)
-- NOTA: Este script asume que la base de datos 'garvis' ya existe
-- NO incluye DROP. Solo CREATE TABLE IF NOT EXISTS.
-- Cambios:
--   - Se reemplaza Inventario viejo (producto/producto_lote/inventario_movimiento) por:
--       inv_producto, inv_producto_compra, inv_producto_ajuste (sin unidad/stock_minimo)
--   - Se reemplaza Obligaciones administrativas (obligacion/obligacion_bitacora) por Entes legales:
--       leg_ente, leg_obligacion, leg_pago
--   - Se agregan: Nómina (nom_empleado/nom_pago), Alquiler (alq_contrato/alq_pago),
--                 Especialistas comisión (esp_comision), Facturación global (fac_movimiento)
-- =========================

USE garvis;

-- =========================
-- 1) Roles
-- =========================
CREATE TABLE
IF NOT EXISTS roles
(
  id_rol CHAR
(36) NOT NULL,
  nombre VARCHAR
(20) NOT NULL,
  PRIMARY KEY
(id_rol),
  UNIQUE KEY uk_roles_nombre
(nombre)
) ENGINE=InnoDB;

-- =========================
-- 2) Usuario (tabla base)
-- =========================
CREATE TABLE
IF NOT EXISTS usuario
(
  id_usuario CHAR
(36) NOT NULL,
  nombre VARCHAR
(50) NOT NULL,
  apellido VARCHAR
(60) NOT NULL,
  genero ENUM
('Masculino','Femenino','Otro') NOT NULL,
  cedula VARCHAR
(20) NOT NULL,
  correo VARCHAR
(80) NOT NULL,
  telefono VARCHAR
(20) NOT NULL,
  contrasena VARCHAR
(255) NOT NULL,
  activo TINYINT
(1) NOT NULL DEFAULT 1,
  fecha_nacimiento DATE NOT NULL,
  fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at TIMESTAMP NULL DEFAULT NULL ON
UPDATE CURRENT_TIMESTAMP,
  id_rol CHAR(36)
NOT NULL,

  PRIMARY KEY
(id_usuario),
  UNIQUE KEY uk_usuario_correo
(correo),
  UNIQUE KEY uk_usuario_cedula
(cedula),
  KEY idx_usuario_id_rol
(id_rol),
  CONSTRAINT fk_usuario_rol
    FOREIGN KEY
(id_rol) REFERENCES roles
(id_rol)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT
) ENGINE=InnoDB;

-- =========================
-- 3) Especialidad
-- =========================
CREATE TABLE
IF NOT EXISTS especialidad
(
  id_especialidad CHAR
(36) NOT NULL,
  nombre VARCHAR
(60) NOT NULL,
  PRIMARY KEY
(id_especialidad),
  UNIQUE KEY uk_especialidad_nombre
(nombre)
) ENGINE=InnoDB;

-- =========================
-- 4) Paciente (hereda de usuario)
-- id_paciente = id_usuario
-- =========================
CREATE TABLE
IF NOT EXISTS paciente
(
  id_paciente CHAR
(36) NOT NULL,
  tipo_sangre VARCHAR
(10) NOT NULL,
  descripcion VARCHAR
(120) NOT NULL,
  direccion VARCHAR
(120) NULL,
  rif VARCHAR
(15) NOT NULL,
  email_verificado TINYINT
(1) NOT NULL DEFAULT 0,
  fecha_verificacion TIMESTAMP NULL DEFAULT NULL,
  contacto_emergencia_nombre VARCHAR
(80) NULL,
  contacto_emergencia_telefono VARCHAR
(20) NULL,

  PRIMARY KEY
(id_paciente),
  KEY idx_paciente_rif
(rif),
  UNIQUE KEY uk_paciente_rif
(rif),
  CONSTRAINT fk_paciente_usuario
    FOREIGN KEY
(id_paciente) REFERENCES usuario
(id_usuario)
    ON
UPDATE CASCADE
    ON
DELETE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 4.1) Email verificacion (solo paciente)
-- =========================
CREATE TABLE
IF NOT EXISTS email_verificacion
(
  id_verificacion CHAR
(36) NOT NULL,
  id_paciente CHAR
(36) NOT NULL,
  token_hash VARCHAR
(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY
(id_verificacion),
  UNIQUE KEY uk_email_verificacion_token
(token_hash),
  KEY idx_email_verificacion_paciente
(id_paciente),
  CONSTRAINT fk_email_verificacion_paciente
    FOREIGN KEY
(id_paciente) REFERENCES paciente
(id_paciente)
    ON
UPDATE CASCADE
    ON
DELETE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 4.2) Password reset
-- =========================
CREATE TABLE
IF NOT EXISTS password_reset
(
  id_reset CHAR
(36) NOT NULL,
  id_usuario CHAR
(36) NOT NULL,
  token_hash VARCHAR
(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY
(id_reset),
  UNIQUE KEY uk_password_reset_token
(token_hash),
  KEY idx_password_reset_usuario
(id_usuario),
  CONSTRAINT fk_password_reset_usuario
    FOREIGN KEY
(id_usuario) REFERENCES usuario
(id_usuario)
    ON
UPDATE CASCADE
    ON
DELETE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 5) Especialista (hereda de usuario)
-- id_especialista = id_usuario
-- =========================
CREATE TABLE
IF NOT EXISTS especialista
(
  id_especialista CHAR
(36) NOT NULL,
  id_especialidad CHAR
(36) NOT NULL,
  codigo_colegiatura VARCHAR
(30) NULL,
  porcentaje DECIMAL
(5,2) NOT NULL DEFAULT 0,

  PRIMARY KEY
(id_especialista),
  KEY idx_especialista_especialidad
(id_especialidad),

  CONSTRAINT fk_especialista_usuario
    FOREIGN KEY
(id_especialista) REFERENCES usuario
(id_usuario)
    ON
UPDATE CASCADE
    ON
DELETE CASCADE,

  CONSTRAINT fk_especialista_especialidad
    FOREIGN KEY
(id_especialidad) REFERENCES especialidad
(id_especialidad)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT
) ENGINE=InnoDB;

-- =========================
-- 6) Representado (dependiente de paciente)
-- =========================
CREATE TABLE
IF NOT EXISTS representado
(
  id_representado CHAR
(36) NOT NULL,
  id_paciente CHAR
(36) NOT NULL,
  nombre VARCHAR
(60) NOT NULL,
  apellido VARCHAR
(60) NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  cedula VARCHAR
(20) NULL,
  genero ENUM
('Masculino','Femenino','Otro') NOT NULL,
  parentesco VARCHAR
(40) NULL,

  PRIMARY KEY
(id_representado),
  KEY idx_representado_paciente
(id_paciente),

  CONSTRAINT fk_representado_paciente
    FOREIGN KEY
(id_paciente) REFERENCES paciente
(id_paciente)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT
) ENGINE=InnoDB;

-- =========================
-- 7) Eco
-- =========================
CREATE TABLE
IF NOT EXISTS eco
(
  id_eco CHAR
(36) NOT NULL,
  nombre VARCHAR
(100) NOT NULL,
  precio DECIMAL
(10,2) NOT NULL,
  duracion_min INT NOT NULL DEFAULT 0,
  activo TINYINT
(1) NOT NULL DEFAULT 1,
  PRIMARY KEY
(id_eco)
) ENGINE=InnoDB;

-- =========================
-- 7.1) Especialista-Eco (relación muchos a muchos)
-- =========================
CREATE TABLE
IF NOT EXISTS especialista_eco
(
  id_especialista CHAR
(36) NOT NULL,
  id_eco CHAR
(36) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY
(id_especialista, id_eco),
  KEY idx_esp_eco_especialista
(id_especialista),
  KEY idx_esp_eco_eco
(id_eco),
  CONSTRAINT fk_esp_eco_especialista 
    FOREIGN KEY
(id_especialista) REFERENCES especialista
(id_especialista) 
    ON
UPDATE CASCADE
    ON
DELETE CASCADE,
  CONSTRAINT fk_esp_eco_eco 
    FOREIGN KEY
(id_eco) REFERENCES eco
(id_eco) 
    ON
UPDATE CASCADE
    ON
DELETE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 8) Disponibilidad (bloques propuestos)
-- =========================
CREATE TABLE
IF NOT EXISTS disponibilidad
(
  id_disponibilidad CHAR
(36) NOT NULL,
  id_especialista CHAR
(36) NOT NULL,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  id_eco CHAR
(36) NULL,
  estado TINYINT NOT NULL DEFAULT 0, -- 0 Propuesto, 1 Aprobado, 2 Rechazado, 3 Cancelado, 4 Reservado
  creado_por CHAR
(36) NOT NULL,
  aprobado_por CHAR
(36) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL DEFAULT NULL ON
UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY
(id_disponibilidad),
  KEY idx_disp_especialista_fecha
(id_especialista, fecha),
  KEY idx_disp_estado
(estado),
  KEY idx_disp_creado_por
(creado_por),
  KEY idx_disp_aprobado_por
(aprobado_por),
  KEY idx_disp_eco
(id_eco),

  CONSTRAINT fk_disp_especialista
    FOREIGN KEY
(id_especialista) REFERENCES especialista
(id_especialista)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT,

  CONSTRAINT fk_disp_creado_por
    FOREIGN KEY
(creado_por) REFERENCES usuario
(id_usuario)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT,

  CONSTRAINT fk_disp_aprobado_por
    FOREIGN KEY
(aprobado_por) REFERENCES usuario
(id_usuario)
    ON
UPDATE CASCADE
    ON DELETE SET NULL,

  CONSTRAINT fk_disponibilidad_eco
FOREIGN KEY
(id_eco) REFERENCES eco
(id_eco)
    ON
UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- =========================
-- 9) Cita
-- =========================
CREATE TABLE
IF NOT EXISTS cita
(
  id_cita CHAR
(36) NOT NULL,
  id_paciente CHAR
(36) NOT NULL,
  id_representado CHAR
(36) NULL,
  id_especialista CHAR
(36) NOT NULL,
  id_eco CHAR
(36) NOT NULL,
  fecha_cita DATE NOT NULL,
  hora_cita TIME NOT NULL,
  orden VARCHAR
(255) NOT NULL,
  id_disponibilidad CHAR
(36) NULL,
  origen_cita ENUM
('web','mostrador') NOT NULL DEFAULT 'web',

  estado_cita TINYINT NOT NULL DEFAULT 0, -- 0 Pendiente, 1 Confirmada, 2 Cancelada, 3 Atendida
  estado_pago TINYINT NOT NULL DEFAULT 0, -- 0 Pendiente, 1 Pagado, 2 Rechazado
  creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY
(id_cita),
  KEY idx_cita_paciente
(id_paciente),
  KEY idx_cita_representado
(id_representado),
  KEY idx_cita_especialista
(id_especialista),
  KEY idx_cita_eco
(id_eco),
  KEY idx_cita_origen
(origen_cita),
  UNIQUE KEY uk_cita_disponibilidad
(id_disponibilidad),
  KEY idx_cita_paciente_representado
(id_paciente, id_representado),

  CONSTRAINT fk_cita_paciente
    FOREIGN KEY
(id_paciente) REFERENCES paciente
(id_paciente)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT,

  CONSTRAINT fk_cita_representado
    FOREIGN KEY
(id_representado) REFERENCES representado
(id_representado)
    ON
UPDATE CASCADE
    ON DELETE SET NULL,

  CONSTRAINT fk_cita_especialista
FOREIGN KEY
(id_especialista) REFERENCES especialista
(id_especialista)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT,

  CONSTRAINT fk_cita_eco
    FOREIGN KEY
(id_eco) REFERENCES eco
(id_eco)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT,

  CONSTRAINT fk_cita_disponibilidad
    FOREIGN KEY
(id_disponibilidad) REFERENCES disponibilidad
(id_disponibilidad)
    ON
UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- =========================
-- 9.1) Cita mostrador (detalle de paciente no registrado)
-- =========================
CREATE TABLE
IF NOT EXISTS cita_mostrador
(
  id_cita CHAR
(36) NOT NULL,
  nombre VARCHAR
(60) NOT NULL,
  apellido VARCHAR
(60) NOT NULL,
  cedula VARCHAR
(20) NOT NULL,
  rif VARCHAR
(15) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY
(id_cita),
  KEY idx_cita_mostrador_cedula
(cedula),
  KEY idx_cita_mostrador_rif
(rif),

  CONSTRAINT fk_cita_mostrador_cita
    FOREIGN KEY
(id_cita) REFERENCES cita
(id_cita)
    ON
UPDATE CASCADE
    ON
DELETE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 9) Resultado
-- =========================
CREATE TABLE
IF NOT EXISTS resultado
(
  id_resultado CHAR
(36) NOT NULL,
  id_cita CHAR
(36) NOT NULL,
  id_especialista CHAR
(36) NOT NULL,
  nombre VARCHAR
(255) NULL,
  archivo TEXT NULL,
  estado_resultado TINYINT NOT NULL DEFAULT 0, -- 0 Pendiente, 1 Vacío, 2 Con resultados
  fecha_emision TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_publicacion TIMESTAMP NULL DEFAULT NULL,

  PRIMARY KEY
(id_resultado),
  UNIQUE KEY uk_resultado_cita
(id_cita),
  KEY idx_resultado_especialista
(id_especialista),

  CONSTRAINT fk_resultado_cita
    FOREIGN KEY
(id_cita) REFERENCES cita
(id_cita)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT,

  CONSTRAINT fk_resultado_especialista
    FOREIGN KEY
(id_especialista) REFERENCES especialista
(id_especialista)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT
) ENGINE=InnoDB;

-- =========================
-- 10) Informe
-- =========================
CREATE TABLE
IF NOT EXISTS informe
(
  id_informe CHAR
(36) NOT NULL,
  id_cita CHAR
(36) NOT NULL,
  id_especialista CHAR
(36) NOT NULL,
  reseña TEXT NULL,
  recomendaciones TEXT NULL,
  firma_url TEXT NULL,
  informe_pdf_url VARCHAR
(255) NULL,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON
UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY
(id_informe),
  UNIQUE KEY uk_informe_cita
(id_cita),
  KEY idx_informe_especialista
(id_especialista),

  CONSTRAINT fk_informe_cita
    FOREIGN KEY
(id_cita) REFERENCES cita
(id_cita)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT,

  CONSTRAINT fk_informe_especialista
    FOREIGN KEY
(id_especialista) REFERENCES especialista
(id_especialista)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT
) ENGINE=InnoDB;

-- =========================
-- 11) Pagos (Citas)
-- =========================
CREATE TABLE
IF NOT EXISTS pagos
(
  id_pago CHAR
(36) NOT NULL,
  id_cita CHAR
(36) NOT NULL,
  id_paciente CHAR
(36) NOT NULL,
  metodo ENUM
('Transferencia','PagoMovil','Efectivo','Zelle','Otro') NOT NULL,
  imagen VARCHAR
(255) NOT NULL,
  banco_origen VARCHAR
(100) NOT NULL,
  banco_destino VARCHAR
(100) NOT NULL,
  monto DECIMAL
(10,2) NOT NULL,
  monto_usd DECIMAL
(12,2) NOT NULL DEFAULT 0,
  monto_bs DECIMAL
(14,2) NOT NULL DEFAULT 0,
  cedula_pagador VARCHAR
(20) NOT NULL,
  telefono_pagador VARCHAR
(20) NOT NULL,
  referencia VARCHAR
(64) NOT NULL,
  estado_pago TINYINT NOT NULL DEFAULT 0, -- 0 Pendiente, 1 Aprobado, 2 Rechazado
  fecha_pago TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_validacion TIMESTAMP NULL DEFAULT NULL,
  validado_por CHAR
(36) NULL,
  tasa_dia_bcv DECIMAL
(12,4) NOT NULL DEFAULT 0 COMMENT 'Tasa BCV del día al registrar el pago (Bs. por USD)',

  PRIMARY KEY
(id_pago),
  UNIQUE KEY uk_pagos_cita
(id_cita),
  UNIQUE KEY uk_pagos_referencia
(referencia),
  KEY idx_pagos_cita
(id_cita),
  KEY idx_pagos_paciente
(id_paciente),
  KEY idx_pagos_validado_por
(validado_por),

  CONSTRAINT fk_pagos_cita
    FOREIGN KEY
(id_cita) REFERENCES cita
(id_cita)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT,

  CONSTRAINT fk_pagos_paciente
    FOREIGN KEY
(id_paciente) REFERENCES paciente
(id_paciente)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT,

  CONSTRAINT fk_pagos_validado_por
    FOREIGN KEY
(validado_por) REFERENCES usuario
(id_usuario)
    ON
UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- =========================
-- 11) Notificaciones
-- =========================
CREATE TABLE
IF NOT EXISTS notificacion
(
  id_notificacion CHAR
(36) NOT NULL,
  id_usuario CHAR
(36) NOT NULL,
  titulo VARCHAR
(120) NOT NULL,
  mensaje VARCHAR
(255) NOT NULL,
  tipo VARCHAR
(40) NOT NULL,
  leida TINYINT
(1) NOT NULL DEFAULT 0,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY
(id_notificacion),
  KEY idx_notificacion_usuario
(id_usuario),

  CONSTRAINT fk_notificacion_usuario
    FOREIGN KEY
(id_usuario) REFERENCES usuario
(id_usuario)
    ON
UPDATE CASCADE
    ON
DELETE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 12) ADMIN - INVENTARIO NUEVO (Productos)
-- =========================
CREATE TABLE
IF NOT EXISTS inv_producto
(
  id_producto CHAR
(36) NOT NULL,
  nombre VARCHAR
(255) NOT NULL,
  stock_actual INT NOT NULL DEFAULT 0,
  activo TINYINT
(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL DEFAULT NULL ON
UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY
(id_producto),
  UNIQUE KEY uk_inv_producto_nombre
(nombre)
) ENGINE=InnoDB;

CREATE TABLE
IF NOT EXISTS inv_producto_compra
(
  id_compra CHAR
(36) NOT NULL,
  id_producto CHAR
(36) NOT NULL,
  fecha_ingreso DATE NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL
(10,2) NOT NULL,
  precio_total DECIMAL
(10,2) NOT NULL,
  monto_usd DECIMAL
(12,2) NOT NULL DEFAULT 0,
  monto_bs DECIMAL
(14,2) NOT NULL DEFAULT 0,
  tasa_dia_bcv DECIMAL
(12,4) NOT NULL DEFAULT 0,
  proveedor VARCHAR
(120) NULL,
  referencia VARCHAR
(80) NULL,
  id_usuario CHAR
(36) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY
(id_compra),
  KEY idx_inv_compra_producto
(id_producto),
  KEY idx_inv_compra_usuario
(id_usuario),

  CONSTRAINT fk_inv_compra_producto
    FOREIGN KEY
(id_producto) REFERENCES inv_producto
(id_producto)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT,

  CONSTRAINT fk_inv_compra_usuario
    FOREIGN KEY
(id_usuario) REFERENCES usuario
(id_usuario)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE
IF NOT EXISTS inv_producto_ajuste
(
  id_ajuste CHAR
(36) NOT NULL,
  id_producto CHAR
(36) NOT NULL,
  fecha DATE NOT NULL,
  stock_anterior INT NOT NULL,
  stock_nuevo INT NOT NULL,
  motivo VARCHAR
(120) NULL,
  id_usuario CHAR
(36) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY
(id_ajuste),
  KEY idx_inv_ajuste_producto
(id_producto),
  KEY idx_inv_ajuste_usuario
(id_usuario),

  CONSTRAINT fk_inv_ajuste_producto
    FOREIGN KEY
(id_producto) REFERENCES inv_producto
(id_producto)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT,

  CONSTRAINT fk_inv_ajuste_usuario
    FOREIGN KEY
(id_usuario) REFERENCES usuario
(id_usuario)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT
) ENGINE=InnoDB;

-- =========================
-- 13) ADMIN - ENTES LEGALES (lista + historial)
-- =========================
CREATE TABLE
IF NOT EXISTS leg_ente
(
  id_ente CHAR
(36) NOT NULL,
  nombre VARCHAR
(120) NOT NULL,
  activo TINYINT
(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL DEFAULT NULL ON
UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY
(id_ente),
  UNIQUE KEY uk_leg_ente_nombre
(nombre)
) ENGINE=InnoDB;

CREATE TABLE
IF NOT EXISTS leg_obligacion
(
  id_obligacion CHAR
(36) NOT NULL,
  id_ente CHAR
(36) NOT NULL,
  concepto VARCHAR
(120) NOT NULL,
  periodo ENUM
('Mensual','Trimestral','Semestral','Anual','Unico') NOT NULL,
  fecha_vencimiento DATE NULL DEFAULT NULL,
  monto DECIMAL
(10,2) NULL DEFAULT NULL,
  estado ENUM
('Pendiente','Pagado','Vencido') NOT NULL DEFAULT 'Pendiente',
  recordatorio_dias INT NOT NULL DEFAULT 0,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL DEFAULT NULL ON
UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY
(id_obligacion),
  KEY idx_leg_obligacion_ente
(id_ente),
  KEY idx_leg_obligacion_estado
(estado),

  CONSTRAINT fk_leg_obligacion_ente
    FOREIGN KEY
(id_ente) REFERENCES leg_ente
(id_ente)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE
IF NOT EXISTS leg_pago
(
  id_pago CHAR
(36) NOT NULL,
  id_obligacion CHAR
(36) NOT NULL,
  fecha_pago DATE NOT NULL,
  monto DECIMAL
(10,2) NOT NULL DEFAULT 0,
  monto_usd DECIMAL
(12,2) NOT NULL DEFAULT 0,
  monto_bs DECIMAL
(14,2) NOT NULL DEFAULT 0,
  tasa_dia_bcv DECIMAL
(12,4) NOT NULL DEFAULT 0,
  metodo ENUM
('Efectivo','Transferencia','PagoMovil','Zelle','Otro') NOT NULL DEFAULT 'Transferencia',
  referencia VARCHAR
(80) NULL,
  comprobante_url VARCHAR
(255) NULL,
  id_usuario CHAR
(36) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY
(id_pago),
  KEY idx_leg_pago_obligacion
(id_obligacion),
  KEY idx_leg_pago_usuario
(id_usuario),

  CONSTRAINT fk_leg_pago_obligacion
    FOREIGN KEY
(id_obligacion) REFERENCES leg_obligacion
(id_obligacion)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT,

  CONSTRAINT fk_leg_pago_usuario
    FOREIGN KEY
(id_usuario) REFERENCES usuario
(id_usuario)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT
) ENGINE=InnoDB;

-- =========================
-- 14) ADMIN - NÓMINA (lista + historial)
-- =========================
CREATE TABLE
IF NOT EXISTS nom_empleado
(
  id_empleado CHAR
(36) NOT NULL,
  nombre VARCHAR
(80) NOT NULL,
  apellido VARCHAR
(80) NULL,
  cedula VARCHAR
(20) NULL,
  cargo VARCHAR
(60) NOT NULL,
  periodo ENUM
('Semanal','Quincenal','Mensual') NOT NULL DEFAULT 'Quincenal',
  sueldo DECIMAL
(10,2) NOT NULL DEFAULT 0,
  estado ENUM
('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  proximo_pago_manual DATE NULL,
  estatus_pago_manual ENUM
('Pendiente','Pagada') NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL DEFAULT NULL ON
UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY
(id_empleado),
  KEY idx_nom_empleado_cedula
(cedula)
) ENGINE=InnoDB;

CREATE TABLE
IF NOT EXISTS nom_pago
(
  id_pago CHAR
(36) NOT NULL,
  id_empleado CHAR
(36) NOT NULL,
  fecha_pago DATE NOT NULL,
  fecha_proximo_pago DATE NULL,
  monto DECIMAL
(10,2) NOT NULL,
  monto_usd DECIMAL
(12,2) NOT NULL DEFAULT 0,
  monto_bs DECIMAL
(14,2) NOT NULL DEFAULT 0,
  tasa_dia_bcv DECIMAL
(12,4) NOT NULL DEFAULT 0,
  metodo ENUM
('Efectivo','Transferencia','PagoMovil','Zelle','Otro') NOT NULL DEFAULT 'Transferencia',
  referencia VARCHAR
(80) NULL,
  comprobante_url VARCHAR
(255) NULL,
  id_usuario CHAR
(36) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY
(id_pago),
  KEY idx_nom_pago_empleado
(id_empleado),
  KEY idx_nom_pago_usuario
(id_usuario),

  CONSTRAINT fk_nom_pago_empleado
    FOREIGN KEY
(id_empleado) REFERENCES nom_empleado
(id_empleado)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT,

  CONSTRAINT fk_nom_pago_usuario
    FOREIGN KEY
(id_usuario) REFERENCES usuario
(id_usuario)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT
) ENGINE=InnoDB;

-- =========================
-- 15) ADMIN - ALQUILER (lista + historial)
-- =========================
CREATE TABLE
IF NOT EXISTS alq_contrato
(
  id_contrato CHAR
(36) NOT NULL,
  nombre VARCHAR
(120) NOT NULL,
  descripcion VARCHAR
(255) NULL,
  periodo ENUM
('Mensual','Anual','Unico') NOT NULL DEFAULT 'Mensual',
  monto DECIMAL
(10,2) NOT NULL DEFAULT 0,
  estado ENUM
('Pendiente','Pagado','Vencido') NOT NULL DEFAULT 'Pendiente',
  fecha_vencimiento DATE NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL DEFAULT NULL ON
UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY
(id_contrato)
) ENGINE=InnoDB;

CREATE TABLE
IF NOT EXISTS alq_pago
(
  id_pago CHAR
(36) NOT NULL,
  id_contrato CHAR
(36) NOT NULL,
  fecha_pago DATE NOT NULL,
  monto DECIMAL
(10,2) NOT NULL,
  monto_usd DECIMAL
(12,2) NOT NULL DEFAULT 0,
  monto_bs DECIMAL
(14,2) NOT NULL DEFAULT 0,
  tasa_dia_bcv DECIMAL
(12,4) NOT NULL DEFAULT 0,
  metodo ENUM
('Efectivo','Transferencia','PagoMovil','Zelle','Otro') NOT NULL DEFAULT 'Transferencia',
  referencia VARCHAR
(80) NULL,
  comprobante_url VARCHAR
(255) NULL,
  id_usuario CHAR
(36) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY
(id_pago),
  KEY idx_alq_pago_contrato
(id_contrato),
  KEY idx_alq_pago_usuario
(id_usuario),

  CONSTRAINT fk_alq_pago_contrato
    FOREIGN KEY
(id_contrato) REFERENCES alq_contrato
(id_contrato)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT,

  CONSTRAINT fk_alq_pago_usuario
    FOREIGN KEY
(id_usuario) REFERENCES usuario
(id_usuario)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT
) ENGINE=InnoDB;

-- =========================
-- 16) ADMIN - ESPECIALISTAS (egreso por % de cita)
-- =========================
CREATE TABLE
IF NOT EXISTS esp_comision
(
  id_comision CHAR
(36) NOT NULL,
  id_cita CHAR
(36) NOT NULL,
  id_especialista CHAR
(36) NOT NULL,
  porcentaje DECIMAL
(5,2) NOT NULL,
  monto DECIMAL
(12,2) NOT NULL,
  estado ENUM
('Pendiente','Pagada') NOT NULL DEFAULT 'Pendiente',
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_pago DATE NULL,
  id_usuario CHAR
(36) NOT NULL,

  PRIMARY KEY
(id_comision),
  UNIQUE KEY uk_esp_comision_cita
(id_cita),
  KEY idx_esp_comision_especialista
(id_especialista),
  KEY idx_esp_comision_estado
(estado),

  CONSTRAINT fk_esp_comision_cita
    FOREIGN KEY
(id_cita) REFERENCES cita
(id_cita)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT,

  CONSTRAINT fk_esp_comision_especialista
    FOREIGN KEY
(id_especialista) REFERENCES especialista
(id_especialista)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT,

  CONSTRAINT fk_esp_comision_usuario
    FOREIGN KEY
(id_usuario) REFERENCES usuario
(id_usuario)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT
) ENGINE=InnoDB;

-- =========================
-- 16.5) ADMIN - MÉTODOS DE PAGO
-- =========================
CREATE TABLE
IF NOT EXISTS metodos_pago
(
  id_metodo_pago CHAR
(36) NOT NULL,
  nombre VARCHAR
(140) NOT NULL,
  banco_codigo VARCHAR
(10) NOT NULL,
  banco_nombre VARCHAR
(120) NOT NULL,
  tipo_pago VARCHAR
(80) NOT NULL,
  moneda ENUM
('BS','USD') NOT NULL,
  titular_nombre VARCHAR
(160) NULL,
  titular_identificacion VARCHAR
(30) NULL,
  correo VARCHAR
(120) NULL,
  telefono VARCHAR
(20) NULL,
  numero_cuenta VARCHAR
(30) NULL,
  imagen_url VARCHAR
(255) NOT NULL,
  activo TINYINT
(1) NOT NULL DEFAULT 1,
  creado_por CHAR
(36) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL DEFAULT NULL ON
UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY
(id_metodo_pago),
  KEY idx_metodo_pago_activo
(activo),
  KEY idx_metodo_pago_moneda
(moneda),
  KEY idx_metodo_pago_banco
(banco_codigo),

  CONSTRAINT fk_metodo_pago_usuario
    FOREIGN KEY
(creado_por) REFERENCES usuario
(id_usuario)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT
) ENGINE=InnoDB;

-- =========================
-- 17) ADMIN - FACTURACIÓN GLOBAL (ingresos + egresos)
-- =========================
CREATE TABLE
IF NOT EXISTS fac_movimiento
(
  id_movimiento CHAR
(36) NOT NULL,
  tipo ENUM
('Ingreso','Egreso') NOT NULL,
  fecha DATE NOT NULL,
  monto DECIMAL
(12,2) NOT NULL,
  monto_usd DECIMAL
(12,2) NOT NULL DEFAULT 0,
  monto_bs DECIMAL
(14,2) NOT NULL DEFAULT 0,
  tasa_dia_bcv DECIMAL
(12,4) NOT NULL DEFAULT 0,
  descripcion VARCHAR
(255) NULL,
  referencia VARCHAR
(80) NULL,

  origen_modulo ENUM
(
    'CITA_PAGO',
    'ESP_COMISION',
    'INV_COMPRA',
    'INV_AJUSTE',
    'LEG_PAGO',
    'NOM_PAGO',
    'ALQ_PAGO',
    'AJUSTE'
  ) NOT NULL,

  origen_id CHAR
(36) NULL,
  id_usuario CHAR
(36) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY
(id_movimiento),
  KEY idx_fac_fecha
(fecha),
  KEY idx_fac_tipo
(tipo),
  KEY idx_fac_origen
(origen_modulo, origen_id),

  CONSTRAINT fk_fac_usuario
    FOREIGN KEY
(id_usuario) REFERENCES usuario
(id_usuario)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT
) ENGINE=InnoDB;

-- =========================
-- Tabla de prueba para el sistema de migraciones
-- =========================
CREATE TABLE
IF NOT EXISTS prueba
(
  id_prueba CHAR
(36) NOT NULL,
  titulo VARCHAR
(200) NOT NULL,
  detalles TEXT NULL,
  activo TINYINT
(1) NOT NULL DEFAULT 0,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON
UPDATE CURRENT_TIMESTAMP,
  id_usuario CHAR(36)
NOT NULL,
  correo_electronico VARCHAR
(150) NULL,
  cantidad INT NOT NULL DEFAULT 10,
  precio DECIMAL
(10,2) NULL,
  orden_medica VARCHAR
(255) NULL,
  
  PRIMARY KEY
(id_prueba),
  KEY idx_prueba_id_usuario
(id_usuario),
  CONSTRAINT fk_prueba_usuario
    FOREIGN KEY
(id_usuario) REFERENCES usuario
(id_usuario)
    ON
UPDATE CASCADE
    ON
DELETE RESTRICT
) ENGINE=InnoDB;
