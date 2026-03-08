import React, { useState } from 'react';
import { useSupabase } from '../context/SupabaseContext';

export default function LoginPage() {
  const { client } = useSupabase();
  const [view, setView]         = useState('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const reset = () => { setError(''); setSuccess(''); };

  const handleLogin = async e => {
    e.preventDefault(); setLoading(true); reset();
    const { error: err } = await client.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
    setLoading(false);
  };

  const handleForgot = async e => {
    e.preventDefault(); setLoading(true); reset();
    const { error: err } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSuccess('Password reset email sent! Check your inbox.');
  };

  const handleRequest = async e => {
    e.preventDefault(); setLoading(true); reset();
    const { error: err } = await client.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSuccess('Access request submitted! An administrator will approve your account.');
    setView('login');
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0F172A', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:'Inter, sans-serif', padding:16 }}>
      <div style={{ width:'100%', maxWidth:420 }}>

        {/* Card */}
        <div style={{ background:'#1E293B', border:'1px solid rgba(255,255,255,0.08)', borderRadius:18, padding:'44px 44px 36px', boxShadow:'0 24px 48px rgba(0,0,0,0.4)' }}>

          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:30 }}>
            <div style={{ width:40, height:40, borderRadius:11, background:'#1D4ED8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>🚛</div>
            <div>
              <div style={{ fontWeight:800, fontSize:16, color:'#fff' }}>FleetMS</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', letterSpacing:1, textTransform:'uppercase' }}>Fleet Management</div>
            </div>
          </div>

          {/* ── LOGIN ── */}
          {view === 'login' && (
            <>
              <h2 style={{ margin:'0 0 4px', fontSize:22, fontWeight:800, color:'#fff' }}>Welcome back</h2>
              <p style={{ margin:'0 0 24px', fontSize:13, color:'rgba(255,255,255,0.4)' }}>Sign in to manage your fleet</p>
              {success && <div style={{ margin:'0 0 14px', padding:'10px 14px', background:'rgba(22,163,74,0.15)', border:'1px solid rgba(22,163,74,0.4)', borderRadius:8, fontSize:13, color:'#86EFAC', fontWeight:500 }}>{success}</div>}
              <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {[['Email','email',email,setEmail,'you@company.com'],['Password','password',password,setPassword,'••••••••']].map(([label,type,val,setter,ph])=>(
                  <div key={label}>
                    <label style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'0.4px', display:'block', marginBottom:5 }}>{label}</label>
                    <input type={type} value={val} onChange={e=>setter(e.target.value)} required style={{ width:'100%', padding:'10px 14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, fontSize:14, outline:'none', fontFamily:'inherit', boxSizing:'border-box', color:'#fff' }} placeholder={ph} />
                  </div>
                ))}
                {error && <p style={{ margin:0, fontSize:13, color:'#FCA5A5', background:'rgba(220,38,38,0.12)', padding:'9px 12px', borderRadius:7, border:'1px solid rgba(220,38,38,0.3)' }}>{error}</p>}
                <button type="submit" disabled={loading} style={{ padding:'12px', background:'#1D4ED8', color:'#fff', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:loading?'not-allowed':'pointer', fontFamily:'inherit', opacity:loading?0.7:1, marginTop:2 }}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
              <div style={{ display:'flex', justifyContent:'center', gap:16, marginTop:18 }}>
                <button onClick={() => { setView('forgot'); reset(); }} style={{ background:'none', border:'none', fontSize:12, color:'rgba(255,255,255,0.4)', cursor:'pointer', fontFamily:'inherit', textDecoration:'underline' }}>Forgot password?</button>
                <button onClick={() => { setView('request'); reset(); }} style={{ background:'none', border:'none', fontSize:12, color:'#60A5FA', cursor:'pointer', fontFamily:'inherit', textDecoration:'underline', fontWeight:600 }}>Request access</button>
              </div>
            </>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {view === 'forgot' && (
            <>
              <button onClick={() => { setView('login'); reset(); }} style={{ background:'none', border:'none', fontSize:12, color:'rgba(255,255,255,0.4)', cursor:'pointer', fontFamily:'inherit', marginBottom:16, padding:0 }}>← Back to sign in</button>
              <h2 style={{ margin:'0 0 4px', fontSize:20, fontWeight:800, color:'#fff' }}>Reset password</h2>
              <p style={{ margin:'0 0 24px', fontSize:13, color:'rgba(255,255,255,0.4)' }}>Enter your email and we'll send a reset link</p>
              {success && <div style={{ margin:'0 0 14px', padding:'10px 14px', background:'rgba(22,163,74,0.15)', border:'1px solid rgba(22,163,74,0.4)', borderRadius:8, fontSize:13, color:'#86EFAC' }}>{success}</div>}
              <form onSubmit={handleForgot} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'0.4px', display:'block', marginBottom:5 }}>Email</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoFocus style={{ width:'100%', padding:'10px 14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, fontSize:14, outline:'none', fontFamily:'inherit', boxSizing:'border-box', color:'#fff' }} placeholder="you@company.com" />
                </div>
                {error && <p style={{ margin:0, fontSize:13, color:'#FCA5A5', background:'rgba(220,38,38,0.12)', padding:'9px 12px', borderRadius:7 }}>{error}</p>}
                <button type="submit" disabled={loading} style={{ padding:'12px', background:'#1D4ED8', color:'#fff', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:loading?'not-allowed':'pointer', fontFamily:'inherit', opacity:loading?0.7:1 }}>
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}

          {/* ── REQUEST ACCESS ── */}
          {view === 'request' && (
            <>
              <button onClick={() => { setView('login'); reset(); }} style={{ background:'none', border:'none', fontSize:12, color:'rgba(255,255,255,0.4)', cursor:'pointer', fontFamily:'inherit', marginBottom:16, padding:0 }}>← Back to sign in</button>
              <h2 style={{ margin:'0 0 4px', fontSize:20, fontWeight:800, color:'#fff' }}>Request Access</h2>
              <p style={{ margin:'0 0 16px', fontSize:13, color:'rgba(255,255,255,0.4)' }}>Submit a request — an admin will approve your account</p>
              <div style={{ background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.25)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#FCD34D', marginBottom:18 }}>
                ℹ️ Your account will be pending until an administrator approves it.
              </div>
              {error && <p style={{ margin:'0 0 12px', fontSize:13, color:'#FCA5A5', background:'rgba(220,38,38,0.12)', padding:'9px 12px', borderRadius:7 }}>{error}</p>}
              <form onSubmit={handleRequest} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {[['Full Name','text',name,setName,'Your full name'],['Email','email',email,setEmail,'you@company.com'],['Password','password',password,setPassword,'Choose a password']].map(([label,type,val,setter,ph])=>(
                  <div key={label}>
                    <label style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'0.4px', display:'block', marginBottom:5 }}>{label}</label>
                    <input type={type} value={val} onChange={e=>setter(e.target.value)} required minLength={type==='password'?6:undefined} style={{ width:'100%', padding:'10px 14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, fontSize:14, outline:'none', fontFamily:'inherit', boxSizing:'border-box', color:'#fff' }} placeholder={ph} />
                  </div>
                ))}
                <button type="submit" disabled={loading} style={{ padding:'12px', background:'#1D4ED8', color:'#fff', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:loading?'not-allowed':'pointer', fontFamily:'inherit', opacity:loading?0.7:1 }}>
                  {loading ? 'Submitting…' : 'Submit Request'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign:'center', marginTop:20 }}>
          <a href="https://messaging-service.co.tz/" target="_blank" rel="noopener noreferrer"
            style={{ fontSize:12, color:'#60A5FA', fontWeight:700, textDecoration:'none' }}>Staff-SMS</a>
          <span style={{ fontSize:12, color:'rgba(255,255,255,0.3)' }}> · FleetMS © {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}
