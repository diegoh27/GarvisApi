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
  genero ENUM('Masculino','Femenino') NOT NULL,
  cedula INT NOT NULL,
  correo VARCHAR(80) NOT NULL,
  telefono VARCHAR(15) NOT NULL,
  contrasena VARCHAR(255) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  fecha_nacimiento DATE NOT NULL,
  fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  id_rol CHAR(36) NULL,

  PRIMARY KEY (id_usuario),
  UNIQUE KEY uk_usuario_correo (correo),
  UNIQUE KEY uk_usuario_cedula (cedula),
  KEY idx_usuario_id_rol (id_rol),
  CONSTRAINT fk_usuario_rol
    FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
    ON UPDATE CASCADE
    ON DELETE SET NULL
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

  PRIMARY KEY (id_paciente),
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
  cedula INT NOT NULL,
  genero ENUM('Masculino','Femenino') NOT NULL,

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
  PRIMARY KEY (id_eco)
) ENGINE=InnoDB;

-- =========================
-- 8) Resultado
-- =========================
CREATE TABLE IF NOT EXISTS resultado (
  id_resultado CHAR(36) NOT NULL,
  nombre VARCHAR(255) NULL,
  archivo VARCHAR(255) NULL,
  PRIMARY KEY (id_resultado)
) ENGINE=InnoDB;

-- =========================
-- 9) Cita
-- =========================
CREATE TABLE IF NOT EXISTS cita (
  id_cita CHAR(36) NOT NULL,
  id_paciente CHAR(36) NOT NULL,
  id_especialista CHAR(36) NOT NULL,
  id_eco CHAR(36) NOT NULL,
  fecha_cita DATE NOT NULL,
  orden VARCHAR(255) NOT NULL,

  id_resultado CHAR(36) NULL,
  estado_cita TINYINT NOT NULL, -- 0 Pendiente, 1 Aprobado, 2 Denegado (por ejemplo)

  PRIMARY KEY (id_cita),
  KEY idx_cita_paciente (id_paciente),
  KEY idx_cita_especialista (id_especialista),
  KEY idx_cita_eco (id_eco),
  KEY idx_cita_resultado (id_resultado),

  CONSTRAINT fk_cita_paciente
    FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_cita_especialista
    FOREIGN KEY (id_especialista) REFERENCES especialista(id_especialista)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_cita_eco
    FOREIGN KEY (id_eco) REFERENCES eco(id_eco)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_cita_resultado
    FOREIGN KEY (id_resultado) REFERENCES resultado(id_resultado)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- =========================
-- 10) Pagos
-- =========================
CREATE TABLE IF NOT EXISTS pagos (
  id_pago CHAR(36) NOT NULL,
  imagen VARCHAR(255) NOT NULL,
  banco_origen VARCHAR(100) NOT NULL,
  banco_destino VARCHAR(100) NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  cedula_pagador INT NOT NULL,
  telefono_pagador BIGINT NOT NULL,
  referencia VARCHAR(64) NOT NULL,
  PRIMARY KEY (id_pago)
) ENGINE=InnoDB;

-- =========================
-- 11) Inventario + tablas auxiliares
-- =========================
CREATE TABLE IF NOT EXISTS producto (
  id_producto CHAR(36) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id_producto)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ente_legal (
  id_ente_legal CHAR(36) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id_ente_legal)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS empleado (
  id_empleado CHAR(36) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id_empleado)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventario (
  id_inventario CHAR(36) NOT NULL,
  id_producto CHAR(36) NOT NULL,
  id_ente_legal CHAR(36) NOT NULL,
  id_empleado CHAR(36) NOT NULL,
  fecha DATE NOT NULL,

  PRIMARY KEY (id_inventario),
  KEY idx_inventario_producto (id_producto),
  KEY idx_inventario_ente (id_ente_legal),
  KEY idx_inventario_empleado (id_empleado),

  CONSTRAINT fk_inventario_producto
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_inventario_ente
    FOREIGN KEY (id_ente_legal) REFERENCES ente_legal(id_ente_legal)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_inventario_empleado
    FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;
