const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const Database = require("better-sqlite3");
const fs = require("fs");

let mainWindow;
const dbPath = path.join(app.getPath("userData"), "sysmelite.db");
const db = new Database(dbPath);

// Init DB tables
const schema = fs.readFileSync(path.join(__dirname, "db-schema.sql"), "utf-8");
db.exec(schema);

// Seed minimal rooms (only once)
try {
  const row = db.prepare("SELECT COUNT(*) AS c FROM habitaciones").get();
  if (row.c === 0) {
    const stmt = db.prepare("INSERT INTO habitaciones (numero, tipo, capacidad, precio, notas) VALUES (?,?,?,?,?)");
    [["101","Doble",2,60,""],["102","Suite",3,90,""],["103","Triple",3,80,""]].forEach(r=>stmt.run(...r));
  }
} catch(e){}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "SysmeLite PMS",
    webPreferences: { preload: path.join(__dirname, "preload.js") }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "renderer/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});
app.on("window-all-closed", () => process.platform !== "darwin" && app.quit());

// IPC: Clients
ipcMain.handle("db:getClientes", () => db.prepare("SELECT * FROM clientes ORDER BY id DESC").all());
ipcMain.handle("db:addCliente", (e, c) => {
  db.prepare("INSERT INTO clientes (nombre, apellido, email, telefono, documento, notas) VALUES (?,?,?,?,?,?)")
    .run(c.nombre, c.apellido||"", c.email||"", c.telefono||"", c.documento||"", c.notas||"");
  return { ok: true };
});

// IPC: Rooms
ipcMain.handle("db:getHabitaciones", () => db.prepare("SELECT * FROM habitaciones ORDER BY numero").all());

// IPC: Reservations (basic overlap check)
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}
ipcMain.handle("db:getReservas", () => db.prepare("SELECT * FROM reservas").all());
ipcMain.handle("db:addReserva", (e, r) => {
  const all = db.prepare("SELECT * FROM reservas WHERE habitacion_id=?").all(r.habitacion_id);
  const clash = all.some(x => x.estado!=='cancelled' && rangesOverlap(x.check_in, x.check_out, r.check_in, r.check_out));
  if (clash) return { ok:false, error:"La habitación no está disponible en ese rango." };
  db.prepare("INSERT INTO reservas (habitacion_id, cliente_id, check_in, check_out, estado, total, moneda) VALUES (?,?,?,?,?,?,?)")
    .run(r.habitacion_id, r.cliente_id, r.check_in, r.check_out, r.estado||"booked", r.total||0, r.moneda||"USD");
  return { ok:true };
});

// Invoices preview
ipcMain.handle("db:getFacturas", () => db.prepare(`
  SELECT f.id, c.nombre as cliente, f.total, f.moneda, f.pagada
  FROM facturas f
  LEFT JOIN reservas r ON r.id = f.reserva_id
  LEFT JOIN clientes c ON c.id = r.cliente_id
  ORDER BY f.id DESC
`).all());

ipcMain.handle("db:backupDB", () => {
  const backupPath = path.join(app.getPath("documents"), "sysmelite_backup.db");
  fs.copyFileSync(dbPath, backupPath);
  return { status: "ok", path: backupPath };
});