-- Script SQL para actualizar RIF de todos los pacientes
-- Basado en el algoritmo Módulo 11 venezolano

-- Función para calcular el dígito verificador del RIF
-- Nota: MySQL no tiene funciones para esto fácilmente, así que usaremos un procedimiento almacenado
-- o lo haremos con una consulta UPDATE más compleja

-- Primero, actualizar pacientes con cédulas que empiezan con V
UPDATE paciente p
INNER JOIN usuario u ON u.id_usuario = p.id_paciente
SET p.rif = CONCAT(
    'V',
    LPAD(REPLACE(REPLACE(REPLACE(u.cedula, '.', ''), '-', ''), ' ', ''), 8, '0'),
    -- Cálculo del dígito verificador (simplificado - requiere lógica más compleja)
    -- Por ahora, usaremos un valor temporal que luego se puede corregir
    '0'
)
WHERE (p.rif IS NULL OR p.rif = '')
  AND u.cedula LIKE 'V%';

-- Nota: El cálculo completo del dígito verificador requiere lógica más compleja
-- que es mejor hacer con el script de Node.js. Este SQL es un ejemplo básico.

-- Para ejecutar el script completo de Node.js, usa:
-- npm run update-rif
-- o
-- node src/utils/update_pacientes_rif.js
