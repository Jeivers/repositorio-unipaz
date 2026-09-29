import React, { useState, useEffect } from 'react';

function App() {
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [titulo, setTitulo] = useState('');
  const [resumen, setResumen] = useState('');

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

  // Obtener documentos de la API
  const obtenerDocumentos = async () => {
    try {
      const res = await fetch(`${API_URL}/api/documentos`);
      const data = await res.json();
      setDocumentos(data);
      setCargando(false);
    } catch (error) {
      console.error('Error cargando documentos:', error);
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerDocumentos();
  }, []);

  // Guardar un nuevo documento
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/documentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, resumen, programa_id: 1 }),
      });

      if (res.ok) {
        setTitulo('');
        setResumen('');
        obtenerDocumentos(); // Recargar lista
      }
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '30px', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ borderBottom: '2px solid #004b87', paddingBottom: '10px', marginBottom: '20px' }}>
        <h1 style={{ color: '#004b87', margin: 0 }}>Repositorio Digital CDI UNIPAZ</h1>
        <p style={{ color: '#666', marginTop: '5px' }}>Plataforma de Consulta y Registro de Documentos Académicos</p>
      </header>

      {/* Formulario de registro */}
      <section style={{ background: '#f4f6f8', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0 }}>Registrar Nuevo Documento</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="Título del proyecto o tesis"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              required
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <textarea
              placeholder="Resumen o abstract"
              value={resumen}
              onChange={(e) => setResumen(e.target.value)}
              style={{ width: '100%', padding: '8px', height: '60px', boxSizing: 'border-box' }}
            />
          </div>
          <button type="submit" style={{ background: '#004b87', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer' }}>
            Publicar Documento
          </button>
        </form>
      </section>

      {/* Lista de documentos */}
      <section>
        <h3>Documentos Publicados ({documentos.length})</h3>
        {cargando ? (
          <p>Cargando información del servidor...</p>
        ) : documentos.length === 0 ? (
          <p style={{ color: '#888' }}>No hay documentos registrados aún. ¡Sé el primero en agregar uno!</p>
        ) : (
          documentos.map((doc) => (
            <div key={doc.id} style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '15px', marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#004b87' }}>{doc.titulo}</h4>
              <p style={{ margin: '0 0 10px 0', color: '#444' }}>{doc.resumen || 'Sin resumen disponible.'}</p>
              <small style={{ color: '#777' }}>
                Programa: <strong>{doc.programa || 'General'}</strong> | Estado: <span style={{ color: 'green' }}>{doc.estado}</span>
              </small>
            </div>
          ))
        )
      }
      </section>
    </div>
  );
}

export default App;