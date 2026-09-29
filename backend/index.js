const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { Pool } = require('pg');

const app = express();
const PORT = 4000;

// Permite peticiones desde el Frontend (React)
app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta /uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuración de multer: guarda PDFs en /uploads con nombre único
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${timestamp}_${safeName}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(
      new Error('Formato de archivo no permitido. Solo se aceptan documentos PDF.'),
      false
    );
  }
};

const upload = multer({ storage, fileFilter });

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'password123',
  database: process.env.DB_NAME || 'cdi_unipaz',
  port: 5432,
});

// Ruta principal
app.get('/', (req, res) => {
  res.send('¡Hola! El servidor Backend del CDI UNIPAZ está funcionando correctamente.');
});

// Ruta de prueba para verificar conexión a la Base de Datos
app.get('/db-check', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'Conexión exitosa a PostgreSQL',
      time: result.rows[0].now,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error conectando a la base de datos' });
  }
});

// Estadísticas generales del repositorio
// Debe declararse ANTES de /api/documentos para que Express no lo confunda con un parámetro
app.get('/api/documentos/stats', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) AS total FROM documentos');
    res.json({ total: parseInt(result.rows[0].total, 10) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Estadísticas detalladas: distribución por tipo_documento y por titulo_grado
app.get('/api/documentos/estadisticas', async (req, res) => {
  try {
    const [porTipo, porGrado] = await Promise.all([
      pool.query(`
        SELECT COALESCE(tipo_documento, 'Sin clasificar') AS nombre,
               COUNT(*) AS total
        FROM documentos
        GROUP BY tipo_documento
        ORDER BY total DESC
      `),
      pool.query(`
        SELECT COALESCE(titulo_grado, 'Sin especificar') AS nombre,
               COUNT(*) AS total
        FROM documentos
        GROUP BY titulo_grado
        ORDER BY total DESC
      `),
    ]);

    res.json({
      porTipoDocumento: porTipo.rows.map(r => ({
        nombre: r.nombre,
        total: parseInt(r.total, 10),
      })),
      porTituloGrado: porGrado.rows.map(r => ({
        nombre: r.nombre,
        total: parseInt(r.total, 10),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener estadísticas detalladas' });
  }
});

// Ruta para obtener la lista de documentos del repositorio
// Acepta ?q=termino para búsqueda en títulos, resumen, autores, directores y palabras clave
app.get('/api/documentos', async (req, res) => {
  const q = (req.query.q || '').trim();

  try {
    let queryText;
    let queryParams;

    if (q) {
      // ILIKE es case-insensitive nativo en PostgreSQL — más eficiente que LOWER(...) LIKE LOWER(...)
      queryText = `
        SELECT id, titulo_es, titulo_en, autores, directores,
               grupo_investigacion, patrocinadores, fecha_aprobacion,
               resumen, palabras_claves_es, tipo_documento,
               abstract, palabras_claves_en, titulo_grado,
               tipo_acceso, archivo_url, creado_en
        FROM documentos
        WHERE  titulo_es          ILIKE $1
            OR titulo_en          ILIKE $1
            OR resumen            ILIKE $1
            OR palabras_claves_es ILIKE $1
            OR palabras_claves_en ILIKE $1
            OR autores::TEXT      ILIKE $1
            OR directores::TEXT   ILIKE $1
        ORDER BY id DESC
      `;
      queryParams = [`%${q}%`];
    } else {
      queryText = `
        SELECT id, titulo_es, titulo_en, autores, directores,
               grupo_investigacion, patrocinadores, fecha_aprobacion,
               resumen, palabras_claves_es, tipo_documento,
               abstract, palabras_claves_en, titulo_grado,
               tipo_acceso, archivo_url, creado_en
        FROM documentos
        ORDER BY id DESC
      `;
      queryParams = [];
    }

    const result = await pool.query(queryText, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar documentos' });
  }
});

// Ruta para registrar un nuevo documento con subida de PDF (multipart/form-data)
app.post('/api/documentos', upload.single('archivo'), async (req, res) => {
  // Al menos uno de los dos títulos es obligatorio
  const { titulo_es, titulo_en } = req.body;
  if (!titulo_es && !titulo_en) {
    return res.status(400).json({ error: 'Se requiere al menos el título en español o en inglés' });
  }

  // Campos escalares opcionales — fallback a null si no vienen
  const {
    grupo_investigacion = null,
    patrocinadores      = null,
    fecha_aprobacion    = null,
    resumen             = null,
    palabras_claves_es  = null,
    tipo_documento      = null,
    abstract            = null,
    palabras_claves_en  = null,
    titulo_grado        = null,
    tipo_acceso         = null,
  } = req.body;

  // autores y directores vienen como strings JSON desde FormData
  let autores    = null;
  let directores = null;
  try {
    autores    = req.body.autores    ? JSON.parse(req.body.autores)    : null;
    directores = req.body.directores ? JSON.parse(req.body.directores) : null;
  } catch (parseErr) {
    return res.status(400).json({ error: 'El formato de autores o directores no es JSON válido' });
  }

  // Ruta relativa del PDF subido, o null si no se adjuntó archivo
  const archivo_url = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const result = await pool.query(
      `INSERT INTO documentos
         (titulo_es, titulo_en, autores, directores, grupo_investigacion,
          patrocinadores, fecha_aprobacion, resumen, palabras_claves_es,
          tipo_documento, abstract, palabras_claves_en, titulo_grado,
          tipo_acceso, archivo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        titulo_es  || null,
        titulo_en  || null,
        autores    ? JSON.stringify(autores)    : null,  // JSONB acepta string serializado
        directores ? JSON.stringify(directores) : null,
        grupo_investigacion,
        patrocinadores,
        fecha_aprobacion || null,
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
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar el documento' });
  }
});

// Manejo de errores de multer y fileFilter
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'Formato de archivo no permitido. Solo se aceptan documentos PDF.') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
