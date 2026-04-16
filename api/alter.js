const { pool } = require('./src/db');

async function run() {
  try {
    const conn = await pool.getConnection();
    
    // Attempt to add id_orden
    try {
      await conn.query("ALTER TABLE inv_nota_compra ADD COLUMN id_orden CHAR(36) NULL AFTER numero_factura");
      await conn.query("ALTER TABLE inv_nota_compra ADD CONSTRAINT fk_inv_nota_compra_orden FOREIGN KEY (id_orden) REFERENCES inv_orden_compra (id_orden) ON UPDATE CASCADE ON DELETE SET NULL");
      console.log("Column id_orden added!");
    } catch(e) {
      console.log("Possibly column already exists:", e.message);
    }

    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS inv_historial_precios (
          id_historial CHAR(36) NOT NULL,
          id_proveedor CHAR(36) NOT NULL,
          id_producto CHAR(36) NOT NULL,
          precio_anterior DECIMAL(10,2) NOT NULL DEFAULT 0,
          precio_nuevo DECIMAL(10,2) NOT NULL DEFAULT 0,
          fecha_cambio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          id_usuario CHAR(36) NOT NULL,
          
          PRIMARY KEY (id_historial),
          KEY idx_inv_hist_precios_prov (id_proveedor),
          KEY idx_inv_hist_precios_prod (id_producto),
          CONSTRAINT fk_inv_hist_precios_prov FOREIGN KEY (id_proveedor) REFERENCES inv_proveedor (id_proveedor) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_inv_hist_precios_prod FOREIGN KEY (id_producto) REFERENCES inv_producto (id_producto) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_inv_hist_precios_usu FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE
        ) ENGINE=InnoDB;
      `);
      console.log("Table inv_historial_precios created!");
    } catch(e) {
      console.log("Error creating table:", e.message);
    }
    
    conn.release();
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
