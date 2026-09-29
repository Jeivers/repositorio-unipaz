import React, { useState, useEffect } from 'react';

// ─── Paleta institucional ────────────────────────────────────────────────────
const C = {
  verde:        '#1a5c38',   // verde universitario principal
  verdeOsc:     '#134a2c',   // hover / encabezados
  verdePale:    '#e8f4ee',   // fondos suaves
  verdeAccent:  '#2e7d52',   // botones secundarios
  grisOsc:      '#2d2d2d',   // texto principal
  grisMed:      '#5a5a5a',   // texto secundario
  grisPale:     '#f5f5f5',   // fondo de secciones
  blanco:       '#ffffff',
  borde:        '#d0ddd6',   // bordes con tinte verde
  sombra:       '0 2px 8px rgba(26,92,56,0.10)',
  sombraHover:  '0 6px 18px rgba(26,92,56,0.18)',
  rojo:         '#c0392b',
};

// ─── Componente botón reutilizable con hover ─────────────────────────────────
function Btn({ onClick, disabled, children, variante = 'primario', type = 'button', style = {} }) {
  const [hover, setHover] = useState(false);

  const base = {
    border: 'none',
    borderRadius: '6px',
    padding: '9px 18px',
    fontSize: '13.5px',
    fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.18s, box-shadow 0.18s',
    letterSpacing: '0.02em',
    ...style,
  };

  const variantes = {
    primario: {
      background: disabled ? '#9cbfad' : hover ? C.verdeOsc : C.verde,
      color: C.blanco,
      boxShadow: !disabled && hover ? C.sombraHover : 'none',
    },
    secundario: {
      background: disabled ? '#b3c9bc' : hover ? '#1e6b44' : C.verdeAccent,
      color: C.blanco,
      boxShadow: !disabled && hover ? C.sombraHover : 'none',
    },
    contorno: {
      background: disabled ? C.grisPale : hover ? C.verdePale : C.blanco,
      color: disabled ? '#aaa' : C.verde,
      border: `1.5px solid ${disabled ? '#ccc' : C.verde}`,
      boxShadow: 'none',
    },
    peligro: {
      background: hover ? '#a93226' : C.rojo,
      color: C.blanco,
      boxShadow: hover ? '0 4px 12px rgba(192,57,43,0.3)' : 'none',
    },
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={{ ...base, ...variantes[variante] }}
    >
      {children}
    </button>
  );
}

// ─── App principal ────────────────────────────────────────────────────────────
function App() {
  const [documentos, setDocumentos]               = useState([]);
  const [cargando, setCargando]                   = useState(true);
  const [titulo, setTitulo]                       = useState('');
  const [resumen, setResumen]                     = useState('');
  const [archivo, setArchivo]                     = useState(null);
  const [enviando, setEnviando]                   = useState(false);
  const [error, setError]                         = useState('');
  const [busqueda, setBusqueda]                   = useState('');
  const [programaFiltro, setProgramaFiltro]       = useState('');
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);
  const [paginaActual, setPaginaActual]           = useState(1);
  const DOCS_POR_PAGINA = 5;

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

  // ── Carga de documentos ───────────────────────────────────────────────────
  const obtenerDocumentos = async () => {
    try {
      const res  = await fetch(`${API_URL}/api/documentos`);
      const data = await res.json();
      setDocumentos(data);
      setCargando(false);
    } catch (err) {
      console.error('Error cargando documentos:', err);
      setCargando(false);
    }
  };

  useEffect(() => { obtenerDocumentos(); }, []);

  // ── Envío del formulario ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    setEnviando(true);
    setError('');

    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('resumen', resumen);
    formData.append('programa_id', 1);
    if (archivo) formData.append('archivo', archivo);

    try {
      const res = await fetch(`${API_URL}/api/documentos`, { method: 'POST', body: formData });

      if (res.ok) {
        setTitulo('');
        setResumen('');
        setArchivo(null);
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

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const documentosFiltrados = documentos.filter((doc) => {
    const txt = busqueda.toLowerCase();
    const coincideTexto =
      !txt ||
      (doc.titulo  || '').toLowerCase().includes(txt) ||
      (doc.resumen || '').toLowerCase().includes(txt);
    const coincidePrograma =
      !programaFiltro ||
      (doc.programa || '').toLowerCase() === programaFiltro.toLowerCase();
    return coincideTexto && coincidePrograma;
  });

  // ── Paginación ────────────────────────────────────────────────────────────
  const totalPaginas   = Math.ceil(documentosFiltrados.length / DOCS_POR_PAGINA);
  const indiceInicio   = (paginaActual - 1) * DOCS_POR_PAGINA;
  const documentosPagina = documentosFiltrados.slice(indiceInicio, indiceInicio + DOCS_POR_PAGINA);

  const handleBusquedaChange  = (v) => { setBusqueda(v);      setPaginaActual(1); };
  const handleProgramaChange  = (v) => { setProgramaFiltro(v); setPaginaActual(1); };

  // ── Estilos compartidos ───────────────────────────────────────────────────
  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    boxSizing: 'border-box',
    border: `1.5px solid ${C.borde}`,
    borderRadius: '6px',
    fontSize: '14px',
    color: C.grisOsc,
    outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", background: '#f0f4f2', minHeight: '100vh', padding: '0 0 48px' }}>

      {/* ── Cabecera institucional ─────────────────────────────────────────── */}
      <header style={{
        background: `linear-gradient(135deg, ${C.verdeOsc} 0%, ${C.verde} 100%)`,
        color: C.blanco,
        padding: '28px 40px 22px',
        boxShadow: '0 3px 12px rgba(0,0,0,0.18)',
        marginBottom: '32px',
      }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', flexShrink: 0,
            }}>🎓</div>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', letterSpacing: '0.01em' }}>
                Repositorio Digital CDI UNIPAZ
              </h1>
              <p style={{ margin: '3px 0 0', fontSize: '13px', opacity: 0.82 }}>
                Plataforma de Consulta y Registro de Documentos Académicos
              </p>
            </div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 20px' }}>

        {/* ── Formulario de registro ─────────────────────────────────────── */}
        <section style={{
          background: C.blanco,
          border: `1px solid ${C.borde}`,
          borderRadius: '10px',
          padding: '24px 28px',
          marginBottom: '28px',
          boxShadow: C.sombra,
        }}>
          <h2 style={{ margin: '0 0 18px', fontSize: '16px', color: C.verde, borderBottom: `2px solid ${C.verdePale}`, paddingBottom: '10px' }}>
            ✏️ Registrar Nuevo Documento
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: C.grisMed }}>
                Título del proyecto o tesis *
              </label>
              <input
                type="text"
                placeholder="Ej. Análisis de sistemas distribuidos..."
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: C.grisMed }}>
                Resumen o abstract
              </label>
              <textarea
                placeholder="Breve descripción del contenido del documento..."
                value={resumen}
                onChange={(e) => setResumen(e.target.value)}
                style={{ ...inputStyle, height: '72px', resize: 'vertical' }}
              />
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: C.grisMed }}>
                Archivo PDF (opcional)
              </label>
              <input
                id="input-archivo"
                type="file"
                accept=".pdf"
                onChange={(e) => setArchivo(e.target.files[0] || null)}
                style={{ fontSize: '13px', color: C.grisMed }}
              />
              {archivo && (
                <div style={{
                  marginTop: '8px', padding: '7px 12px', background: C.verdePale,
                  borderRadius: '6px', fontSize: '13px', color: C.verde,
                  border: `1px solid ${C.borde}`,
                }}>
                  📄 {archivo.name} <span style={{ color: C.grisMed }}>({(archivo.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>
            {error && (
              <div style={{
                marginBottom: '12px', padding: '9px 14px', background: '#fdecea',
                border: '1px solid #f5c6c2', borderRadius: '6px',
                fontSize: '13px', color: C.rojo,
              }}>
                ⚠️ {error}
              </div>
            )}
            <Btn type="submit" disabled={enviando} variante="primario">
              {enviando ? '⏳ Publicando...' : '✅ Publicar Documento'}
            </Btn>
          </form>
        </section>

        {/* ── Búsqueda y filtrado ────────────────────────────────────────── */}
        <section style={{
          background: C.blanco,
          border: `1px solid ${C.borde}`,
          borderRadius: '10px',
          padding: '20px 28px',
          marginBottom: '24px',
          boxShadow: C.sombra,
        }}>
          <h2 style={{ margin: '0 0 14px', fontSize: '16px', color: C.verde, borderBottom: `2px solid ${C.verdePale}`, paddingBottom: '10px' }}>
            🔎 Buscar Documentos
          </h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Buscar por título o resumen..."
              value={busqueda}
              onChange={(e) => handleBusquedaChange(e.target.value)}
              style={{ ...inputStyle, flex: '1', minWidth: '200px' }}
            />
            <select
              value={programaFiltro}
              onChange={(e) => handleProgramaChange(e.target.value)}
              style={{
                padding: '9px 12px',
                border: `1.5px solid ${C.borde}`,
                borderRadius: '6px',
                fontSize: '14px',
                color: C.grisOsc,
                background: C.blanco,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <option value="">Todos los programas</option>
              <option value="Ingeniería de Sistemas">Ingeniería de Sistemas</option>
              <option value="Licenciatura en Pedagogía">Licenciatura en Pedagogía</option>
            </select>
          </div>
        </section>

        {/* ── Lista de documentos ────────────────────────────────────────── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', color: C.grisOsc }}>📂 Documentos Publicados</h2>
            <span style={{
              fontSize: '12px', fontWeight: '600', background: C.verde, color: C.blanco,
              borderRadius: '12px', padding: '2px 10px',
            }}>
              {documentosFiltrados.length}
              {documentosFiltrados.length !== documentos.length && ` / ${documentos.length}`}
            </span>
          </div>

          {cargando ? (
            <p style={{ color: C.grisMed, textAlign: 'center', padding: '32px 0' }}>⏳ Cargando documentos...</p>
          ) : documentos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: C.grisMed, background: C.blanco, borderRadius: '10px', border: `1px solid ${C.borde}` }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>📭</div>
              <p style={{ margin: 0 }}>No hay documentos registrados aún. ¡Sé el primero en agregar uno!</p>
            </div>
          ) : documentosFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: C.grisMed, background: C.blanco, borderRadius: '10px', border: `1px solid ${C.borde}` }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔍</div>
              <p style={{ margin: 0 }}>
                No se encontraron documentos que coincidan con{' '}
                {busqueda && <strong>"{busqueda}"</strong>}
                {busqueda && programaFiltro && ' en '}
                {programaFiltro && <strong>{programaFiltro}</strong>}.
              </p>
              <p style={{ margin: '6px 0 0', fontSize: '13px' }}>Intenta con otros términos o cambia el filtro de programa.</p>
            </div>
          ) : (
            documentosPagina.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                apiUrl={API_URL}
                onPrevisualizar={() => setDocumentoSeleccionado(doc)}
              />
            ))
          )}
        </section>

        {/* ── Paginación ─────────────────────────────────────────────────── */}
        {totalPaginas > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '28px' }}>
            <Btn
              variante="contorno"
              disabled={paginaActual === 1}
              onClick={() => setPaginaActual((p) => p - 1)}
            >
              ← Anterior
            </Btn>
            <span style={{ fontSize: '14px', color: C.grisMed, minWidth: '100px', textAlign: 'center' }}>
              Página <strong style={{ color: C.grisOsc }}>{paginaActual}</strong> de <strong style={{ color: C.grisOsc }}>{totalPaginas}</strong>
            </span>
            <Btn
              variante="contorno"
              disabled={paginaActual === totalPaginas}
              onClick={() => setPaginaActual((p) => p + 1)}
            >
              Siguiente →
            </Btn>
          </div>
        )}
      </div>

      {/* ── Modal de previsualización PDF ──────────────────────────────────── */}
      {documentoSeleccionado && (
        <ModalPDF
          doc={documentoSeleccionado}
          apiUrl={API_URL}
          onCerrar={() => setDocumentoSeleccionado(null)}
        />
      )}
    </div>
  );
}

// ─── Tarjeta de documento ─────────────────────────────────────────────────────
function DocCard({ doc, apiUrl, onPrevisualizar }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: '#fff',
        border: `1px solid ${hover ? '#9dbfad' : '#d0ddd6'}`,
        borderLeft: `4px solid ${hover ? '#134a2c' : '#1a5c38'}`,
        borderRadius: '10px',
        padding: '18px 20px',
        marginBottom: '14px',
        boxShadow: hover
          ? '0 6px 18px rgba(26,92,56,0.13)'
          : '0 2px 8px rgba(26,92,56,0.07)',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
    >
      <h3 style={{ margin: '0 0 6px', fontSize: '15px', color: '#134a2c', fontWeight: '700' }}>
        {doc.titulo}
      </h3>
      <p style={{ margin: '0 0 12px', color: '#5a5a5a', fontSize: '14px', lineHeight: '1.5' }}>
        {doc.resumen || <em>Sin resumen disponible.</em>}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <span style={{
          fontSize: '12px', background: '#e8f4ee', color: '#1a5c38',
          padding: '3px 10px', borderRadius: '12px', border: '1px solid #c3daca', fontWeight: '600',
        }}>
          {doc.programa || 'General'}
        </span>
        <span style={{
          fontSize: '12px', background: '#eafbf0', color: '#1a7a40',
          padding: '3px 10px', borderRadius: '12px', border: '1px solid #b2e8c5', fontWeight: '600',
        }}>
          ✔ {doc.estado}
        </span>
        {doc.archivo_url && (
          <>
            <Btn variante="secundario" onClick={onPrevisualizar} style={{ padding: '5px 14px', fontSize: '12.5px' }}>
              🔍 Previsualizar PDF
            </Btn>
            <a
              href={`${apiUrl}${doc.archivo_url}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '12.5px', fontWeight: '600', color: '#1a5c38',
                textDecoration: 'none', padding: '5px 14px',
                border: '1.5px solid #1a5c38', borderRadius: '6px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e8f4ee'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              📄 Descargar PDF
            </a>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Modal PDF ────────────────────────────────────────────────────────────────
function ModalPDF({ doc, apiUrl, onCerrar }) {
  return (
    <div
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-label={`Previsualización: ${doc.titulo}`}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(10, 30, 20, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '24px', boxSizing: 'border-box',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: '100%', maxWidth: '900px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Encabezado del modal */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px',
          background: `linear-gradient(135deg, #134a2c 0%, #1a5c38 100%)`,
          color: '#fff',
          gap: '12px',
        }}>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ margin: '0 0 2px', fontSize: '11px', opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Previsualización de documento
            </p>
            <span style={{ fontWeight: '700', fontSize: '15px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              📄 {doc.titulo}
            </span>
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar previsualización"
            style={{
              flexShrink: 0,
              background: 'rgba(255,255,255,0.15)',
              border: '2px solid rgba(255,255,255,0.6)',
              color: '#fff',
              borderRadius: '8px',
              padding: '6px 16px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              letterSpacing: '0.03em',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Barra de acciones */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '8px 20px', background: '#f5f8f6', borderBottom: '1px solid #d0ddd6',
          gap: '10px',
        }}>
          <a
            href={`${apiUrl}${doc.archivo_url}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '13px', fontWeight: '600', color: '#1a5c38',
              textDecoration: 'none', padding: '5px 14px',
              border: '1.5px solid #1a5c38', borderRadius: '6px', background: '#e8f4ee',
            }}
          >
            ↗ Abrir en nueva pestaña
          </a>
        </div>

        {/* Visor PDF */}
        <iframe
          src={`${apiUrl}${doc.archivo_url}`}
          width="100%"
          height="560px"
          title="Previsualización PDF"
          style={{ border: 'none', display: 'block', flex: 1 }}
        />
      </div>
    </div>
  );
}

export default App;
