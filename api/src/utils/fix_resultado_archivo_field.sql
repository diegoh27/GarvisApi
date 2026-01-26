-- Script para cambiar el campo archivo de VARCHAR(255) a TEXT
-- Esto permite almacenar URLs largas y arrays JSON de múltiples URLs

USE garvis;

ALTER TABLE resultado 
MODIFY COLUMN archivo TEXT NULL;

-- Verificar el cambio
DESCRIBE resultado;
