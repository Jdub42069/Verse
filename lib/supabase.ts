import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const noopLock = async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
  return await fn();
};

const storage = Platform.OS === 'web' ? undefined : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    lock: noopLock,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: Platform.OS === 'web' ? 'implicit' : 'pkce',
  },
});

export interface Profile {
  id: string;
  name: string;
  age: number;
  bio: string | null;
  avatar_url: string;
  location: string | null;
  positions: string[];
  interests: string[];
  verified: boolean;
  is_active: boolean;
  last_seen: string;
  created_at: string;
  is_admin?: boolean;
  photo_verified?: boolean;
  photo_verification_status?: string;
  photo_rejection_reason?: string | null;
  hiv_status?: 'negative' | 'positive' | 'undetectable' | null;
  on_prep?: boolean | null;
  no_stis?: boolean | null;
  last_tested_at?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  looking_for?: string | null;
  relationship_status?: string | null;
  profile_photos?: string[];
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
}
