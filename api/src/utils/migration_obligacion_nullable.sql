-- Migración para permitir NULL en monto y fecha_vencimiento
-- de la tabla leg_obligacion
-- Ejecutar esta migración una sola vez en la base de datos existente

USE dbgarvis;

ALTER TABLE leg_obligacion
  MODIFY COLUMN monto DECIMAL
(10,2) NULL DEFAULT NULL,
  MODIFY COLUMN fecha_vencimiento DATE NULL DEFAULT NULL;

-- Verificar cambios
DESCRIBE leg_obligacion;
