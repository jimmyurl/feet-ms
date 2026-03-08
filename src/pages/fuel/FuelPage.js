import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '../../context/SupabaseContext';
import { useToast } from '../../context/ToastContext';
import { Button, Badge, Spinner, EmptyState, Modal, Field, StatCard, inputStyle, selectStyle, textareaStyle } from '../../components/ui';
import { fmtCurrency, fmtDate, fmt } from '../../lib/utils';

export default function FuelPage({ isAdmin }) {
  const { client } = useSupabase();
  const { addToast } = useToast();
  const [logs, setLogs]         = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [filter, setFilter]     = useState({ vehicle:'', dateFrom:'', dateTo:'' });

  const blank = { vehicle_id:'', driver_id:'', date:new Date().toISOString().slice(0,10), amount_litres:'', cost_per_litre:'', total_cost:'', odometer:'', fuel_type:'Diesel', station:'', receipt_no:'', notes:'' };
  const [form, setForm] = useState(blank);

  const load = useCallback(async () => {
    setLoading(true);
    const [l,v,d] = await Promise.all([
      client.from('fuel_logs').select('*, vehicles(plate,fuel_type), drivers(full_name)').order('date',{ascending:false}),
      client.from('vehicles').select('id,plate,fuel_type').eq('status','active').order('plate'),
      client.from('drivers').select('id,full_name').eq('status','active').order('full_name'),
    ]);
    setLogs(l.data||[]); setVehicles(v.data||[]); setDrivers(d.data||[]);
    setLoading(false);
  }, [client]);

  useEffect(() => { load(); }, [load]);

  const setF = (k,v) => {
    setForm(f => {
      const upd = {...f,[k]:v};
      // Auto-calculate total cost
      if ((k==='amount_litres'||k==='cost_per_litre') && upd.amount_litres && upd.cost_per_litre) {
        upd.total_cost = (Number(upd.amount_litres) * Number(upd.cost_per_litre)).toFixed(0);
      }
      // Auto-fill fuel type from vehicle
      if (k==='vehicle_id') {
        const veh = vehicles.find(vv=>vv.id===v);
        if (veh) upd.fuel_type = veh.fuel_type||'Diesel';
      }
      return upd;
    });
  };

  const handleSave = async () => {
    if (!form.vehicle_id || !form.amount_litres || !form.total_cost) { addToast('Vehicle, litres and cost required','error'); return; }
    setSaving(true);
    const { error } = await client.from('fuel_logs').insert([{ ...form, amount_litres:Number(form.amount_litres), cost_per_litre:form.cost_per_litre?Number(form.cost_per_litre):null, total_cost:Number(form.total_cost), odometer:form.odometer?Number(form.odometer):null, driver_id:form.driver_id||null }]);
    setSaving(false);
    if (error) { addToast(error.message,'error'); return; }
    addToast('Fuel log recorded'); setModal(false); load();
  };

  const filtered = logs.filter(l => {
    if (filter.vehicle && l.vehicle_id!==filter.vehicle) return false;
    if (filter.dateFrom && l.date<filter.dateFrom) return false;
    if (filter.dateTo && l.date>filter.dateTo) return false;
    return true;
  });

  const totalLitres = filtered.reduce((s,l)=>s+(l.amount_litres||0),0);
  const totalCost   = filtered.reduce((s,l)=>s+(l.total_cost||0),0);
  const avgCostPerL = totalLitres>0 ? totalCost/totalLitres : 0;

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div><h1>Fuel Tracking</h1><p>Monitor fuel consumption and costs across the fleet</p></div>
        <Button onClick={()=>{setForm(blank);setModal(true);}}>+ Log Fuel</Button>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Litres"    value={`${fmt(totalLitres,1)} L`}  sub="in period"        accentColor="#1D4ED8" />
        <StatCard label="Total Cost"      value={fmtCurrency(totalCost)}     sub="in period"        accentColor="#DC2626" />
        <StatCard label="Avg Cost/Litre"  value={fmtCurrency(avgCostPerL)}   sub="per litre"        accentColor="#D97706" />
        <StatCard label="Fill-ups"        value={filtered.length}            sub="total logs"       accentColor="#16A34A" />
      </div>

      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 16px',marginBottom:14,display:'flex',flexWrap:'wrap',gap:10,alignItems:'flex-end'}}>
        <div><div style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:4,textTransform:'uppercase'}}>Vehicle</div>
          <select style={{...selectStyle,width:180}} value={filter.vehicle} onChange={e=>setFilter(f=>({...f,vehicle:e.target.value}))}>
            <option value="">All Vehicles</option>
            {vehicles.map(v=><option key={v.id} value={v.id}>{v.plate}</option>)}
          </select>
        </div>
        <div><div style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:4,textTransform:'uppercase'}}>From</div><input type="date" style={{...inputStyle,width:140}} value={filter.dateFrom} onChange={e=>setFilter(f=>({...f,dateFrom:e.target.value}))} /></div>
        <div><div style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:4,textTransform:'uppercase'}}>To</div><input type="date" style={{...inputStyle,width:140}} value={filter.dateTo} onChange={e=>setFilter(f=>({...f,dateTo:e.target.value}))} /></div>
        <button className="action-btn" onClick={()=>setFilter({vehicle:'',dateFrom:'',dateTo:''})}>Clear</button>
      </div>

      <div className="card">
        {filtered.length===0 ? (
          <EmptyState icon="⛽" message="No fuel logs" action={<Button onClick={()=>{setForm(blank);setModal(true);}}>Log first fill-up</Button>} />
        ) : (
          <table>
            <thead><tr><th>Date</th><th>Vehicle</th><th>Driver</th><th>Litres</th><th>Cost/L</th><th>Total Cost</th><th>Odometer</th><th>Station</th>{isAdmin&&<th>Actions</th>}</tr></thead>
            <tbody>{filtered.map(l=>(
              <tr key={l.id}>
                <td style={{fontSize:12,color:'var(--text3)'}}>{fmtDate(l.date)}</td>
                <td style={{fontWeight:700,color:'#1D4ED8'}}>{l.vehicles?.plate||'—'}</td>
                <td style={{fontSize:12}}>{l.drivers?.full_name||'—'}</td>
                <td style={{fontFamily:'var(--font-mono)',fontWeight:600}}>{fmt(l.amount_litres,1)} L</td>
                <td style={{fontFamily:'var(--font-mono)',fontSize:12}}>{l.cost_per_litre?fmtCurrency(l.cost_per_litre):'—'}</td>
                <td style={{fontFamily:'var(--font-mono)',fontWeight:700,color:'#DC2626'}}>{fmtCurrency(l.total_cost)}</td>
                <td style={{fontFamily:'var(--font-mono)',fontSize:12}}>{l.odometer?`${l.odometer?.toLocaleString()} km`:'—'}</td>
                <td style={{fontSize:12,color:'var(--text3)'}}>{l.station||'—'}</td>
                {isAdmin&&<td><button className="action-btn danger" onClick={async()=>{if(!window.confirm('Delete this fuel log?'))return;await client.from('fuel_logs').delete().eq('id',l.id);addToast('Deleted');load();}}>Del</button></td>}
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title="Log Fuel Fill-up" onClose={()=>setModal(false)}>
          <div className="form-grid">
            <Field label="Vehicle" required><select style={selectStyle} value={form.vehicle_id} onChange={e=>setF('vehicle_id',e.target.value)}><option value="">Select vehicle…</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.plate}</option>)}</select></Field>
            <Field label="Driver"><select style={selectStyle} value={form.driver_id} onChange={e=>setF('driver_id',e.target.value)}><option value="">— None —</option>{drivers.map(d=><option key={d.id} value={d.id}>{d.full_name}</option>)}</select></Field>
            <Field label="Date" required><input type="date" style={inputStyle} value={form.date} onChange={e=>setF('date',e.target.value)} /></Field>
            <Field label="Fuel Type"><select style={selectStyle} value={form.fuel_type} onChange={e=>setF('fuel_type',e.target.value)}>{['Petrol','Diesel','CNG'].map(t=><option key={t} value={t}>{t}</option>)}</select></Field>
            <Field label="Litres" required><input type="number" style={inputStyle} value={form.amount_litres} onChange={e=>setF('amount_litres',e.target.value)} placeholder="0.0" step="0.1" /></Field>
            <Field label="Cost per Litre (TZS)"><input type="number" style={inputStyle} value={form.cost_per_litre} onChange={e=>setF('cost_per_litre',e.target.value)} placeholder="0" /></Field>
            <Field label="Total Cost (TZS)" required><input type="number" style={inputStyle} value={form.total_cost} onChange={e=>setF('total_cost',e.target.value)} placeholder="0" /></Field>
            <Field label="Odometer (km)"><input type="number" style={inputStyle} value={form.odometer} onChange={e=>setF('odometer',e.target.value)} placeholder="Current reading" /></Field>
            <Field label="Station / Supplier"><input style={inputStyle} value={form.station} onChange={e=>setF('station',e.target.value)} placeholder="e.g. TotalEnergies Mwanza" /></Field>
            <Field label="Receipt No."><input style={inputStyle} value={form.receipt_no} onChange={e=>setF('receipt_no',e.target.value)} placeholder="Receipt number" /></Field>
            <Field label="Notes" span2><textarea style={textareaStyle} value={form.notes} onChange={e=>setF('notes',e.target.value)} placeholder="Optional notes…" /></Field>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Button variant="secondary" onClick={()=>setModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving?'Saving…':'Save Fuel Log'}</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
