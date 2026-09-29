const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = 4000;

// Configuración de la conexión a PostgreSQL usando las variables de entorno de Docker
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

app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});