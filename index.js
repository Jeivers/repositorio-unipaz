const express = require('express');
const app = express();
const PORT = 4000; // Usaremos el puerto 4000 para el Backend, como en tu arquitectura

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('¡Hola! El servidor Backend del CDI UNIPAZ está funcionando correctamente.');
});

// Enciende el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});