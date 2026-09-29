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
CREATE TABLE IF NOT EXISTS documentos (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    resumen TEXT,
    archivo_url VARCHAR(255) NOT NULL,
    fecha_publicacion DATE NOT NULL,
    programa_id INT REFERENCES programas(id) ON DELETE SET NULL,
    usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    estado VARCHAR(20) DEFAULT 'pendiente',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Datos iniciales de prueba
INSERT INTO programas (nombre, facultad) VALUES 
('Ingeniería de Sistemas', 'Facultad de Ingenierías'),
('Licenciatura en Pedagogía', 'Facultad de Educación')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES 
('Admin UNIPAZ', 'admin@unipaz.edu.co', 'hash_seguro_123', 'admin')
ON CONFLICT (email) DO NOTHING;