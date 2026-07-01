import { useEffect, useState, useCallback } from 'react';
import { supabase, Raid, RaidSlot } from '../lib/supabase';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Các thứ raid cố định trong tuần: 2=Thứ 3, 3=Thứ 4, 6=Thứ 7 (JS: 0=CN) */
const FIXED_DOW = [2, 3, 6];

function getNextNDays(n: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function toDateStr(d: Date): string {
  // Dùng local date để tránh lệch timezone khi convert sang string
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DOW_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

function buildDefaultSlots(raidId: string): Omit<RaidSlot, 'id' | 'updated_at'>[] {
  const slots: Omit<RaidSlot, 'id' | 'updated_at'>[] = [];
  for (let i = 1; i <= 12; i++) {
    slots.push({
      raid_id: raidId,
      slot_order: i,
      team_group: i <= 6 ? 1 : 2,
      member_name: '',
      class_id: '',
      registered_by: null,
    });
  }
  return slots;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRaids() {
  const [raids, setRaids] = useState<Raid[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRaids = useCallback(async () => {
    const { data } = await supabase
      .from('raids')
      .select('*')
      .order('raid_date', { ascending: true });
    setRaids(data ?? []);
    setLoading(false);
  }, []);

  // Tự động tạo raid cố định 2 tuần tới nếu chưa có
  const ensureRecurringRaids = useCallback(async () => {
    const days = getNextNDays(15); // hôm nay + 14 ngày
    const fixedDays = days.filter((d) => FIXED_DOW.includes(d.getDay()));

    const { data: existing } = await supabase
      .from('raids')
      .select('raid_date')
      .in('raid_date', fixedDays.map(toDateStr));

    const existingDates = new Set((existing ?? []).map((r) => r.raid_date));

    for (const day of fixedDays) {
      const dateStr = toDateStr(day);
      if (existingDates.has(dateStr)) continue;

      const dow = DOW_NAMES[day.getDay()];
      const dd = String(day.getDate()).padStart(2, '0');
      const mm = String(day.getMonth() + 1).padStart(2, '0');

      const { data: newRaid, error } = await supabase
        .from('raids')
        .insert({
          title: `🚢 Raid ${dow} (${dd}/${mm})`,
          raid_date: dateStr,
          raid_time: '21:00',
          status: 'open',
          is_recurring: true,
        })
        .select()
        .single();

      if (!error && newRaid) {
        await supabase.from('raid_slots').insert(buildDefaultSlots(newRaid.id));
      }
    }

    await fetchRaids();
  }, [fetchRaids]);

  useEffect(() => {
    fetchRaids();

    // Realtime subscription (chỉ bật nếu WebSocket khả dụng)
    let sub: ReturnType<typeof supabase.channel> | null = null;
    try {
      const channelName = `raids-channel-${Date.now()}`;
      sub = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'raids' }, fetchRaids)
        .subscribe();
    } catch (e) {
      console.warn('Realtime not available, using polling');
    }

    return () => { if (sub) supabase.removeChannel(sub); };
  }, [fetchRaids]);

  const createRaid = async (title: string, raidDate: string, raidTime: string) => {
    const { data, error } = await supabase
      .from('raids')
      .insert({ title, raid_date: raidDate, raid_time: raidTime, status: 'open', is_recurring: false })
      .select()
      .single();
    if (!error && data) {
      await supabase.from('raid_slots').insert(buildDefaultSlots(data.id));
    }
    return { data, error };
  };

  const updateRaid = async (raidId: string, title: string, raidDate: string, raidTime: string) => {
    setRaids((prev) => prev.map((r) => r.id === raidId ? { ...r, title, raid_date: raidDate, raid_time: raidTime } : r));
    const result = await supabase.from('raids').update({ title, raid_date: raidDate, raid_time: raidTime }).eq('id', raidId);
    if (result.error) fetchRaids();
    return result;
  };

  const updateRaidStatus = async (raidId: string, status: Raid['status']) => {
    // Optimistic update
    setRaids((prev) => prev.map((r) => r.id === raidId ? { ...r, status } : r));
    const result = await supabase.from('raids').update({ status }).eq('id', raidId);
    if (result.error) fetchRaids(); // rollback
    return result;
  };

  const deleteRaid = async (raidId: string) => {
    // Optimistic update
    setRaids((prev) => prev.filter((r) => r.id !== raidId));
    const result = await supabase.from('raids').delete().eq('id', raidId);
    if (result.error) fetchRaids(); // rollback
    return result;
  };

  return { raids, loading, ensureRecurringRaids, createRaid, updateRaid, updateRaidStatus, deleteRaid, refetch: fetchRaids };
}
