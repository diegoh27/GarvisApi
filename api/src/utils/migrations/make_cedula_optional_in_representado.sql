-- Migración para hacer la cédula opcional en la tabla representado
-- Fecha: 2026-02-08

USE garvis;

-- Modificar la columna cedula para permitir valores NULL
ALTER TABLE representado 
MODIFY COLUMN cedula VARCHAR(20) NULL;

-- Comentario: La cédula ahora es opcional para permitir representados sin documento de identidad
