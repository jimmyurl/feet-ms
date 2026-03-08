import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '../../context/SupabaseContext';
import { useToast } from '../../context/ToastContext';
import { Button, Badge, Spinner, EmptyState, Modal, Field, StatCard, inputStyle, selectStyle, textareaStyle } from '../../components/ui';
import { fmtDate, fmtCurrency } from '../../lib/utils';

const DEPARTMENTS  = ['Administration','Operations','Finance','HR','Maintenance','Drivers','IT','Other'];
const CONTRACT_TYPES = ['Permanent','Fixed Term','Part-time','Casual','Intern','Contractor'];
const BLANK = { full_name:'', employee_no:'', department:'Operations', position:'', contract_type:'Permanent', hire_date:'', end_date:'', phone:'', email:'', national_id:'', dob:'', gender:'', address:'', basic_salary:'', allowances:'0', bank_name:'', bank_account:'', nssf_no:'', tin_no:'', status:'active', notes:'' };

export default function EmployeesPage({ isAdmin }) {
  const { client } = useSupabase();
  const { addToast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [form, setForm]           = useState(BLANK);
  const [search, setSearch]       = useState('');
  const [filterDept, setFilterDept] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await client.from('hr_employees').select('*').order('full_name');
    setEmployees(data || []);
    setLoading(false);
  }, [client]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm({ ...BLANK }); setEditTarget(null); setShowForm(true); };
  const openEdit = (e) => {
    const f = {};
    Object.keys(BLANK).forEach(k => { f[k] = e[k] ?? BLANK[k]; });
    setForm(f); setEditTarget(e); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditTarget(null); };
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.full_name.trim()) { addToast('Full name is required', 'error'); return; }
    if (!form.position.trim()) { addToast('Position is required', 'error'); return; }
    setSaving(true);
    const payload = { ...form, full_name:form.full_name.trim(), basic_salary:form.basic_salary?Number(form.basic_salary):null, allowances:Number(form.allowances)||0, hire_date:form.hire_date||null, end_date:form.end_date||null, dob:form.dob||null, employee_no:form.employee_no.trim()||null, bank_account:form.bank_account.trim()||null, bank_name:form.bank_name.trim()||null, nssf_no:form.nssf_no.trim()||null, tin_no:form.tin_no.trim()||null };
    const { error } = editTarget ? await client.from('hr_employees').update(payload).eq('id', editTarget.id) : await client.from('hr_employees').insert([payload]);
    setSaving(false);
    if (error) { addToast(error.message, 'error'); return; }
    addToast(editTarget ? 'Employee updated' : 'Employee added');
    closeForm(); load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this employee record?')) return;
    await client.from('hr_employees').delete().eq('id', id);
    addToast('Employee deleted'); setViewTarget(null); load();
  };

  const filtered = employees.filter(e => {
    if (filterDept && e.department !== filterDept) return false;
    if (search && !`${e.full_name} ${e.employee_no||''} ${e.position||''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalSalaryBill = employees.filter(e=>e.status==='active').reduce((s,e)=>s+(Number(e.basic_salary)||0)+(Number(e.allowances)||0), 0);

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div><h1>Employees</h1><p>Staff records and employment details</p></div>
        {isAdmin && <Button onClick={openNew}>+ Add Employee</Button>}
      </div>

      <div className="stats-grid">
        <StatCard label="Total Staff"    value={employees.length}                                  sub="registered"        accentColor="#1D4ED8" />
        <StatCard label="Active"         value={employees.filter(e=>e.status==='active').length}   sub="currently employed" accentColor="#16A34A" />
        <StatCard label="Monthly Salary Bill" value={fmtCurrency(totalSalaryBill)}                sub="basic + allowances" accentColor="#D97706" />
        <StatCard label="Departments"    value={[...new Set(employees.map(e=>e.department))].length} sub="active"          accentColor="#0EA5E9" />
      </div>

      <div className="toolbar">
        <input style={{ ...inputStyle, width:240 }} placeholder="Search name, position, ID…" value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...selectStyle, width:170 }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <div className="spacer"/>
        <span style={{ fontSize:12, color:'var(--text3)' }}>{filtered.length} employees</span>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon="👥" message={employees.length===0?'No employees registered yet':'No employees match your search'}
            action={isAdmin && employees.length===0 && <Button onClick={openNew}>Add first employee</Button>} />
        ) : (
          <table>
            <thead><tr><th>Employee</th><th>Department</th><th>Position</th><th>Contract</th><th>Hire Date</th><th>Salary</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id}>
                  <td>
                    <div style={{ fontWeight:700 }}>{e.full_name}</div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>{e.employee_no||''}</div>
                  </td>
                  <td style={{ fontSize:12 }}>{e.department}</td>
                  <td style={{ fontSize:12 }}>{e.position}</td>
                  <td><Badge color={e.contract_type==='Permanent'?'green':e.contract_type==='Fixed Term'?'yellow':'blue'}>{e.contract_type}</Badge></td>
                  <td style={{ fontSize:12, color:'var(--text3)' }}>{fmtDate(e.hire_date)}</td>
                  <td style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:600 }}>{e.basic_salary ? fmtCurrency(e.basic_salary) : '—'}</td>
                  <td><Badge color={e.status==='active'?'green':e.status==='terminated'?'red':'gray'}>{e.status}</Badge></td>
                  <td>
                    <div style={{ display:'flex', gap:5 }}>
                      <button className="action-btn" onClick={() => setViewTarget(e)}>View</button>
                      {isAdmin && <button className="action-btn" onClick={() => openEdit(e)}>Edit</button>}
                      {isAdmin && <button className="action-btn danger" onClick={() => handleDelete(e.id)}>Del</button>}
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
        <Modal title={editTarget ? `Edit — ${editTarget.full_name}` : 'Add New Employee'} subtitle={editTarget ? `${editTarget.department} · ${editTarget.position}` : 'Fill in employee details'} onClose={closeForm} maxWidth={760}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:10, marginTop:4 }}>Personal Information</div>
          <div className="form-grid">
            <Field label="Full Name" required span2><input style={inputStyle} value={form.full_name} onChange={e => setF('full_name', e.target.value)} placeholder="Full name" /></Field>
            <Field label="Employee No."><input style={inputStyle} value={form.employee_no} onChange={e => setF('employee_no', e.target.value)} placeholder="EMP-001" /></Field>
            <Field label="Gender"><select style={selectStyle} value={form.gender} onChange={e => setF('gender', e.target.value)}><option value="">— Select —</option><option value="Male">Male</option><option value="Female">Female</option></select></Field>
            <Field label="Date of Birth"><input type="date" style={inputStyle} value={form.dob} onChange={e => setF('dob', e.target.value)} /></Field>
            <Field label="National ID (NIDA)"><input style={inputStyle} value={form.national_id} onChange={e => setF('national_id', e.target.value)} placeholder="NIDA number" /></Field>
            <Field label="Phone"><input style={inputStyle} value={form.phone} onChange={e => setF('phone', e.target.value)} placeholder="+255 7xx xxx xxx" /></Field>
            <Field label="Email"><input type="email" style={inputStyle} value={form.email} onChange={e => setF('email', e.target.value)} placeholder="employee@company.com" /></Field>
            <Field label="Home Address" span2><input style={inputStyle} value={form.address} onChange={e => setF('address', e.target.value)} placeholder="Residential address" /></Field>
          </div>

          <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:10, marginTop:18 }}>Employment Details</div>
          <div className="form-grid">
            <Field label="Department" required><select style={selectStyle} value={form.department} onChange={e => setF('department', e.target.value)}>{DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}</select></Field>
            <Field label="Position" required><input style={inputStyle} value={form.position} onChange={e => setF('position', e.target.value)} placeholder="e.g. Driver, Accountant" /></Field>
            <Field label="Contract Type"><select style={selectStyle} value={form.contract_type} onChange={e => setF('contract_type', e.target.value)}>{CONTRACT_TYPES.map(c=><option key={c} value={c}>{c}</option>)}</select></Field>
            <Field label="Status"><select style={selectStyle} value={form.status} onChange={e => setF('status', e.target.value)}><option value="active">Active</option><option value="on_leave">On Leave</option><option value="suspended">Suspended</option><option value="terminated">Terminated</option></select></Field>
            <Field label="Hire Date"><input type="date" style={inputStyle} value={form.hire_date} onChange={e => setF('hire_date', e.target.value)} /></Field>
            <Field label="Contract End Date"><input type="date" style={inputStyle} value={form.end_date} onChange={e => setF('end_date', e.target.value)} /></Field>
          </div>

          <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:10, marginTop:18 }}>Salary & Banking</div>
          <div className="form-grid">
            <Field label="Basic Salary (TZS)"><input type="number" style={inputStyle} value={form.basic_salary} onChange={e => setF('basic_salary', e.target.value)} placeholder="0" /></Field>
            <Field label="Monthly Allowances (TZS)"><input type="number" style={inputStyle} value={form.allowances} onChange={e => setF('allowances', e.target.value)} placeholder="0" /></Field>
            <Field label="Bank Name"><input style={inputStyle} value={form.bank_name} onChange={e => setF('bank_name', e.target.value)} placeholder="e.g. NMB, CRDB, Stanbic" /></Field>
            <Field label="Bank Account No."><input style={inputStyle} value={form.bank_account} onChange={e => setF('bank_account', e.target.value)} placeholder="Account number" /></Field>
            <Field label="NSSF No."><input style={inputStyle} value={form.nssf_no} onChange={e => setF('nssf_no', e.target.value)} placeholder="NSSF number" /></Field>
            <Field label="TIN No."><input style={inputStyle} value={form.tin_no} onChange={e => setF('tin_no', e.target.value)} placeholder="Tax ID number" /></Field>
          </div>

          <Field label="Notes" span2><textarea style={{ ...textareaStyle, marginTop:18 }} value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Additional notes…" /></Field>

          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <Button variant="secondary" onClick={closeForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Employee'}</Button>
          </div>
        </Modal>
      )}

      {/* ══ VIEW DETAIL MODAL ══ */}
      {viewTarget && (
        <Modal title={viewTarget.full_name} subtitle={`${viewTarget.department} · ${viewTarget.position}`} onClose={() => setViewTarget(null)} maxWidth={560}>
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            <Badge color={viewTarget.status==='active'?'green':viewTarget.status==='terminated'?'red':'gray'}>{viewTarget.status}</Badge>
            <Badge color={viewTarget.contract_type==='Permanent'?'green':'yellow'}>{viewTarget.contract_type}</Badge>
          </div>
          {[
            ['Employee No.',   viewTarget.employee_no||'—'],
            ['Gender',         viewTarget.gender||'—'],
            ['Date of Birth',  fmtDate(viewTarget.dob)],
            ['National ID',    viewTarget.national_id||'—'],
            ['Phone',          viewTarget.phone||'—'],
            ['Email',          viewTarget.email||'—'],
            ['Address',        viewTarget.address||'—'],
            ['Hire Date',      fmtDate(viewTarget.hire_date)],
            ['Contract End',   viewTarget.end_date ? fmtDate(viewTarget.end_date) : '—'],
            ['Basic Salary',   viewTarget.basic_salary ? fmtCurrency(viewTarget.basic_salary) : '—'],
            ['Allowances',     viewTarget.allowances ? fmtCurrency(viewTarget.allowances) : '—'],
            ['Total Monthly',  viewTarget.basic_salary ? fmtCurrency((Number(viewTarget.basic_salary)||0) + (Number(viewTarget.allowances)||0)) : '—'],
            ['Bank',           viewTarget.bank_name ? `${viewTarget.bank_name} — ${viewTarget.bank_account||''}` : '—'],
            ['NSSF No.',       viewTarget.nssf_no||'—'],
            ['TIN No.',        viewTarget.tin_no||'—'],
            ['Notes',          viewTarget.notes||'—'],
          ].map(([l, v]) => (
            <div key={l} style={{ display:'flex', gap:12, padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ width:140, fontSize:12, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:0.4, flexShrink:0 }}>{l}</span>
              <span style={{ fontSize:13 }}>{v}</span>
            </div>
          ))}
          {isAdmin && (
            <div style={{ display:'flex', gap:8, marginTop:20 }}>
              <Button variant="secondary" size="sm" onClick={() => { setViewTarget(null); openEdit(viewTarget); }}>Edit</Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(viewTarget.id)}>Delete</Button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
