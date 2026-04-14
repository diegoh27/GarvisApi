const { pool } = require('./src/utils/db');

const sql = `
CREATE TABLE IF NOT EXISTS paciente_pago_guardado (
  id_guardado CHAR(36) NOT NULL,
  id_paciente CHAR(36) NOT NULL,
  alias VARCHAR(80) NULL,
  banco_origen VARCHAR(100) NOT NULL,
  cedula_pagador VARCHAR(20) NOT NULL,
  telefono_pagador VARCHAR(20) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_guardado),
  KEY idx_ppg_paciente (id_paciente),
  UNIQUE KEY uk_ppg_paciente_banco_cedula (id_paciente, banco_origen, cedula_pagador, telefono_pagador),
  CONSTRAINT fk_ppg_paciente
    FOREIGN KEY (id_paciente) REFERENCES paciente (id_paciente)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB
`;

pool.execute(sql)
  .then(() => { console.log('OK: tabla paciente_pago_guardado creada exitosamente'); process.exit(0); })
  .catch(e => { console.error('Error:', e.message, e.code); process.exit(1); });
