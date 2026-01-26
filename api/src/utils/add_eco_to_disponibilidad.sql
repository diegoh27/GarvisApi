-- Seleccionar la base de datos
USE garvis;

-- Agregar campo id_eco a la tabla disponibilidad
ALTER TABLE disponibilidad
ADD COLUMN id_eco CHAR(36) NULL AFTER hora_fin,
ADD CONSTRAINT fk_disponibilidad_eco 
  FOREIGN KEY (id_eco) REFERENCES eco(id_eco) ON DELETE SET NULL;

-- Agregar índice para mejorar consultas
CREATE INDEX idx_disp_eco ON disponibilidad(id_eco);
