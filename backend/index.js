const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 4000;

// Permite peticiones desde el Frontend (React)
app.use(cors());
app.use(express.json());

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
            time: result.rows[0].now
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
            SELECT d.id, d.titulo, d.resumen, d.estado, d.fecha_publicacion, p.nombre AS programa 
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

// Ruta para registrar un nuevo documento de prueba
app.post('/api/documentos', async (req, res) => {
    const { titulo, resumen, archivo_url, programa_id } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO documentos (titulo, resumen, archivo_url, fecha_publicacion, programa_id, estado) 
             VALUES ($1, $2, $3, CURRENT_DATE, $4, 'aprobado') RETURNING *`,
            [titulo, resumen, archivo_url || 'https://unipaz.edu.co/documento.pdf', programa_id || 1]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al guardar el documento' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});