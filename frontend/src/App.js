import React, { useState, useEffect } from 'react';

function App() {
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [titulo, setTitulo] = useState('');
  const [resumen, setResumen] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

  // Obtener documentos de la API
  const obtenerDocumentos = async () => {
    try {
      const res = await fetch(`${API_URL}/api/documentos`);
      const data = await res.json();
      setDocumentos(data);
      setCargando(false);
    } catch (err) {
      console.error('Error cargando documentos:', err);
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerDocumentos();
  }, []);

  // Guardar un nuevo documento con FormData (multipart/form-data)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    setEnviando(true);
    setError('');

    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('resumen', resumen);
    formData.append('programa_id', 1);
    if (archivo) {
      formData.append('archivo', archivo);
    }

    try {
      const res = await fetch(`${API_URL}/api/documentos`, {
        method: 'POST',
        body: formData, // No se pone Content-Type; el navegador lo establece automáticamente con el boundary
      });

      if (res.ok) {
        setTitulo('');
        setResumen('');
        setArchivo(null);
        // Limpiar el input file visualmente
        const inputFile = document.getElementById('input-archivo');
        if (inputFile) inputFile.value = '';
        obtenerDocumentos();
      } else {
        const data = await res.json();
        setError(data.error || 'Error al guardar el documento');
      }
    } catch (err) {
      console.error('Error al guardar:', err);
      setError('No se pudo conectar con el servidor');
    } finally {
      setEnviando(false);
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
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#333' }}>
              Archivo PDF (opcional)
            </label>
            <input
              id="input-archivo"
              type="file"
              accept=".pdf"
              onChange={(e) => setArchivo(e.target.files[0] || null)}
              style={{ display: 'block', padding: '4px 0' }}
            />
            {archivo && (
              <small style={{ color: '#555', marginTop: '4px', display: 'block' }}>
                📄 {archivo.name} ({(archivo.size / 1024).toFixed(1)} KB)
              </small>
            )}
          </div>
          {error && (
            <p style={{ color: 'red', margin: '0 0 10px 0', fontSize: '14px' }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={enviando}
            style={{
              background: enviando ? '#7da8c7' : '#004b87',
              color: 'white',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '4px',
              cursor: enviando ? 'not-allowed' : 'pointer',
            }}
          >
            {enviando ? 'Publicando...' : 'Publicar Documento'}
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
                Programa: <strong>{doc.programa || 'General'}</strong> | Estado:{' '}
                <span style={{ color: 'green' }}>{doc.estado}</span>
              </small>
              {doc.archivo_url && (
                <div style={{ marginTop: '10px' }}>
                  <a
                    href={`${API_URL}${doc.archivo_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      background: '#004b87',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      textDecoration: 'none',
                      fontSize: '13px',
                    }}
                  >
                    📄 Ver / Descargar PDF
                  </a>
                </div>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}

export default App;
