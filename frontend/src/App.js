import React, { useState, useEffect } from 'react';

function App() {
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [titulo, setTitulo] = useState('');
  const [resumen, setResumen] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [programaFiltro, setProgramaFiltro] = useState('');
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const DOCS_POR_PAGINA = 5;

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

  // Filtrado en tiempo real por texto y programa
  const documentosFiltrados = documentos.filter((doc) => {
    const textoBusqueda = busqueda.toLowerCase();
    const coincideTexto =
      !textoBusqueda ||
      (doc.titulo || '').toLowerCase().includes(textoBusqueda) ||
      (doc.resumen || '').toLowerCase().includes(textoBusqueda);

    const coincidePrograma =
      !programaFiltro ||
      (doc.programa || '').toLowerCase() === programaFiltro.toLowerCase();

    return coincideTexto && coincidePrograma;
  });

  // Paginación: slice de documentosFiltrados según la página actual
  const totalPaginas = Math.ceil(documentosFiltrados.length / DOCS_POR_PAGINA);
  const indiceInicio = (paginaActual - 1) * DOCS_POR_PAGINA;
  const documentosPagina = documentosFiltrados.slice(indiceInicio, indiceInicio + DOCS_POR_PAGINA);

  // Al cambiar filtro/búsqueda se vuelve siempre a la primera página
  const handleBusquedaChange = (valor) => {
    setBusqueda(valor);
    setPaginaActual(1);
  };
  const handleProgramaChange = (valor) => {
    setProgramaFiltro(valor);
    setPaginaActual(1);
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

      {/* Controles de búsqueda y filtrado */}
      <section style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '10px' }}>Buscar Documentos</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Buscar por título o resumen..."
            value={busqueda}
            onChange={(e) => handleBusquedaChange(e.target.value)}
            style={{
              flex: '1',
              minWidth: '200px',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
          <select
            value={programaFiltro}
            onChange={(e) => handleProgramaChange(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            <option value="">Todos los programas</option>
            <option value="Ingeniería de Sistemas">Ingeniería de Sistemas</option>
            <option value="Licenciatura en Pedagogía">Licenciatura en Pedagogía</option>
          </select>
        </div>
      </section>

      {/* Lista de documentos */}
      <section>
        <h3>
          Documentos Publicados ({documentosFiltrados.length}
          {documentosFiltrados.length !== documentos.length && ` de ${documentos.length}`})
        </h3>
        {cargando ? (
          <p>Cargando información del servidor...</p>
        ) : documentos.length === 0 ? (
          <p style={{ color: '#888' }}>No hay documentos registrados aún. ¡Sé el primero en agregar uno!</p>
        ) : documentosFiltrados.length === 0 ? (
          <p style={{ color: '#888', fontStyle: 'italic' }}>
            No se encontraron documentos que coincidan con{' '}
            {busqueda && <strong>"{busqueda}"</strong>}
            {busqueda && programaFiltro && ' en '}
            {programaFiltro && <strong>{programaFiltro}</strong>}.{' '}
            Intenta con otros términos o cambia el filtro de programa.
          </p>
        ) : (
          documentosPagina.map((doc) => (
            <div key={doc.id} style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '15px', marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#004b87' }}>{doc.titulo}</h4>
              <p style={{ margin: '0 0 10px 0', color: '#444' }}>{doc.resumen || 'Sin resumen disponible.'}</p>
              <small style={{ color: '#777' }}>
                Programa: <strong>{doc.programa || 'General'}</strong> | Estado:{' '}
                <span style={{ color: 'green' }}>{doc.estado}</span>
              </small>
              {doc.archivo_url && (
                <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setDocumentoSeleccionado(doc)}
                    style={{
                      background: '#0069d9',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    🔍 Previsualizar PDF
                  </button>
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

      {/* Controles de paginación */}
      {totalPaginas > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '20px', marginBottom: '10px' }}>
          <button
            onClick={() => setPaginaActual((p) => p - 1)}
            disabled={paginaActual === 1}
            style={{
              padding: '8px 18px',
              borderRadius: '4px',
              border: '1px solid #004b87',
              background: paginaActual === 1 ? '#e9ecef' : '#004b87',
              color: paginaActual === 1 ? '#aaa' : 'white',
              cursor: paginaActual === 1 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            ← Anterior
          </button>

          <span style={{ fontSize: '14px', color: '#555' }}>
            Página <strong>{paginaActual}</strong> de <strong>{totalPaginas}</strong>
          </span>

          <button
            onClick={() => setPaginaActual((p) => p + 1)}
            disabled={paginaActual === totalPaginas}
            style={{
              padding: '8px 18px',
              borderRadius: '4px',
              border: '1px solid #004b87',
              background: paginaActual === totalPaginas ? '#e9ecef' : '#004b87',
              color: paginaActual === totalPaginas ? '#aaa' : 'white',
              cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Modal de previsualización PDF */}
      {documentoSeleccionado && (
        <div
          onClick={() => setDocumentoSeleccionado(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            boxSizing: 'border-box',
          }}
        >
          {/* Contenedor del modal — detiene la propagación para no cerrar al hacer clic dentro */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '860px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Encabezado del modal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                background: '#004b87',
                color: 'white',
              }}
            >
              <span style={{ fontWeight: 'bold', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📄 {documentoSeleccionado.titulo}
              </span>
              <button
                onClick={() => setDocumentoSeleccionado(null)}
                aria-label="Cerrar previsualización"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.5)',
                  color: 'white',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  marginLeft: '12px',
                }}
              >
                ✕ Cerrar
              </button>
            </div>

            {/* Visor PDF */}
            <iframe
              src={`${API_URL}${documentoSeleccionado.archivo_url}`}
              width="100%"
              height="500px"
              title="Previsualización PDF"
              style={{ border: 'none', display: 'block' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
