/**
 * ============================================================
 *  SCRIPT DE MIGRACIÓN MASIVA DE DOCUMENTOS — CDI UNIPAZ
 * ============================================================
 *
 * PROPÓSITO:
 *   Lee un archivo CSV exportado desde el Excel del equipo de datos
 *   e inserta cada fila en la tabla `documentos` de PostgreSQL.
 *   Si el programa académico de una fila no existe en la tabla
 *   `programas`, lo crea automáticamente antes de insertar el documento.
 *
 * COLUMNAS ESPERADAS EN EL CSV (exactamente estos nombres de cabecera):
 *   ESCUELA | PROGRAMA | CÓDIGO | TÍTULO | AUTOR | LINK_DRIVE |
 *   AÑO | pregrado o postgrado | Resumen | Abstrac | Palabras clave | keyworks
 *
 *   Notas:
 *     - 'Abstrac'    → se mapea a la columna `abstract`  (sin 't' final, igual que en el Excel)
 *     - 'keyworks'   → se combina con 'Palabras clave' en la columna `palabras_clave`
 *     - 'LINK_DRIVE' → se guarda en `archivo_url`
 *     - 'AÑO'        → se guarda en `anio` (INT); filas con año no numérico se omiten
 *
 * CÓMO PREPARAR EL CSV DESDE EXCEL:
 *   1. Abre el archivo .xlsx en Excel.
 *   2. Ve a Archivo → Guardar como → CSV UTF-8 (delimitado por comas).
 *   3. Copia o mueve el archivo resultante a /backend/datos.csv.
 *
 * CÓMO EJECUTAR:
 *   Desde la carpeta /backend, en la terminal:
 *
 *     node migracion.js
 *
 *   Para usar un archivo con otro nombre:
 *     node migracion.js otro_archivo.csv
 *
 *   Con variables de entorno (si la BD no es la local por defecto):
 *     En Linux / macOS:
 *       DB_HOST=localhost DB_USER=admin DB_PASSWORD=password123 \
 *       DB_NAME=cdi_unipaz node migracion.js
 *
 *     En Windows PowerShell:
 *       $env:DB_HOST="localhost"; $env:DB_USER="admin"
 *       $env:DB_PASSWORD="password123"; $env:DB_NAME="cdi_unipaz"
 *       node migracion.js
 *
 *   Si la BD corre en Docker Compose, levántala primero:
 *     docker compose up -d db
 *   Y usa DB_HOST=localhost (el puerto 5432 debe estar mapeado en docker-compose.yml).
 *
 * RESULTADO:
 *   - Progreso fila a fila en consola.
 *   - Resumen final con totales de insertados / omitidos / errores.
 *   - Si hay errores, se genera /backend/migracion_errores.json para revisión.
 * ============================================================
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
const rutaCSV = path.join(__dirname, nombreArchivo);

// ── Validación de existencia del archivo ──────────────────────────────────────
if (!fs.existsSync(rutaCSV)) {
  console.error(`\n❌ ERROR: No se encontró el archivo "${rutaCSV}".`);
  console.error(`   Copia el CSV a /backend/${nombreArchivo} e intenta de nuevo.\n`);
  process.exit(1);
}

// ── Caché de programas para no consultar la BD en cada fila ──────────────────
// Clave: "ESCUELA||PROGRAMA" en minúsculas → Valor: id (INT)
const cacheProgramas = {};

/**
 * Devuelve el id del programa que coincida con (escuela, nombrePrograma).
 * Si no existe, lo inserta y devuelve el nuevo id.
 * Usa caché en memoria para evitar consultas repetidas.
 */
async function obtenerOCrearPrograma(escuela, nombrePrograma) {
  const clave = `${escuela.toLowerCase()}||${nombrePrograma.toLowerCase()}`;

  if (cacheProgramas[clave]) return cacheProgramas[clave];

  // Buscar en la BD
  const { rows } = await pool.query(
    `SELECT id FROM programas WHERE LOWER(nombre) = LOWER($1) AND LOWER(facultad) = LOWER($2) LIMIT 1`,
    [nombrePrograma, escuela]
  );

  if (rows.length > 0) {
    cacheProgramas[clave] = rows[0].id;
    return rows[0].id;
  }

  // No existe → insertarlo
  const insert = await pool.query(
    `INSERT INTO programas (nombre, facultad) VALUES ($1, $2) RETURNING id`,
    [nombrePrograma, escuela]
  );
  const nuevoId = insert.rows[0].id;
  cacheProgramas[clave] = nuevoId;
  console.log(`   📋 Nuevo programa creado: "${nombrePrograma}" (${escuela}) → id ${nuevoId}`);
  return nuevoId;
}

// ── Función principal ─────────────────────────────────────────────────────────
async function migrar() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  MIGRACIÓN DE DOCUMENTOS — CDI UNIPAZ');
  console.log('═══════════════════════════════════════════════════');
  console.log(`📂 Archivo fuente : ${rutaCSV}\n`);

  // Verificar conexión antes de procesar el CSV
  try {
    await pool.query('SELECT 1');
    console.log('✅ Conexión a PostgreSQL establecida.\n');
  } catch (err) {
    console.error('❌ No se pudo conectar a la base de datos:');
    console.error(`   ${err.message}`);
    console.error('   Verifica que el servidor esté corriendo y las credenciales sean correctas.\n');
    process.exit(1);
  }

  let filasProcesadas = 0;
  let insertados      = 0;
  let omitidos        = 0;
  let errores         = 0;
  const registrosConError = [];

  // Acumulamos las filas del stream para procesarlas de forma async controlada
  // (csv-parser emite 'data' de forma síncrona; no es seguro hacer await dentro
  //  del handler directo sin pausar el stream)
  const filas = [];

  // ── Paso 1: leer todas las filas del CSV ──────────────────────────────────
  await new Promise((resolve, reject) => {
    fs.createReadStream(rutaCSV, { encoding: 'utf8' })
      .pipe(csv({
        // Normaliza los nombres de cabecera eliminando espacios extremos y BOM
        mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim(),
        mapValues:  ({ value })  => value.trim(),
      }))
      .on('data', (fila) => filas.push(fila))
      .on('error', reject)
      .on('end',   resolve);
  });

  console.log(`📊 Total de filas en el CSV: ${filas.length}\n`);

  // ── Paso 2: procesar cada fila de forma async ─────────────────────────────
  for (const fila of filas) {
    filasProcesadas++;

    // ── Mapeo de columnas del Excel a variables ──────────────────────────────
    // Se usan los nombres EXACTOS de las cabeceras del archivo entregado.
    const escuela       = fila['ESCUELA']               || '';
    const programa      = fila['PROGRAMA']              || '';
    const codigo        = fila['CÓDIGO']                || null;
    const titulo        = fila['TÍTULO']                || '';
    const autor         = fila['AUTOR']                 || null;
    const linkDrive     = fila['LINK_DRIVE']            || null;
    const anioRaw       = fila['AÑO']                   || '';
    const nivelAcad     = fila['pregrado o postgrado']  || null;
    const resumen       = fila['Resumen']               || null;
    // 'Abstrac' (sin 't') es el nombre exacto en el Excel del equipo
    const abstracto     = fila['Abstrac']               || null;
    // Combina ambas columnas de palabras clave; si una está vacía usa la otra
    const palabrasClave = [fila['Palabras clave'], fila['keyworks']]
                            .filter(Boolean)
                            .join(' | ') || null;

    // ── Validaciones obligatorias ────────────────────────────────────────────
    if (!titulo) {
      console.warn(`⚠️  Fila ${filasProcesadas}: 'TÍTULO' vacío — omitida.`);
      omitidos++;
      registrosConError.push({ fila: filasProcesadas, motivo: 'TÍTULO vacío', datos: fila });
      continue;
    }

    // Convertir AÑO a entero; omitir si no es numérico
    const anio = anioRaw !== '' ? parseInt(anioRaw, 10) : null;
    if (anioRaw !== '' && isNaN(anio)) {
      console.warn(`⚠️  Fila ${filasProcesadas} ("${titulo}"): AÑO "${anioRaw}" no es un número válido — omitida.`);
      omitidos++;
      registrosConError.push({ fila: filasProcesadas, motivo: `AÑO inválido: "${anioRaw}"`, datos: fila });
      continue;
    }

    // ── Resolver programa_id (crea el programa si no existe) ─────────────────
    let programaId = null;
    if (escuela || programa) {
      try {
        programaId = await obtenerOCrearPrograma(
          escuela  || 'Sin escuela',
          programa || 'Sin programa'
        );
      } catch (err) {
        console.error(`   ✘ Fila ${filasProcesadas}: error al resolver programa — ${err.message}`);
        errores++;
        registrosConError.push({ fila: filasProcesadas, motivo: `Error en programa: ${err.message}`, datos: fila });
        continue;
      }
    }

    // ── Insertar documento ───────────────────────────────────────────────────
    try {
      await pool.query(
        `INSERT INTO documentos
           (titulo, resumen, archivo_url, fecha_publicacion, programa_id, estado,
            codigo, autor, anio, nivel_academico, abstract, palabras_clave)
         VALUES ($1, $2, $3, $4, $5, 'aprobado', $6, $7, $8, $9, $10, $11)`,
        [
          titulo,
          resumen,
          linkDrive,                    // LINK_DRIVE → archivo_url
          anio ? `${anio}-01-01` : null, // AÑO → fecha_publicacion (1 de enero del año)
          programaId,
          codigo,
          autor,
          anio,
          nivelAcad,
          abstracto,
          palabrasClave,
        ]
      );
      insertados++;
      console.log(`   ✔ Fila ${filasProcesadas}: "${titulo}" (${anio || 'sin año'}) — OK`);
    } catch (err) {
      errores++;
      console.error(`   ✘ Fila ${filasProcesadas}: error al insertar "${titulo}" — ${err.message}`);
      registrosConError.push({ fila: filasProcesadas, motivo: err.message, datos: fila });
    }
  }

  // ── Resumen final ─────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  RESUMEN DE LA MIGRACIÓN');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  📄 Filas en el CSV   : ${filasProcesadas}`);
  console.log(`  ✅ Insertadas        : ${insertados}`);
  console.log(`  ⚠️  Omitidas          : ${omitidos}`);
  console.log(`  ❌ Con error DB      : ${errores}`);

  if (registrosConError.length > 0) {
    console.log('\n  Filas problemáticas:');
    registrosConError.forEach(({ fila, motivo }) => {
      console.log(`    • Fila ${fila}: ${motivo}`);
    });
    const logPath = path.join(__dirname, 'migracion_errores.json');
    fs.writeFileSync(logPath, JSON.stringify(registrosConError, null, 2), 'utf8');
    console.log(`\n  ℹ️  Detalle guardado en: ${logPath}`);
  }

  console.log('═══════════════════════════════════════════════════\n');

  await pool.end();
  process.exit(errores > 0 ? 1 : 0);
}

// ── Punto de entrada ──────────────────────────────────────────────────────────
migrar().catch((err) => {
  console.error('\n❌ Error inesperado:', err.message);
  pool.end();
  process.exit(1);
});
