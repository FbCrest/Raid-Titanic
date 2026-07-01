import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, XCircle, Users, Clock, Repeat } from 'lucide-react';
import { supabase, Raid, Availability, Profile } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useRaids } from '../hooks/useRaids';

interface AvailabilityModalProps {
  onClose: () => void;
}

const DOW_FULL = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];

function formatRaidDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = DOW_FULL[date.getUTCDay()];
  return `${dow} ${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}`;
}

export const AvailabilityModal: React.FC<AvailabilityModalProps> = ({ onClose }) => {
  const { profile, isAdmin } = useAuth();
  const { raids } = useRaids();
  const [availMap, setAvailMap] = useState<Record<string, Availability>>({});
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [allAvail, setAllAvail] = useState<Availability[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [noteEditing, setNoteEditing] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');

  // Chỉ lấy raid sắp tới
  const today = new Date().toISOString().split('T')[0];
  const upcomingRaids = raids.filter(r => r.raid_date >= today && r.status !== 'cancelled')
    .sort((a, b) => a.raid_date.localeCompare(b.raid_date));

  const fetchAvailability = useCallback(async () => {
    if (!profile) return;
    // Lấy availability của bản thân
    const { data: myData } = await supabase
      .from('availability')
      .select('*')
      .eq('user_id', profile.id);
    const map: Record<string, Availability> = {};
    (myData ?? []).forEach((a) => { map[a.raid_id] = a; });
    setAvailMap(map);

    // Admin: lấy tất cả
    if (isAdmin) {
      const { data: allData } = await supabase.from('availability').select('*');
      setAllAvail(allData ?? []);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['member', 'admin']);
      setAllProfiles(profilesData ?? []);
    }
  }, [profile, isAdmin]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const toggleStatus = async (raid: Raid) => {
    if (!profile) return;
    const current = availMap[raid.id];
    const newStatus = !current || current.status === 'available' ? 'busy' : 'available';
    setSaving(raid.id);

    // Optimistic
    setAvailMap(prev => ({
      ...prev,
      [raid.id]: { ...(current ?? { id: '', raid_id: raid.id, user_id: profile.id, note: '', updated_at: '' }), status: newStatus }
    }));

    if (current) {
      await supabase.from('availability').update({ status: newStatus }).eq('id', current.id);
    } else {
      await supabase.from('availability').insert({
        raid_id: raid.id, user_id: profile.id, status: newStatus, note: '',
      });
    }
    await fetchAvailability();
    setSaving(null);
  };

  const saveNote = async (raidId: string) => {
    if (!profile) return;
    const current = availMap[raidId];
    if (current) {
      await supabase.from('availability').update({ note: noteValue }).eq('id', current.id);
    } else {
      await supabase.from('availability').insert({
        raid_id: raidId, user_id: profile.id, status: 'available', note: noteValue,
      });
    }
    setAvailMap(prev => ({ ...prev, [raidId]: { ...(prev[raidId] ?? { id:'', raid_id: raidId, user_id: profile.id, status:'available', updated_at:'' }), note: noteValue } }));
    setNoteEditing(null);
    fetchAvailability();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-lg rounded-2xl bg-[#0d1117] border border-white/[0.08] overflow-hidden max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-amber-400" />
            <h2 className="text-sm font-bold text-slate-100">Lịch báo bận</h2>
          </div>
          <button type="button" onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all">
            <X size={15} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-5">
          {/* Phần của bản thân */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Trạng thái của bạn</p>
            <div className="flex flex-col gap-2">
              {upcomingRaids.length === 0 && (
                <p className="text-xs text-slate-600 italic">Không có raid nào sắp tới.</p>
              )}
              {upcomingRaids.map(raid => {
                const avail = availMap[raid.id];
                const isBusy = avail?.status === 'busy';
                const isSaving = saving === raid.id;
                return (
                  <div key={raid.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      {/* Date */}
                      <div className="shrink-0 text-xs text-slate-500 w-28">{formatRaidDate(raid.raid_date)}</div>

                      {/* Title */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-300 truncate">{raid.title}</p>
                        <p className="text-[10px] text-slate-600">{raid.raid_time}</p>
                      </div>

                      {/* Toggle */}
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => toggleStatus(raid)}
                        className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all disabled:opacity-50 ${
                          isBusy
                            ? 'bg-rose-500/15 border-rose-500/25 text-rose-300 hover:bg-rose-500/25'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20'
                        }`}
                      >
                        {isSaving
                          ? <span className="h-3 w-3 rounded-full border border-current/30 border-t-current animate-spin" />
                          : isBusy ? <XCircle size={12} /> : <CheckCircle size={12} />
                        }
                        {isBusy ? 'Bận' : 'Rảnh'}
                      </button>
                    </div>

                    {/* Note */}
                    <div className="px-3 pb-2.5">
                      {noteEditing === raid.id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={noteValue}
                            onChange={e => setNoteValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveNote(raid.id); if (e.key === 'Escape') setNoteEditing(null); }}
                            placeholder="Ghi chú lý do..."
                            autoFocus
                            className="flex-1 rounded-lg bg-white/[0.05] border border-white/[0.08] px-2.5 py-1 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500/40 transition-all"
                          />
                          <button type="button" onClick={() => saveNote(raid.id)}
                            className="rounded-lg bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-1 text-xs text-indigo-300 hover:bg-indigo-500/30 transition-all">
                            Lưu
                          </button>
                          <button type="button" onClick={() => setNoteEditing(null)}
                            className="rounded-lg bg-white/[0.04] border border-white/[0.07] px-2 py-1 text-xs text-slate-500 hover:text-slate-300 transition-all">
                            Huỷ
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => { setNoteEditing(raid.id); setNoteValue(avail?.note ?? ''); }}
                          className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
                          {avail?.note ? `📝 ${avail.note}` : '+ Thêm ghi chú'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Admin: xem tất cả */}
          {isAdmin && upcomingRaids.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Users size={12} />
                Tổng quan thành viên
              </p>
              <div className="flex flex-col gap-3">
                {upcomingRaids.map(raid => {
                  const raidAvail = allAvail.filter(a => a.raid_id === raid.id);
                  const busyIds = new Set(raidAvail.filter(a => a.status === 'busy').map(a => a.user_id));
                  const availIds = new Set(raidAvail.filter(a => a.status === 'available').map(a => a.user_id));
                  const members = allProfiles;

                  return (
                    <div key={raid.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <div className="flex items-center justify-between mb-2.5">
                        <p className="text-xs font-semibold text-slate-300">{formatRaidDate(raid.raid_date)} • {raid.title}</p>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="text-emerald-400">{availIds.size} rảnh</span>
                          <span className="text-slate-600">·</span>
                          <span className="text-rose-400">{busyIds.size} bận</span>
                          <span className="text-slate-600">·</span>
                          <span className="text-slate-500">{members.length - availIds.size - busyIds.size} chưa báo</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {members.map(p => {
                          const isBusy = busyIds.has(p.id);
                          const isAvail = availIds.has(p.id);
                          const note = raidAvail.find(a => a.user_id === p.id)?.note;
                          return (
                            <div key={p.id}
                              title={note ? `${p.display_name}: ${note}` : p.display_name}
                              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-medium transition-all ${
                                isBusy ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' :
                                isAvail ? 'bg-emerald-500/8 border-emerald-500/15 text-emerald-300' :
                                'bg-white/[0.03] border-white/[0.06] text-slate-500'
                              }`}
                            >
                              {p.avatar_url
                                ? <img src={p.avatar_url} className="w-4 h-4 rounded object-cover" />
                                : <span className="w-4 h-4 rounded bg-white/[0.1] flex items-center justify-center text-[8px] font-black">{p.display_name[0]}</span>
                              }
                              {p.display_name}
                              {isBusy && <XCircle size={10} />}
                              {isAvail && <CheckCircle size={10} />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
