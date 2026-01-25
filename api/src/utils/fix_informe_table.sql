-- Script para modificar la columna firma_url a TEXT
USE garvis;

ALTER TABLE informe 
MODIFY COLUMN firma_url TEXT NULL;

ALTER TABLE informe 
MODIFY COLUMN informe_pdf_url VARCHAR(500) NULL;
