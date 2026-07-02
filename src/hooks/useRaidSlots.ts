import { useEffect, useState, useCallback } from 'react';
import { supabase, RaidSlot } from '../lib/supabase';

export function useRaidSlots(raidId: string | null) {
  const [slots, setSlots] = useState<RaidSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSlots = useCallback(async () => {
    if (!raidId) { setSlots([]); setLoading(false); return; }
    const { data } = await supabase
      .from('raid_slots')
      .select('*')
      .eq('raid_id', raidId)
      .order('slot_order', { ascending: true });
    setSlots(data ?? []);
    setLoading(false);
  }, [raidId]);

  // Optimistic update helper — cập nhật UI ngay, không chờ server
  const optimisticUpdate = (slotId: string, updates: Partial<RaidSlot>) => {
    setSlots((prev) => prev.map((s) => s.id === slotId ? { ...s, ...updates } : s));
  };

  useEffect(() => {
    setLoading(true);
    fetchSlots();

    if (!raidId) return;

    const channelName = `slots-${raidId}`;
    let sub: ReturnType<typeof supabase.channel> | null = null;
    try {
      sub = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'raid_slots',
          filter: `raid_id=eq.${raidId}`,
        }, (payload) => {
          // Cập nhật đúng row thay vì fetch lại toàn bộ
          if (payload.eventType === 'UPDATE' && payload.new) {
            setSlots((prev) => prev.map((s) =>
              s.id === (payload.new as RaidSlot).id ? { ...s, ...(payload.new as RaidSlot) } : s
            ));
          } else {
            fetchSlots();
          }
        })
        .subscribe();
    } catch (e) {
      // Realtime không khả dụng — dùng optimistic updates
    }

    return () => { if (sub) supabase.removeChannel(sub); };
  }, [raidId, fetchSlots]);

  /** Thành viên đăng ký slot trống */
  const registerSlot = async (slotId: string, memberName: string, classId: string, userId: string) => {
    // Optimistic
    optimisticUpdate(slotId, { member_name: memberName, class_id: classId, registered_by: userId });
    const result = await supabase
      .from('raid_slots')
      .update({ member_name: memberName, class_id: classId, registered_by: userId })
      .eq('id', slotId)
      .is('registered_by', null);
    if (result.error) {
      // Rollback: fetch lại
      fetchSlots();
    }
    return result;
  };

  /** Thành viên rút tên */
  const unregisterSlot = async (slotId: string, userId: string) => {
    optimisticUpdate(slotId, { member_name: '', class_id: '', registered_by: null });
    const result = await supabase
      .from('raid_slots')
      .update({ member_name: '', class_id: '', registered_by: null })
      .eq('id', slotId)
      .eq('registered_by', userId);
    if (result.error) fetchSlots();
    return result;
  };

  /** Admin cập nhật bất kỳ slot */
  const adminUpdateSlot = async (slotId: string, updates: Partial<Pick<RaidSlot, 'member_name' | 'class_id' | 'registered_by'>>) => {
    optimisticUpdate(slotId, updates);
    const result = await supabase.from('raid_slots').update(updates).eq('id', slotId);
    if (result.error) fetchSlots();
    return result;
  };

  /** Admin xóa slot */
  const adminClearSlot = async (slotId: string) => {
    optimisticUpdate(slotId, { member_name: '', class_id: '', registered_by: null });
    const result = await supabase
      .from('raid_slots')
      .update({ member_name: '', class_id: '', registered_by: null })
      .eq('id', slotId);
    if (result.error) fetchSlots();
    return result;
  };

  return { slots, loading, registerSlot, unregisterSlot, adminUpdateSlot, adminClearSlot, refetch: fetchSlots };
}
