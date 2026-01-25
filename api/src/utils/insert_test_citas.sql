-- Script para insertar citas de prueba con fecha de hoy
-- Ejecutar en la base de datos garvis
-- IMPORTANTE: Ajusta los IDs según tus datos existentes o ejecuta primero las secciones de creación

USE garvis;

-- ============================================
-- PASO 1: Obtener IDs existentes o crear datos mínimos
-- ============================================

-- Obtener el primer especialista existente
SET @especialista_id = (SELECT id_especialista FROM especialista LIMIT 1);

-- Si no hay especialista, descomenta y ajusta estos valores:
-- SET @especialista_id = 'TU_ID_ESPECIALISTA_AQUI';

-- Obtener pacientes existentes (o crear algunos)
SET @paciente1_id = (SELECT id_paciente FROM paciente LIMIT 1 OFFSET 0);
SET @paciente2_id = (SELECT id_paciente FROM paciente LIMIT 1 OFFSET 1);
SET @paciente3_id = (SELECT id_paciente FROM paciente LIMIT 1 OFFSET 2);
SET @paciente4_id = (SELECT id_paciente FROM paciente LIMIT 1 OFFSET 3);

-- Si no hay suficientes pacientes, crear algunos de prueba
-- (Asegúrate de tener roles y especialidades creados primero)
INSERT IGNORE INTO roles (id_rol, nombre) VALUES 
(UUID(), 'especialista'),
(UUID(), 'paciente');

-- Crear pacientes de prueba si no existen
INSERT IGNORE INTO usuario (
    id_usuario, nombre, apellido, genero, cedula, correo, telefono, 
    contrasena, activo, fecha_nacimiento, id_rol
) 
SELECT 
    UUID(), 'Juan', 'Pérez', 'Masculino', 'V-11111111', 'juan.test@garvis.com', '04121111111',
    '$2b$10$dummyhash', 1, '1990-01-01', (SELECT id_rol FROM roles WHERE nombre = 'paciente' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE cedula = 'V-11111111')
LIMIT 1;

INSERT IGNORE INTO paciente (id_paciente, tipo_sangre, descripcion, direccion, contacto_emergencia_nombre, contacto_emergencia_telefono)
SELECT id_usuario, 'O+', 'Paciente de prueba 1', 'Dirección 1', 'Contacto 1', '04121111111'
FROM usuario WHERE cedula = 'V-11111111'
LIMIT 1;

-- Repetir para más pacientes si es necesario...

-- Obtener ecos existentes
SET @eco1_id = (SELECT id_eco FROM eco LIMIT 1 OFFSET 0);
SET @eco2_id = (SELECT id_eco FROM eco LIMIT 1 OFFSET 1);
SET @eco3_id = (SELECT id_eco FROM eco LIMIT 1 OFFSET 2);
SET @eco4_id = (SELECT id_eco FROM eco LIMIT 1 OFFSET 3);

-- Crear ecos de prueba si no existen
INSERT IGNORE INTO eco (id_eco, nombre, precio, duracion_min, activo) VALUES
(UUID(), 'Eco Abdominal', 50.00, 30, 1),
(UUID(), 'Eco Obstétrico', 60.00, 45, 1),
(UUID(), 'Eco Pélvico', 55.00, 30, 1),
(UUID(), 'Eco Cardíaco', 70.00, 45, 1);

-- Re-obtener IDs después de posibles inserciones
SET @especialista_id = (SELECT id_especialista FROM especialista LIMIT 1);
SET @paciente1_id = (SELECT id_paciente FROM paciente LIMIT 1 OFFSET 0);
SET @paciente2_id = (SELECT id_paciente FROM paciente LIMIT 1 OFFSET 1);
SET @paciente3_id = (SELECT id_paciente FROM paciente LIMIT 1 OFFSET 2);
SET @paciente4_id = (SELECT id_paciente FROM paciente LIMIT 1 OFFSET 3);
SET @eco1_id = (SELECT id_eco FROM eco LIMIT 1 OFFSET 0);
SET @eco2_id = (SELECT id_eco FROM eco LIMIT 1 OFFSET 1);
SET @eco3_id = (SELECT id_eco FROM eco LIMIT 1 OFFSET 2);
SET @eco4_id = (SELECT id_eco FROM eco LIMIT 1 OFFSET 3);

-- ============================================
-- PASO 2: Limpiar citas de prueba anteriores (opcional)
-- ============================================
DELETE FROM resultado WHERE id_cita IN (
    SELECT id_cita FROM cita WHERE orden LIKE 'TEST-%' AND fecha_cita = CURDATE()
);
DELETE FROM cita WHERE orden LIKE 'TEST-%' AND fecha_cita = CURDATE();

-- ============================================
-- PASO 3: Insertar citas de prueba con fecha de hoy
-- ============================================
INSERT INTO cita (
    id_cita, id_paciente, id_representado, id_especialista, id_eco,
    fecha_cita, hora_cita, orden, id_disponibilidad,
    estado_cita, estado_pago
) VALUES
-- Cita 1: Confirmada con pago aprobado (09:00)
(UUID(), @paciente1_id, NULL, @especialista_id, @eco1_id,
 CURDATE(), '09:00:00', 'TEST-ORDEN-001', NULL,
 1, 1),

-- Cita 2: Confirmada con pago pendiente (10:30)
(UUID(), @paciente2_id, NULL, @especialista_id, @eco2_id,
 CURDATE(), '10:30:00', 'TEST-ORDEN-002', NULL,
 1, 0),

-- Cita 3: Atendida sin resultado (11:00)
(UUID(), @paciente3_id, NULL, @especialista_id, @eco3_id,
 CURDATE(), '11:00:00', 'TEST-ORDEN-003', NULL,
 3, 1),

-- Cita 4: Atendida con resultado (14:00)
(UUID(), @paciente4_id, NULL, @especialista_id, @eco4_id,
 CURDATE(), '14:00:00', 'TEST-ORDEN-004', NULL,
 3, 1);

-- ============================================
-- PASO 4: Crear resultado para la cita 4 (atendida con resultado)
-- ============================================
INSERT INTO resultado (
    id_resultado, id_cita, id_especialista, nombre, archivo, estado_resultado
)
SELECT 
    UUID(), 
    c.id_cita, 
    @especialista_id, 
    'Resultado Eco Cardíaco', 
    'resultado-test-004.pdf', 
    2
FROM cita c
WHERE c.orden = 'TEST-ORDEN-004'
LIMIT 1;

-- ============================================
-- PASO 5: Mostrar resumen de citas insertadas
-- ============================================
SELECT 
    'Citas insertadas hoy' AS resumen,
    COUNT(*) AS total,
    SUM(CASE WHEN estado_cita = 1 THEN 1 ELSE 0 END) AS confirmadas,
    SUM(CASE WHEN estado_pago = 0 THEN 1 ELSE 0 END) AS pendientes_pago,
    SUM(CASE WHEN estado_cita = 3 THEN 1 ELSE 0 END) AS atendidas,
    SUM(CASE WHEN estado_cita = 3 AND id_cita NOT IN (
        SELECT id_cita FROM resultado WHERE id_cita IS NOT NULL
    ) THEN 1 ELSE 0 END) AS atendidas_sin_resultado
FROM cita 
WHERE fecha_cita = CURDATE() AND orden LIKE 'TEST-%';
