-- Datos iniciales para Mesalab (Postgres)
-- Nota: `clave` está escrita en texto plano en este ejemplo para pruebas locales.
-- En producción, usa hashing seguro antes de guardar las contraseñas.

-- Roles iniciales
INSERT INTO roles (nombre_rol) VALUES
('admin'),
('usuario');

-- Categorías iniciales
INSERT INTO categorias (nombre_categoria) VALUES
('Soporte técnico'),
('Mantenimiento'),
('Consultas generales');

-- Usuarios iniciales
INSERT INTO usuarios (nombre, correo, clave, id_rol, estado) VALUES
('Administrador', 'admin@ejemplo.com', 'adminpass', 1, 'activo'),
('Usuario de prueba', 'usuario@ejemplo.com', 'userpass', 2, 'activo'),
('Lucía García', 'lucia.garcia@example.com', 'luciapass', 2, 'activo'),
('Carlos Méndez', 'carlos.mendez@example.com', 'carlospass', 2, 'suspendido'),
('Marta Ríos', 'marta.rios@example.com', 'martapass', 2, 'activo');

-- Solicitudes iniciales
INSERT INTO solicitudes (id_usuario, id_categoria, titulo, descripcion, prioridad, estado) VALUES
(2, 1, 'Problema con equipo', 'El equipo no enciende desde ayer.', 'alta', 'pendiente'),
(2, 2, 'Solicitud de mantenimiento', 'Solicito revisión mensual del equipo.', 'media', 'en progreso'),
(2, 3, 'Consulta sobre horario', 'Quisiera saber los horarios de atención.', 'baja', 'resuelta'),
(3, 1, 'Falla en impresora', 'La impresora no conecta con la red.', 'alta', 'pendiente'),
(4, 2, 'Cambio de filtros', 'Necesito realizar el cambio de filtros del laboratorio.', 'media', 'pendiente'),
(5, 3, 'Duda sobre reportes', '¿Cómo descargo el informe semanal?', 'baja', 'en progreso');
