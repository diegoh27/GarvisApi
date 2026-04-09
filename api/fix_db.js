const mysql = require('mysql2/promise');

async function fix() {
  const c = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'garvis'
  });
  try {
    await c.query("ALTER TABLE inv_producto ADD COLUMN categoria VARCHAR(50) DEFAULT 'General' AFTER unidad_medida, ADD COLUMN consumo_actual DECIMAL(12,4) DEFAULT 0.0000 AFTER stock_actual;");
    console.log('Columns added successfully');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Columns already exist.');
    } else {
      console.error(err);
    }
  } finally {
    await c.end();
  }
}

fix();
