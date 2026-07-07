import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

function isValidSupabaseUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith('.supabase.co') && !url.hostname.includes('xxxx');
  } catch {
    return false;
  }
}

function isLikelyJwt(value: string) {
  return value.split('.').length === 3 && value.length > 100;
}

function maskKey(value: string) {
  if (!value) return '<missing>';
  if (value.length <= 16) return '<too-short>';
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export const isSupabaseConfigured = isValidSupabaseUrl(supabaseUrl) && isLikelyJwt(supabaseAnonKey);

if (__DEV__) {
  console.info('[FlowTask] Supabase config', {
    url: supabaseUrl || '<missing>',
    anonKey: maskKey(supabaseAnonKey),
    configured: isSupabaseConfigured,
  });
}

export const supabase = createClient(
  supabaseUrl || 'https://invalid.supabase.co',
  supabaseAnonKey || 'missing.invalid.key',
  {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

export function requireSupabaseConfig() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured correctly. Set a real EXPO_PUBLIC_SUPABASE_URL and full EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile-app/.env, then restart Expo with --clear.');
  }
}
