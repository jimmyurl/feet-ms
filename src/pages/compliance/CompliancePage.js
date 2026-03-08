import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '../../context/SupabaseContext';
import { useToast } from '../../context/ToastContext';
import { Button, Badge, Spinner, EmptyState, Modal, Field, StatCard, AlertBanner, inputStyle, selectStyle, textareaStyle } from '../../components/ui';
import { fmtDate, fmtCurrency, daysUntil } from '../../lib/utils';

const TYPES = ['Insurance','Road License','Vehicle Inspection','TLB / Fitness','Fire Extinguisher','First Aid Kit','Permit','Other'];

function expiryBadge(expiry_date) {
  const days = daysUntil(expiry_date);
  if (days === null) return <Badge color="gray">No date</Badge>;
  if (days < 0)    return <Badge color="red">Expired {Math.abs(days)}d ago</Badge>;
  if (days <= 7)   return <Badge color="red">Expires in {days}d</Badge>;
  if (days <= 30)  return <Badge color="yellow">Expires in {days}d</Badge>;
  return <Badge color="green">{fmtDate(expiry_date)}</Badge>;
}

export default function CompliancePage({ isAdmin }) {
  const { client } = useSupabase();
  const { addToast } = useToast();
  const [items, setItems]       = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [filter, setFilter]     = useState({ type:'', vehicle:'', status:'' });
  const [saving, setSaving]     = useState(false);

  const blank = { vehicle_id:'', type:'Insurance', provider:'', policy_no:'', issue_date:'', expiry_date:'', cost:'', coverage_amount:'', reminder_days:30, notes:'' };
  const [form, setForm] = useState(blank);

  const load = useCallback(async () => {
    setLoading(true);
    const [i,v] = await Promise.all([
      client.from('compliance_items').select('*, vehicles(plate,make,model)').order('expiry_date',{ascending:true}),
      client.from('vehicles').select('id,plate,make,model').order('plate'),
    ]);
    setItems(i.data||[]); setVehicles(v.data||[]);
    setLoading(false);
  }, [client]);

  useEffect(() => { load(); }, [load]);

  const setF = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSave = async () => {
    if (!form.vehicle_id || !form.expiry_date) { addToast('Vehicle and expiry date required','error'); return; }
    setSaving(true);
    const payload = {...form, cost:form.cost?Number(form.cost):null, coverage_amount:form.coverage_amount?Number(form.coverage_amount):null, reminder_days:Number(form.reminder_days)||30 };
    const { error } = modal==='new' ? await client.from('compliance_items').insert([payload]) : await client.from('compliance_items').update(payload).eq('id',modal.id);
    setSaving(false);
    if (error) { addToast(error.message,'error'); return; }
    addToast(modal==='new'?'Compliance item added':'Updated');
    setModal(null); load();
  };

  const getStatus = (item) => {
    const days = daysUntil(item.expiry_date);
    if (days === null) return 'unknown';
    if (days < 0) return 'expired';
    if (days <= 30) return 'expiring';
    return 'valid';
  };

  const filtered = items.filter(i => {
    if (filter.vehicle && i.vehicle_id!==filter.vehicle) return false;
    if (filter.type    && i.type!==filter.type)           return false;
    if (filter.status  && getStatus(i)!==filter.status)   return false;
    return true;
  });

  const expired  = items.filter(i=>getStatus(i)==='expired').length;
  const expiring = items.filter(i=>getStatus(i)==='expiring').length;
  const valid    = items.filter(i=>getStatus(i)==='valid').length;

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div><h1>Insurance & Licenses</h1><p>Track compliance documents, renewals and expiry dates</p></div>
        <Button onClick={()=>{setForm(blank);setModal('new');}}>+ Add Item</Button>
      </div>

      {expired > 0 && <div style={{marginBottom:10}}><AlertBanner type="danger">🚨 {expired} item{expired>1?'s':''} have EXPIRED — renew immediately to stay compliant.</AlertBanner></div>}
      {expiring > 0 && <div style={{marginBottom:14}}><AlertBanner type="warning">⚠️ {expiring} item{expiring>1?'s':''} expiring within 30 days.</AlertBanner></div>}

      <div className="stats-grid">
        <StatCard label="Expired"  value={expired}           sub="action required" accentColor="#DC2626" alert={expired>0} />
        <StatCard label="Expiring" value={expiring}          sub="within 30 days"  accentColor="#D97706" alert={expiring>0} />
        <StatCard label="Valid"    value={valid}             sub="up to date"      accentColor="#16A34A" />
        <StatCard label="Total"    value={items.length}      sub="all items"       accentColor="#1D4ED8" />
      </div>

      {/* Quick filter tabs */}
      <div style={{display:'flex',gap:6,marginBottom:12}}>
        {[['','All'],['expired','Expired'],['expiring','Expiring Soon'],['valid','Valid']].map(([v,l])=>(
          <button key={v} className="action-btn" style={{fontWeight:filter.status===v?700:500,background:filter.status===v?'var(--bg2)':'none'}} onClick={()=>setFilter(f=>({...f,status:v}))}>{l}</button>
        ))}
        <div style={{flex:1}}/>
        <select style={{...selectStyle,width:180}} value={filter.vehicle} onChange={e=>setFilter(f=>({...f,vehicle:e.target.value}))}>
          <option value="">All Vehicles</option>
          {vehicles.map(v=><option key={v.id} value={v.id}>{v.plate}</option>)}
        </select>
        <select style={{...selectStyle,width:160}} value={filter.type} onChange={e=>setFilter(f=>({...f,type:e.target.value}))}>
          <option value="">All Types</option>
          {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="card">
        {filtered.length===0 ? (
          <EmptyState icon="📋" message="No compliance items found" action={<Button onClick={()=>{setForm(blank);setModal('new');}}>Add first item</Button>} />
        ) : (
          <table>
            <thead><tr><th>Vehicle</th><th>Type</th><th>Provider</th><th>Policy/Ref No.</th><th>Issue Date</th><th>Expiry</th><th>Cost</th><th>Actions</th></tr></thead>
            <tbody>{filtered.map(i=>(
              <tr key={i.id} style={{background:getStatus(i)==='expired'?'rgba(220,38,38,0.03)':getStatus(i)==='expiring'?'rgba(217,119,6,0.03)':'transparent'}}>
                <td style={{fontWeight:700,color:'#1D4ED8'}}>{i.vehicles?.plate||'—'}<div style={{fontSize:11,color:'var(--text3)',fontWeight:400}}>{i.vehicles?.make} {i.vehicles?.model}</div></td>
                <td><Badge color="blue">{i.type}</Badge></td>
                <td style={{fontSize:12}}>{i.provider||'—'}</td>
                <td style={{fontFamily:'var(--font-mono)',fontSize:12}}>{i.policy_no||'—'}</td>
                <td style={{fontSize:12,color:'var(--text3)'}}>{fmtDate(i.issue_date)}</td>
                <td>{expiryBadge(i.expiry_date)}</td>
                <td style={{fontFamily:'var(--font-mono)',fontSize:12}}>{i.cost?fmtCurrency(i.cost):'—'}</td>
                <td><div style={{display:'flex',gap:5}}>
                  {isAdmin&&<button className="action-btn" onClick={()=>{setForm({...blank,...i,cost:i.cost||'',coverage_amount:i.coverage_amount||''});setModal(i);}}>Edit</button>}
                  {isAdmin&&<button className="action-btn danger" onClick={async()=>{if(!window.confirm('Delete?'))return;await client.from('compliance_items').delete().eq('id',i.id);addToast('Deleted');load();}}>Del</button>}
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal==='new'?'Add Compliance Item':'Edit Compliance Item'} onClose={()=>setModal(null)} maxWidth={680}>
          <div className="form-grid">
            <Field label="Vehicle" required><select style={selectStyle} value={form.vehicle_id} onChange={e=>setF('vehicle_id',e.target.value)}><option value="">Select vehicle…</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.plate} — {v.make} {v.model}</option>)}</select></Field>
            <Field label="Type"><select style={selectStyle} value={form.type} onChange={e=>setF('type',e.target.value)}>{TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></Field>
            <Field label="Provider / Insurer"><input style={inputStyle} value={form.provider} onChange={e=>setF('provider',e.target.value)} placeholder="e.g. Jubilee Insurance" /></Field>
            <Field label="Policy / Ref No."><input style={inputStyle} value={form.policy_no} onChange={e=>setF('policy_no',e.target.value)} placeholder="Reference number" /></Field>
            <Field label="Issue Date"><input type="date" style={inputStyle} value={form.issue_date} onChange={e=>setF('issue_date',e.target.value)} /></Field>
            <Field label="Expiry Date" required><input type="date" style={inputStyle} value={form.expiry_date} onChange={e=>setF('expiry_date',e.target.value)} /></Field>
            <Field label="Cost (TZS)"><input type="number" style={inputStyle} value={form.cost} onChange={e=>setF('cost',e.target.value)} placeholder="0" /></Field>
            <Field label="Coverage Amount (TZS)"><input type="number" style={inputStyle} value={form.coverage_amount} onChange={e=>setF('coverage_amount',e.target.value)} placeholder="0" /></Field>
            <Field label="Remind Before (days)"><input type="number" style={inputStyle} value={form.reminder_days} onChange={e=>setF('reminder_days',e.target.value)} placeholder="30" min="1" /></Field>
            <Field label="Notes" span2><textarea style={textareaStyle} value={form.notes} onChange={e=>setF('notes',e.target.value)} placeholder="Additional notes…" /></Field>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Button variant="secondary" onClick={()=>setModal(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving?'Saving…':modal==='new'?'Add Item':'Save Changes'}</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
