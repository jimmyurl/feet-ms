import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '../../context/SupabaseContext';
import { useToast } from '../../context/ToastContext';
import { Button, Badge, Spinner, EmptyState, Modal, Field, StatCard, inputStyle, selectStyle, textareaStyle } from '../../components/ui';
import { fmtCurrency, fmtDate, fmt } from '../../lib/utils';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STATUS_COLORS = { draft:'gray', pending:'yellow', paid:'green', cancelled:'red' };

const thisYear  = new Date().getFullYear();
const thisMonth = new Date().getMonth() + 1;

export default function PayrollPage({ isAdmin }) {
  const { client } = useSupabase();
  const { addToast } = useToast();
  const [payrolls, setPayrolls]   = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showRun, setShowRun]     = useState(false);
  const [viewPayroll, setViewPayroll] = useState(null);
  const [runYear, setRunYear]     = useState(thisYear);
  const [runMonth, setRunMonth]   = useState(thisMonth);
  const [filterYear, setFilterYear] = useState(thisYear);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, e] = await Promise.all([
      client.from('hr_payroll').select('*, hr_payroll_items(*, hr_employees(full_name, department, position))').order('year', { ascending:false }).order('month', { ascending:false }),
      client.from('hr_employees').select('id,full_name,department,position,basic_salary,allowances').eq('status','active').order('full_name'),
    ]);
    setPayrolls(p.data || []);
    setEmployees(e.data || []);
    setLoading(false);
  }, [client]);

  useEffect(() => { load(); }, [load]);

  // Generate payroll run
  const handleRunPayroll = async () => {
    if (!runYear || !runMonth) { addToast('Select year and month', 'error'); return; }
    const exists = payrolls.find(p => p.year===Number(runYear) && p.month===Number(runMonth));
    if (exists) { addToast('Payroll for this month already exists', 'error'); return; }
    if (employees.length === 0) { addToast('No active employees found', 'error'); return; }
    setSaving(true);
    // Create payroll run
    const { data: run, error: runErr } = await client.from('hr_payroll').insert([{ year:Number(runYear), month:Number(runMonth), status:'draft', total_basic:0, total_allowances:0, total_deductions:0, total_net:0 }]).select().single();
    if (runErr) { addToast(runErr.message, 'error'); setSaving(false); return; }
    // Create items from active employees
    const items = employees.map(e => ({
      payroll_id: run.id,
      employee_id: e.id,
      basic_salary: Number(e.basic_salary) || 0,
      allowances: Number(e.allowances) || 0,
      overtime: 0, deductions: 0,
      net_pay: (Number(e.basic_salary)||0) + (Number(e.allowances)||0),
      notes: '',
    }));
    await client.from('hr_payroll_items').insert(items);
    // Update totals
    const totalBasic      = items.reduce((s, i) => s + i.basic_salary, 0);
    const totalAllowances = items.reduce((s, i) => s + i.allowances, 0);
    const totalNet        = items.reduce((s, i) => s + i.net_pay, 0);
    await client.from('hr_payroll').update({ total_basic:totalBasic, total_allowances:totalAllowances, total_net:totalNet }).eq('id', run.id);
    addToast(`Payroll draft created for ${MONTHS[runMonth-1]} ${runYear}`);
    setShowRun(false); setSaving(false); load();
  };

  const updateStatus = async (id, status) => {
    await client.from('hr_payroll').update({ status, paid_date: status==='paid'?new Date().toISOString().slice(0,10):null }).eq('id', id);
    addToast(`Payroll marked as ${status}`); load();
  };

  const filtered = payrolls.filter(p => !filterYear || p.year === Number(filterYear));

  if (loading) return <Spinner />;

  const totalPaid = payrolls.filter(p=>p.status==='paid').reduce((s,p)=>s+(p.total_net||0), 0);

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div><h1>Payroll</h1><p>Monthly salary processing and payment records</p></div>
        {isAdmin && <Button onClick={() => setShowRun(true)}>+ Run Payroll</Button>}
      </div>

      <div className="stats-grid">
        <StatCard label="Payroll Runs"   value={payrolls.length}                              sub="total processed"   accentColor="#1D4ED8" />
        <StatCard label="Active Staff"   value={employees.length}                             sub="on payroll"        accentColor="#16A34A" />
        <StatCard label="Total Paid"     value={fmtCurrency(totalPaid)}                       sub="all time"          accentColor="#D97706" />
        <StatCard label="Pending"        value={payrolls.filter(p=>p.status==='pending').length} sub="awaiting payment" accentColor="#DC2626" alert={payrolls.filter(p=>p.status==='pending').length>0} />
      </div>

      <div className="toolbar">
        <label style={{ fontSize:12, fontWeight:600, color:'var(--text3)' }}>Year:</label>
        <select style={{ ...selectStyle, width:110 }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value="">All Years</option>
          {[thisYear, thisYear-1, thisYear-2].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="spacer"/>
        <span style={{ fontSize:12, color:'var(--text3)' }}>{filtered.length} runs</span>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon="💰" message="No payroll runs yet" action={isAdmin && <Button onClick={() => setShowRun(true)}>Run first payroll</Button>} />
        ) : (
          <table>
            <thead><tr><th>Period</th><th style={{textAlign:'right'}}>Basic</th><th style={{textAlign:'right'}}>Allowances</th><th style={{textAlign:'right'}}>Deductions</th><th style={{textAlign:'right'}}>Net Pay</th><th>Status</th><th>Paid Date</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight:700 }}>{MONTHS[p.month-1]} {p.year}</td>
                  <td style={{ textAlign:'right', fontFamily:'var(--font-mono)', fontSize:12 }}>{fmtCurrency(p.total_basic)}</td>
                  <td style={{ textAlign:'right', fontFamily:'var(--font-mono)', fontSize:12 }}>{fmtCurrency(p.total_allowances)}</td>
                  <td style={{ textAlign:'right', fontFamily:'var(--font-mono)', fontSize:12, color:'#DC2626' }}>{fmtCurrency(p.total_deductions||0)}</td>
                  <td style={{ textAlign:'right', fontFamily:'var(--font-mono)', fontWeight:800, color:'#16A34A' }}>{fmtCurrency(p.total_net)}</td>
                  <td><Badge color={STATUS_COLORS[p.status]||'gray'}>{p.status}</Badge></td>
                  <td style={{ fontSize:12, color:'var(--text3)' }}>{p.paid_date ? fmtDate(p.paid_date) : '—'}</td>
                  <td>
                    <div style={{ display:'flex', gap:5 }}>
                      <button className="action-btn" onClick={() => setViewPayroll(p)}>View</button>
                      {isAdmin && p.status==='draft'    && <button className="action-btn" onClick={() => updateStatus(p.id,'pending')}>Submit</button>}
                      {isAdmin && p.status==='pending'  && <button className="action-btn success" onClick={() => updateStatus(p.id,'paid')}>Mark Paid</button>}
                      {isAdmin && p.status==='draft'    && <button className="action-btn danger" onClick={() => updateStatus(p.id,'cancelled')}>Cancel</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ══ RUN PAYROLL MODAL ══ */}
      {showRun && (
        <Modal title="Run Payroll" subtitle="Creates a draft payroll for all active employees" onClose={() => setShowRun(false)} maxWidth={480}>
          <div style={{ padding:'8px 0 16px' }}>
            <div style={{ background:'var(--bg2)', borderRadius:10, padding:'14px 18px', marginBottom:18 }}>
              <div style={{ fontSize:13, color:'var(--text3)', marginBottom:6 }}>This will generate salary slips for:</div>
              <div style={{ fontSize:20, fontWeight:800 }}>{employees.length} active employees</div>
              <div style={{ fontSize:13, color:'var(--text3)', marginTop:4 }}>Estimated total: {fmtCurrency(employees.reduce((s,e)=>s+(Number(e.basic_salary)||0)+(Number(e.allowances)||0),0))}</div>
            </div>
            <div className="form-grid">
              <Field label="Year"><select style={selectStyle} value={runYear} onChange={e => setRunYear(e.target.value)}>{[thisYear, thisYear-1, thisYear+1].map(y=><option key={y} value={y}>{y}</option>)}</select></Field>
              <Field label="Month"><select style={selectStyle} value={runMonth} onChange={e => setRunMonth(e.target.value)}>{MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select></Field>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:8 }}>
            <Button variant="secondary" onClick={() => setShowRun(false)}>Cancel</Button>
            <Button onClick={handleRunPayroll} disabled={saving}>{saving ? 'Generating…' : `Generate ${MONTHS[runMonth-1]} ${runYear} Payroll`}</Button>
          </div>
        </Modal>
      )}

      {/* ══ VIEW PAYROLL DETAIL ══ */}
      {viewPayroll && (
        <Modal title={`${MONTHS[viewPayroll.month-1]} ${viewPayroll.year} Payroll`} subtitle={`Status: ${viewPayroll.status}`} onClose={() => setViewPayroll(null)} maxWidth={760}>
          <div style={{ display:'flex', gap:12, marginBottom:20 }}>
            {[['Basic', fmtCurrency(viewPayroll.total_basic),'#1D4ED8'],['Allowances',fmtCurrency(viewPayroll.total_allowances),'#0EA5E9'],['Deductions',fmtCurrency(viewPayroll.total_deductions||0),'#DC2626'],['NET PAY',fmtCurrency(viewPayroll.total_net),'#16A34A']].map(([l,v,c])=>(
              <div key={l} style={{ flex:1, background:'var(--bg2)', borderRadius:10, padding:'12px 16px', borderTop:`3px solid ${c}` }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1 }}>{l}</div>
                <div style={{ fontSize:16, fontWeight:800, fontFamily:'var(--font-mono)', color:c, marginTop:4 }}>{v}</div>
              </div>
            ))}
          </div>
          <table>
            <thead><tr><th>Employee</th><th>Department</th><th style={{textAlign:'right'}}>Basic</th><th style={{textAlign:'right'}}>Allowances</th><th style={{textAlign:'right'}}>Overtime</th><th style={{textAlign:'right'}}>Deductions</th><th style={{textAlign:'right'}}>Net Pay</th></tr></thead>
            <tbody>
              {(viewPayroll.hr_payroll_items || []).map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight:600 }}>{item.hr_employees?.full_name||'—'}</td>
                  <td style={{ fontSize:12, color:'var(--text3)' }}>{item.hr_employees?.department||'—'}</td>
                  <td style={{ textAlign:'right', fontFamily:'var(--font-mono)', fontSize:12 }}>{fmtCurrency(item.basic_salary)}</td>
                  <td style={{ textAlign:'right', fontFamily:'var(--font-mono)', fontSize:12 }}>{fmtCurrency(item.allowances)}</td>
                  <td style={{ textAlign:'right', fontFamily:'var(--font-mono)', fontSize:12, color:'#16A34A' }}>+{fmtCurrency(item.overtime||0)}</td>
                  <td style={{ textAlign:'right', fontFamily:'var(--font-mono)', fontSize:12, color:'#DC2626' }}>-{fmtCurrency(item.deductions||0)}</td>
                  <td style={{ textAlign:'right', fontFamily:'var(--font-mono)', fontWeight:800 }}>{fmtCurrency(item.net_pay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display:'flex', gap:8, marginTop:16 }}>
            {isAdmin && viewPayroll.status==='draft'   && <Button onClick={() => { updateStatus(viewPayroll.id,'pending'); setViewPayroll(null); }}>Submit for Payment</Button>}
            {isAdmin && viewPayroll.status==='pending' && <Button variant="success" onClick={() => { updateStatus(viewPayroll.id,'paid'); setViewPayroll(null); }}>Mark as Paid</Button>}
          </div>
        </Modal>
      )}
    </div>
  );
}
