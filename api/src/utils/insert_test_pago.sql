-- Script para insertar datos de prueba en la tabla pagos
-- Para la cita: 8d7eae41-c7b9-4773-80d9-a068bcc42924

-- Primero, verificar si ya existe un pago para esta cita y eliminarlo si existe
DELETE FROM pagos WHERE id_cita = '8d7eae41-c7b9-4773-80d9-a068bcc42924';

-- Insertar un pago de prueba
INSERT INTO pagos (
  id_pago,
  id_cita,
  id_paciente,
  metodo,
  imagen,
  banco_origen,
  banco_destino,
  monto,
  cedula_pagador,
  telefono_pagador,
  referencia,
  estado_pago,
  fecha_pago,
  fecha_validacion,
  validado_por
) VALUES (
  UUID(), -- id_pago (generado automáticamente)
  '8d7eae41-c7b9-4773-80d9-a068bcc42924', -- id_cita
  (SELECT id_paciente FROM cita WHERE id_cita = '8d7eae41-c7b9-4773-80d9-a068bcc42924' LIMIT 1), -- id_paciente (obtenido de la cita)
  'Transferencia', -- metodo
  'https://via.placeholder.com/800x600/1C837F/FFFFFF?text=Comprobante+de+Pago', -- imagen (placeholder)
  'Banco de Venezuela', -- banco_origen
  'Banco Mercantil', -- banco_destino
  150.00, -- monto
  '12345678', -- cedula_pagador
  '04121234567', -- telefono_pagador
  'TRF-2025-001234', -- referencia
  0, -- estado_pago (0 = Pendiente)
  NOW(), -- fecha_pago
  NULL, -- fecha_validacion (NULL porque está pendiente)
  NULL -- validado_por (NULL porque no ha sido validado)
);

-- Verificar que se insertó correctamente
SELECT * FROM pagos WHERE id_cita = '8d7eae41-c7b9-4773-80d9-a068bcc42924';
