/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  SCRIPT DE MIGRACIÓN MASIVA — Repositorio CDI UNIPAZ
 * ══════════════════════════════════════════════════════════════════════════════
 *
 *  Lee datos.csv desde /backend y los inserta en la tabla `documentos`.
 *
 *  COLUMNAS ESPERADAS EN EL CSV (los nombres exactos de cabecera):
 *  ──────────────────────────────────────────────────────────────────
 *  titulo_es, titulo_en, autores, directores, grupo_investigacion,
 *  patrocinadores, fecha_aprobacion, resumen, palabras_claves_es,
 *  tipo_documento, abstract, palabras_claves_en, titulo_grado,
 *  tipo_acceso, archivo_url
 *
 *  CAMPOS JSONB — autores y directores:
 *  El CSV puede traerlos en cualquiera de estos formatos y el script
 *  los normaliza automáticamente a [{nombre}]:
 *
 *    a) JSON válido ya serializado:  "[{\"nombre\":\"Juan\"}]"
 *    b) Nombres separados por punto y coma:  "Juan Pérez; María López"
 *    c) Nombre simple:  "Carlos Gómez"
 *    d) Vacío / en blanco → se guarda como null
 *
 *  CÓMO EJECUTAR:
 *  ──────────────────────────────────────────────────────────────────
 *  1. Coloca datos.csv en /backend/datos.csv
 *  2. Asegúrate de que la BD esté corriendo:
 *       docker compose up -d db
 *  3. Desde la carpeta /backend:
 *       node migrar.js
 *
 *  Variables de entorno opcionales (si la BD no es localhost):
 *    DB_HOST  DB_USER  DB_PASSWORD  DB_NAME  DB_PORT
 *
 *  En PowerShell:
 *    $env:DB_HOST="localhost"; node migrar.js
 * ══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const fs       = require('fs');
const path     = require('path');
const csv      = require('csv-parser');
const { Pool } = require('pg');

// ── Conexión a PostgreSQL ─────────────────────────────────────────────────────
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'admin',
  password: process.env.DB_PASSWORD || 'password123',
  database: process.env.DB_NAME     || 'cdi_unipaz',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
});

// ── Ruta del CSV ──────────────────────────────────────────────────────────────
const nombreArchivo = process.argv[2] || 'datos.csv';
const rutaCSV       = path.join(__dirname, nombreArchivo);

// ── Validación de existencia del archivo ──────────────────────────────────────
if (!fs.existsSync(rutaCSV)) {
  console.error(`\n❌  Archivo no encontrado: ${rutaCSV}`);
  console.error(`    Coloca el CSV en /backend/${nombreArchivo} e intenta de nuevo.\n`);
  process.exit(1);
}

// ── Helper: normaliza un campo de personas a [{nombre}] ──────────────────────
// Acepta: JSON serializado, "Nombre1; Nombre2", o "Nombre simple"
function normalizarPersonas(valor) {
  if (!valor || !valor.trim()) return null;

  // Intento 1: ya viene como JSON
  try {
    const parsed = JSON.parse(valor);
    if (Array.isArray(parsed)) {
      // Garantiza que cada elemento tenga al menos la clave 'nombre'
      return parsed.map(p =>
        typeof p === 'string' ? { nombre: p } : { nombre: p.nombre || '', ...p }
      );
    }
  } catch (_) { /* no era JSON, continúa */ }

  // Intento 2: nombres separados por punto y coma
  return valor
    .split(';')
    .map(n => n.trim())
    .filter(Boolean)
    .map(nombre => ({ nombre }));
}

// ── Helper: limpia un string y devuelve null si está vacío ───────────────────
const limpiar = (v) => (v && v.trim() ? v.trim() : null);

// ── Helper: parsea una fecha y devuelve null si no es válida ─────────────────
function parsearFecha(v) {
  if (!v || !v.trim()) return null;
  const d = new Date(v.trim());
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

// ── Función principal ─────────────────────────────────────────────────────────
async function migrar() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  MIGRACIÓN MASIVA — CDI UNIPAZ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Archivo : ${rutaCSV}\n`);

  // Verificar conexión a la BD antes de procesar el CSV
  try {
    await pool.query('SELECT 1');
    console.log('  ✅  Conexión a PostgreSQL establecida.\n');
  } catch (err) {
    console.error('  ❌  No se pudo conectar a la BD:', err.message);
    console.error('      Verifica que el servidor esté corriendo y las credenciales sean correctas.\n');
    process.exit(1);
  }

  // Contadores
  let procesadas  = 0;
  let insertadas  = 0;
  let omitidas    = 0;
  let errores     = 0;
  const fallos    = [];   // [{fila, motivo, datos}]

  // ── Paso 1: leer todas las filas del CSV en memoria ──────────────────────
  const filas = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(rutaCSV, { encoding: 'utf8' })
      .pipe(csv({
        // Elimina BOM de UTF-8 (frecuente al exportar desde Excel)
        mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim(),
        mapValues:  ({ value })  => value.trim(),
      }))
      .on('data', row  => filas.push(row))
      .on('error', err => reject(err))
      .on('end',   ()  => resolve());
  });

  console.log(`  📊  Total de filas en el CSV: ${filas.length}\n`);

  // ── Paso 2: insertar cada fila ───────────────────────────────────────────
  for (const fila of filas) {
    procesadas++;

    // Campos obligatorios: al menos un título
    const titulo_es = limpiar(fila['titulo_es']);
    const titulo_en = limpiar(fila['titulo_en']);

    if (!titulo_es && !titulo_en) {
      omitidas++;
      const msg = 'Sin título (titulo_es y titulo_en vacíos)';
      console.warn(`  ⚠️   Fila ${procesadas}: ${msg}`);
      fallos.push({ fila: procesadas, motivo: msg, datos: fila });
      continue;
    }

    // Normalizar JSONB
    const autores    = normalizarPersonas(fila['autores']);
    const directores = normalizarPersonas(fila['directores']);

    // Resto de campos escalares
    const grupo_investigacion = limpiar(fila['grupo_investigacion']);
    const patrocinadores      = limpiar(fila['patrocinadores']);
    const fecha_aprobacion    = parsearFecha(fila['fecha_aprobacion']);
    const resumen             = limpiar(fila['resumen']);
    const palabras_claves_es  = limpiar(fila['palabras_claves_es']);
    const tipo_documento      = limpiar(fila['tipo_documento']);
    const abstract            = limpiar(fila['abstract']);
    const palabras_claves_en  = limpiar(fila['palabras_claves_en']);
    const titulo_grado        = limpiar(fila['titulo_grado']);
    const tipo_acceso         = limpiar(fila['tipo_acceso']);
    const archivo_url         = limpiar(fila['archivo_url']);

    try {
      await pool.query(
        `INSERT INTO documentos
           (titulo_es, titulo_en, autores, directores, grupo_investigacion,
            patrocinadores, fecha_aprobacion, resumen, palabras_claves_es,
            tipo_documento, abstract, palabras_claves_en, titulo_grado,
            tipo_acceso, archivo_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          titulo_es,
          titulo_en,
          autores    ? JSON.stringify(autores)    : null,
          directores ? JSON.stringify(directores) : null,
          grupo_investigacion,
          patrocinadores,
          fecha_aprobacion,
          resumen,
          palabras_claves_es,
          tipo_documento,
          abstract,
          palabras_claves_en,
          titulo_grado,
          tipo_acceso,
          archivo_url,
        ]
      );

      insertadas++;
      const titulo = titulo_es || titulo_en;
      const preview = titulo.length > 60 ? titulo.slice(0, 57) + '...' : titulo;
      console.log(`  ✔   [${insertadas.toString().padStart(4)}] ${preview}`);

    } catch (err) {
      errores++;
      const msg = err.message;
      console.error(`  ✘   Fila ${procesadas}: ${msg}`);
      fallos.push({ fila: procesadas, motivo: msg, datos: fila });
    }
  }

  // ── Resumen final ─────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  RESUMEN');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Filas en el CSV   : ${procesadas}`);
  console.log(`  ✅  Insertadas    : ${insertadas}`);
  console.log(`  ⚠️   Omitidas     : ${omitidas}`);
  console.log(`  ❌  Con error     : ${errores}`);

  if (fallos.length > 0) {
    const logPath = path.join(__dirname, 'migrar_errores.json');
    fs.writeFileSync(logPath, JSON.stringify(fallos, null, 2), 'utf8');
    console.log(`\n  ℹ️   Detalle de fallos guardado en: ${logPath}`);
  }

  console.log('═══════════════════════════════════════════════════════════\n');

  await pool.end();
  process.exit(errores > 0 ? 1 : 0);
}

// ── Punto de entrada ──────────────────────────────────────────────────────────
migrar().catch(err => {
  console.error('\n❌  Error inesperado:', err.message);
  pool.end();
  process.exit(1);
});
