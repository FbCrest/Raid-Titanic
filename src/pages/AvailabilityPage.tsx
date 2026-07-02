import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Bell, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, Swords, CalendarDays,
} from 'lucide-react';
import { supabase, Raid, Availability, DayAvailability, Profile } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useRaids } from '../hooks/useRaids';

// ─── helpers ───────────────────────────────────────────────────
const DOW_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const DOW_FULL  = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];
const MONTHS_VI = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                   'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function todayStr() {
  const n = new Date();
  return toDateStr(n.getFullYear(), n.getMonth(), n.getDate());
}
function formatFull(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${DOW_FULL[date.getUTCDay()]}, ${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
}
function getDaysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

// ─── Main component ────────────────────────────────────────────
export const AvailabilityPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const { raids } = useRaids();

  const today = todayStr();
  const nowDate = new Date();

  // calendar view state
  const [viewYear,  setViewYear]  = useState(nowDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(nowDate.getMonth());
  const [selected,  setSelected]  = useState<string>(today); // 'YYYY-MM-DD'

  // data
  const [myRaidAvail,  setMyRaidAvail]  = useState<Record<string, Availability>>({});
  const [allRaidAvail, setAllRaidAvail] = useState<Availability[]>([]);
  const [myDayAvail,   setMyDayAvail]   = useState<Record<string, DayAvailability>>({});
  const [allDayAvail,  setAllDayAvail]  = useState<DayAvailability[]>([]);
  const [allProfiles,  setAllProfiles]  = useState<Profile[]>([]);

  const [saving,      setSaving]      = useState<string | null>(null);
  const [noteEditing, setNoteEditing] = useState<string | null>(null);
  const [noteValue,   setNoteValue]   = useState('');

  // filter upcoming raids (not cancelled, not past)
  const upcomingRaids = useMemo(() => {
    return raids
      .filter(r => r.status !== 'cancelled' && r.raid_date >= today)
      .sort((a, b) => a.raid_date.localeCompare(b.raid_date));
  }, [raids, today]);

  // raids grouped by date string for calendar dots
  const raidsByDate = useMemo(() => {
    const map: Record<string, Raid[]> = {};
    upcomingRaids.forEach(r => {
      if (!map[r.raid_date]) map[r.raid_date] = [];
      map[r.raid_date].push(r);
    });
    return map;
  }, [upcomingRaids]);

  // fetch all availability data
  const fetchData = useCallback(async () => {
    if (!profile) return;

    const [{ data: myRA }, { data: myDA }] = await Promise.all([
      supabase.from('availability').select('*').eq('user_id', profile.id),
      supabase.from('day_availability').select('*').eq('user_id', profile.id),
    ]);

    const raidMap: Record<string, Availability> = {};
    (myRA ?? []).forEach(a => { raidMap[a.raid_id] = a; });
    setMyRaidAvail(raidMap);

    const dayMap: Record<string, DayAvailability> = {};
    (myDA ?? []).forEach(a => { dayMap[a.avail_date] = a; });
    setMyDayAvail(dayMap);

    if (isAdmin) {
      const [{ data: allRA }, { data: allDA }, { data: profiles }] = await Promise.all([
        supabase.from('availability').select('*'),
        supabase.from('day_availability').select('*'),
        supabase.from('profiles').select('*').in('role', ['member', 'admin', 'superadmin']),
      ]);
      setAllRaidAvail(allRA ?? []);
      setAllDayAvail(allDA ?? []);
      setAllProfiles(profiles ?? []);
    }
  }, [profile, isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Realtime subscriptions ──
  useEffect(() => {
    if (!profile) return;
    const ch = supabase
      .channel(`avail-rt-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'day_availability' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile, fetchData]);

  // ── toggle raid availability ──
  const toggleRaidAvail = async (raid: Raid) => {
    if (!profile) return;
    const cur = myRaidAvail[raid.id];
    const newStatus: 'available' | 'busy' = (!cur || cur.status === 'available') ? 'busy' : 'available';
    setSaving(`raid-${raid.id}`);
    setMyRaidAvail(prev => ({
      ...prev,
      [raid.id]: { ...(cur ?? { id:'', raid_id: raid.id, user_id: profile.id, note:'', updated_at:'' }), status: newStatus },
    }));
    if (cur?.id) {
      await supabase.from('availability').update({ status: newStatus }).eq('id', cur.id);
    } else {
      const { data } = await supabase.from('availability')
        .insert({ raid_id: raid.id, user_id: profile.id, status: newStatus, note: '' })
        .select().single();
      if (data) setMyRaidAvail(prev => ({ ...prev, [raid.id]: data }));
    }
    setSaving(null);
    fetchData();
  };

  // ── toggle day availability ──
  const toggleDayAvail = async (dateStr: string) => {
    if (!profile) return;
    const cur = myDayAvail[dateStr];
    const newStatus: 'available' | 'busy' = (!cur || cur.status === 'available') ? 'busy' : 'available';
    setSaving(`day-${dateStr}`);
    setMyDayAvail(prev => ({
      ...prev,
      [dateStr]: { ...(cur ?? { id:'', avail_date: dateStr, user_id: profile.id, note:'', updated_at:'' }), status: newStatus },
    }));
    if (cur?.id) {
      await supabase.from('day_availability').update({ status: newStatus }).eq('id', cur.id);
    } else {
      const { data } = await supabase.from('day_availability')
        .insert({ avail_date: dateStr, user_id: profile.id, status: newStatus, note: '' })
        .select().single();
      if (data) setMyDayAvail(prev => ({ ...prev, [dateStr]: data }));
    }
    setSaving(null);
    fetchData();
  };

  // ── save note ──
  const saveNote = async (key: string) => {
    if (!profile) return;
    if (key.startsWith('raid-')) {
      const raidId = key.replace('raid-', '');
      const cur = myRaidAvail[raidId];
      if (cur?.id) {
        await supabase.from('availability').update({ note: noteValue }).eq('id', cur.id);
        setMyRaidAvail(prev => ({ ...prev, [raidId]: { ...prev[raidId], note: noteValue } }));
      } else {
        const { data } = await supabase.from('availability')
          .insert({ raid_id: raidId, user_id: profile.id, status: 'available', note: noteValue })
          .select().single();
        if (data) setMyRaidAvail(prev => ({ ...prev, [raidId]: data }));
      }
    } else {
      const dateStr = key.replace('day-', '');
      const cur = myDayAvail[dateStr];
      if (cur?.id) {
        await supabase.from('day_availability').update({ note: noteValue }).eq('id', cur.id);
        setMyDayAvail(prev => ({ ...prev, [dateStr]: { ...prev[dateStr], note: noteValue } }));
      } else {
        const { data } = await supabase.from('day_availability')
          .insert({ avail_date: dateStr, user_id: profile.id, status: 'available', note: noteValue })
          .select().single();
        if (data) setMyDayAvail(prev => ({ ...prev, [dateStr]: data }));
      }
    }
    setNoteEditing(null);
    fetchData();
  };

  // ── calendar helpers ──
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const firstDow    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);

  // colour a calendar cell based on busy ratio (for admin) — now replaced by teamBusyCount
  // is this date marked busy by ME?
  const isMeBusy = (dateStr: string) => {
    const dayRaids = raidsByDate[dateStr] ?? [];
    for (const r of dayRaids) {
      if (myRaidAvail[r.id]?.status === 'busy') return true;
    }
    return myDayAvail[dateStr]?.status === 'busy';
  };

  // how many team members are busy on this date (admin)
  const teamBusyCount = (dateStr: string): number => {
    if (!isAdmin || allProfiles.length === 0) return 0;
    const hasRaid = !!raidsByDate[dateStr];
    const dayBusy = allDayAvail.filter(a => a.avail_date === dateStr && a.status === 'busy').length;
    if (!hasRaid) return dayBusy;
    const raidBusy = raidsByDate[dateStr].reduce((acc, r) => {
      return Math.max(acc, allRaidAvail.filter(a => a.raid_id === r.id && a.status === 'busy').length);
    }, 0);
    return Math.max(dayBusy, raidBusy);
  };

  // data for the selected date panel
  const selectedRaids = raidsByDate[selected] ?? [];
  const hasRaidOnSelected = selectedRaids.length > 0;

  // ── render ──
  return (
    <div className="relative min-h-screen bg-[#080a10] text-slate-300 antialiased">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-amber-600/8 animate-soft-float" style={{ filter:'blur(80px)' }} />
        <div className="absolute bottom-20 right-1/4 h-[400px] w-[400px] rounded-full bg-indigo-600/8" style={{ filter:'blur(70px)' }} />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-4 sm:px-6 py-6 flex flex-col gap-5">

        {/* ── Header ── */}
        <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}
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
              <p className="text-xs text-slate-500">Chọn ngày để xem hoặc cập nhật trạng thái</p>
            </div>
          </div>
        </motion.div>

        {/* ── Calendar ── */}
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:0.06 }}
          className="rounded-2xl bg-white/[0.025] border border-white/[0.06] overflow-hidden">

          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
            <button type="button" onClick={prevMonth}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-all">
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm font-bold text-slate-200">{MONTHS_VI[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-all">
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-white/[0.04]">
            {DOW_SHORT.map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wide">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 p-2 gap-1">
            {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
              const dateStr = toDateStr(viewYear, viewMonth, d);
              const isToday = dateStr === today;
              const isSel   = dateStr === selected;
              const isPast  = dateStr < today;
              const hasRaid = !!raidsByDate[dateStr];
              const meBusy  = isMeBusy(dateStr);
              const busyCnt = teamBusyCount(dateStr);
              // heat level for admin badge
              const heatLevel = isAdmin && busyCnt > 0
                ? (busyCnt / Math.max(allProfiles.length, 1)) >= 0.5 ? 'high'
                : (busyCnt / Math.max(allProfiles.length, 1)) >= 0.25 ? 'mid'
                : 'low'
                : null;

              return (
                <button key={d} type="button" onClick={() => setSelected(dateStr)}
                  className={`relative flex items-center justify-center rounded-xl h-10 text-xs font-medium transition-all overflow-hidden
                    ${isSel && meBusy && !isPast
                      ? 'bg-rose-500/35 border-2 border-rose-400/60 text-rose-100'
                      : isSel && isToday && hasRaid
                      ? 'border-2 border-emerald-400/80 text-emerald-100 bg-emerald-500/20'
                      : isSel && isToday
                      ? 'border-2 border-indigo-400/70 text-indigo-100 bg-indigo-500/20'
                      : isSel && hasRaid
                      ? 'border-2 border-emerald-400/70 text-emerald-100 bg-emerald-500/18'
                      : isSel
                      ? 'bg-white/[0.12] border border-white/[0.22] text-slate-100'
                      : meBusy && !isPast
                      ? 'bg-rose-500/20 border border-rose-500/30 text-rose-200 hover:bg-rose-500/28'
                      : isToday && hasRaid
                      ? 'border border-emerald-400/60 text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/15'
                      : isToday
                      ? 'border border-indigo-400/40 text-indigo-300 bg-indigo-500/8'
                      : isPast
                      ? 'text-slate-700 hover:bg-white/[0.04]'
                      : hasRaid
                      ? 'border border-emerald-500/35 text-slate-200 bg-emerald-500/8 hover:bg-emerald-500/12'
                      : 'text-slate-300 hover:bg-white/[0.06]'}
                  `}
                >
                  {/* Strikethrough overlay khi bận */}
                  {meBusy && !isPast && (
                    <span className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 40 40" preserveAspectRatio="none">
                        <line x1="4" y1="4"  x2="36" y2="36" stroke="rgb(248 113 113)" strokeWidth="1.5" strokeLinecap="round"/>
                        <line x1="36" y1="4" x2="4"  y2="36" stroke="rgb(248 113 113)" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </span>
                  )}

                  {/* Số ngày */}
                  <span className="relative z-10">{d}</span>

                  {/* Raid indicator — chấm xanh góc trên phải */}
                  {hasRaid && !meBusy && (
                    <span className={`absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full shadow-[0_0_4px_rgb(52_211_153/0.8)]
                      ${isSel ? 'bg-emerald-300' : 'bg-emerald-400'}`} />
                  )}

                  {/* Admin heat badge — góc dưới phải: số người bận */}
                  {heatLevel && (
                    <span className={`absolute bottom-0.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-md flex items-center justify-center text-[10px] font-black leading-none
                      ${heatLevel === 'high' ? 'bg-rose-500/35 text-rose-300' : heatLevel === 'mid' ? 'bg-orange-500/30 text-orange-300' : 'bg-yellow-500/25 text-yellow-400'}`}>
                      {busyCnt}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="px-4 py-2.5 border-t border-white/[0.04] flex flex-wrap gap-x-5 gap-y-1.5">
            {/* Raid: chấm xanh góc trên */}
            <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="relative w-5 h-4 inline-flex items-center justify-center rounded-md bg-emerald-500/10 border border-emerald-500/30 shrink-0">
                <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-emerald-400" />
              </span>
              Có raid
            </span>
            {/* Bận: nền đỏ + chéo */}
            <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="relative w-5 h-4 inline-flex items-center justify-center rounded-md bg-rose-500/20 border border-rose-500/30 shrink-0 overflow-hidden">
                <svg className="absolute inset-0 w-full h-full opacity-50" viewBox="0 0 20 16" preserveAspectRatio="none">
                  <line x1="2" y1="2" x2="18" y2="14" stroke="rgb(248 113 113)" strokeWidth="1.5"/>
                  <line x1="18" y1="2" x2="2" y2="14" stroke="rgb(248 113 113)" strokeWidth="1.5"/>
                </svg>
              </span>
              Bạn bận
            </span>
            {/* Admin heat */}
            {isAdmin && (
              <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="relative w-5 h-4 inline-flex items-center justify-center rounded-md bg-white/[0.04] border border-white/[0.08] shrink-0">
                  <span className="absolute top-0 right-0 min-w-[10px] h-[12px] px-0.5 rounded-sm flex items-center justify-center text-[8px] font-black bg-yellow-500/25 text-yellow-400">3</span>
                </span>
                Số người bận trong team
              </span>
            )}
          </div>
        </motion.div>

        {/* ── Detail panel for selected date ── */}
        <AnimatePresence mode="wait">
          <motion.div key={selected}
            initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
            transition={{ duration:0.25 }}
            className="flex flex-col gap-3">

            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              {formatFull(selected)}
            </p>

            {/* ── Raids on this date ── */}
            {selectedRaids.map(raid => {
              const avail   = myRaidAvail[raid.id];
              const isBusy  = avail?.status === 'busy';
              const isSav   = saving === `raid-${raid.id}`;
              const noteKey = `raid-${raid.id}`;

              // admin data
              const raidAllAvail = allRaidAvail.filter(a => a.raid_id === raid.id);
              const busyIds  = new Set(raidAllAvail.filter(a => a.status === 'busy').map(a => a.user_id));
              const availCount = allProfiles.length - busyIds.size;

              return (
                <div key={raid.id}
                  className={`rounded-2xl border overflow-hidden transition-all ${
                    isBusy ? 'bg-rose-500/5 border-rose-500/15' : 'bg-white/[0.025] border-white/[0.06]'
                  }`}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="h-8 w-8 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <Swords size={14} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">{raid.title}</p>
                      <p className="text-xs text-slate-500">{raid.raid_time}</p>
                    </div>
                    <motion.button type="button" disabled={isSav} onClick={() => toggleRaidAvail(raid)}
                      whileHover={{ scale:1.04 }} whileTap={{ scale:0.95 }}
                      className={`shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold border transition-all disabled:opacity-50 ${
                        isBusy
                          ? 'bg-rose-500/20 border-rose-500/30 text-rose-300 hover:bg-rose-500/30'
                          : 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/25'
                      }`}>
                      {isSav
                        ? <span className="h-3.5 w-3.5 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                        : isBusy ? <XCircle size={14} /> : <CheckCircle size={14} />
                      }
                      {isBusy ? 'Bận' : 'Rảnh'}
                    </motion.button>
                  </div>

                  {/* Note */}
                  <div className="px-4 pb-3">
                    <AnimatePresence mode="wait">
                      {noteEditing === noteKey ? (
                        <motion.div key="ed" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex gap-2">
                          <input type="text" value={noteValue} onChange={e => setNoteValue(e.target.value)}
                            onKeyDown={e => { if (e.key==='Enter') saveNote(noteKey); if (e.key==='Escape') setNoteEditing(null); }}
                            placeholder="Ghi chú lý do..." autoFocus
                            className="flex-1 rounded-xl bg-white/[0.05] border border-white/[0.08] px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500/40 transition-all" />
                          <button type="button" onClick={() => saveNote(noteKey)}
                            className="rounded-xl bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/30 transition-all">Lưu</button>
                          <button type="button" onClick={() => setNoteEditing(null)}
                            className="rounded-xl bg-white/[0.04] border border-white/[0.07] px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-all">Huỷ</button>
                        </motion.div>
                      ) : (
                        <motion.button key="disp" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                          type="button" onClick={() => { setNoteEditing(noteKey); setNoteValue(avail?.note ?? ''); }}
                          className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                          {avail?.note ? <span className="flex items-center gap-1">📝 <span className="italic">{avail.note}</span></span> : '+ Thêm ghi chú'}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Admin summary */}
                  {isAdmin && allProfiles.length > 0 && (
                    <>
                      <div className="mx-4 h-px bg-white/[0.05]" />
                      <div className="px-4 py-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-emerald-400"><CheckCircle size={11} /> {availCount} rảnh</span>
                          <span className="flex items-center gap-1 text-rose-400"><XCircle size={11} /> {busyIds.size} bận</span>
                        </div>
                        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                            style={{ width: allProfiles.length > 0 ? `${(availCount / allProfiles.length) * 100}%` : '100%' }} />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {allProfiles.map(p => {
                            const busy = busyIds.has(p.id);
                            const note = raidAllAvail.find(a => a.user_id === p.id)?.note;
                            return (
                              <div key={p.id} title={note ? `${p.display_name}: ${note}` : p.display_name}
                                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${
                                  busy
                                    ? 'bg-rose-500/12 border-rose-500/20 text-rose-300'
                                    : 'bg-emerald-500/8 border-emerald-500/15 text-emerald-300'
                                }`}>
                                {p.avatar_url
                                  ? <img src={p.avatar_url} className="w-4 h-4 rounded object-cover shrink-0" alt="" />
                                  : <span className="w-4 h-4 rounded bg-white/[0.1] flex items-center justify-center text-[8px] font-black shrink-0">{p.display_name[0]}</span>
                                }
                                {p.display_name}
                                {busy ? <XCircle size={10} className="shrink-0" /> : <CheckCircle size={10} className="shrink-0" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {/* ── Day (no raid) availability ── */}
            {!hasRaidOnSelected && (
              <div className={`rounded-2xl border overflow-hidden transition-all ${
                myDayAvail[selected]?.status === 'busy'
                  ? 'bg-rose-500/5 border-rose-500/15'
                  : 'bg-white/[0.025] border-white/[0.06]'
              }`}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="h-8 w-8 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
                    <CalendarDays size={14} className="text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-200">Ngày trống</p>
                    <p className="text-xs text-slate-500">Không có raid, nhưng bạn có thể báo bận/rảnh</p>
                  </div>
                  <motion.button type="button" disabled={saving === `day-${selected}`}
                    onClick={() => toggleDayAvail(selected)}
                    whileHover={{ scale:1.04 }} whileTap={{ scale:0.95 }}
                    className={`shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold border transition-all disabled:opacity-50 ${
                      myDayAvail[selected]?.status === 'busy'
                        ? 'bg-rose-500/20 border-rose-500/30 text-rose-300 hover:bg-rose-500/30'
                        : 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/25'
                    }`}>
                    {saving === `day-${selected}`
                      ? <span className="h-3.5 w-3.5 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                      : myDayAvail[selected]?.status === 'busy' ? <XCircle size={14} /> : <CheckCircle size={14} />
                    }
                    {myDayAvail[selected]?.status === 'busy' ? 'Bận' : 'Rảnh'}
                  </motion.button>
                </div>

                {/* Note */}
                <div className="px-4 pb-3">
                  <AnimatePresence mode="wait">
                    {noteEditing === `day-${selected}` ? (
                      <motion.div key="ed" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex gap-2">
                        <input type="text" value={noteValue} onChange={e => setNoteValue(e.target.value)}
                          onKeyDown={e => { if (e.key==='Enter') saveNote(`day-${selected}`); if (e.key==='Escape') setNoteEditing(null); }}
                          placeholder="Ghi chú lý do..." autoFocus
                          className="flex-1 rounded-xl bg-white/[0.05] border border-white/[0.08] px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500/40 transition-all" />
                        <button type="button" onClick={() => saveNote(`day-${selected}`)}
                          className="rounded-xl bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/30 transition-all">Lưu</button>
                        <button type="button" onClick={() => setNoteEditing(null)}
                          className="rounded-xl bg-white/[0.04] border border-white/[0.07] px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-all">Huỷ</button>
                      </motion.div>
                    ) : (
                      <motion.button key="disp" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                        type="button" onClick={() => { setNoteEditing(`day-${selected}`); setNoteValue(myDayAvail[selected]?.note ?? ''); }}
                        className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                        {myDayAvail[selected]?.note ? <span className="flex items-center gap-1">📝 <span className="italic">{myDayAvail[selected].note}</span></span> : '+ Thêm ghi chú'}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                {/* Admin summary for day */}
                {isAdmin && allProfiles.length > 0 && (
                  <>
                    <div className="mx-4 h-px bg-white/[0.05]" />
                    <div className="px-4 py-3 flex flex-col gap-2">
                      {(() => {
                        const dayAllAvail = allDayAvail.filter(a => a.avail_date === selected);
                        const busyIds = new Set(dayAllAvail.filter(a => a.status === 'busy').map(a => a.user_id));
                        const availIds = new Set(dayAllAvail.filter(a => a.status === 'available').map(a => a.user_id));
                        const availCount = availIds.size;
                        const busyCount  = busyIds.size;
                        const notReported = allProfiles.length - availCount - busyCount;

                        return (
                          <>
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1 text-emerald-400"><CheckCircle size={11} /> {availCount} rảnh</span>
                              <span className="flex items-center gap-1 text-rose-400"><XCircle size={11} /> {busyCount} bận</span>
                              <span className="text-slate-500">{notReported} chưa báo</span>
                            </div>
                            <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                                style={{ width: allProfiles.length > 0 ? `${(availCount / allProfiles.length) * 100}%` : '0%' }} />
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {allProfiles.map(p => {
                                const isBusy = busyIds.has(p.id);
                                const isAvail = availIds.has(p.id);
                                const note = dayAllAvail.find(a => a.user_id === p.id)?.note;
                                return (
                                  <div key={p.id} title={note ? `${p.display_name}: ${note}` : p.display_name}
                                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${
                                      isBusy ? 'bg-rose-500/12 border-rose-500/20 text-rose-300' :
                                      isAvail ? 'bg-emerald-500/8 border-emerald-500/15 text-emerald-300' :
                                      'bg-white/[0.03] border-white/[0.06] text-slate-500'
                                    }`}>
                                    {p.avatar_url
                                      ? <img src={p.avatar_url} className="w-4 h-4 rounded object-cover shrink-0" alt="" />
                                      : <span className="w-4 h-4 rounded bg-white/[0.1] flex items-center justify-center text-[8px] font-black shrink-0">{p.display_name[0]}</span>
                                    }
                                    {p.display_name}
                                    {isBusy && <XCircle size={10} className="shrink-0" />}
                                    {isAvail && <CheckCircle size={10} className="shrink-0" />}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
};
