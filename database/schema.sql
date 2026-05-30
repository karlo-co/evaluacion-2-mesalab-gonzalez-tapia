-- Schema para la aplicación Mesalab (PostgreSQL)

-- Tabla de roles
CREATE TABLE IF NOT EXISTS roles (
  id_rol SERIAL PRIMARY KEY,
  nombre_rol VARCHAR(100) NOT NULL UNIQUE
);

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  correo VARCHAR(255) NOT NULL UNIQUE,
  clave VARCHAR(255) NOT NULL,
  id_rol INTEGER NOT NULL REFERENCES roles(id_rol) ON DELETE RESTRICT,
  estado VARCHAR(50) NOT NULL DEFAULT 'activo',
  creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de categorías
CREATE TABLE IF NOT EXISTS categorias (
  id_categoria SERIAL PRIMARY KEY,
  nombre_categoria VARCHAR(150) NOT NULL UNIQUE
);

-- Tabla de solicitudes
CREATE TABLE IF NOT EXISTS solicitudes (
  id_solicitud SERIAL PRIMARY KEY,
  id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  id_categoria INTEGER NOT NULL REFERENCES categorias(id_categoria) ON DELETE RESTRICT,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT NOT NULL,
  prioridad VARCHAR(20) NOT NULL DEFAULT 'media',
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
  fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_usuarios_correo ON usuarios(correo);
CREATE INDEX IF NOT EXISTS idx_solicitudes_usuario ON solicitudes(id_usuario);
CREATE INDEX IF NOT EXISTS idx_solicitudes_categoria ON solicitudes(id_categoria);
CREATE INDEX IF NOT EXISTS idx_solicitudes_prioridad ON solicitudes(prioridad);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes(estado);
