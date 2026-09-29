-- Tabla de Programas Académicos / Facultades
CREATE TABLE IF NOT EXISTS programas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    facultad VARCHAR(150) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Usuarios (Administradores, Docentes, Estudiantes)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(30) DEFAULT 'estudiante',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Documentos / Publicaciones del Repositorio
-- Schema v3 — metadatos completos del repositorio institucional CDI UNIPAZ
DROP TABLE IF EXISTS documentos CASCADE;
CREATE TABLE documentos (
    id                   SERIAL PRIMARY KEY,
    titulo_es            VARCHAR(255),                  -- título en español
    titulo_en            VARCHAR(255),                  -- title in English
    autores              JSONB,                         -- [{nombre, programa, codigo_estudiante}]
    directores           JSONB,                         -- [{nombre, titulo_academico}]
    grupo_investigacion  VARCHAR(255),
    patrocinadores       VARCHAR(255),
    fecha_aprobacion     DATE,
    resumen              TEXT,                          -- resumen en español
    palabras_claves_es   TEXT,                          -- palabras clave en español
    tipo_documento       VARCHAR(100),                  -- Tesis, Proyecto de grado, Artículo…
    abstract             TEXT,                          -- abstract in English
    palabras_claves_en   TEXT,                          -- keywords in English
    titulo_grado         VARCHAR(255),                  -- título académico al que opta
    tipo_acceso          VARCHAR(50),                   -- Abierto | Restringido | Embargado
    archivo_url          VARCHAR(255),                  -- ruta relativa del PDF subido
    creado_en            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Datos iniciales de prueba
INSERT INTO programas (nombre, facultad) VALUES 
('Ingeniería de Sistemas', 'Facultad de Ingenierías'),
('Licenciatura en Pedagogía', 'Facultad de Educación')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES 
('Admin UNIPAZ', 'admin@unipaz.edu.co', 'hash_seguro_123', 'admin')
ON CONFLICT (email) DO NOTHING;