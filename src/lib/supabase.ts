import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const isSupabaseConfigured =
  !!supabaseUrl &&
  !!supabaseAnonKey &&
  supabaseUrl !== 'your_supabase_url_here' &&
  supabaseAnonKey !== 'your_supabase_anon_key_here' &&
  supabaseUrl.includes('supabase.co');

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as ReturnType<typeof createClient>);

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  role: 'pending' | 'member' | 'admin' | 'superadmin' | 'rejected';
  main_class: string;
  sub_class: string;
  discord: string;
  facebook: string;
  zalo: string;
  avatar_url: string;
  created_at: string;
};

export type Raid = {
  id: string;
  title: string;
  raid_date: string;
  raid_time: string;
  status: 'open' | 'closed' | 'cancelled';
  is_recurring: boolean;
  created_by: string;
  created_at: string;
};

export type RaidSlot = {
  id: string;
  raid_id: string;
  slot_order: number;
  team_group: 1 | 2;
  member_name: string;
  class_id: string;
  registered_by: string | null;
  updated_at: string;
};

export type Availability = {
  id: string;
  raid_id: string;
  user_id: string;
  status: 'available' | 'busy';
  note: string;
  updated_at: string;
};

export type DayAvailability = {
  id: string;
  avail_date: string; // 'YYYY-MM-DD'
  user_id: string;
  status: 'available' | 'busy';
  note: string;
  updated_at: string;
};

export type RaidSettingsDB = {
  id: 1;
  title: string;
  description: string;
  banner_url: string | null;
  updated_at: string;
  updated_by: string | null;
};
