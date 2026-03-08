import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '../../context/SupabaseContext';
import { useToast } from '../../context/ToastContext';
import { Button, Badge, Spinner, EmptyState, Modal, Field, StatCard, inputStyle, selectStyle, textareaStyle } from '../../components/ui';
import { fmtCurrency, fmtDate, fmt } from '../../lib/utils';

const CATEGORIES = ['Salary & Wages','Fuel','Maintenance','Insurance','Tolls & Parking','Vehicle Parts','Office Supplies','Utilities','Communication','Training','Medical','Travel & Accommodation','Meals & Entertainment','Legal & Professional','Taxes & Levies','Other'];
const PAYMENT_METHODS = ['Cash','Bank Transfer','Cheque','Mobile Money (M-Pesa)','Mobile Money (Tigo)','Mobile Money (Airtel)','Credit Card','Other'];
const STATUS_COLORS = { pending:'yellow', approved:'green', rejected:'red', paid:'blue' };

const BLANK = { date: new Date().toISOString().slice(0,10), category:'Other', description:'', amount:'', payment_method:'Cash', reference_no:'', vendor:'', vehicle_id:'', employee_id:'', status:'pending', notes:'' };

export default function ExpensesPage({ isAdmin }) {
  const { client } = useSupabase();
  const { addToast } = useToast();
  const [expenses, setExpenses]   = useState([]);
  const [vehicles, setVehicles]   = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]           = useState(BLANK);
  const [filter, setFilter]       = useState({ category:'', status:'', dateFrom:'', dateTo:'' });

  const load = useCallback(async () => {
    setLoading(true);
    const [ex, v, e] = await Promise.all([
      client.from('expenses').select('*, vehicles(plate), hr_employees(full_name)').order('date', { ascending:false }),
      client.from('vehicles').select('id,plate').order('plate'),
      client.from('hr_employees').select('id,full_name').eq('status','active').order('full_name'),
    ]);
    setExpenses(ex.data || []);
    setVehicles(v.data || []);
    setEmployees(e.data || []);
    setLoading(false);
  }, [client]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm({ ...BLANK }); setEditTarget(null); setShowForm(true); };
  const openEdit = (e) => {
    const f = {};
    Object.keys(BLANK).forEach(k => { f[k] = e[k] !== undefined ? (e[k] ?? '') : BLANK[k]; });
    f.amount = e.amount || '';
    f.vehicle_id = e.vehicle_id || '';
    f.employee_id = e.employee_id || '';
    setForm(f); setEditTarget(e); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditTarget(null); };
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.description.trim()) { addToast('Description is required', 'error'); return; }
    if (!form.amount || Number(form.amount) <= 0) { addToast('Enter a valid amount', 'error'); return; }
    setSaving(true);
    const payload = { date:form.date, category:form.category, description:form.description.trim(), amount:Number(form.amount), payment_method:form.payment_method, reference_no:form.reference_no.trim()||null, vendor:form.vendor.trim()||null, vehicle_id:form.vehicle_id||null, employee_id:form.employee_id||null, status:form.status, notes:form.notes.trim()||null };
    const { error } = editTarget ? await client.from('expenses').update(payload).eq('id', editTarget.id) : await client.from('expenses').insert([payload]);
    setSaving(false);
    if (error) { addToast(error.message, 'error'); return; }
    addToast(editTarget ? 'Expense updated' : 'Expense recorded');
    closeForm(); load();
  };

  const updateStatus = async (id, status) => {
    await client.from('expenses').update({ status }).eq('id', id);
    addToast(`Expense ${status}`); load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    await client.from('expenses').delete().eq('id', id);
    addToast('Deleted'); load();
  };

  const filtered = expenses.filter(e => {
    if (filter.category && e.category !== filter.category) return false;
    if (filter.status   && e.status   !== filter.status)   return false;
    if (filter.dateFrom && e.date < filter.dateFrom)        return false;
    if (filter.dateTo   && e.date > filter.dateTo)          return false;
    return true;
  });

  const totalFiltered = filtered.reduce((s, e) => s + (e.amount||0), 0);
  const totalMonth    = expenses.filter(e => e.date?.startsWith(new Date().toISOString().slice(0,7))).reduce((s,e)=>s+(e.amount||0),0);
  const pending       = expenses.filter(e => e.status === 'pending').length;

  // By category totals
  const byCategory = {};
  expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category]||0) + (e.amount||0); });
  const topCategories = Object.entries(byCategory).sort(([,a],[,b])=>b-a).slice(0,4);

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div><h1>Expenses</h1><p>Track all operational and administrative expenditure</p></div>
        <Button onClick={openNew}>+ Record Expense</Button>
      </div>

      <div className="stats-grid">
        <StatCard label="This Month"      value={fmtCurrency(totalMonth)}   sub="total expenses"      accentColor="#1D4ED8" />
        <StatCard label="Pending Approval" value={pending}                  sub="awaiting review"     accentColor="#D97706" alert={pending>0} />
        <StatCard label="Total (shown)"   value={fmtCurrency(totalFiltered)} sub={`${filtered.length} records`} accentColor="#DC2626" />
        <StatCard label="Total Records"   value={expenses.length}           sub="all time"            accentColor="#64748B" />
      </div>

      {/* Top categories */}
      {topCategories.length > 0 && (
        <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
          {topCategories.map(([cat, total]) => (
            <div key={cat} style={{ padding:'7px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', borderBottom:`3px solid #1D4ED8` }}
              onClick={() => setFilter(f => ({ ...f, category: f.category===cat?'':cat }))}>
              <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600 }}>{cat}</div>
              <div style={{ fontSize:14, fontWeight:800, fontFamily:'var(--font-mono)' }}>{fmtCurrency(total)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px', marginBottom:14, display:'flex', flexWrap:'wrap', gap:10, alignItems:'flex-end' }}>
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', marginBottom:4, textTransform:'uppercase' }}>Category</div>
          <select style={{ ...selectStyle, width:190 }} value={filter.category} onChange={e => setFilter(f => ({ ...f, category:e.target.value }))}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', marginBottom:4, textTransform:'uppercase' }}>Status</div>
          <select style={{ ...selectStyle, width:140 }} value={filter.status} onChange={e => setFilter(f => ({ ...f, status:e.target.value }))}>
            <option value="">All</option>
            {['pending','approved','paid','rejected'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', marginBottom:4, textTransform:'uppercase' }}>From</div>
          <input type="date" style={{ ...inputStyle, width:140 }} value={filter.dateFrom} onChange={e => setFilter(f => ({ ...f, dateFrom:e.target.value }))} />
        </div>
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', marginBottom:4, textTransform:'uppercase' }}>To</div>
          <input type="date" style={{ ...inputStyle, width:140 }} value={filter.dateTo} onChange={e => setFilter(f => ({ ...f, dateTo:e.target.value }))} />
        </div>
        <button className="action-btn" onClick={() => setFilter({ category:'', status:'', dateFrom:'', dateTo:'' })}>Clear</button>
        <div style={{ flex:1 }}/>
        <span style={{ fontSize:12, color:'var(--text3)', fontWeight:600 }}>
          {filtered.length} records · <span style={{ color:'#DC2626', fontFamily:'var(--font-mono)' }}>{fmtCurrency(totalFiltered)}</span>
        </span>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon="🧾" message={expenses.length===0?'No expenses recorded yet':'No expenses match your filters'}
            action={expenses.length===0 && <Button onClick={openNew}>Record first expense</Button>} />
        ) : (
          <table>
            <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Vehicle</th><th>Staff</th><th>Method</th><th style={{textAlign:'right'}}>Amount</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id}>
                  <td style={{ fontSize:12, color:'var(--text3)', whiteSpace:'nowrap' }}>{fmtDate(e.date)}</td>
                  <td>
                    <div style={{ fontWeight:600, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.description}</div>
                    {e.vendor && <div style={{ fontSize:11, color:'var(--text3)' }}>{e.vendor}</div>}
                    {e.reference_no && <div style={{ fontSize:11, color:'var(--text3)' }}>Ref: {e.reference_no}</div>}
                  </td>
                  <td><Badge color="blue">{e.category}</Badge></td>
                  <td style={{ fontSize:12, color:'var(--text3)' }}>{e.vehicles?.plate || '—'}</td>
                  <td style={{ fontSize:12, color:'var(--text3)' }}>{e.hr_employees?.full_name || '—'}</td>
                  <td style={{ fontSize:11, color:'var(--text3)' }}>{e.payment_method}</td>
                  <td style={{ textAlign:'right', fontFamily:'var(--font-mono)', fontWeight:700, color:'#DC2626', whiteSpace:'nowrap' }}>{fmtCurrency(e.amount)}</td>
                  <td><Badge color={STATUS_COLORS[e.status]||'gray'}>{e.status}</Badge></td>
                  <td>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      {isAdmin && e.status==='pending'  && <button className="action-btn success" onClick={() => updateStatus(e.id,'approved')}>Approve</button>}
                      {isAdmin && e.status==='approved' && <button className="action-btn" onClick={() => updateStatus(e.id,'paid')}>Mark Paid</button>}
                      {isAdmin && e.status==='pending'  && <button className="action-btn danger" onClick={() => updateStatus(e.id,'rejected')}>Reject</button>}
                      <button className="action-btn" onClick={() => openEdit(e)}>Edit</button>
                      {isAdmin && <button className="action-btn danger" onClick={() => handleDelete(e.id)}>Del</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background:'var(--bg2)' }}>
                <td colSpan={6} style={{ padding:'10px 12px', fontWeight:700 }}>TOTAL (shown)</td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontFamily:'var(--font-mono)', fontWeight:800, color:'#DC2626' }}>{fmtCurrency(totalFiltered)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* ══ ADD / EDIT MODAL ══ */}
      {showForm && (
        <Modal title={editTarget ? 'Edit Expense' : 'Record Expense'} subtitle="Track all operational expenditure" onClose={closeForm} maxWidth={680}>
          <div className="form-grid">
            <Field label="Date" required><input type="date" style={inputStyle} value={form.date} onChange={e => setF('date', e.target.value)} /></Field>
            <Field label="Category"><select style={selectStyle} value={form.category} onChange={e => setF('category', e.target.value)}>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></Field>
            <Field label="Description" required span2><input style={inputStyle} value={form.description} onChange={e => setF('description', e.target.value)} placeholder="What was this expense for?" /></Field>
            <Field label="Amount (TZS)" required><input type="number" style={inputStyle} value={form.amount} onChange={e => setF('amount', e.target.value)} placeholder="0" min="0" /></Field>
            <Field label="Payment Method"><select style={selectStyle} value={form.payment_method} onChange={e => setF('payment_method', e.target.value)}>{PAYMENT_METHODS.map(m=><option key={m} value={m}>{m}</option>)}</select></Field>
            <Field label="Vendor / Supplier"><input style={inputStyle} value={form.vendor} onChange={e => setF('vendor', e.target.value)} placeholder="Company or person paid" /></Field>
            <Field label="Reference / Receipt No."><input style={inputStyle} value={form.reference_no} onChange={e => setF('reference_no', e.target.value)} placeholder="Receipt number" /></Field>
            <Field label="Related Vehicle"><select style={selectStyle} value={form.vehicle_id} onChange={e => setF('vehicle_id', e.target.value)}><option value="">— None —</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.plate}</option>)}</select></Field>
            <Field label="Related Staff"><select style={selectStyle} value={form.employee_id} onChange={e => setF('employee_id', e.target.value)}><option value="">— None —</option>{employees.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select></Field>
            <Field label="Status"><select style={selectStyle} value={form.status} onChange={e => setF('status', e.target.value)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="paid">Paid</option><option value="rejected">Rejected</option></select></Field>
            <Field label="Notes" span2><textarea style={textareaStyle} value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Additional notes…" /></Field>
          </div>
          {form.amount > 0 && (
            <div style={{ margin:'16px 0 4px', padding:'10px 16px', background:'var(--bg2)', borderRadius:8, display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:13, color:'var(--text3)' }}>Expense amount</span>
              <span style={{ fontSize:18, fontWeight:800, fontFamily:'var(--font-mono)', color:'#DC2626' }}>{fmtCurrency(Number(form.amount))}</span>
            </div>
          )}
          <div style={{ display:'flex', gap:10, marginTop:20 }}>
            <Button variant="secondary" onClick={closeForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Record Expense'}</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
