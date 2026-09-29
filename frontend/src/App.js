import React, { useState, useEffect } from 'react';

// ─── Paleta institucional ────────────────────────────────────────────────────
const C = {
  verde:       '#1a5c38',
  verdeOsc:    '#134a2c',
  verdePale:   '#e8f4ee',
  verdeAccent: '#2e7d52',
  grisOsc:     '#2d2d2d',
  grisMed:     '#5a5a5a',
  grisPale:    '#f5f5f5',
  blanco:      '#ffffff',
  borde:       '#d0ddd6',
  sombra:      '0 2px 8px rgba(26,92,56,0.10)',
  sombraHover: '0 6px 18px rgba(26,92,56,0.18)',
  rojo:        '#c0392b',
};

// ─── Botón reutilizable con hover ─────────────────────────────────────────────
function Btn({ onClick, disabled, children, variante = 'primario', type = 'button', style = {} }) {
  const [hover, setHover] = useState(false);
  const base = {
    border: 'none', borderRadius: '6px', padding: '9px 18px',
    fontSize: '13.5px', fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.18s, box-shadow 0.18s',
    letterSpacing: '0.02em', ...style,
  };
  const variantes = {
    primario:   { background: disabled ? '#9cbfad' : hover ? C.verdeOsc : C.verde,    color: C.blanco, boxShadow: !disabled && hover ? C.sombraHover : 'none' },
    secundario: { background: disabled ? '#b3c9bc' : hover ? '#1e6b44'  : C.verdeAccent, color: C.blanco, boxShadow: !disabled && hover ? C.sombraHover : 'none' },
    contorno:   { background: disabled ? C.grisPale : hover ? C.verdePale : C.blanco, color: disabled ? '#aaa' : C.verde, border: `1.5px solid ${disabled ? '#ccc' : C.verde}`, boxShadow: 'none' },
    peligro:    { background: hover ? '#a93226' : C.rojo, color: C.blanco, boxShadow: hover ? '0 4px 12px rgba(192,57,43,0.3)' : 'none' },
    ghost:      { background: 'transparent', color: C.verde, border: `1px dashed ${C.verde}`, boxShadow: 'none', padding: '5px 12px', fontSize: '12.5px' },
  };
  return (
    <button type={type} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={onClick} style={{ ...base, ...variantes[variante] }}>
      {children}
    </button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Mayúscula inicial en cada palabra (Title Case ligero: solo la primera letra)
const mayusculaInicial = (str) =>
  str.length === 0 ? str : str.charAt(0).toUpperCase() + str.slice(1);

// ─── App principal ────────────────────────────────────────────────────────────
function App() {
  // ── Estado: lista de documentos y UI ─────────────────────────────────────
  const [documentos, setDocumentos]               = useState([]);
  const [cargando, setCargando]                   = useState(true);
  const [totalDepositos, setTotalDepositos]        = useState(null);
  const [enviando, setEnviando]                   = useState(false);
  const [error, setError]                         = useState('');
  const [busqueda, setBusqueda]                   = useState('');
  const [programaFiltro, setProgramaFiltro]       = useState('');
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);
  const [fichaSeleccionada,     setFichaSeleccionada]     = useState(null);
  const [mostrarEstadisticas,   setMostrarEstadisticas]   = useState(false);
  const [estadisticas,          setEstadisticas]          = useState(null);
  const [paginaActual, setPaginaActual]           = useState(1);
  const DOCS_POR_PAGINA = 5;

  // ── Estado: campos del formulario ─────────────────────────────────────────
  const [tituloEs,           setTituloEs]           = useState('');
  const [tituloEn,           setTituloEn]           = useState('');
  const [autores,            setAutores]            = useState([{ nombre: '' }]);
  const [directores,         setDirectores]         = useState([{ nombre: '' }]);
  const [grupoInvestigacion, setGrupoInvestigacion] = useState('');
  const [patrocinadores,     setPatrocinadores]     = useState('');
  const [fechaAprobacion,    setFechaAprobacion]    = useState('');
  const [resumen,            setResumen]            = useState('');
  const [palabrasClavesEs,   setPalabrasClavesEs]   = useState('');
  const [tipoDocumento,      setTipoDocumento]      = useState('');
  const [abstracto,          setAbstracto]          = useState('');
  const [palabrasClavesEn,   setPalabrasClavesEn]   = useState('');
  const [tituloGrado,        setTituloGrado]        = useState('');
  const [tipoAcceso,         setTipoAcceso]         = useState('');
  const [archivo,            setArchivo]            = useState(null);

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

  // ── Contador total del repositorio ────────────────────────────────────────
  const obtenerStats = async () => {
    try {
      const res  = await fetch(`${API_URL}/api/documentos/stats`);
      const data = await res.json();
      setTotalDepositos(data.total);
    } catch (err) {
      console.error('Error cargando stats:', err);
    }
  };

  // ── Estadísticas detalladas (carga bajo demanda) ──────────────────────────
  const obtenerEstadisticas = async () => {
    if (estadisticas) return;          // ya cargadas, no volver a pedir
    try {
      const res  = await fetch(`${API_URL}/api/documentos/estadisticas`);
      const data = await res.json();
      setEstadisticas(data);
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  };

  useEffect(() => {
    obtenerDocumentos();
    obtenerStats();
  }, []);

  // ── Manejadores de listas dinámicas ──────────────────────────────────────
  const handleAutorChange = (i, valor) =>
    setAutores(autores.map((a, idx) => idx === i ? { ...a, nombre: valor } : a));

  const handleDirectorChange = (i, valor) =>
    setDirectores(directores.map((d, idx) => idx === i ? { ...d, nombre: valor } : d));

  const agregarAutor    = () => setAutores([...autores,    { nombre: '' }]);
  const agregarDirector = () => setDirectores([...directores, { nombre: '' }]);

  const quitarAutor    = (i) => setAutores(autores.filter((_, idx) => idx !== i));
  const quitarDirector = (i) => setDirectores(directores.filter((_, idx) => idx !== i));

  // ── Reset completo del formulario ─────────────────────────────────────────
  const resetFormulario = () => {
    setTituloEs(''); setTituloEn('');
    setAutores([{ nombre: '' }]); setDirectores([{ nombre: '' }]);
    setGrupoInvestigacion(''); setPatrocinadores(''); setFechaAprobacion('');
    setResumen(''); setPalabrasClavesEs(''); setTipoDocumento('');
    setAbstracto(''); setPalabrasClavesEn(''); setTituloGrado('');
    setTipoAcceso(''); setArchivo(null);
    const inputFile = document.getElementById('input-archivo');
    if (inputFile) inputFile.value = '';
  };

  // ── Envío del formulario ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tituloEs.trim() && !tituloEn.trim()) return;

    setEnviando(true);
    setError('');

    const formData = new FormData();
    if (tituloEs) formData.append('titulo_es', tituloEs);
    if (tituloEn) formData.append('titulo_en', tituloEn);
    // Arrays → JSON.stringify para que multer/express los reciba como strings
    formData.append('autores',    JSON.stringify(autores.filter(a => a.nombre.trim())));
    formData.append('directores', JSON.stringify(directores.filter(d => d.nombre.trim())));
    if (grupoInvestigacion) formData.append('grupo_investigacion', grupoInvestigacion);
    if (patrocinadores)     formData.append('patrocinadores',      patrocinadores);
    if (fechaAprobacion)    formData.append('fecha_aprobacion',    fechaAprobacion);
    if (resumen)            formData.append('resumen',             resumen);
    if (palabrasClavesEs)   formData.append('palabras_claves_es',  palabrasClavesEs);
    if (tipoDocumento)      formData.append('tipo_documento',      tipoDocumento);
    if (abstracto)          formData.append('abstract',            abstracto);
    if (palabrasClavesEn)   formData.append('palabras_claves_en',  palabrasClavesEn);
    if (tituloGrado)        formData.append('titulo_grado',        tituloGrado);
    if (tipoAcceso)         formData.append('tipo_acceso',         tipoAcceso);
    if (archivo)            formData.append('archivo',             archivo);

    try {
      const res = await fetch(`${API_URL}/api/documentos`, { method: 'POST', body: formData });
      if (res.ok) {
        resetFormulario();
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
      (doc.titulo_es || '').toLowerCase().includes(txt) ||
      (doc.titulo_en || '').toLowerCase().includes(txt) ||
      (doc.resumen   || '').toLowerCase().includes(txt);
    const coincidePrograma =
      !programaFiltro ||
      (doc.tipo_documento || '').toLowerCase() === programaFiltro.toLowerCase();
    return coincideTexto && coincidePrograma;
  });

  // ── Paginación ────────────────────────────────────────────────────────────
  const totalPaginas     = Math.ceil(documentosFiltrados.length / DOCS_POR_PAGINA);
  const indiceInicio     = (paginaActual - 1) * DOCS_POR_PAGINA;
  const documentosPagina = documentosFiltrados.slice(indiceInicio, indiceInicio + DOCS_POR_PAGINA);

  const handleBusquedaChange = (v) => { setBusqueda(v);       setPaginaActual(1); };
  const handleFiltroChange   = (v) => { setProgramaFiltro(v); setPaginaActual(1); };

  // ── Estilos compartidos ───────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', padding: '9px 12px', boxSizing: 'border-box',
    border: `1.5px solid ${C.borde}`, borderRadius: '6px',
    fontSize: '14px', color: C.grisOsc, outline: 'none', fontFamily: 'inherit',
  };
  const labelStyle = {
    display: 'block', marginBottom: '5px',
    fontSize: '13px', fontWeight: '600', color: C.grisMed,
  };
  const seccionStyle = {
    background: C.blanco, border: `1px solid ${C.borde}`,
    borderRadius: '8px', padding: '16px 18px', marginBottom: '14px',
  };
  const subtituloStyle = {
    margin: '0 0 12px', fontSize: '13px', fontWeight: '700',
    color: C.verde, textTransform: 'uppercase', letterSpacing: '0.05em',
    borderLeft: `3px solid ${C.verde}`, paddingLeft: '8px',
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", background: '#f0f4f2', minHeight: '100vh', paddingBottom: '48px' }}>

      {/* ── Cabecera institucional ─────────────────────────────────────────── */}
      <header style={{
        background: `linear-gradient(135deg, ${C.verdeOsc} 0%, ${C.verde} 100%)`,
        color: C.blanco, padding: '28px 40px 22px',
        boxShadow: '0 3px 12px rgba(0,0,0,0.18)', marginBottom: '32px',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Identidad */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>🎓</div>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>Repositorio Digital CDI UNIPAZ</h1>
              <p style={{ margin: '3px 0 0', fontSize: '13px', opacity: 0.82 }}>Plataforma de Consulta y Registro de Documentos Académicos</p>
            </div>
          </div>

          {/* Banner hero — contador de objetos digitales depositados */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '14px',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '10px',
            padding: '12px 24px',
          }}>
            <span style={{ fontSize: '28px' }}>📦</span>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '800', lineHeight: 1, color: C.blanco }}>
                {totalDepositos === null ? '—' : totalDepositos.toLocaleString('es-CO')}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '2px', letterSpacing: '0.03em' }}>
                Objetos digitales depositados
              </div>
            </div>
          </div>
        </div>

        {/* Barra de navegación */}
        <div style={{
          display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap',
        }}>
          <button
            onClick={() => { setMostrarEstadisticas(true); obtenerEstadisticas(); }}
            style={{
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.4)',
              color: '#fff', borderRadius: '6px', padding: '6px 16px',
              fontSize: '13px', fontWeight: '600', cursor: 'pointer', letterSpacing: '0.02em',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
          >
            📊 Estadísticas
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px' }}>

        {/* ════════════════════════════════════════════════════════════════
            FORMULARIO DE REGISTRO
        ════════════════════════════════════════════════════════════════ */}
        <section style={{ background: C.blanco, border: `1px solid ${C.borde}`, borderRadius: '10px', padding: '24px 28px', marginBottom: '28px', boxShadow: C.sombra }}>
          <h2 style={{ margin: '0 0 20px', fontSize: '16px', color: C.verde, borderBottom: `2px solid ${C.verdePale}`, paddingBottom: '10px' }}>
            ✏️ Registrar Nuevo Documento
          </h2>
          <form onSubmit={handleSubmit}>

            {/* ── Bloque 1: Identificación ─────────────────────────────── */}
            <div style={seccionStyle}>
              <p style={subtituloStyle}>Identificación</p>

              {/* Título en español */}
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Título en español *</label>
                <input
                  type="text"
                  placeholder="Ej. Análisis de redes de sensores inalámbricos..."
                  value={tituloEs}
                  onChange={(e) => setTituloEs(mayusculaInicial(e.target.value))}
                  style={inputStyle}
                />
              </div>

              {/* Título en inglés */}
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Title in English</label>
                <input
                  type="text"
                  placeholder="E.g. Analysis of wireless sensor networks..."
                  value={tituloEn}
                  onChange={(e) => setTituloEn(mayusculaInicial(e.target.value))}
                  style={inputStyle}
                />
              </div>

              {/* Tipo documento + Título de grado */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={labelStyle}>Tipo de documento</label>
                  <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)} style={{ ...inputStyle, background: C.blanco, cursor: 'pointer' }}>
                    <option value="">— Seleccionar —</option>
                    <option value="Tesis de pregrado">Tesis de pregrado</option>
                    <option value="Tesis de posgrado">Tesis de posgrado</option>
                    <option value="Proyecto de grado">Proyecto de grado</option>
                    <option value="Artículo de investigación">Artículo de investigación</option>
                    <option value="Monografía">Monografía</option>
                    <option value="Informe técnico">Informe técnico</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Título al que opta</label>
                  <input type="text" placeholder="Ej. Ingeniero de Sistemas" value={tituloGrado} onChange={(e) => setTituloGrado(e.target.value)} style={inputStyle} />
                </div>
              </div>

              {/* Grupo investigación + Patrocinadores */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={labelStyle}>Grupo de investigación</label>
                  <input type="text" placeholder="Nombre del grupo" value={grupoInvestigacion} onChange={(e) => setGrupoInvestigacion(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Patrocinadores</label>
                  <input type="text" placeholder="Ej. Colciencias, UNIPAZ" value={patrocinadores} onChange={(e) => setPatrocinadores(e.target.value)} style={inputStyle} />
                </div>
              </div>

              {/* Fecha aprobación */}
              <div>
                <label style={labelStyle}>Fecha de aprobación</label>
                <input type="date" value={fechaAprobacion} onChange={(e) => setFechaAprobacion(e.target.value)} style={{ ...inputStyle, maxWidth: '220px' }} />
              </div>
            </div>

            {/* ── Bloque 2: Autores ────────────────────────────────────── */}
            <div style={seccionStyle}>
              <p style={subtituloStyle}>Autores</p>
              {autores.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder={`Nombre del autor ${i + 1}`}
                    value={a.nombre}
                    onChange={(e) => handleAutorChange(i, e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  {autores.length > 1 && (
                    <button
                      type="button"
                      onClick={() => quitarAutor(i)}
                      aria-label="Quitar autor"
                      style={{ background: 'none', border: 'none', color: C.rojo, cursor: 'pointer', fontSize: '16px', padding: '4px 6px', flexShrink: 0 }}
                    >✕</button>
                  )}
                </div>
              ))}
              <Btn variante="ghost" onClick={agregarAutor} style={{ marginTop: '4px' }}>
                + Añadir autor
              </Btn>
            </div>

            {/* ── Bloque 3: Directores ─────────────────────────────────── */}
            <div style={seccionStyle}>
              <p style={subtituloStyle}>Directores / Asesores</p>
              {directores.map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder={`Nombre del director ${i + 1}`}
                    value={d.nombre}
                    onChange={(e) => handleDirectorChange(i, e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  {directores.length > 1 && (
                    <button
                      type="button"
                      onClick={() => quitarDirector(i)}
                      aria-label="Quitar director"
                      style={{ background: 'none', border: 'none', color: C.rojo, cursor: 'pointer', fontSize: '16px', padding: '4px 6px', flexShrink: 0 }}
                    >✕</button>
                  )}
                </div>
              ))}
              <Btn variante="ghost" onClick={agregarDirector} style={{ marginTop: '4px' }}>
                + Añadir director
              </Btn>
            </div>

            {/* ── Bloque 4: Resumen y palabras clave (español) ─────────── */}
            <div style={seccionStyle}>
              <p style={subtituloStyle}>Resumen (Español)</p>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Resumen</label>
                <textarea placeholder="Descripción del contenido en español..." value={resumen} onChange={(e) => setResumen(e.target.value)} style={{ ...inputStyle, height: '88px', resize: 'vertical' }} />
              </div>
              <div>
                <label style={labelStyle}>Palabras claves</label>
                <input type="text" placeholder="Ej. redes, sensores, IoT, Colombia" value={palabrasClavesEs} onChange={(e) => setPalabrasClavesEs(e.target.value)} style={inputStyle} />
              </div>
            </div>

            {/* ── Bloque 5: Abstract y keywords (inglés) ───────────────── */}
            <div style={seccionStyle}>
              <p style={subtituloStyle}>Abstract (English)</p>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Abstract</label>
                <textarea placeholder="Content description in English..." value={abstracto} onChange={(e) => setAbstracto(e.target.value)} style={{ ...inputStyle, height: '88px', resize: 'vertical' }} />
              </div>
              <div>
                <label style={labelStyle}>Keywords</label>
                <input type="text" placeholder="E.g. networks, sensors, IoT, Colombia" value={palabrasClavesEn} onChange={(e) => setPalabrasClavesEn(e.target.value)} style={inputStyle} />
              </div>
            </div>

            {/* ── Bloque 6: Acceso y archivo ───────────────────────────── */}
            <div style={seccionStyle}>
              <p style={subtituloStyle}>Acceso y Archivo</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={labelStyle}>Tipo de acceso</label>
                  <select value={tipoAcceso} onChange={(e) => setTipoAcceso(e.target.value)} style={{ ...inputStyle, background: C.blanco, cursor: 'pointer' }}>
                    <option value="">— Seleccionar —</option>
                    <option value="Abierto">Abierto</option>
                    <option value="Restringido">Restringido</option>
                    <option value="Embargado">Embargado</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Archivo PDF (opcional)</label>
                  <input
                    id="input-archivo"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setArchivo(e.target.files[0] || null)}
                    style={{ fontSize: '13px', color: C.grisMed, paddingTop: '8px' }}
                  />
                </div>
              </div>
              {archivo && (
                <div style={{ padding: '7px 12px', background: C.verdePale, borderRadius: '6px', fontSize: '13px', color: C.verde, border: `1px solid ${C.borde}` }}>
                  📄 {archivo.name} <span style={{ color: C.grisMed }}>({(archivo.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>

            {/* Error + botón envío */}
            {error && (
              <div style={{ marginBottom: '12px', padding: '9px 14px', background: '#fdecea', border: '1px solid #f5c6c2', borderRadius: '6px', fontSize: '13px', color: C.rojo }}>
                ⚠️ {error}
              </div>
            )}
            <Btn type="submit" disabled={enviando} variante="primario" style={{ width: '100%', padding: '11px', fontSize: '14px', justifyContent: 'center' }}>
              {enviando ? '⏳ Publicando...' : '✅ Publicar Documento'}
            </Btn>
          </form>
        </section>

        {/* ── Búsqueda y filtrado ────────────────────────────────────────── */}
        <section style={{ background: C.blanco, border: `1px solid ${C.borde}`, borderRadius: '10px', padding: '20px 28px', marginBottom: '24px', boxShadow: C.sombra }}>
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
              onChange={(e) => handleFiltroChange(e.target.value)}
              style={{ padding: '9px 12px', border: `1.5px solid ${C.borde}`, borderRadius: '6px', fontSize: '14px', color: C.grisOsc, background: C.blanco, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <option value="">Todos los tipos</option>
              <option value="Tesis de pregrado">Tesis de pregrado</option>
              <option value="Tesis de posgrado">Tesis de posgrado</option>
              <option value="Proyecto de grado">Proyecto de grado</option>
              <option value="Artículo de investigación">Artículo de investigación</option>
            </select>
          </div>
        </section>

        {/* ── Lista de documentos ────────────────────────────────────────── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', color: C.grisOsc }}>📂 Documentos Publicados</h2>
            <span style={{ fontSize: '12px', fontWeight: '600', background: C.verde, color: C.blanco, borderRadius: '12px', padding: '2px 10px' }}>
              {documentosFiltrados.length}{documentosFiltrados.length !== documentos.length && ` / ${documentos.length}`}
            </span>
          </div>

          {cargando ? (
            <p style={{ color: C.grisMed, textAlign: 'center', padding: '32px 0' }}>⏳ Cargando documentos...</p>
          ) : documentos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: C.grisMed, background: C.blanco, borderRadius: '10px', border: `1px solid ${C.borde}` }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>📭</div>
              <p style={{ margin: 0 }}>No hay documentos registrados aún.</p>
            </div>
          ) : documentosFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: C.grisMed, background: C.blanco, borderRadius: '10px', border: `1px solid ${C.borde}` }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔍</div>
              <p style={{ margin: 0 }}>No se encontraron documentos que coincidan con{' '}
                {busqueda && <strong>"{busqueda}"</strong>}{busqueda && programaFiltro && ' en '}{programaFiltro && <strong>{programaFiltro}</strong>}.
              </p>
            </div>
          ) : (
            documentosPagina.map((doc) => (
              <DocCard key={doc.id} doc={doc} apiUrl={API_URL}
                onPrevisualizar={() => setDocumentoSeleccionado(doc)}
                onVerFicha={() => setFichaSeleccionada(doc)}
              />
            ))
          )}
        </section>

        {/* ── Paginación ─────────────────────────────────────────────────── */}
        {totalPaginas > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '28px' }}>
            <Btn variante="contorno" disabled={paginaActual === 1} onClick={() => setPaginaActual((p) => p - 1)}>← Anterior</Btn>
            <span style={{ fontSize: '14px', color: C.grisMed, minWidth: '100px', textAlign: 'center' }}>
              Página <strong style={{ color: C.grisOsc }}>{paginaActual}</strong> de <strong style={{ color: C.grisOsc }}>{totalPaginas}</strong>
            </span>
            <Btn variante="contorno" disabled={paginaActual === totalPaginas} onClick={() => setPaginaActual((p) => p + 1)}>Siguiente →</Btn>
          </div>
        )}
      </div>

      {/* ── Modal PDF ──────────────────────────────────────────────────────── */}
      {documentoSeleccionado && (
        <ModalPDF doc={documentoSeleccionado} apiUrl={API_URL} onCerrar={() => setDocumentoSeleccionado(null)} />
      )}

      {/* ── Ficha técnica completa ─────────────────────────────────────────── */}
      {fichaSeleccionada && (
        <ModalFicha
          doc={fichaSeleccionada}
          apiUrl={API_URL}
          onCerrar={() => setFichaSeleccionada(null)}
          onPrevisualizar={() => { setFichaSeleccionada(null); setDocumentoSeleccionado(fichaSeleccionada); }}
        />
      )}

      {/* ── Modal de Estadísticas ──────────────────────────────────────────── */}
      {mostrarEstadisticas && (
        <ModalEstadisticas
          datos={estadisticas}
          total={totalDepositos}
          onCerrar={() => setMostrarEstadisticas(false)}
        />
      )}
    </div>
  );
}

// ─── Tarjeta de documento ─────────────────────────────────────────────────────
function DocCard({ doc, apiUrl, onPrevisualizar, onVerFicha }) {
  const [hover, setHover] = useState(false);

  // ── Helpers de parseo JSONB ───────────────────────────────────────────────
  const parseJson = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
    return [];
  };

  const listaAutores    = parseJson(doc.autores);
  const listaDirectores = parseJson(doc.directores);

  const nombresAutores    = listaAutores.map(a => a.nombre).filter(Boolean).join(', ');
  const nombresDirectores = listaDirectores.map(d => d.nombre).filter(Boolean).join(', ');

  // ── Fecha formateada ──────────────────────────────────────────────────────
  const fechaFmt = doc.fecha_aprobacion
    ? new Date(doc.fecha_aprobacion).toLocaleDateString('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
      })
    : null;

  // ── Palabras clave → array de píldoras ───────────────────────────────────
  const palabras = doc.palabras_claves_es
    ? doc.palabras_claves_es.split(',').map(p => p.trim()).filter(Boolean)
    : [];

  // ── Estilos locales ───────────────────────────────────────────────────────
  const pill = {
    fontSize: '11px', fontWeight: '600',
    padding: '2px 9px', borderRadius: '20px',
    background: '#e8f4ee', color: '#1a5c38',
    border: '1px solid #c3daca',
    whiteSpace: 'nowrap',
  };
  const metaChip = {
    fontSize: '12px', fontWeight: '600',
    padding: '3px 10px', borderRadius: '12px',
    border: '1px solid #c3daca',
    background: '#e8f4ee', color: '#1a5c38',
  };

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
        boxShadow: hover ? '0 6px 18px rgba(26,92,56,0.13)' : '0 2px 8px rgba(26,92,56,0.07)',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
    >
      {/* ── Títulos ─────────────────────────────────────────────────────── */}
      <h3
        onClick={onVerFicha}
        style={{
          margin: '0 0 3px', fontSize: '15.5px', color: '#0d3b26',
          fontWeight: '700', lineHeight: '1.3',
          cursor: 'pointer', textDecoration: 'underline',
          textDecorationColor: 'rgba(13,59,38,0.3)', textUnderlineOffset: '3px',
        }}
        title="Ver ficha técnica completa"
      >
        {doc.titulo_es || doc.titulo_en || '(Sin título)'}
      </h3>
      {doc.titulo_en && (
        <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#5a7a68', fontStyle: 'italic' }}>
          {doc.titulo_en}
        </p>
      )}

      {/* ── Personas ────────────────────────────────────────────────────── */}
      {nombresAutores && (
        <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#2d2d2d' }}>
          <span style={{ fontWeight: '600', color: '#1a5c38' }}>👤 Autor(es): </span>
          {nombresAutores}
        </p>
      )}
      {nombresDirectores && (
        <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#2d2d2d' }}>
          <span style={{ fontWeight: '600', color: '#1a5c38' }}>🎓 Director(es): </span>
          {nombresDirectores}
        </p>
      )}

      {/* ── Resumen ─────────────────────────────────────────────────────── */}
      {doc.resumen && (
        <p style={{ margin: '0 0 12px', color: '#4a4a4a', fontSize: '13.5px', lineHeight: '1.55' }}>
          {doc.resumen}
        </p>
      )}

      {/* ── Fila de metadatos ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '10px' }}>
        {doc.tipo_documento && (
          <span style={{ ...metaChip, background: '#e8f4ee', borderColor: '#c3daca' }}>
            📄 {doc.tipo_documento}
          </span>
        )}
        {doc.titulo_grado && (
          <span style={{ ...metaChip, background: '#f0f8ff', color: '#1a4070', borderColor: '#b8d4ee' }}>
            🎓 {doc.titulo_grado}
          </span>
        )}
        {doc.tipo_acceso && (
          <span style={{ ...metaChip, background: '#eafbf0', color: '#1a7a40', borderColor: '#b2e8c5' }}>
            {doc.tipo_acceso === 'Abierto' ? '🔓' : doc.tipo_acceso === 'Restringido' ? '🔒' : '⏳'} {doc.tipo_acceso}
          </span>
        )}
        {fechaFmt && (
          <span style={{ ...metaChip, background: '#f7f7f7', color: '#555', borderColor: '#ddd' }}>
            📅 {fechaFmt}
          </span>
        )}
      </div>

      {/* ── Palabras clave (píldoras) ────────────────────────────────────── */}
      {palabras.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
          {palabras.map((p, i) => (
            <span key={i} style={pill}>{p}</span>
          ))}
        </div>
      )}

      {/* ── Botones de acción ───────────────────────────────────────────── */}
      {doc.archivo_url && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
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
        </div>
      )}
    </div>
  );
}

// ─── Modal PDF ────────────────────────────────────────────────────────────────
function ModalPDF({ doc, apiUrl, onCerrar }) {
  return (
    <div onClick={onCerrar} role="dialog" aria-modal="true" aria-label={`Previsualización: ${doc.titulo_es || doc.titulo_en || 'documento'}`}
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,30,20,0.65)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px', boxSizing: 'border-box' }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '900px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'linear-gradient(135deg,#134a2c 0%,#1a5c38 100%)', color: '#fff', gap: '12px' }}>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ margin: '0 0 2px', fontSize: '11px', opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Previsualización de documento</p>
            <span style={{ fontWeight: '700', fontSize: '15px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📄 {doc.titulo_es || doc.titulo_en || '(Sin título)'}</span>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar previsualización"
            style={{ flexShrink: 0, background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.6)', color: '#fff', borderRadius: '8px', padding: '6px 16px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}>
            ✕ Cerrar
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '8px 20px', background: '#f5f8f6', borderBottom: '1px solid #d0ddd6' }}>
          <a href={`${apiUrl}${doc.archivo_url}`} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '13px', fontWeight: '600', color: '#1a5c38', textDecoration: 'none', padding: '5px 14px', border: '1.5px solid #1a5c38', borderRadius: '6px', background: '#e8f4ee' }}>
            ↗ Abrir en nueva pestaña
          </a>
        </div>
        <iframe src={`${apiUrl}${doc.archivo_url}`} width="100%" height="560px" title="Previsualización PDF" style={{ border: 'none', display: 'block', flex: 1 }} />
      </div>
    </div>
  );
}

// ─── Modal Ficha Técnica Completa ────────────────────────────────────────────
function ModalFicha({ doc, apiUrl, onCerrar, onPrevisualizar }) {

  const parseJson = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
    return [];
  };

  const nombresAutores    = parseJson(doc.autores).map(a => a.nombre).filter(Boolean).join(', ');
  const nombresDirectores = parseJson(doc.directores).map(d => d.nombre).filter(Boolean).join(', ');

  const fechaFmt = doc.fecha_aprobacion
    ? new Date(doc.fecha_aprobacion).toLocaleDateString('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
      })
    : null;

  const palabrasEs = doc.palabras_claves_es
    ? doc.palabras_claves_es.split(',').map(p => p.trim()).filter(Boolean)
    : [];
  const palabrasEn = doc.palabras_claves_en
    ? doc.palabras_claves_en.split(',').map(p => p.trim()).filter(Boolean)
    : [];

  // ── Micro-componentes de layout ───────────────────────────────────────────
  const Campo = ({ icono, label, valor }) => {
    if (!valor) return null;
    return (
      <div style={{ marginBottom: '2px' }}>
        <span style={{
          display: 'block', fontSize: '10.5px', fontWeight: '700',
          letterSpacing: '0.07em', textTransform: 'uppercase',
          color: '#1a5c38', marginBottom: '3px',
        }}>
          {icono} {label}
        </span>
        <span style={{ fontSize: '13.5px', color: '#2d2d2d', lineHeight: '1.5' }}>{valor}</span>
      </div>
    );
  };

  const Separador = () => (
    <div style={{ borderTop: '1px solid #e4ede8', margin: '18px 0' }} />
  );

  const BadgesPill = ({ items, color = '#1a5c38', bg = '#e8f4ee', border = '#c3daca' }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
      {items.map((p, i) => (
        <span key={i} style={{
          fontSize: '11.5px', fontWeight: '600', padding: '3px 10px',
          borderRadius: '20px', background: bg, color, border: `1px solid ${border}`,
        }}>
          {p}
        </span>
      ))}
    </div>
  );

  return (
    <div
      onClick={onCerrar}
      role="dialog" aria-modal="true" aria-label="Ficha técnica del documento"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(8, 24, 16, 0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100, padding: '20px', boxSizing: 'border-box',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '14px',
          width: '100%', maxWidth: '780px',
          maxHeight: '92vh',
          boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── Encabezado sticky ─────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #0d3320 0%, #1a5c38 100%)',
          color: '#fff', padding: '20px 26px',
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', gap: '16px',
          flexShrink: 0,
        }}>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <p style={{
              margin: '0 0 6px', fontSize: '10px', fontWeight: '700',
              letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7,
            }}>
              📋 Ficha Técnica Completa
            </p>
            {doc.titulo_es && (
              <h2 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '800', lineHeight: '1.3' }}>
                {doc.titulo_es}
              </h2>
            )}
            {doc.titulo_en && (
              <p style={{ margin: 0, fontSize: '13px', fontStyle: 'italic', opacity: 0.8 }}>
                {doc.titulo_en}
              </p>
            )}
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar ficha técnica"
            style={{
              flexShrink: 0, background: 'rgba(255,255,255,0.12)',
              border: '2px solid rgba(255,255,255,0.5)', color: '#fff',
              borderRadius: '8px', padding: '7px 18px',
              fontSize: '13.5px', fontWeight: '700', cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
          >
            ✕ Cerrar
          </button>
        </div>

        {/* ── Cuerpo con scroll ─────────────────────────────────────────── */}
        <div style={{ overflowY: 'auto', padding: '24px 28px', flex: 1 }}>

          {/* Chips de tipo/acceso/fecha */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '20px' }}>
            {doc.tipo_documento && (
              <span style={{ fontSize: '12px', fontWeight: '600', padding: '4px 12px', borderRadius: '20px', background: '#e8f4ee', color: '#1a5c38', border: '1px solid #c3daca' }}>
                📄 {doc.tipo_documento}
              </span>
            )}
            {doc.titulo_grado && (
              <span style={{ fontSize: '12px', fontWeight: '600', padding: '4px 12px', borderRadius: '20px', background: '#f0f7ff', color: '#1a4070', border: '1px solid #b8d4ee' }}>
                🎓 {doc.titulo_grado}
              </span>
            )}
            {doc.tipo_acceso && (
              <span style={{ fontSize: '12px', fontWeight: '600', padding: '4px 12px', borderRadius: '20px', background: '#edfaf3', color: '#1a7a40', border: '1px solid #a8e0bf' }}>
                {doc.tipo_acceso === 'Abierto' ? '🔓' : doc.tipo_acceso === 'Restringido' ? '🔒' : '⏳'} {doc.tipo_acceso}
              </span>
            )}
            {fechaFmt && (
              <span style={{ fontSize: '12px', fontWeight: '600', padding: '4px 12px', borderRadius: '20px', background: '#f5f5f5', color: '#555', border: '1px solid #ddd' }}>
                📅 {fechaFmt}
              </span>
            )}
          </div>

          <Separador />

          {/* Metadatos en cuadrícula de dos columnas */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '16px 24px', marginBottom: '4px',
          }}>
            <Campo icono="👤" label="Autor(es)"                valor={nombresAutores} />
            <Campo icono="🎓" label="Director(es) / Asesor(es)" valor={nombresDirectores} />
            <Campo icono="🔬" label="Grupo de Investigación"   valor={doc.grupo_investigacion} />
            <Campo icono="🤝" label="Patrocinadores"           valor={doc.patrocinadores} />
          </div>

          <Separador />

          {/* Resumen en español */}
          {doc.resumen && (
            <div style={{ marginBottom: '16px' }}>
              <span style={{
                display: 'block', fontSize: '10.5px', fontWeight: '700',
                letterSpacing: '0.07em', textTransform: 'uppercase',
                color: '#1a5c38', marginBottom: '6px',
              }}>
                📝 Resumen
              </span>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#333', lineHeight: '1.65', textAlign: 'justify' }}>
                {doc.resumen}
              </p>
              {palabrasEs.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase', color: '#1a5c38' }}>
                    🏷 Palabras clave
                  </span>
                  <BadgesPill items={palabrasEs} />
                </div>
              )}
            </div>
          )}

          {/* Abstract en inglés */}
          {doc.abstract && (
            <>
              <Separador />
              <div style={{ marginBottom: '16px' }}>
                <span style={{
                  display: 'block', fontSize: '10.5px', fontWeight: '700',
                  letterSpacing: '0.07em', textTransform: 'uppercase',
                  color: '#1a4070', marginBottom: '6px',
                }}>
                  📝 Abstract
                </span>
                <p style={{ margin: 0, fontSize: '13.5px', color: '#333', lineHeight: '1.65', fontStyle: 'italic', textAlign: 'justify' }}>
                  {doc.abstract}
                </p>
                {palabrasEn.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase', color: '#1a4070' }}>
                      🏷 Keywords
                    </span>
                    <BadgesPill items={palabrasEn} color="#1a4070" bg="#f0f7ff" border="#b8d4ee" />
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Pie: botones PDF ──────────────────────────────────────────── */}
          {doc.archivo_url && (
            <>
              <Separador />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', paddingBottom: '4px' }}>
                <Btn variante="primario" onClick={onPrevisualizar} style={{ fontSize: '13px' }}>
                  🔍 Previsualizar PDF
                </Btn>
                <a
                  href={`${apiUrl}${doc.archivo_url}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    fontSize: '13px', fontWeight: '600', color: '#1a5c38',
                    textDecoration: 'none', padding: '9px 18px',
                    border: '1.5px solid #1a5c38', borderRadius: '6px',
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#e8f4ee'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  📄 Descargar PDF
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modal Estadísticas ───────────────────────────────────────────────────────
function ModalEstadisticas({ datos, total, onCerrar }) {

  // Paleta de colores para las barras
  const COLORES = [
    '#1a5c38', '#2e7d52', '#4a9e70', '#6dbf92',
    '#134a2c', '#3d8b60', '#5aa878', '#7fc49a',
  ];

  const Grafico = ({ titulo, filas, colorBase }) => {
    if (!filas || filas.length === 0) return null;
    const max = Math.max(...filas.map(f => f.total), 1);

    return (
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{
          margin: '0 0 14px', fontSize: '13px', fontWeight: '700',
          textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1a5c38',
          borderLeft: '3px solid #1a5c38', paddingLeft: '8px',
        }}>
          {titulo}
        </h3>
        {filas.map((fila, i) => {
          const pct = Math.round((fila.total / max) * 100);
          const color = COLORES[i % COLORES.length];
          return (
            <div key={i} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontSize: '13px', color: '#2d2d2d', flex: 1, paddingRight: '10px' }}>
                  {fila.nombre}
                </span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1a5c38', minWidth: '28px', textAlign: 'right' }}>
                  {fila.total}
                </span>
              </div>
              {/* Barra de progreso */}
              <div style={{ background: '#e8f4ee', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`, height: '100%',
                  background: color,
                  borderRadius: '6px',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      onClick={onCerrar}
      role="dialog" aria-modal="true" aria-label="Estadísticas del repositorio"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(8,24,16,0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1200, padding: '20px', boxSizing: 'border-box',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '14px',
          width: '100%', maxWidth: '680px', maxHeight: '90vh',
          boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Encabezado */}
        <div style={{
          background: 'linear-gradient(135deg, #0d3320 0%, #1a5c38 100%)',
          color: '#fff', padding: '18px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: '10px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Repositorio CDI UNIPAZ
            </p>
            <span style={{ fontWeight: '800', fontSize: '16px' }}>📊 Estadísticas del Repositorio</span>
          </div>
          <button
            onClick={onCerrar}
            style={{
              background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.5)',
              color: '#fff', borderRadius: '8px', padding: '6px 16px',
              fontSize: '13.5px', fontWeight: '700', cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Contenido */}
        <div style={{ overflowY: 'auto', padding: '24px 28px' }}>

          {/* Tarjeta resumen total */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            background: 'linear-gradient(135deg, #e8f4ee, #f5fbf7)',
            border: '1px solid #c3daca', borderRadius: '10px',
            padding: '16px 20px', marginBottom: '28px',
          }}>
            <span style={{ fontSize: '36px' }}>📦</span>
            <div>
              <div style={{ fontSize: '32px', fontWeight: '900', color: '#1a5c38', lineHeight: 1 }}>
                {total !== null ? total.toLocaleString('es-CO') : '—'}
              </div>
              <div style={{ fontSize: '13px', color: '#3a6b4e', marginTop: '2px' }}>
                Total de objetos digitales depositados
              </div>
            </div>
          </div>

          {/* Gráficos */}
          {!datos ? (
            <p style={{ textAlign: 'center', color: '#888', padding: '20px 0' }}>⏳ Cargando estadísticas....</p>
          ) : (
            <>
              <Grafico
                titulo="Distribución por Tipo de Documento"
                filas={datos.porTipoDocumento}
              />
              <Grafico
                titulo="Distribución por Título al que Opta"
                filas={datos.porTituloGrado}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;


