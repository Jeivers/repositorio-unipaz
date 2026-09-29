'use strict';

const { Pool } = require('pg');

// Misma configuración que index.js
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'admin',
  password: process.env.DB_PASSWORD || 'password123',
  database: process.env.DB_NAME     || 'cdi_unipaz',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
});

async function verificar() {
  try {
    const { rows } = await pool.query(`
      SELECT
        ordinal_position  AS "#",
        column_name       AS "Columna",
        data_type         AS "Tipo",
        character_maximum_length AS "Long. máx.",
        is_nullable       AS "Nullable",
        column_default    AS "Default"
      FROM information_schema.columns
      WHERE table_name   = 'documentos'
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    if (rows.length === 0) {
      console.log('\n⚠️  La tabla "documentos" no existe o no tiene columnas visibles.\n');
      return;
    }

    console.log(`\n✅ Tabla "documentos" — ${rows.length} columnas encontradas:\n`);
    console.table(rows);
  } catch (err) {
    console.error('\n❌ Error al consultar la base de datos:', err.message);
    console.error('   Verifica que el servidor PostgreSQL esté corriendo y las credenciales sean correctas.\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verificar();
