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
    cb(new Error('Solo se permiten archivos PDF'), false);
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

// Ruta para obtener la lista de documentos del repositorio
app.get('/api/documentos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.id, d.titulo, d.resumen, d.estado, d.fecha_publicacion, d.archivo_url, p.nombre AS programa 
      FROM documentos d
      LEFT JOIN programas p ON d.programa_id = p.id
      ORDER BY d.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar documentos' });
  }
});

// Ruta para registrar un nuevo documento con subida de PDF (multipart/form-data)
app.post('/api/documentos', upload.single('archivo'), async (req, res) => {
  const { titulo, resumen, programa_id } = req.body;

  if (!titulo) {
    return res.status(400).json({ error: 'El título es obligatorio' });
  }

  // Ruta relativa del archivo subido, o null si no se subió ninguno
  const archivo_url = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const result = await pool.query(
      `INSERT INTO documentos (titulo, resumen, archivo_url, fecha_publicacion, programa_id, estado) 
       VALUES ($1, $2, $3, CURRENT_DATE, $4, 'aprobado') RETURNING *`,
      [titulo, resumen || null, archivo_url, programa_id || 1]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar el documento' });
  }
});

// Manejo de errores de multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'Solo se permiten archivos PDF') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
