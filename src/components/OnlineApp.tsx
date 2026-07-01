import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, LogOut, Camera, X, Plus, ChevronLeft, ChevronRight, ChevronDown, CalendarDays, Bell, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRaids } from '../hooks/useRaids';
import { RaidView } from './raid/RaidView';
import { AdminPanel } from './admin/AdminPanel';
import { BannerHeader } from './BannerHeader';
import { RaidList } from './raid/RaidList';
import { CreateRaidModal } from './raid/CreateRaidModal';
import { ProfileModal } from './ProfileModal';
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
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { raids, ensureRecurringRaids, updateRaidStatus } = useRaids();
  const [selectedRaidId, setSelectedRaidId] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showRaidPicker, setShowRaidPicker] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [settings, setSettings] = useState<RaidSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (isAdmin) ensureRecurringRaids();
  }, [isAdmin]);

  useEffect(() => {
    if (raids.length > 0 && !selectedRaidId) {
      const today = new Date().toISOString().split('T')[0];
      // Ưu tiên: hôm nay → sắp tới → raid mới nhất
      const todayRaid = raids.find((r) => r.raid_date === today && r.status !== 'cancelled');
      const upcoming = raids.find((r) => r.raid_date > today && r.status !== 'cancelled');
      // Nếu không có gì sắp tới, lấy raid gần nhất (có thể đã qua)
      const fallback = [...raids].reverse().find((r) => r.status !== 'cancelled') ?? raids[0];
      setSelectedRaidId(todayRaid?.id ?? upcoming?.id ?? fallback.id);
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
              <h1 className="text-base font-bold text-slate-100">🚢Tàu Titanic</h1>
            </div>
            <div className="flex items-center gap-2">
              {/* User badge — avatar vuông, click mở profile */}
              <motion.button
                type="button"
                onClick={() => setShowProfile(true)}
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.07)' }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="hidden sm:flex items-center gap-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] pl-1.5 pr-3 py-1.5"
              >
                <div className="h-7 w-7 rounded-lg overflow-hidden shrink-0 border border-white/[0.1]">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-indigo-500/25 flex items-center justify-center">
                      <span className="text-[11px] font-black text-indigo-200">
                        {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-300 leading-none">{profile?.display_name}</span>
                {isAdmin && (
                  <span className="text-[9px] font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 rounded-md px-1.5 py-0.5 leading-none">
                    ADMIN
                  </span>
                )}
              </motion.button>

              {/* Thành viên — tất cả đều thấy */}
              <motion.button
                whileHover={{ scale: 1.03, backgroundColor: 'rgba(255,255,255,0.07)' }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
                type="button" onClick={() => navigate('/thanh-vien')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07] text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Users size={13} /><span className="hidden sm:inline">Thành viên</span>
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

              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
                type="button" onClick={() => setIsScreenshotMode(true)}
                className="flex items-center gap-1.5 px-3 py-2 btn-primary text-xs"
              >
                <Camera size={13} /><span className="hidden sm:inline">Chụp ảnh</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
                type="button" onClick={signOut}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07] text-xs text-slate-500 hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/5 transition-all"
              >
                <LogOut size={13} /><span className="hidden sm:inline">Đăng xuất</span>
              </motion.button>
            </div>
          </motion.header>
        )}

        {/* Banner */}
        <motion.section id="banner-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}>
          <BannerHeader settings={settings} onUpdateSettings={() => {}} isScreenshotMode={isScreenshotMode} readOnly={true} />
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
}

const RaidNavBar: React.FC<RaidNavBarProps> = ({ selectedRaid, raids, selectedIndex, isAdmin, onPrev, onNext, onOpenPicker, onOpenCreate, onToggleCancel }) => {
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
        className="flex-1 flex items-center gap-2.5 min-w-0 text-left group hover:opacity-80 transition-opacity">
        <CalendarDays size={14} className="text-slate-500 shrink-0" />
        {selectedRaid ? (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-slate-200 truncate leading-tight">{selectedRaid.title}</p>
              {isCancelled && <span className="text-[9px] font-bold text-rose-300 bg-rose-500/15 border border-rose-500/25 rounded-full px-1.5 py-0.5 shrink-0">NGHỈ</span>}
              <ChevronDown size={12} className="text-slate-500 shrink-0 group-hover:text-slate-300 transition-colors" />
            </div>
            <p className="text-[10px] text-slate-500">{raidDateLabel} • {selectedRaid.raid_time}
              <span className="ml-2 text-indigo-400/70">· bấm để xem lịch raid</span>
            </p>
          </div>
        ) : (
          <span className="text-sm text-slate-500">Chưa có raid — chọn hoặc tạo mới</span>
        )}
      </button>

      {/* Next */}
      <button type="button" onClick={onNext} disabled={selectedIndex >= raids.length - 1}
        className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all disabled:opacity-25 disabled:cursor-not-allowed">
        <ChevronRight size={15} />
      </button>

      {/* Nghỉ raid / Mở lại — chỉ admin, chỉ khi có raid */}
      {isAdmin && selectedRaid && (
        <button type="button" onClick={onToggleCancel}
          className={`shrink-0 flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
            isCancelled
              ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/25'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
          }`}
          title={isCancelled ? 'Mở lại raid này' : 'Đánh dấu nghỉ raid'}
        >
          {isCancelled ? '↩ Mở lại' : '✕ Nghỉ raid'}
        </button>
      )}

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

// ── Raid Picker Modal ─────────────────────────────────────────────────────────

interface RaidPickerModalProps {
  raids: Raid[];
  selectedRaidId: string | null;
  isAdmin: boolean;
  onSelect: (id: string) => void;
  onToggleStatus: (raid: Raid) => void;
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
  dimmed?: boolean;
}> = ({ raid, isSelected, isAdmin, onSelect, onToggleStatus, dimmed }) => {
  const [y, mo, d] = raid.raid_date.split('-').map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d));
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = raid.raid_date === todayStr;
  const isCancelled = raid.status === 'cancelled';

  return (
    <div className={`flex items-center gap-2 rounded-xl border transition-all ${dimmed ? 'opacity-50' : ''} ${
      isSelected ? 'bg-indigo-500/15 border-indigo-500/30' : 'bg-white/[0.025] border-white/[0.05]'
    }`}>
      {/* Click vùng chính để chọn raid */}
      <button type="button" onClick={() => onSelect(raid.id)}
        className="flex items-center gap-3 flex-1 min-w-0 px-3 py-2.5 text-left hover:opacity-80 transition-opacity">
        <div className={`shrink-0 flex flex-col items-center justify-center w-9 h-9 rounded-lg ${isToday ? 'bg-indigo-500/20 border border-indigo-500/30' : 'bg-white/[0.04] border border-white/[0.07]'}`}>
          <span className={`text-[9px] font-bold ${isToday ? 'text-indigo-300' : 'text-slate-500'}`}>{DOW_SHORT[date.getUTCDay()]}</span>
          <span className={`text-sm font-black leading-none ${isToday ? 'text-indigo-200' : 'text-slate-300'}`}>{d}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold truncate ${isCancelled ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{raid.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-600">{raid.raid_time}</span>
            <span className={`text-[9px] font-semibold border rounded-full px-1.5 py-0.5 ${STATUS_STYLE[raid.status]}`}>{STATUS_LABEL[raid.status]}</span>
          </div>
        </div>
      </button>

      {/* Nút nghỉ/mở lại — chỉ admin */}
      {isAdmin && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleStatus(raid); }}
          className={`shrink-0 mr-2 rounded-lg px-2.5 py-1 text-[10px] font-semibold border transition-all ${
            isCancelled
              ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
              : 'text-rose-400 bg-rose-500/8 border-rose-500/15 hover:bg-rose-500/15'
          }`}
          title={isCancelled ? 'Mở lại raid' : 'Đánh dấu nghỉ raid'}
        >
          {isCancelled ? '↩ Mở lại' : '✕ Nghỉ'}
        </button>
      )}
    </div>
  );
};

const RaidPickerModal: React.FC<RaidPickerModalProps> = ({ raids, selectedRaidId, isAdmin, onSelect, onToggleStatus, onClose }) => {
  const today = new Date().toISOString().split('T')[0];
  const upcoming = raids.filter((r) => r.raid_date >= today);
  const past = raids.filter((r) => r.raid_date < today);

  return (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-10 w-full max-w-sm rounded-2xl bg-[#0d1117] border border-white/[0.08] overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-sm font-bold text-slate-100">Chọn lịch raid</h2>
        <button type="button" onClick={onClose}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all">
          <X size={15} />
        </button>
      </div>
      <div className="flex flex-col gap-1.5 p-3 max-h-[60vh] overflow-y-auto">
        {raids.length === 0 && <p className="text-xs text-slate-600 text-center py-4">Chưa có raid nào.</p>}

        {/* Sắp tới */}
        {upcoming.length > 0 && (
          <>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1 pt-1 pb-0.5">Sắp diễn ra</p>
            {upcoming.map((raid) => <RaidPickerItem key={raid.id} raid={raid} isSelected={raid.id === selectedRaidId} isAdmin={isAdmin} onSelect={onSelect} onToggleStatus={onToggleStatus} />)}
          </>
        )}

        {/* Đã qua */}
        {past.length > 0 && (
          <>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-1 pt-3 pb-0.5">Đã qua</p>
            {[...past].reverse().map((raid) => <RaidPickerItem key={raid.id} raid={raid} isSelected={raid.id === selectedRaidId} isAdmin={isAdmin} onSelect={onSelect} onToggleStatus={onToggleStatus} dimmed />)}
          </>
        )}
      </div>
    </motion.div>
  </div>
  );
};
