export const fmt = (n, dec = 0) => n == null ? '—' : Number(n).toLocaleString('en', { minimumFractionDigits: dec, maximumFractionDigits: dec });
export const fmtCurrency = (n, cur = 'TZS') => n == null ? `${cur} 0` : `${cur} ${fmt(n)}`;
export const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';
export const fmtDateTime = d => d ? new Date(d).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
export const daysUntil = d => d ? Math.round((new Date(d) - new Date()) / 86400000) : null;

export const inputStyle = {
  padding:'9px 12px', border:'1px solid var(--border)', borderRadius:8,
  fontSize:13, color:'var(--text1)', background:'var(--bg1)',
  outline:'none', fontFamily:'inherit', width:'100%', boxSizing:'border-box',
};
export const selectStyle = { ...inputStyle, cursor:'pointer' };
export const textareaStyle = { ...inputStyle, resize:'vertical', minHeight:64 };
