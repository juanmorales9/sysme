CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  apellido TEXT,
  email TEXT,
  telefono TEXT,
  documento TEXT,
  notas TEXT
);

CREATE TABLE IF NOT EXISTS habitaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT NOT NULL,
  tipo TEXT,
  capacidad INTEGER,
  precio REAL,
  notas TEXT
);

CREATE TABLE IF NOT EXISTS reservas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habitacion_id INTEGER,
  cliente_id INTEGER,
  check_in DATE,
  check_out DATE,
  estado TEXT CHECK(estado IN ('booked','checked-in','checked-out','cancelled')),
  total REAL,
  moneda TEXT,
  notas TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(habitacion_id) REFERENCES habitaciones(id),
  FOREIGN KEY(cliente_id) REFERENCES clientes(id)
);

CREATE TABLE IF NOT EXISTS facturas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reserva_id INTEGER,
  fecha_emision DATE DEFAULT CURRENT_DATE,
  total REAL,
  moneda TEXT,
  pagada INTEGER DEFAULT 0,
  FOREIGN KEY(reserva_id) REFERENCES reservas(id)
);

CREATE TABLE IF NOT EXISTS factura_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  factura_id INTEGER,
  descripcion TEXT,
  cantidad INTEGER,
  unitario REAL,
  FOREIGN KEY(factura_id) REFERENCES facturas(id)
);

CREATE TABLE IF NOT EXISTS pagos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  factura_id INTEGER,
  fecha DATE DEFAULT CURRENT_DATE,
  monto REAL,
  metodo TEXT,
  notas TEXT,
  FOREIGN KEY(factura_id) REFERENCES facturas(id)
);