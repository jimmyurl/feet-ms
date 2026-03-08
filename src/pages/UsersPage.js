import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '../context/SupabaseContext';
import { useToast } from '../context/ToastContext';
import { Button, Badge, Spinner, EmptyState, Modal, Field, inputStyle, selectStyle } from '../components/ui';
import { fmtDate } from '../lib/utils';

const ROLE_COLORS   = { admin:'purple', manager:'blue', staff:'gray', viewer:'gray' };
const STATUS_COLORS = { approved:'green', pending:'yellow', rejected:'red' };

export default function UsersPage() {
  const { client } = useSupabase();
  const { addToast } = useToast();
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState({ role:'staff', status:'approved' });
  const [saving, setSaving]   = useState(false);
  const [tab, setTab]         = useState('all'); // 'all' | 'pending'

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await client.from('profiles').select('*').order('created_at', { ascending:false });
    setUsers(data || []);
    setLoading(false);
  }, [client]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await client.from('profiles')
      .update({ role:form.role, status:form.status })
      .eq('id', modal.id);
    setSaving(false);
    if (error) { addToast(error.message, 'error'); return; }
    addToast('User updated'); setModal(null); load();
  };

  const quickAction = async (id, role, status) => {
    await client.from('profiles').update({ role, status }).eq('id', id);
    addToast(`User ${status === 'approved' ? 'approved' : 'updated'}`);
    load();
  };

  const pendingUsers  = users.filter(u => u.status === 'pending');
  const displayed     = tab === 'pending' ? pendingUsers : users;

  if (loading) return <Spinner />;

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1>Users & Roles</h1>
          <p>Manage system access, roles and permissions</p>
        </div>
        {pendingUsers.length > 0 && (
          <div style={{ padding:'8px 16px', background:'#FEF9C3', border:'1px solid #FCD34D', borderRadius:9, fontSize:13, fontWeight:700, color:'#854D0E' }}>
            ⏳ {pendingUsers.length} pending request{pendingUsers.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Pending requests banner */}
      {pendingUsers.length > 0 && (
        <div style={{ background:'#FFFBEB', border:'1px solid #FCD34D', borderRadius:12, padding:'16px 20px', marginBottom:20 }}>
          <div style={{ fontWeight:700, color:'#92400E', fontSize:14, marginBottom:12 }}>
            🔔 Access Requests — Action Required
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {pendingUsers.map(u => (
              <div key={u.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#fff', border:'1px solid #FDE68A', borderRadius:9, padding:'10px 14px' }}>
                <div>
                  <span style={{ fontWeight:700, fontSize:13 }}>{u.full_name || '(no name)'}</span>
                  <span style={{ fontSize:12, color:'#92400E', marginLeft:10 }}>{u.email}</span>
                  <span style={{ fontSize:11, color:'#A16207', marginLeft:10 }}>Requested {fmtDate(u.created_at)}</span>
                </div>
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  <button className="action-btn success" onClick={() => quickAction(u.id, 'staff', 'approved')}>
                    ✓ Approve as Staff
                  </button>
                  <button className="action-btn" style={{ color:'#1D4ED8', borderColor:'#1D4ED8' }}
                    onClick={() => quickAction(u.id, 'manager', 'approved')}>
                    ✓ Approve as Manager
                  </button>
                  <button className="action-btn" onClick={() => { setForm({ role:u.role||'staff', status:u.status }); setModal(u); }}>
                    Set Role…
                  </button>
                  <button className="action-btn danger" onClick={() => quickAction(u.id, 'staff', 'rejected')}>
                    ✗ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display:'flex', gap:2, marginBottom:14, background:'var(--bg2)', borderRadius:9, padding:4, width:'fit-content' }}>
        {[['all', `All Users (${users.length})`], ['pending', `Pending (${pendingUsers.length})`]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:'7px 18px', borderRadius:7, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13,
              fontWeight:tab===t?700:500, background:tab===t?'var(--surface)':'transparent',
              color:tab===t?'var(--text1)':'var(--text3)',
              boxShadow:tab===t?'0 1px 4px rgba(0,0,0,0.08)':'none' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        {displayed.length === 0 ? (
          <EmptyState icon="🔐" message={tab === 'pending' ? 'No pending access requests' : 'No users found'} />
        ) : (
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {displayed.map(u => (
                <tr key={u.id} style={{ background: u.status==='pending' ? 'rgba(254,243,199,0.3)' : 'transparent' }}>
                  <td style={{ fontWeight:700 }}>
                    {u.full_name || <span style={{ color:'var(--text3)', fontWeight:400 }}>(no name)</span>}
                  </td>
                  <td style={{ fontSize:12, color:'var(--text3)' }}>{u.email || '—'}</td>
                  <td><Badge color={ROLE_COLORS[u.role]||'gray'}>{u.role || 'staff'}</Badge></td>
                  <td><Badge color={STATUS_COLORS[u.status]||'gray'}>{u.status}</Badge></td>
                  <td style={{ fontSize:12, color:'var(--text3)' }}>{fmtDate(u.created_at)}</td>
                  <td>
                    <div style={{ display:'flex', gap:5 }}>
                      <button className="action-btn" onClick={() => { setForm({ role:u.role||'staff', status:u.status||'pending' }); setModal(u); }}>
                        Edit
                      </button>
                      {u.status === 'pending' && (
                        <button className="action-btn success" onClick={() => quickAction(u.id, 'staff', 'approved')}>
                          Approve
                        </button>
                      )}
                      {u.status === 'approved' && (
                        <button className="action-btn danger" onClick={() => quickAction(u.id, u.role||'staff', 'rejected')}>
                          Revoke
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit modal */}
      {modal && (
        <Modal
          title={`Edit — ${modal.full_name || modal.email}`}
          subtitle={`Email: ${modal.email}`}
          onClose={() => setModal(null)}
          maxWidth={460}
        >
          <div style={{ background:'var(--bg2)', borderRadius:9, padding:'12px 16px', marginBottom:18, fontSize:13 }}>
            <div style={{ display:'flex', gap:8 }}>
              <Badge color={STATUS_COLORS[modal.status]||'gray'}>{modal.status}</Badge>
              <Badge color={ROLE_COLORS[modal.role]||'gray'}>{modal.role||'staff'}</Badge>
            </div>
          </div>
          <div className="form-grid">
            <Field label="Role">
              <select style={selectStyle} value={form.role} onChange={e => setForm(f => ({ ...f, role:e.target.value }))}>
                <option value="admin">Admin — Full access</option>
                <option value="manager">Manager — Approve & manage</option>
                <option value="staff">Staff — Standard access</option>
                <option value="viewer">Viewer — Read only</option>
              </select>
            </Field>
            <Field label="Status">
              <select style={selectStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status:e.target.value }))}>
                <option value="approved">Approved — Can log in</option>
                <option value="pending">Pending — Awaiting approval</option>
                <option value="rejected">Rejected — Cannot log in</option>
              </select>
            </Field>
          </div>

          {/* Role descriptions */}
          <div style={{ marginTop:14, padding:'10px 14px', background:'var(--bg2)', borderRadius:8, fontSize:12, color:'var(--text3)', lineHeight:1.7 }}>
            <strong>Role guide:</strong><br/>
            🔴 <strong>Admin</strong> — full access to all modules, user management, reports<br/>
            🔵 <strong>Manager</strong> — all modules, approve expenses/payroll, no user management<br/>
            ⚫ <strong>Staff</strong> — create & view records, limited to their work<br/>
            👁 <strong>Viewer</strong> — read-only across all modules
          </div>

          <div style={{ display:'flex', gap:10, marginTop:20 }}>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Update User'}</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
