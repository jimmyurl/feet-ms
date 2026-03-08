import React, { createContext, useContext } from 'react';
import { createClient } from '@supabase/supabase-js';

const Ctx = createContext(null);
const url = process.env.REACT_APP_SUPABASE_URL;
const key = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = url && key ? createClient(url, key) : null;

export function SupabaseProvider({ children }) {
  return <Ctx.Provider value={{ client: supabase }}>{children}</Ctx.Provider>;
}
export function useSupabase() { return useContext(Ctx); }
