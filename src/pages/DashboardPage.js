import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../context/SupabaseContext';
import { StatCard, Badge, Spinner } from '../components/ui';
import { fmtCurrency, fmtDate, daysUntil } from '../lib/utils';

const STATUS_COLORS = { active:'green', inactive:'gray', maintenance:'yellow', decommissioned:'red' };

// ── Clickable alert chip ──
function AlertChip({ icon, label, count, color, onClick }) {
  const colors = {
    red:    { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', hover: '#FEE2E2' },
    yellow: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', hover: '#FEF3C7' },
    blue:   { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', hover: '#DBEAFE' },
  };
  const c = colors[color] || colors.yellow;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 20,
        background: hovered ? c.hover : c.bg,
        border: `1px solid ${c.border}`,
        color: c.text, fontSize: 12, fontWeight: 600,
        cursor: 'pointer', transition: 'background 0.15s',
        userSelect: 'none',
      }}
    >
      <span>{icon}</span>
      <span>{count} {label}</span>
      <span style={{ opacity: 0.6, fontSize: 11 }}>→</span>
    </div>
  );
}

// ── Alert banner with clickable chips ──
function AlertRow({ chips }) {
  if (!chips.length) return null;
  return (
    <div style={{
      background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10,
      padding: '10px 16px', marginBottom: 10,
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginRight: 4 }}>⚠️ Alerts:</span>
      {chips}
    </div>
  );
}

function DangerRow({ chips }) {
  if (!chips.length) return null;
  return (
    <div style={{
      background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
      padding: '10px 16px', marginBottom: 10,
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#991B1B', marginRight: 4 }}>🚨 Immediate action:</span>
      {chips}
    </div>
  );
}

export default function DashboardPage({ isAdmin }) {
  const { client } = useSupabase();
  const navigate   = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) return;
    Promise.all([
      client.from('vehicles').select('id,plate,make,model,status,next_service_date'),
      client.from('drivers').select('id,full_name,status,license_expiry'),
      client.from('fuel_logs').select('id,amount,cost,date,vehicles(plate)').order('date',{ascending:false}).limit(5),
      client.from('maintenance_records').select('id,description,cost,date,status,vehicles(plate)').order('date',{ascending:false}).limit(5),
      client.from('trips').select('id,distance_km,start_date,vehicles(plate),drivers(full_name)').order('start_date',{ascending:false}).limit(5),
      client.from('compliance_items').select('id,type,expiry_date,vehicles(plate)'),
      client.from('incidents').select('id,severity,status,date,vehicles(plate)').order('date',{ascending:false}).limit(5),
    ]).then(([v,d,f,m,t,c,i]) => {
      setData({
        vehicles:   v.data||[],
        drivers:    d.data||[],
        fuelLogs:   f.data||[],
        maintenance:m.data||[],
        trips:      t.data||[],
        compliance: c.data||[],
        incidents:  i.data||[],
      });
      setLoading(false);
    });
  }, [client]);

  if (loading) return <Spinner />;

  const { vehicles, drivers, fuelLogs, maintenance, trips, compliance, incidents } = data;

  const active        = vehicles.filter(v => v.status === 'active').length;
  const inMaint       = vehicles.filter(v => v.status === 'maintenance').length;
  const activeDrivers = drivers.filter(d => d.status === 'active').length;
  const openIncidents = incidents.filter(i => i.status === 'open').length;

  // ── Alert buckets ──
  const expiredCompliance  = compliance.filter(c => { const d = daysUntil(c.expiry_date); return d !== null && d < 0; });
  const expiringCompliance = compliance.filter(c => { const d = daysUntil(c.expiry_date); return d !== null && d >= 0 && d <= 30; });
  const expiringLicenses   = drivers.filter(d => { const days = daysUntil(d.license_expiry); return days !== null && days <= 30; });
  const servicesDue        = vehicles.filter(v => { const days = daysUntil(v.next_service_date); return days !== null && days <= 14; });
  const openIncidentList   = incidents.filter(i => i.status === 'open');

  // ── Danger chips (expired / critical) ──
  const dangerChips = [
    expiredCompliance.length > 0 && (
      <AlertChip key="exp-comp" icon="📋" color="red"
        count={expiredCompliance.length}
        label={`compliance item${expiredCompliance.length > 1 ? 's' : ''} EXPIRED`}
        onClick={() => navigate('/compliance')} />
    ),
    openIncidentList.length > 0 && (
      <AlertChip key="incidents" icon="🚨" color="red"
        count={openIncidentList.length}
        label={`open incident${openIncidentList.length > 1 ? 's' : ''}`}
        onClick={() => navigate('/incidents')} />
    ),
  ].filter(Boolean);

  // ── Warning chips (expiring soon) ──
  const warningChips = [
    expiringCompliance.length > 0 && (
      <AlertChip key="exp-soon" icon="📋" color="yellow"
        count={expiringCompliance.length}
        label={`compliance item${expiringCompliance.length > 1 ? 's' : ''} expiring`}
        onClick={() => navigate('/compliance')} />
    ),
    expiringLicenses.length > 0 && (
      <AlertChip key="lic" icon="🪪" color="yellow"
        count={expiringLicenses.length}
        label={`driver license${expiringLicenses.length > 1 ? 's' : ''} expiring`}
        onClick={() => navigate('/drivers')} />
    ),
    servicesDue.length > 0 && (
      <AlertChip key="svc" icon="🔧" color="blue"
        count={servicesDue.length}
        label={`vehicle${servicesDue.length > 1 ? 's' : ''} due for service`}
        onClick={() => navigate('/maintenance')} />
    ),
  ].filter(Boolean);

  return (
    <div>
      <div className="page-header">
        <h1>Fleet Dashboard</h1>
        <p>Real-time overview of your entire fleet</p>
      </div>

      {/* ── Alert banners ── */}
      <DangerRow chips={dangerChips} />
      <AlertRow  chips={warningChips} />

      {/* ── KPIs ── */}
      <div className="stats-grid">
        <StatCard label="Total Vehicles"    value={vehicles.length}                sub={`${active} active · ${inMaint} in maintenance`}          accentColor="#1D4ED8" onClick={() => navigate('/vehicles')} />
        <StatCard label="Active Drivers"    value={activeDrivers}                  sub={`of ${drivers.length} total drivers`}                     accentColor="#0EA5E9" onClick={() => navigate('/drivers')} />
        <StatCard label="Open Incidents"    value={openIncidents}                  sub="awaiting resolution"                                      accentColor="#DC2626" alert={openIncidents > 0} onClick={() => navigate('/incidents')} />
        <StatCard label="Compliance Alerts" value={expiredCompliance.length + expiringCompliance.length} sub={`${expiredCompliance.length} expired · ${expiringCompliance.length} expiring`} accentColor="#D97706" alert={expiredCompliance.length > 0} onClick={() => navigate('/compliance')} />
      </div>

      <div className="grid2" style={{ marginBottom: 16 }}>
        {/* Recent Trips */}
        <div className="card">
          <div className="card-head">
            <h3 className="card-title">Recent Trips</h3>
            <button className="action-btn" onClick={() => navigate('/trips')}>View all →</button>
          </div>
          {trips.length === 0
            ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No trips recorded</div>
            : (
              <table>
                <thead><tr><th>Vehicle</th><th>Driver</th><th>Distance</th><th>Date</th></tr></thead>
                <tbody>
                  {trips.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.vehicles?.plate || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text3)' }}>{t.drivers?.full_name || '—'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{t.distance_km ? `${t.distance_km} km` : '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text3)' }}>{fmtDate(t.start_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>

        {/* Recent Fuel */}
        <div className="card">
          <div className="card-head">
            <h3 className="card-title">Recent Fuel Logs</h3>
            <button className="action-btn" onClick={() => navigate('/fuel')}>View all →</button>
          </div>
          {fuelLogs.length === 0
            ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No fuel logs</div>
            : (
              <table>
                <thead><tr><th>Vehicle</th><th>Litres</th><th>Cost</th><th>Date</th></tr></thead>
                <tbody>
                  {fuelLogs.map(f => (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 600 }}>{f.vehicles?.plate || '—'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{f.amount}L</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: '#DC2626' }}>{fmtCurrency(f.cost)}</td>
                      <td style={{ fontSize: 12, color: 'var(--text3)' }}>{fmtDate(f.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>

      <div className="grid2">
        {/* Recent Maintenance */}
        <div className="card">
          <div className="card-head">
            <h3 className="card-title">Recent Maintenance</h3>
            <button className="action-btn" onClick={() => navigate('/maintenance')}>View all →</button>
          </div>
          {maintenance.length === 0
            ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No maintenance records</div>
            : (
              <table>
                <thead><tr><th>Vehicle</th><th>Work</th><th>Status</th><th>Cost</th></tr></thead>
                <tbody>
                  {maintenance.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600 }}>{m.vehicles?.plate || '—'}</td>
                      <td style={{ fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.description}</td>
                      <td><Badge color={m.status === 'completed' ? 'green' : m.status === 'in_progress' ? 'yellow' : 'blue'}>{m.status}</Badge></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmtCurrency(m.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>

        {/* Vehicle Status */}
        <div className="card">
          <div className="card-head">
            <h3 className="card-title">Vehicle Status</h3>
            <button className="action-btn" onClick={() => navigate('/vehicles')}>Manage →</button>
          </div>
          {vehicles.length === 0
            ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No vehicles registered</div>
            : (
              <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {vehicles.map(v => (
                  <div
                    key={v.id}
                    onClick={() => navigate('/vehicles')}
                    style={{ padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8, border: '1px solid var(--border)', minWidth: 110, cursor: 'pointer', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#1D4ED8'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{v.plate}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{v.make} {v.model}</div>
                    <Badge color={STATUS_COLORS[v.status] || 'gray'}>{v.status}</Badge>
                    {/* Service due indicator */}
                    {(() => { const d = daysUntil(v.next_service_date); return d !== null && d <= 14 ? (
                      <div style={{ fontSize: 10, color: '#D97706', marginTop: 4, fontWeight: 600 }}>
                        🔧 Service {d <= 0 ? 'overdue' : `in ${d}d`}
                      </div>
                    ) : null; })()}
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}