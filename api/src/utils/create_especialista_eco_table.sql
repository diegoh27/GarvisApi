-- Seleccionar la base de datos
USE garvis;

-- Crear tabla intermedia para relacionar especialistas con ecos
CREATE TABLE IF NOT EXISTS especialista_eco (
  id_especialista CHAR(36) NOT NULL,
  id_eco CHAR(36) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_especialista, id_eco),
  CONSTRAINT fk_esp_eco_especialista 
    FOREIGN KEY (id_especialista) REFERENCES especialista(id_especialista) ON DELETE CASCADE,
  CONSTRAINT fk_esp_eco_eco 
    FOREIGN KEY (id_eco) REFERENCES eco(id_eco) ON DELETE CASCADE,
  KEY idx_esp_eco_especialista (id_especialista),
  KEY idx_esp_eco_eco (id_eco)
) ENGINE=InnoDB;
