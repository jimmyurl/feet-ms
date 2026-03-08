import React, { useEffect, useState } from 'react';
import { useSupabase } from '../context/SupabaseContext';
import { Spinner } from '../components/ui';
import ExportButton from '../components/ExportButton';
import {
  exportVehiclesPDF, exportDriversPDF, exportFuelPDF,
  exportMaintenancePDF, exportCompliancePDF, exportTripsPDF,
  exportFleetExcel,
} from '../lib/exportUtils';

const SECTIONS = [
  { key: 'vehicles',    label: 'Vehicles',            icon: '🚗', color: '#1D4ED8' },
  { key: 'drivers',     label: 'Drivers',             icon: '👤', color: '#0EA5E9' },
  { key: 'fuel',        label: 'Fuel Consumption',    icon: '⛽', color: '#D97706' },
  { key: 'maintenance', label: 'Maintenance History', icon: '🔧', color: '#7C3AED' },
  { key: 'compliance',  label: 'Compliance & Insurance', icon: '📋', color: '#DC2626' },
  { key: 'trips',       label: 'Trip Logs',           icon: '🗺️', color: '#059669' },
];

export default function ReportsPage() {
  const { client } = useSupabase();
  const [data, setData]       = useState({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState({});

  useEffect(() => {
    if (!client) return;
    Promise.all([
      client.from('vehicles').select('*'),
      client.from('drivers').select('*'),
      client.from('fuel_logs').select('*, vehicles(plate), drivers(full_name)').order('date', { ascending: false }),
      client.from('maintenance_records').select('*, vehicles(plate)').order('date', { ascending: false }),
      client.from('compliance_items').select('*, vehicles(plate)'),
      client.from('trips').select('*, vehicles(plate), drivers(full_name)').order('start_date', { ascending: false }),
    ]).then(([v, d, f, m, c, t]) => {
      setData({
        vehicles:    v.data || [],
        drivers:     d.data || [],
        fuel:        f.data || [],
        maintenance: m.data || [],
        compliance:  c.data || [],
        trips:       t.data || [],
      });
      setLoading(false);
    });
  }, [client]);

  const wrap = async (key, fn) => {
    setExporting(e => ({ ...e, [key]: true }));
    try { await fn(); } catch (err) { console.error(err); alert('Export failed: ' + err.message); }
    setExporting(e => ({ ...e, [key]: false }));
  };

  if (loading) return <Spinner />;

  const { vehicles, drivers, fuel, maintenance, compliance, trips } = data;

  return (
    <div>
      <div className="page-header">
        <h1>Reports & Exports</h1>
        <p>Download fleet data as PDF or Excel</p>
      </div>

      {/* Full fleet export */}
      <div className="card" style={{ marginBottom: 20, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>📦 Full Fleet Report</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              All data in one Excel file — {vehicles.length} vehicles, {drivers.length} drivers,
              {fuel.length} fuel logs, {maintenance.length} maintenance records,
              {trips.length} trips, {compliance.length} compliance items
            </div>
          </div>
          <ExportButton
            loading={exporting['full']}
            options={[{
              label: 'Download Full Report (.xlsx)',
              icon: '📊',
              sub: 'All 6 sheets in one file',
              onClick: () => wrap('full', () => exportFleetExcel(vehicles, drivers, fuel, maintenance, trips, compliance)),
            }]}
          />
        </div>
      </div>

      {/* Individual section exports */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {/* Vehicles */}
        <ReportCard
          icon="🚗" color="#1D4ED8" label="Vehicle Status Report"
          count={vehicles.length} unit="vehicles"
          loading={exporting['vehicles']}
          options={[
            { label: 'PDF Report', icon: '📄', sub: 'Formatted A4 document', onClick: () => wrap('vehicles', () => exportVehiclesPDF(vehicles)) },
          ]}
        />

        {/* Drivers */}
        <ReportCard
          icon="👤" color="#0EA5E9" label="Driver List Report"
          count={drivers.length} unit="drivers"
          loading={exporting['drivers']}
          options={[
            { label: 'PDF Report', icon: '📄', sub: 'With license expiry dates', onClick: () => wrap('drivers', () => exportDriversPDF(drivers)) },
          ]}
        />

        {/* Fuel */}
        <ReportCard
          icon="⛽" color="#D97706" label="Fuel Consumption Report"
          count={fuel.length} unit="fuel entries"
          loading={exporting['fuel']}
          options={[
            { label: 'PDF Report', icon: '📄', sub: `Total: TZS ${fuel.reduce((s,f)=>s+(f.cost||0),0).toLocaleString()}`, onClick: () => wrap('fuel', () => exportFuelPDF(fuel)) },
          ]}
        />

        {/* Maintenance */}
        <ReportCard
          icon="🔧" color="#7C3AED" label="Maintenance History"
          count={maintenance.length} unit="records"
          loading={exporting['maintenance']}
          options={[
            { label: 'PDF Report', icon: '📄', sub: `Total cost: TZS ${maintenance.reduce((s,m)=>s+(m.cost||0),0).toLocaleString()}`, onClick: () => wrap('maintenance', () => exportMaintenancePDF(maintenance)) },
          ]}
        />

        {/* Compliance */}
        <ReportCard
          icon="📋" color="#DC2626" label="Compliance & Insurance"
          count={compliance.length} unit="items"
          loading={exporting['compliance']}
          options={[
            { label: 'PDF Report', icon: '📄', sub: `${compliance.filter(c => c.expiry_date && new Date(c.expiry_date) < new Date()).length} expired items highlighted`, onClick: () => wrap('compliance', () => exportCompliancePDF(compliance)) },
          ]}
        />

        {/* Trips */}
        <ReportCard
          icon="🗺️" color="#059669" label="Trip Log Report"
          count={trips.length} unit="trips"
          loading={exporting['trips']}
          options={[
            { label: 'PDF Report', icon: '📄', sub: `${trips.reduce((s,t)=>s+(t.distance_km||0),0).toLocaleString()} km total`, onClick: () => wrap('trips', () => exportTripsPDF(trips)) },
          ]}
        />
      </div>
    </div>
  );
}

function ReportCard({ icon, color, label, count, unit, options, loading }) {
  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text1)', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{count} {unit} available to export</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <ExportButton options={options} loading={loading} disabled={count === 0} />
        {count === 0 && (
          <span style={{ fontSize: 12, color: 'var(--text3)', alignSelf: 'center' }}>No data to export</span>
        )}
      </div>
    </div>
  );
}