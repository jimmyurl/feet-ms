import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '../../context/SupabaseContext';
import { useToast } from '../../context/ToastContext';
import { Button, Badge, Spinner, EmptyState, Modal, Field, StatCard, inputStyle, selectStyle, textareaStyle } from '../../components/ui';
import { fmtDate, fmtCurrency } from '../../lib/utils';

const STATUS_COLORS = { active:'green', inactive:'gray', maintenance:'yellow', decommissioned:'red' };
const FUEL_TYPES    = ['Petrol','Diesel','CNG','Electric','Hybrid'];
const VEHICLE_TYPES = ['Saloon','SUV','Van','Pick-up','Truck','Bus','Minibus'];
const STATUSES      = ['active','maintenance','inactive','decommissioned'];

const BLANK = { plate:'', make:'', model:'', year:'', color:'', vehicle_type:'SUV', fuel_type:'Diesel', engine_cc:'', chassis_no:'', mileage_current:'0', mileage_last_service:'0', next_service_date:'', next_service_km:'', status:'active', purchase_date:'', purchase_price:'', insurance_expiry:'', road_license_expiry:'', notes:'' };

export default function VehiclesPage({ isAdmin }) {
  const { client } = useSupabase();
  const { addToast } = useToast();
  const [vehicles, setVehicles]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [form, setForm]           = useState(BLANK);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await client.from('vehicles').select('*').order('plate');
    setVehicles(data || []);
    setLoading(false);
  }, [client]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm({ ...BLANK }); setEditTarget(null); setShowForm(true); };
  const openEdit = (v) => {
    setForm({ plate:v.plate||'', make:v.make||'', model:v.model||'', year:v.year||'', color:v.color||'', vehicle_type:v.vehicle_type||'SUV', fuel_type:v.fuel_type||'Diesel', engine_cc:v.engine_cc||'', chassis_no:v.chassis_no||'', mileage_current:v.mileage_current??'0', mileage_last_service:v.mileage_last_service??'0', next_service_date:v.next_service_date||'', next_service_km:v.next_service_km||'', status:v.status||'active', purchase_date:v.purchase_date||'', purchase_price:v.purchase_price||'', insurance_expiry:v.insurance_expiry||'', road_license_expiry:v.road_license_expiry||'', notes:v.notes||'' });
    setEditTarget(v); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditTarget(null); };
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.plate.trim()) { addToast('Plate number is required', 'error'); return; }
    if (!form.make.trim())  { addToast('Make is required', 'error'); return; }
    setSaving(true);
    const payload = { plate:form.plate.trim().toUpperCase(), make:form.make.trim(), model:form.model.trim(), year:form.year?Number(form.year):null, color:form.color.trim(), vehicle_type:form.vehicle_type, fuel_type:form.fuel_type, engine_cc:form.engine_cc?Number(form.engine_cc):null, chassis_no:form.chassis_no.trim()||null, mileage_current:Number(form.mileage_current)||0, mileage_last_service:Number(form.mileage_last_service)||0, next_service_date:form.next_service_date||null, next_service_km:form.next_service_km?Number(form.next_service_km):null, status:form.status, purchase_date:form.purchase_date||null, purchase_price:form.purchase_price?Number(form.purchase_price):null, insurance_expiry:form.insurance_expiry||null, road_license_expiry:form.road_license_expiry||null, notes:form.notes.trim()||null };
    const { error } = editTarget ? await client.from('vehicles').update(payload).eq('id', editTarget.id) : await client.from('vehicles').insert([payload]);
    setSaving(false);
    if (error) { addToast(error.message, 'error'); return; }
    addToast(editTarget ? 'Vehicle updated' : 'Vehicle registered');
    closeForm(); load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this vehicle? This cannot be undone.')) return;
    await client.from('vehicles').delete().eq('id', id);
    addToast('Vehicle deleted'); setViewTarget(null); load();
  };

  const filtered = vehicles.filter(v => {
    if (filterStatus && v.status !== filterStatus) return false;
    if (search && !`${v.plate} ${v.make} ${v.model}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div><h1>Vehicles</h1><p>Fleet register — all company vehicles</p></div>
        {isAdmin && <Button onClick={openNew}>+ Add Vehicle</Button>}
      </div>

      <div className="stats-grid">
        {STATUSES.map(s => (
          <StatCard key={s} label={s.charAt(0).toUpperCase()+s.slice(1)} value={vehicles.filter(v=>v.status===s).length} sub="vehicles"
            accentColor={s==='active'?'#16A34A':s==='maintenance'?'#D97706':s==='inactive'?'#64748B':'#DC2626'}
            onClick={() => setFilterStatus(filterStatus===s?'':s)} />
        ))}
      </div>

      <div className="toolbar">
        <input style={{ ...inputStyle, width:220 }} placeholder="Search plate, make, model…" value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...selectStyle, width:160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="spacer"/>
        <span style={{ fontSize:12, color:'var(--text3)' }}>{filtered.length} of {vehicles.length} vehicles</span>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon="🚗" message={vehicles.length===0?'No vehicles registered yet':'No vehicles match your search'}
            action={isAdmin && vehicles.length===0 && <Button onClick={openNew}>Register first vehicle</Button>} />
        ) : (
          <table>
            <thead><tr><th>Plate</th><th>Vehicle</th><th>Type</th><th>Fuel</th><th>Mileage</th><th>Next Service</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.id}>
                  <td style={{ fontWeight:800, fontFamily:'var(--font-mono)', fontSize:14, color:'#1D4ED8' }}>{v.plate}</td>
                  <td><div style={{ fontWeight:600 }}>{v.make} {v.model}</div><div style={{ fontSize:11, color:'var(--text3)' }}>{v.year}{v.color?` · ${v.color}`:''}</div></td>
                  <td style={{ fontSize:12 }}>{v.vehicle_type}</td>
                  <td style={{ fontSize:12 }}>{v.fuel_type}</td>
                  <td style={{ fontFamily:'var(--font-mono)', fontSize:12 }}>{(v.mileage_current||0).toLocaleString()} km</td>
                  <td style={{ fontSize:12, color:v.next_service_date&&new Date(v.next_service_date)<new Date()?'#DC2626':'var(--text3)' }}>{fmtDate(v.next_service_date)}</td>
                  <td><Badge color={STATUS_COLORS[v.status]||'gray'}>{v.status}</Badge></td>
                  <td>
                    <div style={{ display:'flex', gap:5 }}>
                      <button className="action-btn" onClick={() => setViewTarget(v)}>View</button>
                      {isAdmin && <button className="action-btn" onClick={() => openEdit(v)}>Edit</button>}
                      {isAdmin && <button className="action-btn danger" onClick={() => handleDelete(v.id)}>Del</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ══ ADD / EDIT MODAL ══ */}
      {showForm && (
        <Modal title={editTarget ? `Edit — ${editTarget.plate}` : 'Register New Vehicle'} subtitle={editTarget ? `${editTarget.make} ${editTarget.model}` : 'Fill in vehicle details'} onClose={closeForm} maxWidth={740}>
          <div className="form-grid">
            <Field label="Plate Number" required><input style={inputStyle} value={form.plate} onChange={e => setF('plate', e.target.value.toUpperCase())} placeholder="e.g. T 123 ABC" /></Field>
            <Field label="Status"><select style={selectStyle} value={form.status} onChange={e => setF('status', e.target.value)}>{STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select></Field>
            <Field label="Make" required><input style={inputStyle} value={form.make} onChange={e => setF('make', e.target.value)} placeholder="e.g. Toyota" /></Field>
            <Field label="Model"><input style={inputStyle} value={form.model} onChange={e => setF('model', e.target.value)} placeholder="e.g. Land Cruiser" /></Field>
            <Field label="Year"><input type="number" style={inputStyle} value={form.year} onChange={e => setF('year', e.target.value)} placeholder="2022" /></Field>
            <Field label="Color"><input style={inputStyle} value={form.color} onChange={e => setF('color', e.target.value)} placeholder="White" /></Field>
            <Field label="Vehicle Type"><select style={selectStyle} value={form.vehicle_type} onChange={e => setF('vehicle_type', e.target.value)}>{VEHICLE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></Field>
            <Field label="Fuel Type"><select style={selectStyle} value={form.fuel_type} onChange={e => setF('fuel_type', e.target.value)}>{FUEL_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></Field>
            <Field label="Engine (CC)"><input type="number" style={inputStyle} value={form.engine_cc} onChange={e => setF('engine_cc', e.target.value)} placeholder="2000" /></Field>
            <Field label="Chassis / VIN No."><input style={inputStyle} value={form.chassis_no} onChange={e => setF('chassis_no', e.target.value)} placeholder="Chassis number" /></Field>
            <Field label="Current Mileage (km)"><input type="number" style={inputStyle} value={form.mileage_current} onChange={e => setF('mileage_current', e.target.value)} placeholder="0" /></Field>
            <Field label="Mileage at Last Service"><input type="number" style={inputStyle} value={form.mileage_last_service} onChange={e => setF('mileage_last_service', e.target.value)} placeholder="0" /></Field>
            <Field label="Next Service Date"><input type="date" style={inputStyle} value={form.next_service_date} onChange={e => setF('next_service_date', e.target.value)} /></Field>
            <Field label="Next Service at (km)"><input type="number" style={inputStyle} value={form.next_service_km} onChange={e => setF('next_service_km', e.target.value)} placeholder="0" /></Field>
            <Field label="Purchase Date"><input type="date" style={inputStyle} value={form.purchase_date} onChange={e => setF('purchase_date', e.target.value)} /></Field>
            <Field label="Purchase Price (TZS)"><input type="number" style={inputStyle} value={form.purchase_price} onChange={e => setF('purchase_price', e.target.value)} placeholder="0" /></Field>
            <Field label="Insurance Expiry"><input type="date" style={inputStyle} value={form.insurance_expiry} onChange={e => setF('insurance_expiry', e.target.value)} /></Field>
            <Field label="Road License Expiry"><input type="date" style={inputStyle} value={form.road_license_expiry} onChange={e => setF('road_license_expiry', e.target.value)} /></Field>
            <Field label="Notes" span2><textarea style={textareaStyle} value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Additional notes…" /></Field>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <Button variant="secondary" onClick={closeForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Register Vehicle'}</Button>
          </div>
        </Modal>
      )}

      {/* ══ VIEW DETAIL MODAL ══ */}
      {viewTarget && (
        <Modal title={`${viewTarget.plate} — ${viewTarget.make} ${viewTarget.model}`} subtitle={`${viewTarget.year||''} · ${viewTarget.color||''} · ${viewTarget.vehicle_type}`} onClose={() => setViewTarget(null)} maxWidth={560}>
          <div style={{ display:'flex', gap:8, marginBottom:18 }}>
            <Badge color={STATUS_COLORS[viewTarget.status]||'gray'}>{viewTarget.status}</Badge>
            <Badge color="blue">{viewTarget.fuel_type}</Badge>
          </div>
          {[
            ['Chassis / VIN', viewTarget.chassis_no||'—'], ['Engine', viewTarget.engine_cc?`${viewTarget.engine_cc} cc`:'—'],
            ['Current Mileage', `${(viewTarget.mileage_current||0).toLocaleString()} km`],
            ['Last Service at', `${(viewTarget.mileage_last_service||0).toLocaleString()} km`],
            ['Next Service Date', fmtDate(viewTarget.next_service_date)],
            ['Next Service km', viewTarget.next_service_km?`${viewTarget.next_service_km.toLocaleString()} km`:'—'],
            ['Insurance Expiry', fmtDate(viewTarget.insurance_expiry)],
            ['Road License Expiry', fmtDate(viewTarget.road_license_expiry)],
            ['Purchase Date', fmtDate(viewTarget.purchase_date)],
            ['Purchase Price', viewTarget.purchase_price?fmtCurrency(viewTarget.purchase_price):'—'],
            ['Notes', viewTarget.notes||'—'],
          ].map(([l, v]) => (
            <div key={l} style={{ display:'flex', gap:12, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ width:160, fontSize:12, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:0.4, flexShrink:0 }}>{l}</span>
              <span style={{ fontSize:13 }}>{v}</span>
            </div>
          ))}
          {isAdmin && (
            <div style={{ display:'flex', gap:8, marginTop:20 }}>
              <Button variant="secondary" size="sm" onClick={() => { setViewTarget(null); openEdit(viewTarget); }}>Edit Vehicle</Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(viewTarget.id)}>Delete</Button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
