import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '../../context/SupabaseContext';
import { useToast } from '../../context/ToastContext';
import { Button, Badge, Spinner, EmptyState, Modal, Field, StatCard, inputStyle, selectStyle, textareaStyle } from '../../components/ui';
import { fmtCurrency, fmtDate } from '../../lib/utils';

const STATUS_COLORS = { scheduled:'blue', in_progress:'yellow', completed:'green', cancelled:'gray' };
const TYPES = ['Oil Change','Tyre Change','Brake Service','Engine Repair','Transmission','Electrical','Body Work','AC Service','Suspension','Inspection','General Service','Other'];

export default function MaintenancePage({ isAdmin }) {
  const { client } = useSupabase();
  const { addToast } = useToast();
  const [records, setRecords]   = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [filter, setFilter]     = useState({ status:'', vehicle:'' });
  const [saving, setSaving]     = useState(false);

  const blank = { vehicle_id:'', type:'General Service', description:'', status:'scheduled', date:'', completion_date:'', cost:'', odometer:'', service_provider:'', invoice_no:'', next_service_date:'', next_service_km:'', notes:'' };
  const [form, setForm] = useState(blank);

  const load = useCallback(async () => {
    setLoading(true);
    const [r,v] = await Promise.all([
      client.from('maintenance_records').select('*, vehicles(plate,make,model)').order('date',{ascending:false}),
      client.from('vehicles').select('id,plate,make,model').order('plate'),
    ]);
    setRecords(r.data||[]); setVehicles(v.data||[]);
    setLoading(false);
  }, [client]);

  useEffect(() => { load(); }, [load]);

  const setF = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSave = async () => {
    if (!form.vehicle_id || !form.description.trim()) { addToast('Vehicle and description required','error'); return; }
    setSaving(true);
    const payload = {...form, cost:form.cost?Number(form.cost):null, odometer:form.odometer?Number(form.odometer):null, next_service_km:form.next_service_km?Number(form.next_service_km):null, date:form.date||null, completion_date:form.completion_date||null };
    const { error } = modal==='new' ? await client.from('maintenance_records').insert([payload]) : await client.from('maintenance_records').update(payload).eq('id',modal.id);
    setSaving(false);
    if (error) { addToast(error.message,'error'); return; }
    addToast(modal==='new'?'Maintenance record created':'Record updated');
    setModal(null); load();
  };

  const updateStatus = async (id, status) => {
    await client.from('maintenance_records').update({ status, completion_date: status==='completed'?new Date().toISOString().slice(0,10):null }).eq('id',id);
    addToast(`Marked as ${status}`); load();
  };

  const filtered = records.filter(r => {
    if (filter.status  && r.status!==filter.status)    return false;
    if (filter.vehicle && r.vehicle_id!==filter.vehicle) return false;
    return true;
  });

  const totalCost = records.filter(r=>r.status==='completed').reduce((s,r)=>s+(r.cost||0),0);
  const open      = records.filter(r=>['scheduled','in_progress'].includes(r.status)).length;

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div><h1>Maintenance</h1><p>Schedule and track all vehicle maintenance and repairs</p></div>
        <Button onClick={()=>{setForm(blank);setModal('new');}}>+ Add Record</Button>
      </div>

      <div className="stats-grid">
        <StatCard label="Open"       value={open}                                                           sub="scheduled/in progress" accentColor="#1D4ED8" />
        <StatCard label="Completed"  value={records.filter(r=>r.status==='completed').length}               sub="total"                 accentColor="#16A34A" />
        <StatCard label="Total Cost" value={fmtCurrency(totalCost)}                                         sub="completed jobs"        accentColor="#DC2626" />
        <StatCard label="Scheduled"  value={records.filter(r=>r.status==='scheduled').length}               sub="upcoming"              accentColor="#D97706" />
      </div>

      <div className="toolbar">
        <select style={{...selectStyle,width:160}} value={filter.status} onChange={e=>setFilter(f=>({...f,status:e.target.value}))}>
          <option value="">All Statuses</option>
          {['scheduled','in_progress','completed','cancelled'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <select style={{...selectStyle,width:180}} value={filter.vehicle} onChange={e=>setFilter(f=>({...f,vehicle:e.target.value}))}>
          <option value="">All Vehicles</option>
          {vehicles.map(v=><option key={v.id} value={v.id}>{v.plate} — {v.make} {v.model}</option>)}
        </select>
        <div className="spacer"/>
        <span style={{fontSize:12,color:'var(--text3)'}}>{filtered.length} records</span>
      </div>

      <div className="card">
        {filtered.length===0 ? (
          <EmptyState icon="🔧" message="No maintenance records" action={<Button onClick={()=>{setForm(blank);setModal('new');}}>Add first record</Button>} />
        ) : (
          <table>
            <thead><tr><th>Vehicle</th><th>Type</th><th>Description</th><th>Date</th><th>Cost</th><th>Provider</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{filtered.map(r=>(
              <tr key={r.id}>
                <td style={{fontWeight:700,color:'#1D4ED8'}}>{r.vehicles?.plate||'—'}<div style={{fontSize:11,color:'var(--text3)',fontWeight:400}}>{r.vehicles?.make} {r.vehicles?.model}</div></td>
                <td style={{fontSize:12}}><Badge color="blue">{r.type}</Badge></td>
                <td style={{fontSize:12,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.description}</td>
                <td style={{fontSize:12,color:'var(--text3)'}}>{fmtDate(r.date)}</td>
                <td style={{fontFamily:'var(--font-mono)',fontSize:12}}>{r.cost?fmtCurrency(r.cost):'—'}</td>
                <td style={{fontSize:12,color:'var(--text3)'}}>{r.service_provider||'—'}</td>
                <td><Badge color={STATUS_COLORS[r.status]||'gray'}>{r.status?.replace('_',' ')}</Badge></td>
                <td><div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                  {isAdmin&&<button className="action-btn" onClick={()=>{setForm({...blank,...r,cost:r.cost||'',odometer:r.odometer||'',next_service_km:r.next_service_km||''});setModal(r);}}>Edit</button>}
                  {r.status==='scheduled'&&<button className="action-btn success" onClick={()=>updateStatus(r.id,'in_progress')}>Start</button>}
                  {r.status==='in_progress'&&<button className="action-btn success" onClick={()=>updateStatus(r.id,'completed')}>Complete</button>}
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal==='new'?'Add Maintenance Record':'Edit Record'} onClose={()=>setModal(null)} maxWidth={700}>
          <div className="form-grid">
            <Field label="Vehicle" required><select style={selectStyle} value={form.vehicle_id} onChange={e=>setF('vehicle_id',e.target.value)}><option value="">Select vehicle…</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.plate} — {v.make} {v.model}</option>)}</select></Field>
            <Field label="Type"><select style={selectStyle} value={form.type} onChange={e=>setF('type',e.target.value)}>{TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></Field>
            <Field label="Description" required span2><input style={inputStyle} value={form.description} onChange={e=>setF('description',e.target.value)} placeholder="Describe the work to be done" /></Field>
            <Field label="Status"><select style={selectStyle} value={form.status} onChange={e=>setF('status',e.target.value)}>{['scheduled','in_progress','completed','cancelled'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}</select></Field>
            <Field label="Date"><input type="date" style={inputStyle} value={form.date} onChange={e=>setF('date',e.target.value)} /></Field>
            <Field label="Completion Date"><input type="date" style={inputStyle} value={form.completion_date} onChange={e=>setF('completion_date',e.target.value)} /></Field>
            <Field label="Cost (TZS)"><input type="number" style={inputStyle} value={form.cost} onChange={e=>setF('cost',e.target.value)} placeholder="0" /></Field>
            <Field label="Odometer (km)"><input type="number" style={inputStyle} value={form.odometer} onChange={e=>setF('odometer',e.target.value)} placeholder="Current reading" /></Field>
            <Field label="Service Provider"><input style={inputStyle} value={form.service_provider} onChange={e=>setF('service_provider',e.target.value)} placeholder="Garage / workshop name" /></Field>
            <Field label="Invoice No."><input style={inputStyle} value={form.invoice_no} onChange={e=>setF('invoice_no',e.target.value)} placeholder="Invoice number" /></Field>
            <Field label="Next Service Date"><input type="date" style={inputStyle} value={form.next_service_date} onChange={e=>setF('next_service_date',e.target.value)} /></Field>
            <Field label="Next Service at (km)"><input type="number" style={inputStyle} value={form.next_service_km} onChange={e=>setF('next_service_km',e.target.value)} placeholder="0" /></Field>
            <Field label="Notes" span2><textarea style={textareaStyle} value={form.notes} onChange={e=>setF('notes',e.target.value)} placeholder="Additional notes…" /></Field>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Button variant="secondary" onClick={()=>setModal(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving?'Saving…':'Save Record'}</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
