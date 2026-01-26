-- Seleccionar la base de datos
USE garvis;

-- Agregar campo RIF a la tabla paciente
ALTER TABLE paciente
ADD COLUMN rif VARCHAR(15) NULL AFTER direccion;

-- Agregar índice para búsquedas por RIF
CREATE INDEX idx_paciente_rif ON paciente(rif);
