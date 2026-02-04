-- Migración: agregar columna costo_total a producto_lote (para registrar el costo de compra del lote).
-- Ejecutar solo si la tabla producto_lote ya existe y no tiene esta columna.

ALTER TABLE producto_lote
ADD COLUMN costo_total DECIMAL(10,2) NULL COMMENT 'Costo total de la compra/entrada del lote' AFTER fecha_ingreso;
