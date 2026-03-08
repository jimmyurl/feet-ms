import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '../../context/SupabaseContext';
import { useToast } from '../../context/ToastContext';
import { Button, Badge, Spinner, EmptyState, Modal, Field, StatCard, inputStyle, selectStyle, textareaStyle } from '../../components/ui';
import { fmtDate, fmtCurrency } from '../../lib/utils';

const TYPES     = ['Accident','Breakdown','Traffic Violation','Theft','Vandalism','Near Miss','Other'];
const SEVERITY  = ['low','medium','high','critical'];
const SEV_COLORS = { low:'green', medium:'yellow', high:'orange', critical:'red' };
const STATUS_COLORS = { open:'red', under_investigation:'yellow', resolved:'green', closed:'gray' };

export default function IncidentsPage({ isAdmin }) {
  const { client } = useSupabase();
  const { addToast } = useToast();
  const [incidents, setIncidents] = useState([]);
  const [vehicles, setVehicles]   = useState([]);
  const [drivers, setDrivers]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);
  const [view, setView]           = useState(null);
  const [filter, setFilter]       = useState({ status:'', severity:'' });
  const [saving, setSaving]       = useState(false);

  const blank = { vehicle_id:'', driver_id:'', date:new Date().toISOString().slice(0,10), type:'Accident', severity:'medium', location:'', description:'', injuries:'', third_party:'', police_report_no:'', estimated_damage:'', repair_cost:'', insurance_claimed:false, status:'open', resolution:'', notes:'' };
  const [form, setForm] = useState(blank);

  const load = useCallback(async () => {
    setLoading(true);
    const [i,v,d] = await Promise.all([
      client.from('incidents').select('*, vehicles(plate,make,model), drivers(full_name)').order('date',{ascending:false}),
      client.from('vehicles').select('id,plate,make,model').order('plate'),
      client.from('drivers').select('id,full_name').order('full_name'),
    ]);
    setIncidents(i.data||[]); setVehicles(v.data||[]); setDrivers(d.data||[]);
    setLoading(false);
  }, [client]);

  useEffect(() => { load(); }, [load]);

  const setF = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSave = async () => {
    if (!form.vehicle_id || !form.description.trim()) { addToast('Vehicle and description required','error'); return; }
    setSaving(true);
    const payload = {...form, estimated_damage:form.estimated_damage?Number(form.estimated_damage):null, repair_cost:form.repair_cost?Number(form.repair_cost):null, driver_id:form.driver_id||null };
    const { error } = modal==='new' ? await client.from('incidents').insert([payload]) : await client.from('incidents').update(payload).eq('id',modal.id);
    setSaving(false);
    if (error) { addToast(error.message,'error'); return; }
    addToast(modal==='new'?'Incident reported':'Incident updated');
    setModal(null); load();
  };

  const updateStatus = async (id, status) => {
    await client.from('incidents').update({status}).eq('id',id);
    addToast(`Status updated to ${status.replace('_',' ')}`); load();
  };

  const filtered = incidents.filter(i => {
    if (filter.status   && i.status!==filter.status)     return false;
    if (filter.severity && i.severity!==filter.severity) return false;
    return true;
  });

  const open       = incidents.filter(i=>i.status==='open').length;
  const totalDmg   = incidents.reduce((s,i)=>s+(i.repair_cost||0),0);
  const critical   = incidents.filter(i=>i.severity==='critical'||i.severity==='high').length;

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div><h1>Incidents</h1><p>Report and manage accidents, breakdowns and violations</p></div>
        <Button onClick={()=>{setForm(blank);setModal('new');}}>+ Report Incident</Button>
      </div>

      <div className="stats-grid">
        <StatCard label="Open"          value={open}                  sub="unresolved"          accentColor="#DC2626" alert={open>0} />
        <StatCard label="High/Critical" value={critical}              sub="severe incidents"     accentColor="#D97706" alert={critical>0} />
        <StatCard label="Total Cost"    value={fmtCurrency(totalDmg)} sub="repair costs"        accentColor="#1D4ED8" />
        <StatCard label="Total"         value={incidents.length}      sub="all incidents"       accentColor="#64748B" />
      </div>

      <div className="toolbar">
        {[['','All'],['open','Open'],['under_investigation','Investigating'],['resolved','Resolved'],['closed','Closed']].map(([v,l])=>(
          <button key={v} className="action-btn" style={{fontWeight:filter.status===v?700:500,background:filter.status===v?'var(--bg2)':'none'}} onClick={()=>setFilter(f=>({...f,status:v}))}>{l}</button>
        ))}
        <div style={{flex:1}}/>
        <select style={{...selectStyle,width:140}} value={filter.severity} onChange={e=>setFilter(f=>({...f,severity:e.target.value}))}>
          <option value="">All Severities</option>
          {SEVERITY.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        {filtered.length===0 ? (
          <EmptyState icon="⚠️" message="No incidents recorded" action={<Button onClick={()=>{setForm(blank);setModal('new');}}>Report first incident</Button>} />
        ) : (
          <table>
            <thead><tr><th>Date</th><th>Vehicle</th><th>Driver</th><th>Type</th><th>Severity</th><th>Location</th><th>Repair Cost</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{filtered.map(i=>(
              <tr key={i.id}>
                <td style={{fontSize:12,color:'var(--text3)'}}>{fmtDate(i.date)}</td>
                <td style={{fontWeight:700,color:'#1D4ED8'}}>{i.vehicles?.plate||'—'}</td>
                <td style={{fontSize:12}}>{i.drivers?.full_name||'—'}</td>
                <td style={{fontSize:12}}><Badge color="blue">{i.type}</Badge></td>
                <td><Badge color={SEV_COLORS[i.severity]||'gray'}>{i.severity}</Badge></td>
                <td style={{fontSize:12,color:'var(--text3)',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{i.location||'—'}</td>
                <td style={{fontFamily:'var(--font-mono)',fontSize:12,color:'#DC2626'}}>{i.repair_cost?fmtCurrency(i.repair_cost):'—'}</td>
                <td><Badge color={STATUS_COLORS[i.status]||'gray'}>{i.status?.replace('_',' ')}</Badge></td>
                <td><div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                  <button className="action-btn" onClick={()=>setView(i)}>View</button>
                  {isAdmin&&<button className="action-btn" onClick={()=>{setForm({...blank,...i,estimated_damage:i.estimated_damage||'',repair_cost:i.repair_cost||''});setModal(i);}}>Edit</button>}
                  {isAdmin&&i.status==='open'&&<button className="action-btn" onClick={()=>updateStatus(i.id,'under_investigation')}>Investigate</button>}
                  {isAdmin&&i.status==='under_investigation'&&<button className="action-btn success" onClick={()=>updateStatus(i.id,'resolved')}>Resolve</button>}
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {/* Report Modal */}
      {modal && (
        <Modal title={modal==='new'?'Report Incident':'Edit Incident'} onClose={()=>setModal(null)} maxWidth={720}>
          <div className="form-grid">
            <Field label="Vehicle" required><select style={selectStyle} value={form.vehicle_id} onChange={e=>setF('vehicle_id',e.target.value)}><option value="">Select vehicle…</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.plate} — {v.make} {v.model}</option>)}</select></Field>
            <Field label="Driver"><select style={selectStyle} value={form.driver_id} onChange={e=>setF('driver_id',e.target.value)}><option value="">— None —</option>{drivers.map(d=><option key={d.id} value={d.id}>{d.full_name}</option>)}</select></Field>
            <Field label="Date" required><input type="date" style={inputStyle} value={form.date} onChange={e=>setF('date',e.target.value)} /></Field>
            <Field label="Type"><select style={selectStyle} value={form.type} onChange={e=>setF('type',e.target.value)}>{TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></Field>
            <Field label="Severity"><select style={selectStyle} value={form.severity} onChange={e=>setF('severity',e.target.value)}>{SEVERITY.map(s=><option key={s} value={s}>{s}</option>)}</select></Field>
            <Field label="Status"><select style={selectStyle} value={form.status} onChange={e=>setF('status',e.target.value)}>{['open','under_investigation','resolved','closed'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}</select></Field>
            <Field label="Location" span2><input style={inputStyle} value={form.location} onChange={e=>setF('location',e.target.value)} placeholder="Where did this occur?" /></Field>
            <Field label="Description" required span2><textarea style={textareaStyle} value={form.description} onChange={e=>setF('description',e.target.value)} placeholder="Describe what happened…" /></Field>
            <Field label="Injuries"><input style={inputStyle} value={form.injuries} onChange={e=>setF('injuries',e.target.value)} placeholder="Any injuries? Describe." /></Field>
            <Field label="Third Party Involved"><input style={inputStyle} value={form.third_party} onChange={e=>setF('third_party',e.target.value)} placeholder="Name, vehicle, contacts" /></Field>
            <Field label="Police Report No."><input style={inputStyle} value={form.police_report_no} onChange={e=>setF('police_report_no',e.target.value)} placeholder="OB number" /></Field>
            <Field label="Estimated Damage (TZS)"><input type="number" style={inputStyle} value={form.estimated_damage} onChange={e=>setF('estimated_damage',e.target.value)} placeholder="0" /></Field>
            <Field label="Repair Cost (TZS)"><input type="number" style={inputStyle} value={form.repair_cost} onChange={e=>setF('repair_cost',e.target.value)} placeholder="0" /></Field>
            <Field label="Insurance Claimed">
              <select style={selectStyle} value={form.insurance_claimed?'yes':'no'} onChange={e=>setF('insurance_claimed',e.target.value==='yes')}>
                <option value="no">No</option><option value="yes">Yes</option>
              </select>
            </Field>
            <Field label="Resolution" span2><textarea style={{...textareaStyle,minHeight:48}} value={form.resolution} onChange={e=>setF('resolution',e.target.value)} placeholder="How was this resolved?" /></Field>
            <Field label="Notes" span2><textarea style={textareaStyle} value={form.notes} onChange={e=>setF('notes',e.target.value)} placeholder="Additional notes…" /></Field>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Button variant="secondary" onClick={()=>setModal(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving?'Saving…':modal==='new'?'Submit Report':'Save Changes'}</Button>
          </div>
        </Modal>
      )}

      {/* View Modal */}
      {view && (
        <Modal title={`${view.type} — ${view.vehicles?.plate||'Unknown Vehicle'}`} subtitle={`${fmtDate(view.date)} · ${view.location||'Location not specified'}`} onClose={()=>setView(null)} maxWidth={620}>
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            <Badge color={SEV_COLORS[view.severity]||'gray'}>{view.severity}</Badge>
            <Badge color={STATUS_COLORS[view.status]||'gray'}>{view.status?.replace('_',' ')}</Badge>
            {view.insurance_claimed&&<Badge color="blue">Insurance Claimed</Badge>}
          </div>
          <p style={{margin:'0 0 16px',fontSize:14,lineHeight:1.6,color:'var(--text2)'}}>{view.description}</p>
          {[
            ['Driver',view.drivers?.full_name||'—'],
            ['Injuries',view.injuries||'None reported'],
            ['Third Party',view.third_party||'None'],
            ['Police Report',view.police_report_no||'—'],
            ['Est. Damage',view.estimated_damage?fmtCurrency(view.estimated_damage):'—'],
            ['Repair Cost',view.repair_cost?fmtCurrency(view.repair_cost):'—'],
            ['Resolution',view.resolution||'—'],
            ['Notes',view.notes||'—'],
          ].map(([l,v])=>(
            <div key={l} style={{display:'flex',gap:12,padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
              <span style={{width:130,fontSize:12,fontWeight:600,color:'var(--text3)',textTransform:'uppercase',letterSpacing:0.4,flexShrink:0}}>{l}</span>
              <span style={{fontSize:13}}>{v}</span>
            </div>
          ))}
          {isAdmin&&<div style={{marginTop:16}}><Button variant="secondary" size="sm" onClick={()=>{setView(null);setForm({...blank,...view,estimated_damage:view.estimated_damage||'',repair_cost:view.repair_cost||''});setModal(view);}}>Edit Incident</Button></div>}
        </Modal>
      )}
    </div>
  );
}
