import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '../../context/SupabaseContext';
import { useToast } from '../../context/ToastContext';
import { Button, Badge, Spinner, EmptyState, Modal, Field, StatCard, inputStyle, selectStyle, textareaStyle } from '../../components/ui';
import { fmtDate, daysUntil } from '../../lib/utils';

const LICENSE_CLASSES = ['A','B','C','D','E','F','G'];
const BLANK = { full_name:'', phone:'', email:'', national_id:'', dob:'', address:'', license_no:'', license_class:'B', license_issue_date:'', license_expiry:'', hire_date:'', status:'active', emergency_contact:'', emergency_phone:'', notes:'' };

export default function DriversPage({ isAdmin }) {
  const { client } = useSupabase();
  const { addToast } = useToast();
  const [drivers, setDrivers]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [form, setForm]           = useState(BLANK);
  const [search, setSearch]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await client.from('drivers').select('*').order('full_name');
    setDrivers(data || []);
    setLoading(false);
  }, [client]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm({ ...BLANK }); setEditTarget(null); setShowForm(true); };
  const openEdit = (d) => {
    setForm({ full_name:d.full_name||'', phone:d.phone||'', email:d.email||'', national_id:d.national_id||'', dob:d.dob||'', address:d.address||'', license_no:d.license_no||'', license_class:d.license_class||'B', license_issue_date:d.license_issue_date||'', license_expiry:d.license_expiry||'', hire_date:d.hire_date||'', status:d.status||'active', emergency_contact:d.emergency_contact||'', emergency_phone:d.emergency_phone||'', notes:d.notes||'' });
    setEditTarget(d); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditTarget(null); };
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.full_name.trim()) { addToast('Full name is required', 'error'); return; }
    setSaving(true);
    const payload = { ...form, full_name:form.full_name.trim(), phone:form.phone.trim()||null, email:form.email.trim()||null, national_id:form.national_id.trim()||null, dob:form.dob||null, address:form.address.trim()||null, license_no:form.license_no.trim()||null, license_issue_date:form.license_issue_date||null, license_expiry:form.license_expiry||null, hire_date:form.hire_date||null, emergency_contact:form.emergency_contact.trim()||null, emergency_phone:form.emergency_phone.trim()||null, notes:form.notes.trim()||null };
    const { error } = editTarget ? await client.from('drivers').update(payload).eq('id', editTarget.id) : await client.from('drivers').insert([payload]);
    setSaving(false);
    if (error) { addToast(error.message, 'error'); return; }
    addToast(editTarget ? 'Driver updated' : 'Driver added');
    closeForm(); load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this driver?')) return;
    await client.from('drivers').delete().eq('id', id);
    addToast('Driver deleted'); setViewTarget(null); load();
  };

  const filtered = drivers.filter(d => !search || `${d.full_name} ${d.license_no||''} ${d.phone||''}`.toLowerCase().includes(search.toLowerCase()));

  const expiringSoon = drivers.filter(d => { const days = daysUntil(d.license_expiry); return days !== null && days <= 30 && days >= 0; });
  const expired      = drivers.filter(d => { const days = daysUntil(d.license_expiry); return days !== null && days < 0; });

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div><h1>Drivers</h1><p>Manage driver profiles and license records</p></div>
        {isAdmin && <Button onClick={openNew}>+ Add Driver</Button>}
      </div>

      <div className="stats-grid">
        <StatCard label="Total Drivers"    value={drivers.length}                                sub="registered"       accentColor="#1D4ED8" />
        <StatCard label="Active"           value={drivers.filter(d=>d.status==='active').length} sub="on duty"          accentColor="#16A34A" />
        <StatCard label="License Expiring" value={expiringSoon.length}                          sub="within 30 days"   accentColor="#D97706" alert={expiringSoon.length>0} />
        <StatCard label="Expired Licenses" value={expired.length}                               sub="action required"  accentColor="#DC2626" alert={expired.length>0} />
      </div>

      <div className="toolbar">
        <input style={{ ...inputStyle, width:260 }} placeholder="Search name, license, phone…" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="spacer"/>
        <span style={{ fontSize:12, color:'var(--text3)' }}>{filtered.length} drivers</span>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon="👤" message={drivers.length===0?'No drivers registered yet':'No drivers match your search'}
            action={isAdmin && drivers.length===0 && <Button onClick={openNew}>Add first driver</Button>} />
        ) : (
          <table>
            <thead><tr><th>Driver</th><th>Phone</th><th>License No.</th><th>Class</th><th>License Expiry</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(d => {
                const days = daysUntil(d.license_expiry);
                const licenseColor = days===null?'gray':days<0?'red':days<=30?'yellow':'green';
                return (
                  <tr key={d.id}>
                    <td><div style={{ fontWeight:700 }}>{d.full_name}</div><div style={{ fontSize:11, color:'var(--text3)' }}>{d.national_id||''}</div></td>
                    <td style={{ fontSize:12 }}>{d.phone||'—'}</td>
                    <td style={{ fontFamily:'var(--font-mono)', fontWeight:600 }}>{d.license_no||'—'}</td>
                    <td><Badge color="blue">Class {d.license_class}</Badge></td>
                    <td><Badge color={licenseColor}>{fmtDate(d.license_expiry)}{days!==null&&days<=30&&days>=0?` (${days}d)`:days!==null&&days<0?' ⚠ EXPIRED':''}</Badge></td>
                    <td><Badge color={d.status==='active'?'green':d.status==='suspended'?'red':'gray'}>{d.status}</Badge></td>
                    <td>
                      <div style={{ display:'flex', gap:5 }}>
                        <button className="action-btn" onClick={() => setViewTarget(d)}>View</button>
                        {isAdmin && <button className="action-btn" onClick={() => openEdit(d)}>Edit</button>}
                        {isAdmin && <button className="action-btn danger" onClick={() => handleDelete(d.id)}>Del</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ══ ADD / EDIT MODAL ══ */}
      {showForm && (
        <Modal title={editTarget ? `Edit — ${editTarget.full_name}` : 'Add New Driver'} subtitle={editTarget ? `License: ${editTarget.license_no||'—'}` : 'Fill in driver details'} onClose={closeForm} maxWidth={720}>
          <div className="form-grid">
            <Field label="Full Name" required span2><input style={inputStyle} value={form.full_name} onChange={e => setF('full_name', e.target.value)} placeholder="e.g. Hamisi Juma" /></Field>
            <Field label="Phone"><input style={inputStyle} value={form.phone} onChange={e => setF('phone', e.target.value)} placeholder="+255 7xx xxx xxx" /></Field>
            <Field label="Email"><input type="email" style={inputStyle} value={form.email} onChange={e => setF('email', e.target.value)} placeholder="driver@company.com" /></Field>
            <Field label="National ID (NIDA)"><input style={inputStyle} value={form.national_id} onChange={e => setF('national_id', e.target.value)} placeholder="National ID number" /></Field>
            <Field label="Date of Birth"><input type="date" style={inputStyle} value={form.dob} onChange={e => setF('dob', e.target.value)} /></Field>
            <Field label="License No."><input style={inputStyle} value={form.license_no} onChange={e => setF('license_no', e.target.value)} placeholder="License number" /></Field>
            <Field label="License Class"><select style={selectStyle} value={form.license_class} onChange={e => setF('license_class', e.target.value)}>{LICENSE_CLASSES.map(c=><option key={c} value={c}>Class {c}</option>)}</select></Field>
            <Field label="License Issue Date"><input type="date" style={inputStyle} value={form.license_issue_date} onChange={e => setF('license_issue_date', e.target.value)} /></Field>
            <Field label="License Expiry Date"><input type="date" style={inputStyle} value={form.license_expiry} onChange={e => setF('license_expiry', e.target.value)} /></Field>
            <Field label="Hire Date"><input type="date" style={inputStyle} value={form.hire_date} onChange={e => setF('hire_date', e.target.value)} /></Field>
            <Field label="Status"><select style={selectStyle} value={form.status} onChange={e => setF('status', e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select></Field>
            <Field label="Home Address" span2><input style={inputStyle} value={form.address} onChange={e => setF('address', e.target.value)} placeholder="Residential address" /></Field>
            <Field label="Emergency Contact Name"><input style={inputStyle} value={form.emergency_contact} onChange={e => setF('emergency_contact', e.target.value)} placeholder="Full name" /></Field>
            <Field label="Emergency Contact Phone"><input style={inputStyle} value={form.emergency_phone} onChange={e => setF('emergency_phone', e.target.value)} placeholder="+255 7xx xxx xxx" /></Field>
            <Field label="Notes" span2><textarea style={textareaStyle} value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Additional notes…" /></Field>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <Button variant="secondary" onClick={closeForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Driver'}</Button>
          </div>
        </Modal>
      )}

      {/* ══ VIEW DETAIL MODAL ══ */}
      {viewTarget && (
        <Modal title={viewTarget.full_name} subtitle={`License ${viewTarget.license_no||'—'} · Class ${viewTarget.license_class}`} onClose={() => setViewTarget(null)} maxWidth={540}>
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            <Badge color={viewTarget.status==='active'?'green':viewTarget.status==='suspended'?'red':'gray'}>{viewTarget.status}</Badge>
            <Badge color="blue">Class {viewTarget.license_class}</Badge>
          </div>
          {[
            ['Phone', viewTarget.phone||'—'], ['Email', viewTarget.email||'—'],
            ['National ID', viewTarget.national_id||'—'], ['Date of Birth', fmtDate(viewTarget.dob)],
            ['Address', viewTarget.address||'—'], ['Hire Date', fmtDate(viewTarget.hire_date)],
            ['License Issue', fmtDate(viewTarget.license_issue_date)], ['License Expiry', fmtDate(viewTarget.license_expiry)],
            ['Emergency Contact', viewTarget.emergency_contact||'—'], ['Emergency Phone', viewTarget.emergency_phone||'—'],
            ['Notes', viewTarget.notes||'—'],
          ].map(([l, v]) => (
            <div key={l} style={{ display:'flex', gap:12, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ width:150, fontSize:12, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:0.4, flexShrink:0 }}>{l}</span>
              <span style={{ fontSize:13 }}>{v}</span>
            </div>
          ))}
          {isAdmin && (
            <div style={{ display:'flex', gap:8, marginTop:20 }}>
              <Button variant="secondary" size="sm" onClick={() => { setViewTarget(null); openEdit(viewTarget); }}>Edit Driver</Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(viewTarget.id)}>Delete</Button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
