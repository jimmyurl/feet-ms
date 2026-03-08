import React, { createContext, useContext, useState, useCallback } from 'react';

const Ctx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return (
    <Ctx.Provider value={{ addToast }}>
      {children}
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ padding:'11px 18px', borderRadius:10, fontSize:13, fontWeight:600, color:'#fff', boxShadow:'0 4px 16px rgba(0,0,0,0.18)', animation:'slideIn 0.2s ease',
            background: t.type==='error' ? '#DC2626' : t.type==='warning' ? '#D97706' : '#16A34A' }}>
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export function useToast() { return useContext(Ctx); }
