import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SupabaseProvider, useSupabase } from './context/SupabaseContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/layout/Layout';
import './index.css';

import LoginPage       from './pages/LoginPage';
import DashboardPage   from './pages/DashboardPage';
import VehiclesPage    from './pages/vehicles/VehiclesPage';
import DriversPage     from './pages/drivers/DriversPage';
import FuelPage        from './pages/fuel/FuelPage';
import MaintenancePage from './pages/maintenance/MaintenancePage';
import TripsPage       from './pages/trips/TripsPage';
import CompliancePage  from './pages/compliance/CompliancePage';
import IncidentsPage   from './pages/incidents/IncidentsPage';
import ReportsPage     from './pages/reports/ReportsPage';
import EmployeesPage   from './pages/hr/EmployeesPage';
import PayrollPage     from './pages/hr/PayrollPage';
import ExpensesPage    from './pages/hr/ExpensesPage';
import UsersPage       from './pages/UsersPage';

const SESSION_MS  = 8 * 60 * 60 * 1000;
const SESSION_KEY = 'fleet_login_time';

function AdminRoute({ isAdmin, children }) {
  return isAdmin ? children : <Navigate to="/dashboard" replace />;
}

function AccessGate({ status, email, onSignOut }) {
  return (
    <div style={{ minHeight:'100vh', background:'#0F172A', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#1E293B', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'48px 44px', maxWidth:440, width:'100%', textAlign:'center', fontFamily:'Inter,sans-serif' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>{status==='pending'?'⏳':'🚫'}</div>
        <h2 style={{ margin:'0 0 8px', color:'#fff', fontSize:20 }}>
          {status==='pending' ? 'Awaiting Approval' : 'Access Denied'}
        </h2>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:8 }}>
          {status==='pending'
            ? 'Your account is pending administrator approval.'
            : 'Your access has been revoked. Contact your administrator.'}
        </p>
        {email && (
          <p style={{ fontSize:12, color:'#FCA5A5', marginBottom:20 }}>
            Signed in as: <strong>{email}</strong>
          </p>
        )}
        <button onClick={onSignOut} style={{ padding:'10px 28px', background:'#1D4ED8', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ── NO profile row found → show pending gate only
// ── The DB trigger handles profile creation on signup
// ── Frontend NEVER writes to profiles — read only
function NoProfileGate({ email, onSignOut }) {
  return (
    <div style={{ minHeight:'100vh', background:'#0F172A', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#1E293B', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'48px 44px', maxWidth:440, width:'100%', textAlign:'center', fontFamily:'Inter,sans-serif' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>⏳</div>
        <h2 style={{ margin:'0 0 8px', color:'#fff', fontSize:20 }}>Awaiting Approval</h2>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:8 }}>
          Your account is pending administrator approval.
        </p>
        <p style={{ fontSize:12, color:'#FCA5A5', marginBottom:20 }}>
          Signed in as: <strong>{email}</strong>
        </p>
        <button onClick={onSignOut} style={{ padding:'10px 28px', background:'#1D4ED8', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { client } = useSupabase();
  const [session,    setSession]    = useState(undefined);
  const [profile,    setProfile]    = useState(undefined);
  const [profileKey, setProfileKey] = useState(0);

  const signOut = async () => {
    localStorage.removeItem(SESSION_KEY);
    await client.auth.signOut();
  };

  const isExpired = () => {
    const t = localStorage.getItem(SESSION_KEY);
    return !t || Date.now() - Number(t) > SESSION_MS;
  };

  // ── Auth listener ──
  useEffect(() => {
    if (!client) return;
    client.auth.getSession().then(({ data }) => {
      if (data.session && isExpired()) { signOut(); return; }
      setSession(data.session);
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_IN')  localStorage.setItem(SESSION_KEY, String(Date.now()));
      if (event === 'SIGNED_OUT') { localStorage.removeItem(SESSION_KEY); setProfile(undefined); }
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, [client]); // eslint-disable-line

  // ── Profile fetch — READ ONLY, never writes to DB ──
  useEffect(() => {
    if (!client || !session) return;
    setProfile(undefined);
    client
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('Profile fetch error:', error.message);
          // On error, retry once after 2 seconds instead of showing NoProfileGate
          setTimeout(() => setProfileKey(k => k + 1), 2000);
          return;
        }
        setProfile(data);
      });
  }, [client, session, profileKey]); // eslint-disable-line

  if (!client) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0F172A', color:'#FCA5A5', fontSize:14, padding:24, textAlign:'center' }}>
      ⚠️ Supabase not configured. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY to .env
    </div>
  );

  // Still loading session or profile
  if (session === undefined || (session && profile === undefined)) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0F172A', color:'rgba(255,255,255,0.4)', fontSize:15 }}>
      Loading…
    </div>
  );

  if (!session) return <LoginPage />;

  // No profile row → show pending gate, DB trigger already created it on signup
  // NEVER write to profiles from here
  if (profile === null) return (
    <NoProfileGate email={session.user.email} onSignOut={signOut} />
  );

  // Profile exists but not approved
  if (profile.status !== 'approved') return (
    <AccessGate status={profile.status} email={session.user.email} onSignOut={signOut} />
  );

  const isAdmin = profile.role === 'admin' || profile.role === 'manager';

  return (
    <HashRouter>
      <Layout isAdmin={isAdmin} onSignOut={signOut} userProfile={profile}>
        <Routes>
          <Route path="/"             element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"    element={<DashboardPage isAdmin={isAdmin} />} />
          <Route path="/vehicles"     element={<VehiclesPage isAdmin={isAdmin} />} />
          <Route path="/drivers"      element={<DriversPage isAdmin={isAdmin} />} />
          <Route path="/trips"        element={<TripsPage isAdmin={isAdmin} />} />
          <Route path="/fuel"         element={<FuelPage isAdmin={isAdmin} />} />
          <Route path="/maintenance"  element={<MaintenancePage isAdmin={isAdmin} />} />
          <Route path="/compliance"   element={<CompliancePage isAdmin={isAdmin} />} />
          <Route path="/incidents"    element={<IncidentsPage isAdmin={isAdmin} />} />
          <Route path="/hr/employees" element={<EmployeesPage isAdmin={isAdmin} />} />
          <Route path="/hr/payroll"   element={<AdminRoute isAdmin={isAdmin}><PayrollPage isAdmin={isAdmin} /></AdminRoute>} />
          <Route path="/hr/expenses"  element={<ExpensesPage isAdmin={isAdmin} />} />
          <Route path="/reports"      element={<AdminRoute isAdmin={isAdmin}><ReportsPage /></AdminRoute>} />
          <Route path="/users"        element={<AdminRoute isAdmin={isAdmin}><UsersPage /></AdminRoute>} />
          <Route path="*"             element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default function App() {
  return (
    <SupabaseProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </SupabaseProvider>
  );
}