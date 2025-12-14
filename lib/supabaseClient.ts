import { createClient } from '@supabase/supabase-js';

// Helper to safely access environment variables in various environments
const getEnvVar = (key: string): string | undefined => {
  // 1. Try process.env (often replaced by bundlers like Webpack or some Vite configs)
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // Ignore ReferenceErrors if process is not defined
  }

  // 2. Try import.meta.env (Standard Vite)
  try {
    // @ts-ignore
    if (import.meta && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // Ignore errors accessing import.meta
  }

  return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Realtime features will not work.");
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(
  supabaseUrl || 'https://fwekplhxogodbaeglsmw.supabase.co', 
  supabaseAnonKey || 'sb_publishable_ewviXFQycdYaWfknxDjd_A_FytA2Zkm'
);
