import React, { useState, useEffect, useCallback } from 'react';import { motion, AnimatePresence } from 'motion/react';
import { Shield, LogOut, Camera, X, Plus, ChevronLeft, ChevronRight, ChevronDown, CalendarDays, Bell, Users, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useRaids } from '../hooks/useRaids';
import { RaidView } from './raid/RaidView';
import { AdminPanel } from './admin/AdminPanel';
import { BannerHeader } from './BannerHeader';
import { RaidList } from './raid/RaidList';
import { CreateRaidModal } from './raid/CreateRaidModal';
import { ProfileModal } from './ProfileModal';
import { DateTimePicker } from './DateTimePicker';
import { RaidSettings } from '../types';
import { Raid } from '../lib/supabase';

const now = new Date();
const todayDow = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'][now.getDay()];
const todayD = String(now.getDate()).padStart(2, '0');
const todayMo = String(now.getMonth() + 1).padStart(2, '0');

const DEFAULT_SETTINGS: RaidSettings = {
  title: "🚢Tàu Titanic『镇海潮生』",
  dateTime: `21:00 - ${todayDow} (${todayD}/${todayMo})`,
  bannerUrl: null,
  description: "Yêu cầu đồng đội có mặt đúng giờ, vào Discord để hoạt động nhóm được tốt hơn!",
};

const DOW_FULL = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

export const OnlineApp: React.FC = () => {
  const { profile, isAdmin, isSuperAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { raids, ensureRecurringRaids, updateRaidStatus, deleteRaid } = useRaids();
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch pending member count for admin badge
  useEffect(() => {
    if (!isAdmin) return;
    const fetch = async () => {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'pending');
      setPendingCount(count ?? 0);
    };
    fetch();
    // Realtime không cần thiết ở đây, poll mỗi 30s là đủ
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);
  const [selectedRaidId, setSelectedRaidId] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showRaidPicker, setShowRaidPicker] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [settings, setSettings] = useState<RaidSettings>(DEFAULT_SETTINGS);

  // ── Load settings từ DB + realtime ──
  const applyDBSettings = useCallback((row: { title: string; description: string; banner_url: string | null }) => {
    setSettings(prev => ({
      ...prev,
      title: row.title,
      description: row.description,
      bannerUrl: row.banner_url,
    }));
  }, []);

  useEffect(() => {
    // Fetch initial
    supabase.from('raid_settings').select('*').eq('id', 1).single()
      .then(({ data }) => { if (data) applyDBSettings(data); });

    // Realtime
    const ch = supabase
      .channel('raid-settings-rt')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'raid_settings', filter: 'id=eq.1' },
        (payload) => { if (payload.new) applyDBSettings(payload.new as { title: string; description: string; banner_url: string | null }); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [applyDBSettings]);

  // ── Lưu settings lên DB (chỉ admin) ──
  const handleUpdateSettings = useCallback(async (next: RaidSettings) => {
    setSettings(next);
    if (!isAdmin) return;
    await supabase.from('raid_settings').update({
      title: next.title,
      description: next.description,
      banner_url: next.bannerUrl,
      updated_by: profile?.id ?? null,
    }).eq('id', 1);
  }, [isAdmin, profile?.id]);

  useEffect(() => {
    if (isAdmin) ensureRecurringRaids();
  }, [isAdmin]);

  useEffect(() => {
    if (raids.length > 0 && !selectedRaidId) {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

      const isRaidPast = (r: Raid) => {
        if (r.raid_date < today) return true;
        if (r.raid_date === today) {
          const [h, m] = r.raid_time.split(':').map(Number);
          const end = new Date(now); end.setHours(h + 2, m, 0, 0);
          return now > end;
        }
        return false;
      };

      // Ưu tiên: raid sắp tới gần nhất (chưa qua, không huỷ) → fallback raid gần nhất
      const next = raids.find((r) => !isRaidPast(r) && r.status !== 'cancelled');
      const fallback = [...raids].reverse().find((r) => r.status !== 'cancelled') ?? raids[0];
      setSelectedRaidId((next ?? fallback).id);
    }
  }, [raids, selectedRaidId]);

  const selectedRaid = raids.find((r) => r.id === selectedRaidId) ?? null;
  const selectedIndex = raids.findIndex((r) => r.id === selectedRaidId);

  // Tự động cập nhật ngày giờ trên banner theo raid đang chọn
  useEffect(() => {
    if (!selectedRaid) return;
    const [y, m, d] = selectedRaid.raid_date.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const dow = DOW_FULL[date.getUTCDay()];
    const dd = String(d).padStart(2, '0');
    const mo = String(m).padStart(2, '0');
    setSettings((prev) => ({ ...prev, dateTime: `${selectedRaid.raid_time} - ${dow} (${dd}/${mo})` }));
  }, [selectedRaid?.id, selectedRaid?.raid_date, selectedRaid?.raid_time]);

  const goPrev = () => { if (selectedIndex > 0) setSelectedRaidId(raids[selectedIndex - 1].id); };
  const goNext = () => { if (selectedIndex < raids.length - 1) setSelectedRaidId(raids[selectedIndex + 1].id); };

  const handleToggleCancel = async () => {
    if (!selectedRaid) return;
    const next = selectedRaid.status === 'cancelled' ? 'open' : 'cancelled';
    await updateRaidStatus(selectedRaid.id, next);
  };

  return (
    <div className={`relative min-h-screen bg-[#080a10] text-slate-300 antialiased overflow-x-hidden transition-all duration-300 ${
      isScreenshotMode ? 'pb-2 pt-2' : 'pb-4 pt-3 md:pt-5'
    }`}>
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/10 animate-soft-float" style={{ filter: 'blur(80px)' }} />
        <div className="absolute top-1/3 -right-24 h-[400px] w-[400px] rounded-full bg-violet-600/8" style={{ animationDelay: '2.5s', filter: 'blur(70px)' }} />
        <div className="absolute bottom-10 left-1/3 h-[350px] w-[350px] rounded-full bg-cyan-600/7" style={{ animationDelay: '5s', filter: 'blur(90px)' }} />
        <div className="absolute inset-0 opacity-[0.018]" style={{ backgroundImage: `linear-gradient(rgb(129 140 248) 1px, transparent 1px), linear-gradient(90deg, rgb(129 140 248) 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />
      </div>

      {/* Screenshot exit */}
      <AnimatePresence>
        {isScreenshotMode && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => setIsScreenshotMode(false)}
            className="fixed top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 btn-secondary text-xs"
          >
            <X size={13} /> Thoát chụp ảnh
          </motion.button>
        )}
      </AnimatePresence>

      <div className={`relative z-10 mx-auto max-w-4xl px-4 sm:px-6 flex flex-col ${isScreenshotMode ? 'gap-2' : 'gap-3 md:gap-4'}`}>

        {/* Header */}
        {!isScreenshotMode && (
          <motion.header
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-between pb-4 border-b border-white/[0.06]"
          >
            <div className="flex items-center gap-2.5">
              <motion.img src="/icon.png" alt="icon" className="h-10 w-10 object-contain"
                animate={{ rotate: [0, -8, 8, -5, 5, 0] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
                style={{ filter: 'drop-shadow(0 0 8px rgba(129,140,248,0.5))' }}
              />
              <h1 className="text-base font-bold text-slate-100">🚢Tàu Titanic『镇海潮生』</h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Thành viên — tất cả đều thấy */}
              <motion.button
                whileHover={{ scale: 1.03, backgroundColor: 'rgba(255,255,255,0.07)' }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
                type="button" onClick={() => navigate('/thanh-vien')}
                className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07] text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Users size={13} />
                <span className="hidden sm:inline">Thành viên</span>
                {isAdmin && pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03, backgroundColor: 'rgba(245,158,11,0.08)' }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
                type="button" onClick={() => navigate('/bao-ban')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/8 border border-amber-500/15 text-xs text-amber-400 hover:border-amber-500/30 transition-colors"
              >
                <Bell size={13} />
                <span className="hidden sm:inline">Báo bận</span>
              </motion.button>

              {/* User badge — ngoài cùng bên phải */}
              <div className="hidden sm:flex items-center gap-1 rounded-xl bg-white/[0.04] border border-white/[0.07] pl-1.5 pr-1.5 py-1">
                {/* Avatar + info — click mở profile */}
                <motion.button
                  type="button"
                  onClick={() => setShowProfile(true)}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1.5 rounded-lg px-1 py-0.5 transition-colors"
                >
                  <div className="h-6 w-6 rounded-md overflow-hidden shrink-0 border border-white/[0.1]">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-indigo-500/25 flex items-center justify-center">
                        <span className="text-[10px] font-black text-indigo-200">
                          {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-300 leading-none">{profile?.display_name}</span>
                  {isSuperAdmin ? (
                    <span className="text-[9px] font-bold text-yellow-300 bg-yellow-500/15 border border-yellow-500/25 rounded-md px-1.5 py-0.5 leading-none">
                      S.ADMIN
                    </span>
                  ) : isAdmin ? (
                    <span className="text-[9px] font-bold text-rose-300 bg-rose-500/15 border border-rose-500/25 rounded-md px-1.5 py-0.5 leading-none">
                      ADMIN
                    </span>
                  ) : null}
                </motion.button>

                {/* Divider */}
                <div className="w-px h-4 bg-white/[0.08]" />

                {/* Đăng xuất */}
                <motion.button
                  type="button"
                  onClick={signOut}
                  whileHover={{ backgroundColor: 'rgba(239,68,68,0.08)' }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="relative group h-6 w-6 rounded-md flex items-center justify-center text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <LogOut size={12} />
                  <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-200 bg-[#1a2030] border border-white/[0.08] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg z-50">
                    Đăng xuất
                  </span>
                </motion.button>
              </div>

            </div>
          </motion.header>
        )}

        {/* Banner */}
        <motion.section id="banner-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}>
          <BannerHeader settings={settings} onUpdateSettings={handleUpdateSettings} isScreenshotMode={isScreenshotMode} />
        </motion.section>

        {/* Raid navigation bar — ẩn khi chụp ảnh */}
        {!isScreenshotMode && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.12 }}>
            <RaidNavBar
              selectedRaid={selectedRaid}
              raids={raids}
              selectedIndex={selectedIndex}
              isAdmin={isAdmin}
              onPrev={goPrev}
              onNext={goNext}
              onOpenPicker={() => setShowRaidPicker(true)}
              onOpenCreate={() => setShowCreateModal(true)}
              onToggleCancel={handleToggleCancel}
              onScreenshot={() => setIsScreenshotMode(true)}
            />
          </motion.div>
        )}

        {/* Raid content */}
        <motion.section id="roster-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
          <AnimatePresence mode="wait">
            {selectedRaid ? (
              <motion.div key={selectedRaid.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <RaidView raid={selectedRaid} isScreenshotMode={isScreenshotMode} />
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center justify-center h-48 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                <p className="text-sm text-slate-600">Chưa có raid nào</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </div>

      {/* Footer */}
      {!isScreenshotMode && (
        <footer className="relative mt-6 w-full border-t border-white/[0.05]">
          <div className="flex flex-col items-center justify-center gap-1.5 py-4 px-6 text-center sm:flex-row sm:gap-3">
            <span className="text-xs text-slate-500">
              Vẽ ra ngàn thế giới, nhưng không vẽ nổi một người đã rời đi{' '}
              <motion.span className="inline-block" animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.3, repeat: Infinity }}>💔</motion.span>
            </span>
            <span className="hidden text-white/15 sm:inline">|</span>
            <span className="text-xs text-slate-600">Tạo bởi <motion.span className="font-semibold" style={{ color: '#818cf8' }} animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 3, repeat: Infinity }}>Mèo.Đi.Bụi</motion.span> © 2025</span>
          </div>
        </footer>
      )}

      {/* Admin panel */}
      <AnimatePresence>{showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}</AnimatePresence>

      {/* Raid picker modal */}
      <AnimatePresence>
        {showRaidPicker && (
          <RaidPickerModal
            raids={raids}
            selectedRaidId={selectedRaidId}
            isAdmin={isAdmin}
            onSelect={(id) => { setSelectedRaidId(id); setShowRaidPicker(false); }}
            onToggleStatus={async (raid) => {
              const next = raid.status === 'cancelled' ? 'open' : 'cancelled';
              await updateRaidStatus(raid.id, next);
            }}
            onDelete={async (raid) => { await deleteRaid(raid.id); }}
            onClose={() => setShowRaidPicker(false)}
          />
        )}
      </AnimatePresence>

      {/* Create raid modal */}
      <AnimatePresence>
        {showCreateModal && <CreateRaidModal onClose={() => setShowCreateModal(false)} />}
      </AnimatePresence>

      {/* Profile modal */}
      <AnimatePresence>
        {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      </AnimatePresence>
    </div>
  );
};

// ── Raid Nav Bar ──────────────────────────────────────────────────────────────

interface RaidNavBarProps {
  selectedRaid: Raid | null;
  raids: Raid[];
  selectedIndex: number;
  isAdmin: boolean;
  onPrev: () => void;
  onNext: () => void;
  onOpenPicker: () => void;
  onOpenCreate: () => void;
  onToggleCancel: () => void;
  onScreenshot: () => void;
}

const RaidNavBar: React.FC<RaidNavBarProps> = ({ selectedRaid, raids, selectedIndex, isAdmin, onPrev, onNext, onOpenPicker, onOpenCreate, onToggleCancel, onScreenshot }) => {
  const isCancelled = selectedRaid?.status === 'cancelled';

  const raidDateLabel = selectedRaid ? (() => {
    const [y, m, d] = selectedRaid.raid_date.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const dow = DOW_FULL[date.getUTCDay()];
    const dd = String(d).padStart(2, '0');
    const mo = String(m).padStart(2, '0');
    return `${dow}, ${dd}/${mo}`;
  })() : null;

  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/[0.03] border border-white/[0.07] px-3 py-2.5">
      {/* Prev */}
      <button type="button" onClick={onPrev} disabled={selectedIndex <= 0}
        className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all disabled:opacity-25 disabled:cursor-not-allowed">
        <ChevronLeft size={15} />
      </button>

      {/* Raid info — click để mở picker */}
      <button type="button" onClick={onOpenPicker}
        className="flex items-center gap-2.5 min-w-0 text-left group hover:opacity-80 transition-opacity">
        <CalendarDays size={14} className="text-slate-500 shrink-0" />
        {selectedRaid ? (
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-slate-200 truncate leading-tight">{selectedRaid.title} • {selectedRaid.raid_time}</p>
              {isCancelled
                ? <span className="text-[9px] font-bold text-rose-300 bg-rose-500/15 border border-rose-500/25 rounded-full px-1.5 py-0.5 shrink-0">NGHỈ</span>
                : <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-1.5 py-0.5 shrink-0">MỞ</span>
              }
              <ChevronDown size={12} className="text-slate-500 shrink-0 group-hover:text-slate-300 transition-colors" />
            </div>
            <p className="text-[10px] text-slate-400/80 leading-tight">{raidDateLabel} • {selectedRaid.raid_time} <span className="text-indigo-400/70">— bấm để xem lịch raid</span></p>
          </div>
        ) : (
          <span className="text-sm text-slate-500">Chưa có raid — chọn hoặc tạo mới</span>
        )}
      </button>

      {/* Next — ngay sau chữ */}
      <button type="button" onClick={onNext} disabled={selectedIndex >= raids.length - 1}
        className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all disabled:opacity-25 disabled:cursor-not-allowed">
        <ChevronRight size={15} />
      </button>

      {/* Spacer đẩy các nút admin ra xa */}
      <div className="flex-1" />

      {/* Chụp ảnh */}
      <button type="button" onClick={onScreenshot}
        className="shrink-0 flex items-center gap-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/25 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/25 transition-all">
        <Camera size={13} />
        <span className="hidden sm:inline">Chụp ảnh</span>
      </button>

      {/* Nghỉ raid / Mở lại — chỉ admin, chỉ khi có raid, disable nếu đã qua */}
      {isAdmin && selectedRaid && (() => {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        const raidIsPast = selectedRaid.raid_date < today || (
          selectedRaid.raid_date === today && (() => {
            const [h, m] = selectedRaid.raid_time.split(':').map(Number);
            const end = new Date(now); end.setHours(h + 2, m, 0, 0);
            return now > end;
          })()
        );
        return (
          <button type="button" onClick={onToggleCancel}
            disabled={raidIsPast}
            className={`shrink-0 flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
              isCancelled
                ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/25'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
            }`}
            title={raidIsPast ? 'Raid đã qua' : isCancelled ? 'Mở lại raid này' : 'Đánh dấu nghỉ raid'}
          >
            {isCancelled ? '↩ Mở lại' : '✕ Nghỉ raid'}
          </button>
        );
      })()}

      {/* Thêm lịch — chỉ admin */}
      {isAdmin && (
        <button type="button" onClick={onOpenCreate}
          className="shrink-0 flex items-center gap-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/25 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/25 transition-all">
          <Plus size={13} />
          <span className="hidden sm:inline">Thêm lịch</span>
        </button>
      )}
    </div>
  );
};

// ── Helpers cho DateTimePicker ────────────────────────────────────────────────
function parseDisplayValue(display: string): { dateStr: string; timeStr: string } | null {
  const match = display.match(/^(\d{2}:\d{2}) - .+\((\d{2})\/(\d{2})\)$/);
  if (!match) return null;
  const timeStr = match[1];
  const dd = match[2]; const mm = match[3];
  const now = new Date();
  const monthNum = parseInt(mm); const dayNum = parseInt(dd);
  let y = now.getFullYear();
  if (monthNum < now.getMonth() + 1 || (monthNum === now.getMonth() + 1 && dayNum < now.getDate())) y++;
  return { dateStr: `${y}-${mm}-${dd}`, timeStr };
}

function buildDisplayValue(dateStr: string, timeStr: string): string {
  const DOW = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = DOW[date.getUTCDay()];
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${timeStr} - ${dow} (${dd}/${mm})`;
}

// ── Raid Picker Modal ─────────────────────────────────────────────────────────

interface RaidPickerModalProps {
  raids: Raid[];
  selectedRaidId: string | null;
  isAdmin: boolean;
  onSelect: (id: string) => void;
  onToggleStatus: (raid: Raid) => void;
  onDelete: (raid: Raid) => void;
  onClose: () => void;
}

const STATUS_STYLE: Record<Raid['status'], string> = {
  open:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  closed:    'text-slate-500 bg-white/[0.04] border-white/[0.08]',
  cancelled: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
};
const STATUS_LABEL: Record<Raid['status'], string> = { open: 'Mở', closed: 'Đã đóng', cancelled: 'Huỷ' };
const DOW_SHORT = ['CN','T2','T3','T4','T5','T6','T7'];

// ── Raid Picker Item ──────────────────────────────────────────────────────────

const RaidPickerItem: React.FC<{
  raid: Raid;
  isSelected: boolean;
  isAdmin: boolean;
  onSelect: (id: string) => void;
  onToggleStatus: (raid: Raid) => void;
  onDelete: (raid: Raid) => void;
  onEdit: (raid: Raid, title: string, date: string, time: string) => Promise<void>;
  dimmed?: boolean;
  index?: number;
}> = ({ raid, isSelected, isAdmin, onSelect, onToggleStatus, onDelete, onEdit, dimmed, index }) => {
  const isCancelled = raid.status === 'cancelled';
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [title, setTitle] = useState(raid.title);
  const [dateTimeDisplay, setDateTimeDisplay] = useState(buildDisplayValue(raid.raid_date, raid.raid_time));
  const [saving, setSaving] = useState(false);

  // Tính ngày tháng hiển thị
  const [y, mo, d] = raid.raid_date.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, mo - 1, d));
  const DOW = ['CN','T2','T3','T4','T5','T6','T7'];
  const dateLabel = `${DOW[dateObj.getUTCDay()]} ${String(d).padStart(2,'0')}/${String(mo).padStart(2,'0')}`;

  // Sync khi raid prop thay đổi (sau khi lưu)
  useEffect(() => {
    if (!editing) {
      setTitle(raid.title);
      setDateTimeDisplay(buildDisplayValue(raid.raid_date, raid.raid_time));
    }
  }, [raid.title, raid.raid_date, raid.raid_time, editing]);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!title.trim()) return;
    const parsed = parseDisplayValue(dateTimeDisplay);
    if (!parsed) return;
    setSaving(true);
    await onEdit(raid, title.trim(), parsed.dateStr, parsed.timeStr);
    setSaving(false);
    setEditing(false);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTitle(raid.title);
    setDateTimeDisplay(buildDisplayValue(raid.raid_date, raid.raid_time));
    setEditing(false);
  };

  return (
    <div className={`relative flex flex-col rounded-xl border transition-all ${dimmed ? 'opacity-40' : ''} ${
      isSelected
        ? 'bg-indigo-500/15 border-indigo-500/35'
        : isCancelled
          ? 'bg-rose-500/5 border-rose-500/15'
          : 'bg-white/[0.025] border-white/[0.06] hover:border-white/[0.1]'
    }`}>
      {editing ? (
        /* ── Inline edit form ── */
        <div className="flex flex-col gap-2 px-3 py-2.5" onClick={e => e.stopPropagation()}>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            className="w-full rounded-lg bg-white/[0.06] border border-white/[0.1] px-2.5 py-1.5 text-sm text-slate-100 outline-none focus:border-indigo-500/50 transition-all" />
          <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] px-2.5 py-1.5 text-sm [&_span]:text-sm [&_button_span]:text-sm">
            <DateTimePicker value={dateTimeDisplay} onChange={setDateTimeDisplay} />
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={handleCancelEdit}
              className="flex-1 rounded-lg py-1.5 text-xs font-semibold text-slate-500 bg-white/[0.03] border border-white/[0.07] hover:text-slate-300 transition-all">
              Huỷ
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex-1 rounded-lg py-1.5 text-xs font-bold text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/15 transition-all disabled:opacity-50"
              style={{ background: 'rgba(99,102,241,0.1)' }}>
              {saving ? '...' : 'Lưu'}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => onSelect(raid.id)}
          className="flex flex-col px-3 py-2.5 text-left w-full gap-0.5">
          <div className="flex items-start justify-between gap-1 overflow-hidden">
            <div className="overflow-hidden flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate leading-snug ${isCancelled ? 'text-slate-500 line-through' : 'text-slate-200'}`}
                title={raid.title}>
                {index !== undefined && <span className="text-slate-500 font-normal mr-1">{index + 1}.</span>}
                {raid.title}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-1">
              {isSelected && <span className="text-indigo-400 text-sm">✓</span>}
              {isAdmin && !dimmed && (
                <button type="button"
                  onClick={e => { e.stopPropagation(); setEditing(true); }}
                  className="h-5 w-5 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-300 hover:bg-white/[0.08] transition-all">
                  <Pencil size={11} />
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500">{raid.raid_time} · {dateLabel}</p>
        </button>
      )}

      {/* Admin bottom strip: 2 nút bằng nhau */}
      {isAdmin && !editing && (
        <div className="flex border-t border-white/[0.05] rounded-b-xl overflow-hidden">
          {/* Trái: Nghỉ / Mở lại */}
          <button
            type="button"
            disabled={dimmed}
            onClick={(e) => { e.stopPropagation(); onToggleStatus(raid); setConfirmDelete(false); }}
            className={`flex-1 py-1.5 text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed border-r border-white/[0.05] ${
              isCancelled
                ? 'text-emerald-300 hover:bg-emerald-500/10'
                : 'text-rose-400 hover:bg-rose-500/8'
            }`}
          >
            {isCancelled ? '↩ Mở lại' : '✕ Nghỉ raid'}
          </button>

          {/* Phải: Xóa (confirm 2 bước) */}
          {confirmDelete ? (
            <>
              <button type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(raid); }}
                className="flex-1 py-1.5 text-xs font-bold text-white bg-rose-500/30 hover:bg-rose-500/50 transition-all">
                ⚠ Xác nhận
              </button>
              <button type="button"
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-300 border-l border-white/[0.05] transition-all">
                ✕
              </button>
            </>
          ) : (
            <button type="button"
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
              className="flex-1 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/8 transition-all">
              🗑 Xóa
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const RaidPickerModal: React.FC<RaidPickerModalProps> = ({ raids, selectedRaidId, isAdmin, onSelect, onToggleStatus, onDelete, onClose }) => {
  const { updateRaid } = useRaids();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const [showPast, setShowPast] = useState(false);

  const isPast = (raid: Raid) => {
    if (raid.raid_date < today) return true;
    if (raid.raid_date === today) {
      const [h, m] = raid.raid_time.split(':').map(Number);
      const raidEnd = new Date(now);
      raidEnd.setHours(h + 2, m, 0, 0);
      return now > raidEnd;
    }
    return false;
  };

  const upcoming = raids.filter((r) => !isPast(r));
  const past = raids.filter((r) => isPast(r));

  return (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-10 w-full max-w-xl rounded-2xl bg-[#0d1117] border border-white/[0.08] overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-sm font-bold text-slate-100">Chọn lịch raid</h2>
        <button type="button" onClick={onClose}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all">
          <X size={15} />
        </button>
      </div>

      <div className="p-3 max-h-[70vh] overflow-y-auto flex flex-col gap-3">
        {raids.length === 0 && <p className="text-xs text-slate-600 text-center py-4">Chưa có raid nào.</p>}

        {/* Sắp tới — 2 cột */}
        {upcoming.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
              Sắp diễn ra · {upcoming.length}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {upcoming.map((raid, i) => (
                <RaidPickerItem key={raid.id} raid={raid} isSelected={raid.id === selectedRaidId}
                  isAdmin={isAdmin} index={i} onSelect={onSelect} onToggleStatus={onToggleStatus}
                  onDelete={onDelete}
                  onEdit={async (r, t, d, ti) => { await updateRaid(r.id, t, d, ti); }} />
              ))}
            </div>
          </div>
        )}

        {/* Đã qua — collapsible */}
        {past.length > 0 && (
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => setShowPast(v => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wider px-1 hover:text-slate-400 transition-colors">
              <ChevronDown size={11} className={`transition-transform ${showPast ? 'rotate-180' : ''}`} />
              Đã qua · {past.length}
            </button>
            <AnimatePresence>
              {showPast && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                  className="flex gap-2 overflow-hidden">
                  <div className="flex flex-col gap-2 flex-1">
                    {[...past].reverse().filter((_, i) => i % 2 === 0).map((raid, i) => (
                      <RaidPickerItem key={raid.id} raid={raid} isSelected={raid.id === selectedRaidId}
                        isAdmin={isAdmin} index={i * 2} onSelect={onSelect} onToggleStatus={onToggleStatus}
                        onDelete={onDelete}
                        onEdit={async (r, t, d, ti) => { await updateRaid(r.id, t, d, ti); }} dimmed />
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    {[...past].reverse().filter((_, i) => i % 2 === 1).map((raid, i) => (
                      <RaidPickerItem key={raid.id} raid={raid} isSelected={raid.id === selectedRaidId}
                        isAdmin={isAdmin} index={i * 2 + 1} onSelect={onSelect} onToggleStatus={onToggleStatus}
                        onDelete={onDelete}
                        onEdit={async (r, t, d, ti) => { await updateRaid(r.id, t, d, ti); }} dimmed />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  </div>
  );
};
