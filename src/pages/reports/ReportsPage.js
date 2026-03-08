import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '../../context/SupabaseContext';
import { Spinner } from '../../components/ui';
import { fmtCurrency, fmtDate, fmt } from '../../lib/utils';

function SectionTitle({ children }) {
  return <h3 style={{ margin:'0 0 12px', fontSize:13, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:1, paddingBottom:8, borderBottom:'2px solid var(--border)' }}>{children}</h3>;
}

function KPIBox({ label, value, sub, color }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderTop:`3px solid ${color||'#1D4ED8'}`, borderRadius:10, padding:'14px 18px' }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:800, fontFamily:'var(--font-mono)', color:color||'var(--text1)' }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ label, value, max, color }) {
  const p = max > 0 ? Math.min(100, Math.round((value/max)*100)) : 0;
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:12 }}>
        <span style={{ fontWeight:600 }}>{label}</span>
        <span style={{ color:'var(--text3)', fontFamily:'var(--font-mono)' }}>{fmtCurrency(value)} ({p}%)</span>
      </div>
      <div style={{ height:8, background:'var(--bg2)', borderRadius:4 }}>
        <div style={{ height:'100%', width:`${p}%`, background:color||'#1D4ED8', borderRadius:4, transition:'width 0.4s' }} />
      </div>
    </div>
  );
}

const TABS = [
  { id:'overview',     label:'Fleet Overview'    },
  { id:'fuel',         label:'Fuel Analysis'     },
  { id:'maintenance',  label:'Maintenance'       },
  { id:'vehicles',     label:'Per Vehicle'       },
];

export default function ReportsPage() {
  const { client } = useSupabase();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState('overview');
  const [period, setPeriod] = useState({
    from: new Date(new Date().getFullYear(),0,1).toISOString().slice(0,10),
    to:   new Date().toISOString().slice(0,10),
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [v,d,f,m,t,i,c] = await Promise.all([
      client.from('vehicles').select('*'),
      client.from('drivers').select('*'),
      client.from('fuel_logs').select('*, vehicles(plate,make,model)'),
      client.from('maintenance_records').select('*, vehicles(plate,make,model)'),
      client.from('trips').select('*, vehicles(plate,make,model), drivers(full_name)'),
      client.from('incidents').select('*, vehicles(plate)'),
      client.from('compliance_items').select('*, vehicles(plate)'),
    ]);
    setData({ vehicles:v.data||[], drivers:d.data||[], fuelLogs:f.data||[], maintenance:m.data||[], trips:t.data||[], incidents:i.data||[], compliance:c.data||[] });
    setLoading(false);
  }, [client]);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) return <Spinner />;

  const { vehicles, drivers, fuelLogs, maintenance, trips, incidents, compliance } = data;

  // Period filter
  const inPeriod = arr => arr.filter(x => (x.date||x.start_date) >= period.from && (x.date||x.start_date) <= period.to);
  const pFuel  = inPeriod(fuelLogs);
  const pMaint = inPeriod(maintenance);
  const pTrips = inPeriod(trips);
  const pInc   = inPeriod(incidents);

  const totalFuelCost  = pFuel.reduce((s,f)=>s+(f.total_cost||0),0);
  const totalFuelL     = pFuel.reduce((s,f)=>s+(f.amount_litres||0),0);
  const totalMaintCost = pMaint.filter(m=>m.status==='completed').reduce((s,m)=>s+(m.cost||0),0);
  const totalKm        = pTrips.reduce((s,t)=>s+(t.distance_km||0),0);
  const totalCost      = totalFuelCost + totalMaintCost;
  const costPerKm      = totalKm > 0 ? totalCost/totalKm : 0;

  // Fuel by vehicle
  const fuelByVehicle = {};
  pFuel.forEach(f => {
    const k = f.vehicles?.plate || 'Unknown';
    if (!fuelByVehicle[k]) fuelByVehicle[k] = { litres:0, cost:0 };
    fuelByVehicle[k].litres += f.amount_litres||0;
    fuelByVehicle[k].cost   += f.total_cost||0;
  });
  const maxFuelCost = Math.max(...Object.values(fuelByVehicle).map(v=>v.cost), 1);

  // Maintenance by type
  const maintByType = {};
  pMaint.forEach(m => {
    maintByType[m.type] = (maintByType[m.type]||0) + (m.cost||0);
  });

  // Per-vehicle combined stats
  const perVehicle = {};
  vehicles.forEach(v => {
    perVehicle[v.id] = { plate:v.plate, make:v.make, model:v.model, status:v.status, fuel:0, fuelL:0, maint:0, trips:0, km:0, incidents:0 };
  });
  pFuel.forEach(f => { if (perVehicle[f.vehicle_id]) { perVehicle[f.vehicle_id].fuel += f.total_cost||0; perVehicle[f.vehicle_id].fuelL += f.amount_litres||0; }});
  pMaint.forEach(m => { if (perVehicle[m.vehicle_id]&&m.status==='completed') perVehicle[m.vehicle_id].maint += m.cost||0; });
  pTrips.forEach(t => { if (perVehicle[t.vehicle_id]) { perVehicle[t.vehicle_id].trips++; perVehicle[t.vehicle_id].km += t.distance_km||0; }});
  pInc.forEach(i => { if (perVehicle[i.vehicle_id]) perVehicle[i.vehicle_id].incidents++; });
  const vehicleRows = Object.values(perVehicle).sort((a,b)=>(b.fuel+b.maint)-(a.fuel+a.maint));

  // Monthly fuel trend
  const fuelByMonth = {};
  pFuel.forEach(f => {
    const m = f.date?.slice(0,7)||'';
    if (!fuelByMonth[m]) fuelByMonth[m] = { cost:0, litres:0 };
    fuelByMonth[m].cost   += f.total_cost||0;
    fuelByMonth[m].litres += f.amount_litres||0;
  });
  const fuelMonths = Object.entries(fuelByMonth).sort(([a],[b])=>a.localeCompare(b));
  const maxMonthCost = Math.max(...fuelMonths.map(([,v])=>v.cost), 1);

  const PERIOD_PRESETS = [
    { label:'This Year',  from:`${new Date().getFullYear()}-01-01`, to:new Date().toISOString().slice(0,10) },
    { label:'This Month', from:new Date().toISOString().slice(0,8)+'01', to:new Date().toISOString().slice(0,10) },
    { label:'Last Year',  from:`${new Date().getFullYear()-1}-01-01`, to:`${new Date().getFullYear()-1}-12-31` },
  ];

  const inputStyle = { padding:'8px 12px', border:'1px solid var(--border)', borderRadius:8, fontSize:13, color:'var(--text1)', background:'var(--bg1)', outline:'none', fontFamily:'inherit', boxSizing:'border-box' };

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div><h1>Reports & Analytics</h1><p>Fleet performance insights · {fmtDate(period.from)} to {fmtDate(period.to)}</p></div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          {PERIOD_PRESETS.map(p=>(
            <button key={p.label} className="action-btn"
              style={{ fontWeight:period.from===p.from&&period.to===p.to?700:500, background:period.from===p.from&&period.to===p.to?'var(--bg2)':'none' }}
              onClick={()=>setPeriod({from:p.from,to:p.to})}>{p.label}</button>
          ))}
          <input type="date" style={{...inputStyle,width:140}} value={period.from} onChange={e=>setPeriod(p=>({...p,from:e.target.value}))} />
          <span style={{fontSize:12,color:'var(--text3)'}}>to</span>
          <input type="date" style={{...inputStyle,width:140}} value={period.to} onChange={e=>setPeriod(p=>({...p,to:e.target.value}))} />
        </div>
      </div>

      {/* Top KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        <KPIBox label="Total Fleet Cost"     value={fmtCurrency(totalCost)}         sub="fuel + maintenance"     color="#DC2626" />
        <KPIBox label="Total Distance"       value={`${fmt(totalKm)} km`}           sub={`${pTrips.length} trips`} color="#1D4ED8" />
        <KPIBox label="Cost per km"          value={fmtCurrency(costPerKm)}         sub="blended rate"           color="#D97706" />
        <KPIBox label="Total Fuel"           value={`${fmt(totalFuelL,1)} L`}       sub={fmtCurrency(totalFuelCost)} color="#0EA5E9" />
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:2, marginBottom:16, background:'var(--bg2)', borderRadius:10, padding:4, width:'fit-content' }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ padding:'8px 18px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13,
              fontWeight:tab===t.id?700:500, background:tab===t.id?'var(--surface)':'transparent',
              color:tab===t.id?'#1D4ED8':'var(--text2)',
              boxShadow:tab===t.id?'0 1px 4px rgba(0,0,0,0.08)':'none', transition:'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW ══ */}
      {tab==='overview' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="grid2">
            <div className="card" style={{ padding:'20px 24px' }}>
              <SectionTitle>Fleet Status</SectionTitle>
              {[['Active','#16A34A'],['Maintenance','#D97706'],['Inactive','#64748B'],['Decommissioned','#DC2626']].map(([s,c])=>{
                const count = vehicles.filter(v=>v.status===s.toLowerCase()).length;
                return (
                  <div key={s} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid var(--bg2)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:c }} />
                      <span style={{ fontSize:13, fontWeight:500 }}>{s}</span>
                    </div>
                    <span style={{ fontSize:16, fontWeight:800, fontFamily:'var(--font-mono)' }}>{count}</span>
                  </div>
                );
              })}
              <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0 0', fontWeight:700 }}>
                <span>Total Vehicles</span><span style={{ fontFamily:'var(--font-mono)' }}>{vehicles.length}</span>
              </div>
            </div>

            <div className="card" style={{ padding:'20px 24px' }}>
              <SectionTitle>Cost Breakdown</SectionTitle>
              <div style={{ marginBottom:16 }}>
                <ProgressBar label="Fuel Costs"        value={totalFuelCost}  max={totalCost||1} color="#0EA5E9" />
                <ProgressBar label="Maintenance Costs" value={totalMaintCost} max={totalCost||1} color="#D97706" />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0 0', borderTop:'2px solid var(--border)', fontWeight:700 }}>
                <span>Total Fleet Cost</span>
                <span style={{ fontFamily:'var(--font-mono)', color:'#DC2626' }}>{fmtCurrency(totalCost)}</span>
              </div>
            </div>
          </div>

          <div className="grid2">
            <div className="card" style={{ padding:'20px 24px' }}>
              <SectionTitle>Driver Stats</SectionTitle>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {[['Total Drivers',drivers.length],['Active',drivers.filter(d=>d.status==='active').length],['Inactive',drivers.filter(d=>d.status!=='active').length],['Trips (period)',pTrips.length]].map(([l,v])=>(
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--bg2)', fontSize:13 }}>
                    <span>{l}</span><span style={{ fontWeight:700, fontFamily:'var(--font-mono)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding:'20px 24px' }}>
              <SectionTitle>Incidents & Compliance</SectionTitle>
              {[
                ['Total Incidents (period)', pInc.length],
                ['Open Incidents',           incidents.filter(i=>i.status==='open').length],
                ['Expired Compliance',       compliance.filter(c=>new Date(c.expiry_date)<new Date()).length],
                ['Expiring (30d)',           compliance.filter(c=>{const d=(new Date(c.expiry_date)-new Date())/86400000;return d>=0&&d<=30;}).length],
              ].map(([l,v])=>(
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--bg2)', fontSize:13 }}>
                  <span>{l}</span><span style={{ fontWeight:700, fontFamily:'var(--font-mono)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ FUEL ANALYSIS ══ */}
      {tab==='fuel' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Monthly bar chart */}
          <div className="card" style={{ padding:'20px 24px' }}>
            <SectionTitle>Monthly Fuel Cost Trend</SectionTitle>
            {fuelMonths.length===0 ? <div style={{ color:'var(--text3)', fontSize:13 }}>No fuel data in this period</div> : (
              <div style={{ display:'flex', gap:8, alignItems:'flex-end', height:140, overflowX:'auto', paddingBottom:8 }}>
                {fuelMonths.map(([month, d])=>{
                  const h = Math.round((d.cost/maxMonthCost)*120);
                  return (
                    <div key={month} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, minWidth:52 }}>
                      <span style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--font-mono)' }}>{fmtCurrency(d.cost).replace('TZS ','')}</span>
                      <div style={{ width:36, height:h, background:'#1D4ED8', borderRadius:'4px 4px 0 0', transition:'height 0.4s' }} />
                      <span style={{ fontSize:10, color:'var(--text3)' }}>{new Date(month+'-15').toLocaleDateString('en',{month:'short'})}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fuel by vehicle */}
          <div className="card" style={{ padding:'20px 24px' }}>
            <SectionTitle>Fuel Cost by Vehicle</SectionTitle>
            {Object.keys(fuelByVehicle).length===0 ? <div style={{ color:'var(--text3)', fontSize:13 }}>No data</div> :
              Object.entries(fuelByVehicle).sort(([,a],[,b])=>b.cost-a.cost).map(([plate,d])=>(
                <ProgressBar key={plate} label={`${plate} — ${fmt(d.litres,1)} L`} value={d.cost} max={maxFuelCost} color="#0EA5E9" />
              ))
            }
          </div>
        </div>
      )}

      {/* ══ MAINTENANCE ══ */}
      {tab==='maintenance' && (
        <div className="card">
          <div className="card-head"><h3 className="card-title">Maintenance Cost by Type</h3><span style={{ fontSize:13, fontWeight:700, fontFamily:'var(--font-mono)', color:'#DC2626' }}>{fmtCurrency(totalMaintCost)} total</span></div>
          {Object.keys(maintByType).length===0 ? <div style={{ padding:24, color:'var(--text3)', fontSize:13, textAlign:'center' }}>No maintenance records in this period</div> : (
            <div style={{ padding:'20px 24px' }}>
              {Object.entries(maintByType).sort(([,a],[,b])=>b-a).map(([type,cost])=>(
                <ProgressBar key={type} label={type} value={cost} max={totalMaintCost||1} color="#D97706" />
              ))}
            </div>
          )}
          <table>
            <thead><tr><th>Vehicle</th><th>Type</th><th>Description</th><th>Date</th><th>Provider</th><th style={{textAlign:'right'}}>Cost</th></tr></thead>
            <tbody>{pMaint.filter(m=>m.status==='completed').sort((a,b)=>(b.cost||0)-(a.cost||0)).map(m=>(
              <tr key={m.id}>
                <td style={{ fontWeight:700, color:'#1D4ED8' }}>{m.vehicles?.plate}</td>
                <td style={{ fontSize:12 }}>{m.type}</td>
                <td style={{ fontSize:12, color:'var(--text3)' }}>{m.description}</td>
                <td style={{ fontSize:12, color:'var(--text3)' }}>{fmtDate(m.date)}</td>
                <td style={{ fontSize:12 }}>{m.service_provider||'—'}</td>
                <td style={{ textAlign:'right', fontFamily:'var(--font-mono)', fontWeight:700, color:'#DC2626' }}>{fmtCurrency(m.cost)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* ══ PER VEHICLE ══ */}
      {tab==='vehicles' && (
        <div className="card">
          <div className="card-head"><h3 className="card-title">Per Vehicle Summary</h3><span style={{ fontSize:12, color:'var(--text3)' }}>Sorted by total cost</span></div>
          <table>
            <thead><tr><th>Vehicle</th><th>Status</th><th style={{textAlign:'right'}}>Trips</th><th style={{textAlign:'right'}}>Distance</th><th style={{textAlign:'right'}}>Fuel Cost</th><th style={{textAlign:'right'}}>Maint Cost</th><th style={{textAlign:'right'}}>Total Cost</th><th style={{textAlign:'center'}}>Incidents</th></tr></thead>
            <tbody>{vehicleRows.map(v=>(
              <tr key={v.plate}>
                <td><div style={{ fontWeight:700, color:'#1D4ED8' }}>{v.plate}</div><div style={{ fontSize:11, color:'var(--text3)' }}>{v.make} {v.model}</div></td>
                <td><span style={{ fontSize:11, padding:'2px 8px', borderRadius:12, background:v.status==='active'?'#DCFCE7':'#F1F5F9', color:v.status==='active'?'#166534':'#475569', fontWeight:700 }}>{v.status}</span></td>
                <td style={{ textAlign:'right', fontFamily:'var(--font-mono)' }}>{v.trips}</td>
                <td style={{ textAlign:'right', fontFamily:'var(--font-mono)' }}>{fmt(v.km)} km</td>
                <td style={{ textAlign:'right', fontFamily:'var(--font-mono)', color:'#0EA5E9' }}>{fmtCurrency(v.fuel)}</td>
                <td style={{ textAlign:'right', fontFamily:'var(--font-mono)', color:'#D97706' }}>{fmtCurrency(v.maint)}</td>
                <td style={{ textAlign:'right', fontFamily:'var(--font-mono)', fontWeight:800, color:'#DC2626' }}>{fmtCurrency(v.fuel+v.maint)}</td>
                <td style={{ textAlign:'center', fontWeight:700, color:v.incidents>0?'#DC2626':'var(--text3)' }}>{v.incidents}</td>
              </tr>
            ))}</tbody>
            <tfoot>
              <tr style={{ background:'var(--bg2)' }}>
                <td colSpan={2} style={{ padding:'10px 12px', fontWeight:700 }}>TOTAL</td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontFamily:'var(--font-mono)', fontWeight:800 }}>{pTrips.length}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontFamily:'var(--font-mono)', fontWeight:800 }}>{fmt(totalKm)} km</td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontFamily:'var(--font-mono)', fontWeight:800, color:'#0EA5E9' }}>{fmtCurrency(totalFuelCost)}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontFamily:'var(--font-mono)', fontWeight:800, color:'#D97706' }}>{fmtCurrency(totalMaintCost)}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontFamily:'var(--font-mono)', fontWeight:800, color:'#DC2626' }}>{fmtCurrency(totalCost)}</td>
                <td style={{ padding:'10px 12px', textAlign:'center', fontFamily:'var(--font-mono)', fontWeight:800 }}>{pInc.length}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
