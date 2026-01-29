-- =========================
-- Script SQL completo para crear la base de datos y todas las tablas
-- =========================

-- =========================
-- 0) DB
-- =========================
CREATE DATABASE IF NOT EXISTS garvis
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE garvis;

-- =========================
-- 1) Roles
-- =========================
CREATE TABLE IF NOT EXISTS roles (
  id_rol CHAR(36) NOT NULL,
  nombre VARCHAR(20) NOT NULL,
  PRIMARY KEY (id_rol),
  UNIQUE KEY uk_roles_nombre (nombre)
) ENGINE=InnoDB;

-- =========================
-- 2) Usuario (tabla base)
-- =========================
CREATE TABLE IF NOT EXISTS usuario (
  id_usuario CHAR(36) NOT NULL,
  nombre VARCHAR(50) NOT NULL,
  apellido VARCHAR(60) NOT NULL,
  genero ENUM('Masculino','Femenino','Otro') NOT NULL,
  cedula VARCHAR(20) NOT NULL,
  correo VARCHAR(80) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  contrasena VARCHAR(255) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  fecha_nacimiento DATE NOT NULL,
  fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  id_rol CHAR(36) NOT NULL,

  PRIMARY KEY (id_usuario),
  UNIQUE KEY uk_usuario_correo (correo),
  UNIQUE KEY uk_usuario_cedula (cedula),
  KEY idx_usuario_id_rol (id_rol),
  CONSTRAINT fk_usuario_rol
    FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =========================
-- 3) Especialidad
-- =========================
CREATE TABLE IF NOT EXISTS especialidad (
  id_especialidad CHAR(36) NOT NULL,
  nombre VARCHAR(60) NOT NULL,
  PRIMARY KEY (id_especialidad),
  UNIQUE KEY uk_especialidad_nombre (nombre)
) ENGINE=InnoDB;

-- =========================
-- 4) Paciente (hereda de usuario)
-- id_paciente = id_usuario
-- =========================
CREATE TABLE IF NOT EXISTS paciente (
  id_paciente CHAR(36) NOT NULL,
  tipo_sangre VARCHAR(10) NOT NULL,
  descripcion VARCHAR(120) NOT NULL,
  direccion VARCHAR(120) NULL,
  rif VARCHAR(15) NOT NULL,
  contacto_emergencia_nombre VARCHAR(80) NULL,
  contacto_emergencia_telefono VARCHAR(20) NULL,

  PRIMARY KEY (id_paciente),
  KEY idx_paciente_rif (rif),
  UNIQUE KEY uk_paciente_rif (rif),
  CONSTRAINT fk_paciente_usuario
    FOREIGN KEY (id_paciente) REFERENCES usuario(id_usuario)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 5) Especialista (hereda de usuario)
-- id_especialista = id_usuario
-- =========================
CREATE TABLE IF NOT EXISTS especialista (
  id_especialista CHAR(36) NOT NULL,
  id_especialidad CHAR(36) NOT NULL,
  codigo_colegiatura VARCHAR(30) NULL,

  PRIMARY KEY (id_especialista),
  KEY idx_especialista_especialidad (id_especialidad),

  CONSTRAINT fk_especialista_usuario
    FOREIGN KEY (id_especialista) REFERENCES usuario(id_usuario)
    ON UPDATE CASCADE
    ON DELETE CASCADE,

  CONSTRAINT fk_especialista_especialidad
    FOREIGN KEY (id_especialidad) REFERENCES especialidad(id_especialidad)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =========================
-- 6) Representado (dependiente de paciente)
-- =========================
CREATE TABLE IF NOT EXISTS representado (
  id_representado CHAR(36) NOT NULL,
  id_paciente CHAR(36) NOT NULL,
  nombre VARCHAR(60) NOT NULL,
  apellido VARCHAR(60) NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  cedula VARCHAR(20) NOT NULL,
  genero ENUM('Masculino','Femenino','Otro') NOT NULL,
  parentesco VARCHAR(40) NULL,

  PRIMARY KEY (id_representado),
  KEY idx_representado_paciente (id_paciente),

  CONSTRAINT fk_representado_paciente
    FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =========================
-- 7) Eco
-- =========================
CREATE TABLE IF NOT EXISTS eco (
  id_eco CHAR(36) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  duracion_min INT NOT NULL DEFAULT 0,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id_eco)
) ENGINE=InnoDB;

-- =========================
-- 7.1) Especialista-Eco (relación muchos a muchos)
-- =========================
CREATE TABLE IF NOT EXISTS especialista_eco (
  id_especialista CHAR(36) NOT NULL,
  id_eco CHAR(36) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_especialista, id_eco),
  KEY idx_esp_eco_especialista (id_especialista),
  KEY idx_esp_eco_eco (id_eco),
  CONSTRAINT fk_esp_eco_especialista 
    FOREIGN KEY (id_especialista) REFERENCES especialista(id_especialista) 
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_esp_eco_eco 
    FOREIGN KEY (id_eco) REFERENCES eco(id_eco) 
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 8) Disponibilidad (bloques propuestos)
-- =========================
CREATE TABLE IF NOT EXISTS disponibilidad (
  id_disponibilidad CHAR(36) NOT NULL,
  id_especialista CHAR(36) NOT NULL,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  id_eco CHAR(36) NULL,
  estado TINYINT NOT NULL DEFAULT 0, -- 0 Propuesto, 1 Aprobado, 2 Rechazado, 3 Cancelado, 4 Reservado
  creado_por CHAR(36) NOT NULL,
  aprobado_por CHAR(36) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id_disponibilidad),
  KEY idx_disp_especialista_fecha (id_especialista, fecha),
  KEY idx_disp_estado (estado),
  KEY idx_disp_creado_por (creado_por),
  KEY idx_disp_aprobado_por (aprobado_por),
  KEY idx_disp_eco (id_eco),

  CONSTRAINT fk_disp_especialista
    FOREIGN KEY (id_especialista) REFERENCES especialista(id_especialista)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_disp_creado_por
    FOREIGN KEY (creado_por) REFERENCES usuario(id_usuario)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_disp_aprobado_por
    FOREIGN KEY (aprobado_por) REFERENCES usuario(id_usuario)
    ON UPDATE CASCADE
    ON DELETE SET NULL,

  CONSTRAINT fk_disponibilidad_eco
    FOREIGN KEY (id_eco) REFERENCES eco(id_eco)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- =========================
-- 9) Cita
-- =========================
CREATE TABLE IF NOT EXISTS cita (
  id_cita CHAR(36) NOT NULL,
  id_paciente CHAR(36) NOT NULL,
  id_representado CHAR(36) NULL,
  id_especialista CHAR(36) NOT NULL,
  id_eco CHAR(36) NOT NULL,
  fecha_cita DATE NOT NULL,
  hora_cita TIME NOT NULL,
  orden VARCHAR(255) NOT NULL,
  id_disponibilidad CHAR(36) NULL,

  estado_cita TINYINT NOT NULL DEFAULT 0, -- 0 Pendiente, 1 Confirmada, 2 Cancelada, 3 Atendida
  estado_pago TINYINT NOT NULL DEFAULT 0, -- 0 Pendiente, 1 Pagado, 2 Rechazado
  creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id_cita),
  KEY idx_cita_paciente (id_paciente),
  KEY idx_cita_representado (id_representado),
  KEY idx_cita_especialista (id_especialista),
  KEY idx_cita_eco (id_eco),
  UNIQUE KEY uk_cita_disponibilidad (id_disponibilidad),
  KEY idx_cita_paciente_representado (id_paciente, id_representado),

  CONSTRAINT fk_cita_paciente
    FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_cita_representado
    FOREIGN KEY (id_representado) REFERENCES representado(id_representado)
    ON UPDATE CASCADE
    ON DELETE SET NULL,

  CONSTRAINT fk_cita_especialista
    FOREIGN KEY (id_especialista) REFERENCES especialista(id_especialista)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_cita_eco
    FOREIGN KEY (id_eco) REFERENCES eco(id_eco)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_cita_disponibilidad
    FOREIGN KEY (id_disponibilidad) REFERENCES disponibilidad(id_disponibilidad)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- =========================
-- 9) Resultado
-- =========================
CREATE TABLE IF NOT EXISTS resultado (
  id_resultado CHAR(36) NOT NULL,
  id_cita CHAR(36) NOT NULL,
  id_especialista CHAR(36) NOT NULL,
  nombre VARCHAR(255) NULL,
  archivo TEXT NULL, -- TEXT para almacenar arrays JSON de múltiples URLs
  estado_resultado TINYINT NOT NULL DEFAULT 0, -- 0 Pendiente, 1 Vacío, 2 Con resultados (resultado_archivo)
  fecha_emision TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_publicacion TIMESTAMP NULL DEFAULT NULL,

  PRIMARY KEY (id_resultado),
  UNIQUE KEY uk_resultado_cita (id_cita),
  KEY idx_resultado_especialista (id_especialista),

  CONSTRAINT fk_resultado_cita
    FOREIGN KEY (id_cita) REFERENCES cita(id_cita)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_resultado_especialista
    FOREIGN KEY (id_especialista) REFERENCES especialista(id_especialista)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =========================
-- 10) Informe
-- =========================
CREATE TABLE IF NOT EXISTS informe (
  id_informe CHAR(36) NOT NULL,
  id_cita CHAR(36) NOT NULL,
  id_especialista CHAR(36) NOT NULL,
  reseña TEXT NULL,
  recomendaciones TEXT NULL,
  firma_url TEXT NULL,
  informe_pdf_url VARCHAR(255) NULL,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id_informe),
  UNIQUE KEY uk_informe_cita (id_cita),
  KEY idx_informe_especialista (id_especialista),

  CONSTRAINT fk_informe_cita
    FOREIGN KEY (id_cita) REFERENCES cita(id_cita)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_informe_especialista
    FOREIGN KEY (id_especialista) REFERENCES especialista(id_especialista)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =========================
-- 11) Pagos
-- =========================
CREATE TABLE IF NOT EXISTS pagos (
  id_pago CHAR(36) NOT NULL,
  id_cita CHAR(36) NOT NULL,
  id_paciente CHAR(36) NOT NULL,
  metodo ENUM('Transferencia','PagoMovil') NOT NULL,
  imagen VARCHAR(255) NOT NULL,
  banco_origen VARCHAR(100) NOT NULL,
  banco_destino VARCHAR(100) NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  cedula_pagador VARCHAR(20) NOT NULL,
  telefono_pagador VARCHAR(20) NOT NULL,
  referencia VARCHAR(64) NOT NULL,
  estado_pago TINYINT NOT NULL DEFAULT 0, -- 0 Pendiente, 1 Aprobado, 2 Rechazado
  fecha_pago TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_validacion TIMESTAMP NULL DEFAULT NULL,
  validado_por CHAR(36) NULL,

  PRIMARY KEY (id_pago),
  UNIQUE KEY uk_pagos_cita (id_cita),
  UNIQUE KEY uk_pagos_referencia (referencia),
  KEY idx_pagos_cita (id_cita),
  KEY idx_pagos_paciente (id_paciente),
  KEY idx_pagos_validado_por (validado_por),

  CONSTRAINT fk_pagos_cita
    FOREIGN KEY (id_cita) REFERENCES cita(id_cita)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_pagos_paciente
    FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_pagos_validado_por
    FOREIGN KEY (validado_por) REFERENCES usuario(id_usuario)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- =========================
-- 11) Notificaciones
-- =========================
CREATE TABLE IF NOT EXISTS notificacion (
  id_notificacion CHAR(36) NOT NULL,
  id_usuario CHAR(36) NOT NULL,
  titulo VARCHAR(120) NOT NULL,
  mensaje VARCHAR(255) NOT NULL,
  tipo VARCHAR(40) NOT NULL,
  leida TINYINT(1) NOT NULL DEFAULT 0,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id_notificacion),
  KEY idx_notificacion_usuario (id_usuario),

  CONSTRAINT fk_notificacion_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 12) Inventario
-- =========================
CREATE TABLE IF NOT EXISTS producto (
  id_producto CHAR(36) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  unidad VARCHAR(20) NOT NULL,
  stock_minimo INT NOT NULL DEFAULT 0,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  precio DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id_producto),
  UNIQUE KEY uk_producto_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS producto_lote (
  id_lote CHAR(36) NOT NULL,
  id_producto CHAR(36) NOT NULL,
  cantidad INT NOT NULL,
  fecha_vencimiento DATE NULL,
  fecha_ingreso DATE NOT NULL,

  PRIMARY KEY (id_lote),
  KEY idx_lote_producto (id_producto),

  CONSTRAINT fk_lote_producto
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventario_movimiento (
  id_movimiento CHAR(36) NOT NULL,
  id_producto CHAR(36) NOT NULL,
  tipo ENUM('Entrada','Salida','Ajuste') NOT NULL,
  cantidad INT NOT NULL,
  motivo VARCHAR(120) NULL,
  id_usuario CHAR(36) NOT NULL,
  fecha_movimiento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id_movimiento),
  KEY idx_movimiento_producto (id_producto),
  KEY idx_movimiento_usuario (id_usuario),

  CONSTRAINT fk_movimiento_producto
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_movimiento_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =========================
-- 13) Obligaciones administrativas
-- =========================
CREATE TABLE IF NOT EXISTS obligacion (
  id_obligacion CHAR(36) NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  descripcion VARCHAR(255) NULL,
  fecha_vencimiento DATE NOT NULL,
  monto DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado TINYINT NOT NULL DEFAULT 0, -- 0 Pendiente, 1 Pagada, 2 Vencida
  recordatorio_dias INT NOT NULL DEFAULT 0,

  PRIMARY KEY (id_obligacion)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS obligacion_bitacora (
  id_bitacora CHAR(36) NOT NULL,
  id_obligacion CHAR(36) NOT NULL,
  id_usuario CHAR(36) NOT NULL,
  accion VARCHAR(120) NOT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_bitacora),
  KEY idx_bitacora_obligacion (id_obligacion),
  KEY idx_bitacora_usuario (id_usuario),
  CONSTRAINT fk_bitacora_obligacion
    FOREIGN KEY (id_obligacion) REFERENCES obligacion(id_obligacion)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_bitacora_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Tabla de prueba para el sistema de migraciones
CREATE TABLE IF NOT EXISTS prueba (
  id_prueba CHAR(36) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  id_usuario CHAR(36) NOT NULL,
  
  PRIMARY KEY (id_prueba),
  KEY idx_prueba_id_usuario (id_usuario),
  CONSTRAINT fk_prueba_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;
