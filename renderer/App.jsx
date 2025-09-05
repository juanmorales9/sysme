import React, { useEffect, useMemo, useState } from "react";

const todayISO = () => new Date().toISOString().slice(0,10);
const parseISO = (s) => new Date(s + (s?.length===10?"T00:00:00":""));
const nightsBetween = (a,b) => Math.max(0, Math.round((parseISO(b)-parseISO(a))/(1000*60*60*24)));

export default function App(){
  const [tab, setTab] = useState("dashboard");
  const [clientes, setClientes] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [res, setRes] = useState([]);
  const [name, setName] = useState("");

  const reload = async () => {
    setClientes(await window.api.getClientes());
    setRooms(await window.api.getHabitaciones());
    setRes(await window.api.getReservas());
  };

  useEffect(() => { reload(); }, []);

  const occToday = useMemo(()=>{
    const date = todayISO();
    const occupiedRoomIds = new Set(res.filter(r => r.estado!=='cancelled' && parseISO(r.check_in) <= parseISO(date) && parseISO(date) < parseISO(r.check_out)).map(r=>r.habitacion_id));
    return { occupied: occupiedRoomIds.size, total: rooms.length };
  }, [res, rooms]);

  const upcoming = useMemo(()=>{
    const now = new Date();
    return res.filter(r => parseISO(r.check_in) >= now && r.estado!=='cancelled')
              .sort((a,b)=>a.check_in.localeCompare(b.check_in)).slice(0,5);
  }, [res]);

  const addCliente = async () => {
    if(!name.trim()) return;
    await window.api.addCliente({ nombre:name, apellido:"", email:"", telefono:"", documento:"", notas:"" });
    setName("");
    await reload();
  };

  return (
    <div className="layout">
      <aside className="side">
        <div className="brand">🏨 SysmeLite PMS</div>
        <div className="nav">
          <button className={tab==='dashboard'?'active':''} onClick={()=>setTab('dashboard')}>🏠 Habitaciones</button>
          <button className={tab==='reservas'?'active':''} onClick={()=>setTab('reservas')}>📅 Reservas</button>
          <button className={tab==='clientes'?'active':''} onClick={()=>setTab('clientes')}>👤 Clientes</button>
          <button className={tab==='facturas'?'active':''} onClick={()=>setTab('facturas')}>🧾 Facturas</button>
          <button onClick={async ()=>{
            const r = await window.api.backupDB(); alert("Backup: " + r.path);
          }}>💾 Backup</button>
        </div>
      </aside>

      <main className="content">
        {tab==='dashboard' && (
          <div>
            <div className="cards">
              <div className="card">
                <div className="h2">Ocupación de hoy</div>
                <div className="big">{occToday.occupied}/{occToday.total} <span className="muted">habitaciones</span></div>
              </div>
              <div className="card">
                <div className="h2">Próximas llegadas</div>
                <div className="big">{upcoming.length}</div>
              </div>
              <div className="card">
                <div className="h2">Ajustes</div>
                <div className="muted">Moneda: USD · Impuesto: 0%</div>
              </div>
            </div>

            <div className="grid">
              <div className="card">
                <div className="h2">Calendario de ocupación (14 días)</div>
                <Calendar rooms={rooms} reservas={res} />
              </div>
              <div className="card">
                <div className="h2">Facturas</div>
                <InvoicesPreview />
              </div>
            </div>
          </div>
        )}

        {tab==='clientes' && (
          <div className="card">
            <div className="h2">Clientes</div>
            <div className="toolbar">
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre"/>
              <button className="primary" onClick={addCliente}>Agregar</button>
            </div>
            <table>
              <thead><tr><th>ID</th><th>Nombre</th><th>Email</th></tr></thead>
              <tbody>{clientes.map(c=>(<tr key={c.id}><td>{c.id}</td><td>{c.nombre}</td><td>{c.email||'-'}</td></tr>))}</tbody>
            </table>
          </div>
        )}

        {tab==='reservas' && (
          <Reservas rooms={rooms} reload={reload} reservas={res} />
        )}

        {tab==='facturas' && (
          <Facturas />
        )}
      </main>
    </div>
  );
}

function Calendar({ rooms, reservas }){
  const days = [...Array(14)].map((_,i)=>{
    const d = new Date(); d.setDate(d.getDate()+i);
    return d.toISOString().slice(0,10);
  });
  return (
    <div>
      <table>
        <thead>
          <tr><th style={{width:80}}>Hab</th>{days.map(d=><th key={d}>{Number(d.slice(8,10))}</th>)}</tr>
        </thead>
        <tbody>
          {rooms.map(r=>{
            return (
              <tr key={r.id}>
                <td>{r.numero}</td>
                {days.map(d=>{
                  const occ = reservas.some(x => x.habitacion_id===r.id && x.estado!=='cancelled' && new Date(x.check_in) <= new Date(d) && new Date(d) < new Date(x.check_out));
                  return <td key={d}>{occ ? "█" : ""}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="muted" style={{marginTop:6}}>Bloques indican días ocupados.</div>
    </div>
  );
}

function Reservas({ rooms, reservas, reload }){
  const [clienteId, setClienteId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [inDate, setInDate] = useState(todayISO());
  const [outDate, setOutDate] = useState(todayISO());

  const add = async () => {
    const cid = Number(clienteId||0);
    const rid = Number(roomId||0);
    const nights = nightsBetween(inDate, outDate);
    const res = await window.api.addReserva({ habitacion_id: rid, cliente_id: cid, check_in: inDate, check_out: outDate, total: nights*80, moneda:"USD" });
    if(!res.ok) return alert(res.error||"Error");
    await reload();
  };

  return (
    <div className="card">
      <div className="h2">Crear reserva</div>
      <div className="toolbar">
        <input type="number" placeholder="ID cliente" value={clienteId} onChange={e=>setClienteId(e.target.value)} />
        <select value={roomId} onChange={e=>setRoomId(e.target.value)}>
          <option value="">Habitación</option>
          {rooms.map(r=><option key={r.id} value={r.id}>#{r.numero} · {r.tipo}</option>)}
        </select>
        <input type="date" value={inDate} onChange={e=>setInDate(e.target.value)} />
        <input type="date" value={outDate} onChange={e=>setOutDate(e.target.value)} />
        <button className="primary" onClick={add}>Agregar</button>
      </div>
      <table>
        <thead><tr><th>ID</th><th>Hab</th><th>Cliente</th><th>Desde</th><th>Hasta</th><th>Estado</th></tr></thead>
        <tbody>{reservas.map(r=>(<tr key={r.id}><td>{r.id}</td><td>{r.habitacion_id}</td><td>{r.cliente_id}</td><td>{r.check_in}</td><td>{r.check_out}</td><td>{r.estado}</td></tr>))}</tbody>
      </table>
    </div>
  );
}

function InvoicesPreview(){
  const [rows, setRows] = useState([]);
  useEffect(()=>{ window.api.getFacturas().then(setRows); },[]);
  return (
    <table>
      <thead><tr><th>#</th><th>Cliente</th><th>Importe</th><th>Moneda</th><th>Pagada</th></tr></thead>
      <tbody>{rows.map(r=>(<tr key={r.id}><td>{r.id}</td><td>{r.cliente||'-'}</td><td>{r.total||0}</td><td>{r.moneda||'USD'}</td><td>{r.pagada? 'Sí':'No'}</td></tr>))}</tbody>
    </table>
  );
}

function Facturas(){
  return (
    <div className="card">
      <div className="h2">Facturas (vista simple)</div>
      <div className="muted">Este módulo está listo para expandirse (crear factura desde reserva, ítems, pagos y exportar CSV).</div>
    </div>
  );
}