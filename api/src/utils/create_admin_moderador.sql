-- =========================
-- Script SQL para crear usuarios Admin y Moderador
-- Contraseña por defecto: admin123
-- =========================
-- 
-- INSTRUCCIONES:
-- 1. Primero genera el hash bcrypt ejecutando:
--    node src/utils/generate_user_hashes.js
-- 2. Copia el hash generado y reemplázalo en las líneas marcadas con "REEMPLAZAR_HASH_AQUI"
-- 3. Ejecuta este script completo en DBeaver
-- =========================

USE garvis;

-- =========================
-- 1) Crear roles si no existen
-- =========================
INSERT IGNORE INTO roles (id_rol, nombre) VALUES
  (UUID(), 'admin'),
  (UUID(), 'moderador'),
  (UUID(), 'especialista'),
  (UUID(), 'paciente');

-- =========================
-- 2) Obtener IDs de roles
-- =========================
SET @admin_rol_id = (SELECT id_rol FROM roles WHERE nombre = 'admin' LIMIT 1);
SET @moderador_rol_id = (SELECT id_rol FROM roles WHERE nombre = 'moderador' LIMIT 1);

-- =========================
-- 3) Crear usuario Admin
-- =========================
-- Contraseña: admin123
-- REEMPLAZAR_HASH_AQUI con el hash generado por generate_user_hashes.js
INSERT INTO usuario (
  id_usuario,
  nombre,
  apellido,
  genero,
  cedula,
  correo,
  telefono,
  contrasena,
  activo,
  fecha_nacimiento,
  fecha_registro,
  id_rol
) VALUES (
  UUID(),
  'Admin',
  'Sistema',
  'Otro',
  'V-00000000',
  'admin@garvis.com',
  '0412-0000000',
  'REEMPLAZAR_HASH_AQUI', -- Hash bcrypt para "admin123" - generar con: node src/utils/generate_user_hashes.js
  1,
  '1990-01-01',
  NOW(),
  @admin_rol_id
)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  apellido = VALUES(apellido);

-- =========================
-- 4) Crear usuario Moderador
-- =========================
-- Contraseña: admin123
-- REEMPLAZAR_HASH_AQUI con el mismo hash de admin (misma contraseña)
INSERT INTO usuario (
  id_usuario,
  nombre,
  apellido,
  genero,
  cedula,
  correo,
  telefono,
  contrasena,
  activo,
  fecha_nacimiento,
  fecha_registro,
  id_rol
) VALUES (
  UUID(),
  'Moderador',
  'Sistema',
  'Otro',
  'V-00000001',
  'moderador@garvis.com',
  '0412-0000001',
  'REEMPLAZAR_HASH_AQUI', -- Hash bcrypt para "admin123" - usar el mismo hash de admin
  1,
  '1990-01-01',
  NOW(),
  @moderador_rol_id
)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  apellido = VALUES(apellido);

-- =========================
-- 5) Verificar usuarios creados
-- =========================
SELECT 
  u.id_usuario,
  u.nombre,
  u.apellido,
  u.correo,
  r.nombre AS rol,
  u.activo,
  u.fecha_registro
FROM usuario u
INNER JOIN roles r ON u.id_rol = r.id_rol
WHERE r.nombre IN ('admin', 'moderador')
ORDER BY r.nombre;
