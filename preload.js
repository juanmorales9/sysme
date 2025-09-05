const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getClientes: () => ipcRenderer.invoke("db:getClientes"),
  addCliente: (c) => ipcRenderer.invoke("db:addCliente", c),
  getHabitaciones: () => ipcRenderer.invoke("db:getHabitaciones"),
  getReservas: () => ipcRenderer.invoke("db:getReservas"),
  addReserva: (r) => ipcRenderer.invoke("db:addReserva", r),
  getFacturas: () => ipcRenderer.invoke("db:getFacturas"),
  backupDB: () => ipcRenderer.invoke("db:backupDB")
});