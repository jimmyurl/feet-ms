import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const NAV = [
  { group:'Overview',    items:[
    { path:'/dashboard',    icon:'📊', label:'Dashboard' },
  ]},
  { group:'Fleet',       items:[
    { path:'/vehicles',     icon:'🚗', label:'Vehicles'   },
    { path:'/drivers',      icon:'👤', label:'Drivers'    },
    { path:'/trips',        icon:'🗺️',  label:'Trip Logs'  },
  ]},
  { group:'Operations',  items:[
    { path:'/fuel',         icon:'⛽', label:'Fuel Tracking'  },
    { path:'/maintenance',  icon:'🔧', label:'Maintenance'    },
  ]},
  { group:'Compliance',  items:[
    { path:'/compliance',   icon:'📋', label:'Insurance & Licenses' },
    { path:'/incidents',    icon:'⚠️',  label:'Incidents'            },
  ]},
  { group:'HR & Finance', items:[
    { path:'/hr/employees', icon:'👥', label:'Employees'       },
    { path:'/hr/payroll',   icon:'💰', label:'Payroll',     adminOnly:true },
    { path:'/hr/expenses',  icon:'🧾', label:'Expenses'        },
  ]},
  { group:'Analytics',   items:[
    { path:'/reports',      icon:'📈', label:'Reports',    adminOnly:true },
  ]},
  { group:'Admin',       items:[
    { path:'/users',        icon:'🔐', label:'Users & Roles', adminOnly:true },
  ]},
];

export default function Layout({ children, isAdmin, onSignOut, userProfile }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const initials = userProfile?.full_name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || '?';

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg1)', fontFamily:'var(--font-sans)' }}>

      {/* Sidebar */}
      <aside style={{ width:collapsed?60:240, minHeight:'100vh', background:'#0F172A', display:'flex', flexDirection:'column', transition:'width 0.2s ease', overflow:'hidden', flexShrink:0, position:'sticky', top:0, height:'100vh' }}>
        {/* Logo */}
        <div style={{ padding:collapsed?'18px 0':'18px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:'#1D4ED8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0, marginLeft:collapsed?13:0 }}>🚛</div>
          {!collapsed && (
            <div>
              <div style={{ fontWeight:800, fontSize:14, color:'#fff', lineHeight:1.2 }}>FleetMS</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', letterSpacing:1, textTransform:'uppercase' }}>Fleet Management</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex:1, overflowY:'auto', padding:'6px 0' }}>
          {NAV.map(group => {
            const items = group.items.filter(i => !i.adminOnly || isAdmin);
            if (!items.length) return null;
            return (
              <div key={group.group} style={{ marginBottom:2 }}>
                {!collapsed && (
                  <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:1, padding:'10px 16px 4px' }}>
                    {group.group}
                  </div>
                )}
                {items.map(item => {
                  const active = location.pathname === item.path || location.pathname.startsWith(item.path+'/');
                  return (
                    <NavLink key={item.path} to={item.path} title={collapsed ? item.label : ''}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:collapsed?'10px 0':'8px 16px', justifyContent:collapsed?'center':'flex-start',
                        textDecoration:'none', fontSize:13, fontWeight:active?700:400,
                        color:active?'#93C5FD':'rgba(255,255,255,0.55)',
                        background:active?'rgba(29,78,216,0.3)':'transparent',
                        borderLeft:!collapsed?(active?'3px solid #3B82F6':'3px solid transparent'):'none',
                        transition:'all 0.12s' }}>
                      <span style={{ fontSize:15, flexShrink:0 }}>{item.icon}</span>
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', padding:collapsed?'12px 0':'12px 16px', flexShrink:0 }}>
          {!collapsed && (
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ width:30, height:30, borderRadius:'50%', background:'#1D4ED8', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>{initials}</div>
              <div style={{ overflow:'hidden' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{userProfile?.full_name||'User'}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:0.5 }}>{userProfile?.role||'staff'}</div>
              </div>
            </div>
          )}
          <button onClick={onSignOut} style={{ width:'100%', padding:collapsed?'6px 0':'7px 10px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:7, fontSize:12, cursor:'pointer', color:'rgba(255,255,255,0.45)', fontFamily:'inherit', textAlign:'center' }}>
            {collapsed ? '↩' : '↩ Sign out'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        {/* Topbar */}
        <header style={{ height:52, background:'var(--surface)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', flexShrink:0, position:'sticky', top:0, zIndex:100 }}>
          <button onClick={() => setCollapsed(c => !c)} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'var(--text3)', padding:4 }}>
            {collapsed ? '▶' : '◀'}
          </button>
          <span style={{ fontSize:12, color:'var(--text3)' }}>Fleet Management System</span>
        </header>

        {/* Page content */}
        <main style={{ flex:1, padding:24, overflowY:'auto' }}>{children}</main>

        {/* Footer */}
        <footer style={{ borderTop:'1px solid var(--border)', padding:'10px 24px', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--surface)', flexShrink:0 }}>
          <span style={{ fontSize:11, color:'var(--text3)' }}>
            <a href="https://messaging-service.co.tz/" target="_blank" rel="noopener noreferrer"
              style={{ color:'#1D4ED8', fontWeight:700, textDecoration:'none' }}
              onMouseEnter={e => e.target.style.textDecoration='underline'}
              onMouseLeave={e => e.target.style.textDecoration='none'}>
              Staff-SMS
            </a>
            {' '}· FleetMS © {new Date().getFullYear()}
          </span>
        </footer>
      </div>
    </div>
  );
}
