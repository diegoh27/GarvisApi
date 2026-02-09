-- ===================================
-- Agregar campos manuales a nom_empleado
-- ===================================

ALTER TABLE nom_empleado
ADD COLUMN proximo_pago_manual DATE NULL,
ADD COLUMN estatus_pago_manual ENUM
('Pendiente','Pagada') NULL;
