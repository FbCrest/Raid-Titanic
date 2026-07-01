import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Bell } from 'lucide-react';
import { supabase, Raid, Availability, Profile } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useRaids } from '../hooks/useRaids';

const DOW_FULL = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];

function formatRaidDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${DOW_FULL[date.getUTCDay()]} ${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}`;
}

export const AvailabilityPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const { raids } = useRaids();

  const [myAvail, setMyAvail] = useState<Record<string, Availability>>({});
  const [allAvail, setAllAvail] = useState<Availability[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [noteEditing, setNoteEditing] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  const isPastRaid = (raid: { raid_date: string; raid_time: string }) => {
    if (raid.raid_date < today) return true;
    if (raid.raid_date === today) {
      const [h, m] = raid.raid_time.split(':').map(Number);
      const raidEnd = new Date(now);
      raidEnd.setHours(h + 2, m, 0, 0);
      return now > raidEnd;
    }
    return false;
  };

  const upcomingRaids = raids
    .filter(r => !isPastRaid(r) && r.status !== 'cancelled')
    .sort((a, b) => a.raid_date.localeCompare(b.raid_date));

  const fetchData = useCallback(async () => {
    if (!profile) return;
    const { data: myData } = await supabase.from('availability').select('*').eq('user_id', profile.id);
    const map: Record<string, Availability> = {};
    (myData ?? []).forEach(a => { map[a.raid_id] = a; });
    setMyAvail(map);

    if (isAdmin) {
      const { data: allData } = await supabase.from('availability').select('*');
      setAllAvail(allData ?? []);
      const { data: profilesData } = await supabase.from('profiles').select('*').in('role', ['member', 'admin']);
      setAllProfiles(profilesData ?? []);
    }
  }, [profile, isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleBusy = async (raid: Raid) => {
    if (!profile) return;
    const current = myAvail[raid.id];
    // Mặc định rảnh — chỉ có 2 trạng thái: rảnh và bận
    const newStatus: 'available' | 'busy' = (!current || current.status === 'available') ? 'busy' : 'available';
    setSaving(raid.id);

    // Optimistic
    setMyAvail(prev => ({
      ...prev,
      [raid.id]: { ...(current ?? { id: '', raid_id: raid.id, user_id: profile.id, note: '', updated_at: '' }), status: newStatus }
    }));

    if (current?.id) {
      await supabase.from('availability').update({ status: newStatus }).eq('id', current.id);
    } else {
      const { data } = await supabase.from('availability').insert({
        raid_id: raid.id, user_id: profile.id, status: newStatus, note: '',
      }).select().single();
      if (data) setMyAvail(prev => ({ ...prev, [raid.id]: data }));
    }
    setSaving(null);
    fetchData();
  };

  const saveNote = async (raidId: string) => {
    if (!profile) return;
    const current = myAvail[raidId];
    if (current?.id) {
      await supabase.from('availability').update({ note: noteValue }).eq('id', current.id);
      setMyAvail(prev => ({ ...prev, [raidId]: { ...prev[raidId], note: noteValue } }));
    } else {
      const { data } = await supabase.from('availability').insert({
        raid_id: raidId, user_id: profile.id, status: 'available', note: noteValue,
      }).select().single();
      if (data) setMyAvail(prev => ({ ...prev, [raidId]: data }));
    }
    setNoteEditing(null);
  };

  return (
    <div className="relative min-h-screen bg-[#080a10] text-slate-300 antialiased">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-amber-600/8 animate-soft-float" style={{ filter: 'blur(80px)' }} />
        <div className="absolute bottom-20 right-1/4 h-[400px] w-[400px] rounded-full bg-indigo-600/8" style={{ filter: 'blur(70px)' }} />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="flex items-center gap-4">
          <button type="button" onClick={() => navigate('/')}
            className="h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-all">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
              <Bell size={16} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100">Lịch báo bận</h1>
              <p className="text-xs text-slate-500">Bấm "Bận" nếu hôm đó bạn không tham gia được</p>
            </div>
          </div>
        </motion.div>

        {/* Raids gộp */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
          {upcomingRaids.length === 0 ? (
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-8 text-center">
              <p className="text-sm text-slate-600">Không có raid nào sắp tới.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingRaids.map((raid, idx) => {
                const avail = myAvail[raid.id];
                const isBusy = avail?.status === 'busy';
                const isSaving = saving === raid.id;

                // Admin data
                const raidAvail = allAvail.filter(a => a.raid_id === raid.id);
                const busyIds = new Set(raidAvail.filter(a => a.status === 'busy').map(a => a.user_id));
                const totalMembers = allProfiles.length;
                const busyCount = busyIds.size;
                const availCount = totalMembers - busyCount;

                return (
                  <motion.div
                    key={raid.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    className={`rounded-2xl border overflow-hidden transition-all duration-200 ${
                      isBusy ? 'bg-rose-500/5 border-rose-500/15' : 'bg-white/[0.025] border-white/[0.06]'
                    }`}
                  >
                    {/* Row: info + toggle */}
                    <div className="flex items-center gap-4 px-4 py-3">
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-200 truncate">{raid.title}</p>
                        <p className="text-xs text-slate-500">{raid.raid_time}</p>
                      </div>

                      {/* Toggle button */}
                      <motion.button
                        type="button"
                        disabled={isSaving}
                        onClick={() => toggleBusy(raid)}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.95 }}
                        className={`shrink-0 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold border transition-all disabled:opacity-50 ${
                          isBusy
                            ? 'bg-rose-500/20 border-rose-500/30 text-rose-300 hover:bg-rose-500/30'
                            : 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/25'
                        }`}
                      >
                        {isSaving
                          ? <span className="h-4 w-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                          : isBusy ? <XCircle size={15} /> : <CheckCircle size={15} />
                        }
                        {isBusy ? 'Bận' : 'Rảnh'}
                      </motion.button>
                    </div>

                    {/* Note */}
                    <div className="px-4 pb-3">
                      <AnimatePresence mode="wait">
                        {noteEditing === raid.id ? (
                          <motion.div key="editing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex gap-2">
                            <input type="text" value={noteValue} onChange={e => setNoteValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveNote(raid.id); if (e.key === 'Escape') setNoteEditing(null); }}
                              placeholder="Ghi chú lý do bận..." autoFocus
                              className="flex-1 rounded-xl bg-white/[0.05] border border-white/[0.08] px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500/40 transition-all" />
                            <button type="button" onClick={() => saveNote(raid.id)}
                              className="rounded-xl bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/30 transition-all">Lưu</button>
                            <button type="button" onClick={() => setNoteEditing(null)}
                              className="rounded-xl bg-white/[0.04] border border-white/[0.07] px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-all">Huỷ</button>
                          </motion.div>
                        ) : (
                          <motion.button key="display" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            type="button" onClick={() => { setNoteEditing(raid.id); setNoteValue(avail?.note ?? ''); }}
                            className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                            {avail?.note
                              ? <span className="flex items-center gap-1">📝 <span className="italic">{avail.note}</span></span>
                              : '+ Thêm ghi chú'
                            }
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Admin: tổng quan thành viên — ngay trong cùng card */}
                    {isAdmin && totalMembers > 0 && (
                      <>
                        <div className="mx-4 h-px bg-white/[0.05]" />
                        <div className="px-4 py-3 flex flex-col gap-2">
                          {/* Stats + progress */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-xs">
                              <span className="flex items-center gap-1 text-emerald-400">
                                <CheckCircle size={11} /> {availCount} rảnh
                              </span>
                              <span className="flex items-center gap-1 text-rose-400">
                                <XCircle size={11} /> {busyCount} bận
                              </span>
                            </div>
                          </div>
                          <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                              style={{ width: totalMembers > 0 ? `${(availCount / totalMembers) * 100}%` : '100%' }} />
                          </div>
                          {/* Member chips */}
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {allProfiles.map(p => {
                              const isMemberBusy = busyIds.has(p.id);
                              const note = raidAvail.find(a => a.user_id === p.id)?.note;
                              return (
                                <div key={p.id} title={note ? `${p.display_name}: ${note}` : p.display_name}
                                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium cursor-default ${
                                    isMemberBusy
                                      ? 'bg-rose-500/12 border-rose-500/20 text-rose-300'
                                      : 'bg-emerald-500/8 border-emerald-500/15 text-emerald-300'
                                  }`}
                                >
                                  {p.avatar_url
                                    ? <img src={p.avatar_url} className="w-4 h-4 rounded object-cover shrink-0" alt="" />
                                    : <span className="w-4 h-4 rounded bg-white/[0.1] flex items-center justify-center text-[8px] font-black shrink-0">{p.display_name[0]}</span>
                                  }
                                  {p.display_name}
                                  {isMemberBusy ? <XCircle size={10} className="shrink-0" /> : <CheckCircle size={10} className="shrink-0" />}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
};
