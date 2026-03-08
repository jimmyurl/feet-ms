import React from 'react';

export function Button({ children, onClick, variant='primary', size='md', disabled, style, type='button' }) {
  const base = { cursor:disabled?'not-allowed':'pointer', border:'none', borderRadius:8, fontWeight:600, fontFamily:'inherit', opacity:disabled?0.6:1, transition:'opacity 0.15s', ...style };
  const v = {
    primary:   { background:'#1D4ED8', color:'#fff',          padding:size==='sm'?'6px 14px':'10px 20px', fontSize:size==='sm'?12:14 },
    secondary: { background:'var(--bg2)', color:'var(--text1)', border:'1px solid var(--border)', padding:size==='sm'?'6px 14px':'10px 20px', fontSize:size==='sm'?12:14 },
    danger:    { background:'#DC2626', color:'#fff',           padding:size==='sm'?'6px 14px':'10px 20px', fontSize:size==='sm'?12:14 },
    success:   { background:'#16A34A', color:'#fff',           padding:size==='sm'?'6px 14px':'10px 20px', fontSize:size==='sm'?12:14 },
    ghost:     { background:'transparent', color:'var(--text2)', padding:size==='sm'?'4px 10px':'8px 16px', fontSize:size==='sm'?12:13 },
  };
  return <button type={type} style={{ ...base, ...v[variant] }} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function Badge({ children, color='blue' }) {
  const c = { blue:{bg:'#DBEAFE',text:'#1E40AF'}, green:{bg:'#DCFCE7',text:'#166534'}, yellow:{bg:'#FEF9C3',text:'#854D0E'}, red:{bg:'#FEE2E2',text:'#991B1B'}, purple:{bg:'#EDE9FE',text:'#5B21B6'}, gray:{bg:'#F1F5F9',text:'#475569'}, orange:{bg:'#FFEDD5',text:'#9A3412'} }[color] || {bg:'#F1F5F9',text:'#475569'};
  return <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:700, letterSpacing:'0.3px', background:c.bg, color:c.text, textTransform:'capitalize' }}>{children}</span>;
}

export function Spinner() {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48 }}><div style={{ width:32, height:32, borderRadius:'50%', border:'3px solid var(--border)', borderTopColor:'#1D4ED8', animation:'spin 0.7s linear infinite' }} /></div>;
}

export function EmptyState({ icon, message, action }) {
  return <div style={{ padding:'40px 24px', textAlign:'center', color:'var(--text3)' }}><div style={{ fontSize:40, marginBottom:10 }}>{icon}</div><div style={{ fontSize:14, marginBottom:action?16:0 }}>{message}</div>{action}</div>;
}

export function StatCard({ label, value, sub, accentColor, onClick, alert }) {
  return (
    <div onClick={onClick} style={{ background:'var(--surface)', border:`1px solid ${alert?'#FCA5A5':' var(--border)'}`, borderRadius:12, padding:'18px 20px', cursor:onClick?'pointer':'default', borderTop:`3px solid ${accentColor||'#1D4ED8'}`, transition:'box-shadow 0.15s' }}
      onMouseEnter={e=>onClick&&(e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)')}
      onMouseLeave={e=>onClick&&(e.currentTarget.style.boxShadow='none')}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:800, color:alert?'#DC2626':'var(--text1)', lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:alert?'#DC2626':'var(--text3)', marginTop:6 }}>{sub}</div>}
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children, maxWidth=600 }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16, animation:'fadeIn 0.15s ease' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--surface)', borderRadius:16, width:'100%', maxWidth, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.25)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'24px 28px 16px', borderBottom:'1px solid var(--border)' }}>
          <div>
            <h2 style={{ margin:'0 0 4px', fontSize:18, fontWeight:700 }}>{title}</h2>
            {subtitle && <p style={{ margin:0, fontSize:13, color:'var(--text3)' }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'var(--text3)', padding:4 }}>✕</button>
        </div>
        <div style={{ padding:'20px 28px 28px' }}>{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, span2, required }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5, gridColumn:span2?'span 2':undefined }}>
      <label style={{ fontSize:12, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.4px' }}>{label}{required&&<span style={{color:'#DC2626'}}> *</span>}</label>
      {children}
    </div>
  );
}

export function AlertBanner({ children, type='warning' }) {
  const styles = { warning:{bg:'#FFFBEB',border:'#FCD34D',text:'#92400E'}, danger:{bg:'#FEF2F2',border:'#FCA5A5',text:'#991B1B'}, info:{bg:'#EFF6FF',border:'#BFDBFE',text:'#1E40AF'} }[type];
  return <div style={{ padding:'10px 14px', background:styles.bg, border:`1px solid ${styles.border}`, borderRadius:8, fontSize:13, color:styles.text, fontWeight:500 }}>{children}</div>;
}


export const inputStyle = {
  padding:'9px 12px', border:'1px solid var(--border)', borderRadius:8,
  fontSize:13, color:'var(--text1)', background:'var(--bg1)',
  outline:'none', fontFamily:'inherit', width:'100%', boxSizing:'border-box',
};
export const selectStyle = { ...inputStyle, cursor:'pointer' };
export const textareaStyle = { ...inputStyle, resize:'vertical', minHeight:64 };
