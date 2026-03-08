import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '../../context/SupabaseContext';
import { useToast } from '../../context/ToastContext';
import { Button, Badge, Spinner, EmptyState, Modal, Field, StatCard, inputStyle, selectStyle, textareaStyle } from '../../components/ui';
import { fmtDate, fmt } from '../../lib/utils';

const PURPOSE = ['Official Business','Client Visit','Field Work','Airport Transfer','Delivery','Maintenance Run','Other'];
const STATUS_COLORS = { in_progress:'yellow', completed:'green', cancelled:'gray' };

export default function TripsPage({ isAdmin }) {
  const { client } = useSupabase();
  const { addToast } = useToast();
  const [trips, setTrips]       = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [filter, setFilter]     = useState({ vehicle:'', driver:'', status:'' });
  const [saving, setSaving]     = useState(false);

  const blank = { vehicle_id:'', driver_id:'', start_date:new Date().toISOString().slice(0,10), end_date:'', start_odometer:'', end_odometer:'', distance_km:'', origin:'', destination:'', purpose:'Official Business', passengers:'', fuel_used:'', status:'completed', notes:'' };
  const [form, setForm] = useState(blank);

  const load = useCallback(async () => {
    setLoading(true);
    const [t,v,d] = await Promise.all([
      client.from('trips').select('*, vehicles(plate,make,model), drivers(full_name)').order('start_date',{ascending:false}),
      client.from('vehicles').select('id,plate,make,model,mileage_current').eq('status','active').order('plate'),
      client.from('drivers').select('id,full_name').eq('status','active').order('full_name'),
    ]);
    setTrips(t.data||[]); setVehicles(v.data||[]); setDrivers(d.data||[]);
    setLoading(false);
  }, [client]);

  useEffect(() => { load(); }, [load]);

  const setF = (k,v) => setForm(f=>{
    const upd = {...f,[k]:v};
    if ((k==='start_odometer'||k==='end_odometer') && upd.start_odometer && upd.end_odometer) {
      const dist = Number(upd.end_odometer) - Number(upd.start_odometer);
      if (dist > 0) upd.distance_km = dist;
    }
    return upd;
  });

  const handleSave = async () => {
    if (!form.vehicle_id || !form.driver_id) { addToast('Vehicle and driver required','error'); return; }
    setSaving(true);
    const payload = {...form, start_odometer:form.start_odometer?Number(form.start_odometer):null, end_odometer:form.end_odometer?Number(form.end_odometer):null, distance_km:form.distance_km?Number(form.distance_km):null, fuel_used:form.fuel_used?Number(form.fuel_used):null, passengers:form.passengers?Number(form.passengers):null, end_date:form.end_date||null };
    const { error } = await client.from('trips').insert([payload]);
    setSaving(false);
    if (error) { addToast(error.message,'error'); return; }
    addToast('Trip logged'); setModal(false); load();
  };

  const filtered = trips.filter(t => {
    if (filter.vehicle && t.vehicle_id!==filter.vehicle) return false;
    if (filter.driver  && t.driver_id!==filter.driver)   return false;
    if (filter.status  && t.status!==filter.status)       return false;
    return true;
  });

  const totalKm = filtered.reduce((s,t)=>s+(t.distance_km||0),0);

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div><h1>Trip Logs</h1><p>Record and track all vehicle trips and mileage</p></div>
        <Button onClick={()=>{setForm(blank);setModal(true);}}>+ Log Trip</Button>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Trips"    value={trips.length}                    sub="all time"    accentColor="#1D4ED8" />
        <StatCard label="Total Distance" value={`${fmt(totalKm)} km`}           sub="shown"       accentColor="#0EA5E9" />
        <StatCard label="In Progress"    value={trips.filter(t=>t.status==='in_progress').length} sub="active trips" accentColor="#D97706" />
        <StatCard label="This Month"     value={trips.filter(t=>t.start_date?.startsWith(new Date().toISOString().slice(0,7))).length} sub="trips" accentColor="#16A34A" />
      </div>

      <div className="toolbar">
        <select style={{...selectStyle,width:170}} value={filter.vehicle} onChange={e=>setFilter(f=>({...f,vehicle:e.target.value}))}>
          <option value="">All Vehicles</option>
          {vehicles.map(v=><option key={v.id} value={v.id}>{v.plate}</option>)}
        </select>
        <select style={{...selectStyle,width:180}} value={filter.driver} onChange={e=>setFilter(f=>({...f,driver:e.target.value}))}>
          <option value="">All Drivers</option>
          {drivers.map(d=><option key={d.id} value={d.id}>{d.full_name}</option>)}
        </select>
        <select style={{...selectStyle,width:150}} value={filter.status} onChange={e=>setFilter(f=>({...f,status:e.target.value}))}>
          <option value="">All Statuses</option>
          {['in_progress','completed','cancelled'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <div className="spacer"/>
        <span style={{fontSize:12,color:'var(--text3)'}}>{filtered.length} trips · {fmt(totalKm)} km</span>
      </div>

      <div className="card">
        {filtered.length===0 ? (
          <EmptyState icon="🗺️" message="No trips logged" action={<Button onClick={()=>{setForm(blank);setModal(true);}}>Log first trip</Button>} />
        ) : (
          <table>
            <thead><tr><th>Date</th><th>Vehicle</th><th>Driver</th><th>Route</th><th>Purpose</th><th>Distance</th><th>Status</th></tr></thead>
            <tbody>{filtered.map(t=>(
              <tr key={t.id}>
                <td style={{fontSize:12,color:'var(--text3)'}}>{fmtDate(t.start_date)}</td>
                <td style={{fontWeight:700,color:'#1D4ED8'}}>{t.vehicles?.plate||'—'}</td>
                <td style={{fontSize:12}}>{t.drivers?.full_name||'—'}</td>
                <td style={{fontSize:12}}>{t.origin&&t.destination?`${t.origin} → ${t.destination}`:t.destination||t.origin||'—'}</td>
                <td style={{fontSize:11}}><Badge color="blue">{t.purpose}</Badge></td>
                <td style={{fontFamily:'var(--font-mono)',fontWeight:600}}>{t.distance_km?`${fmt(t.distance_km)} km`:'—'}</td>
                <td><Badge color={STATUS_COLORS[t.status]||'gray'}>{t.status?.replace('_',' ')}</Badge></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title="Log Trip" onClose={()=>setModal(false)} maxWidth={700}>
          <div className="form-grid">
            <Field label="Vehicle" required><select style={selectStyle} value={form.vehicle_id} onChange={e=>setF('vehicle_id',e.target.value)}><option value="">Select vehicle…</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.plate} — {v.make} {v.model}</option>)}</select></Field>
            <Field label="Driver" required><select style={selectStyle} value={form.driver_id} onChange={e=>setF('driver_id',e.target.value)}><option value="">Select driver…</option>{drivers.map(d=><option key={d.id} value={d.id}>{d.full_name}</option>)}</select></Field>
            <Field label="Start Date"><input type="date" style={inputStyle} value={form.start_date} onChange={e=>setF('start_date',e.target.value)} /></Field>
            <Field label="End Date"><input type="date" style={inputStyle} value={form.end_date} onChange={e=>setF('end_date',e.target.value)} /></Field>
            <Field label="Origin"><input style={inputStyle} value={form.origin} onChange={e=>setF('origin',e.target.value)} placeholder="Departure location" /></Field>
            <Field label="Destination"><input style={inputStyle} value={form.destination} onChange={e=>setF('destination',e.target.value)} placeholder="Arrival location" /></Field>
            <Field label="Start Odometer (km)"><input type="number" style={inputStyle} value={form.start_odometer} onChange={e=>setF('start_odometer',e.target.value)} placeholder="0" /></Field>
            <Field label="End Odometer (km)"><input type="number" style={inputStyle} value={form.end_odometer} onChange={e=>setF('end_odometer',e.target.value)} placeholder="0" /></Field>
            <Field label="Distance (km)"><input type="number" style={inputStyle} value={form.distance_km} onChange={e=>setF('distance_km',e.target.value)} placeholder="Auto-calculated" /></Field>
            <Field label="Fuel Used (L)"><input type="number" style={inputStyle} value={form.fuel_used} onChange={e=>setF('fuel_used',e.target.value)} placeholder="0" step="0.1" /></Field>
            <Field label="Purpose"><select style={selectStyle} value={form.purpose} onChange={e=>setF('purpose',e.target.value)}>{PURPOSE.map(p=><option key={p} value={p}>{p}</option>)}</select></Field>
            <Field label="Passengers"><input type="number" style={inputStyle} value={form.passengers} onChange={e=>setF('passengers',e.target.value)} placeholder="0" min="0" /></Field>
            <Field label="Status"><select style={selectStyle} value={form.status} onChange={e=>setF('status',e.target.value)}><option value="completed">Completed</option><option value="in_progress">In Progress</option><option value="cancelled">Cancelled</option></select></Field>
            <Field label="Notes" span2><textarea style={textareaStyle} value={form.notes} onChange={e=>setF('notes',e.target.value)} placeholder="Additional notes…" /></Field>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Button variant="secondary" onClick={()=>setModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving?'Saving…':'Save Trip'}</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
