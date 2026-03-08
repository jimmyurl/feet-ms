import React, { useState, useRef, useEffect } from 'react';

/**
 * ExportButton — reusable export dropdown
 *
 * Usage:
 *   <ExportButton
 *     options={[
 *       { label: 'Export PDF',   icon: '📄', onClick: () => exportVehiclesPDF(vehicles) },
 *       { label: 'Export Excel', icon: '📊', onClick: () => exportFleetExcel(...) },
 *     ]}
 *   />
 */
export default function ExportButton({ options = [], disabled = false, loading = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (options.length === 1) {
    // Single option — just a button, no dropdown
    return (
      <button
        onClick={options[0].onClick}
        disabled={disabled || loading}
        style={btnStyle(disabled || loading)}
      >
        {loading ? '⏳' : (options[0].icon || '📤')} {options[0].label}
      </button>
    );
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={disabled || loading}
        style={btnStyle(disabled || loading)}
      >
        {loading ? '⏳ Preparing…' : '📤 Export'} <span style={{ fontSize: 10, marginLeft: 2 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, zIndex: 99,
          background: '#fff', border: '1px solid #E5E0D8', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 180, padding: 4,
        }}>
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => { opt.onClick(); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '9px 14px',
                background: 'transparent', border: 'none',
                borderRadius: 7, fontSize: 13, fontWeight: 500,
                color: '#1A1410', cursor: 'pointer', textAlign: 'left',
                fontFamily: 'inherit', transition: 'background 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F7F4EF'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: 16 }}>{opt.icon || '📤'}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{opt.label}</div>
                {opt.sub && <div style={{ fontSize: 11, color: '#8A7F74', marginTop: 1 }}>{opt.sub}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function btnStyle(disabled) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', background: disabled ? '#F0EDE8' : '#fff',
    border: '1px solid #E5E0D8', borderRadius: 8,
    fontSize: 13, fontWeight: 600, color: disabled ? '#A89F94' : '#1A1410',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit', transition: 'all 0.15s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  };
}