import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Member, RaidSettings } from './types';
import { BannerHeader } from './components/BannerHeader';
import { RaidRoster } from './components/RaidRoster';
import { Camera, X, Cloud } from 'lucide-react';

const INITIAL_MEMBERS: Member[] = Array.from({ length: 12 }, (_, i) => {
  const id = i + 1;
  const group = id <= 6 ? 1 : 2;
  const defaultClasses = ['thiet-y', 'cuu-linh', 'to-van', 'toai-mong', 'huyet-ha', 'than-tuong'];
  const classId = defaultClasses[i % defaultClasses.length];
  return { id, name: '', classId, group };
});

const now = new Date();
const todayDow = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'][now.getDay()];
const todayD = String(now.getDate()).padStart(2, '0');
const todayMo = String(now.getMonth() + 1).padStart(2, '0');

const DEFAULT_SETTINGS: RaidSettings = {
  title: "🚢Tàu Titanic『镇海潮生』",
  dateTime: `21:00 - ${todayDow} (${todayD}/${todayMo})`,
  bannerUrl: null,
  description: "Yêu cầu đồng đội có mặt đúng giờ, vào Discord để hoạt động nhóm được tốt hơn!"
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] },
};

export default function App() {
  const [members, setMembers] = useState<Member[]>(() => {
    try {
      const saved = localStorage.getItem('raid_roster_members');
      return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
    } catch { return INITIAL_MEMBERS; }
  });

  const [settings, setSettings] = useState<RaidSettings>(() => {
    try {
      const saved = localStorage.getItem('raid_roster_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate old hardcoded title
        if (parsed.title === "⚔️ QUYẾT CHIẾN PHÓ BẢN: ĐẠI LÀN SÓNG HUYỀN THOẠI ⚔️") {
          parsed.title = DEFAULT_SETTINGS.title;
        }
        // Migrate old description
        const oldDescs = [
          "Yêu cầu đồng đội có mặt đúng giờ, đem đủ nhu yếu phẩm/dược phẩm kháng tính và bật Discord trực chiến!",
          "Yêu cầu đồng đội có mặt đúng giờ, đem đủ nhu yếu phẩm/dược phẩm kháng tính và bật Discord trực chiến"
        ];
        if (oldDescs.some(d => parsed.description?.includes('nhu yếu phẩm'))) {
          parsed.description = "Yêu cầu đồng đội có mặt đúng giờ, vào Discord để hoạt động nhóm được tốt hơn!";
        }
        const pickerFormat = /^\d{2}:\d{2} - .+ \(\d{2}\/\d{2}\)$/;
        if (!pickerFormat.test(parsed.dateTime ?? '')) {
          const now = new Date();
          const dow = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'][now.getDay()];
          const d = String(now.getDate()).padStart(2, '0');
          const mo = String(now.getMonth() + 1).padStart(2, '0');
          parsed.dateTime = `21:00 - ${dow} (${d}/${mo})`;
        }
        localStorage.setItem('raid_roster_settings', JSON.stringify(parsed));
        return parsed;
      }
    } catch { /* ignore */ }
    return DEFAULT_SETTINGS;
  });

  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced save indicator
  const triggerSave = () => {
    setIsSaving(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setIsSaving(false), 1200);
  };

  useEffect(() => {
    localStorage.setItem('raid_roster_members', JSON.stringify(members));
    triggerSave();
  }, [members]);

  useEffect(() => {
    localStorage.setItem('raid_roster_settings', JSON.stringify(settings));
    triggerSave();
  }, [settings]);

  const handleClearRoster = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ tên thành viên không?')) {
      setMembers((prev) => prev.map((m) => ({ ...m, name: '' })));
    }
  };

  return (
    <div className={`relative min-h-screen bg-[#080a10] text-slate-300 antialiased overflow-x-hidden transition-all duration-300 ${
      isScreenshotMode ? 'pb-2 pt-2' : 'pb-12 pt-5 md:pt-8 lg:pt-10'
    }`}>

      {/* ── Ambient background orbs ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/10 animate-soft-float animate-neon-pulse"
          style={{ filter: 'blur(80px)' }}
        />
        <div
          className="absolute top-1/3 -right-24 h-[400px] w-[400px] rounded-full bg-violet-600/8 animate-soft-float animate-neon-pulse"
          style={{ animationDelay: '2.5s', filter: 'blur(70px)' }}
        />
        <div
          className="absolute bottom-10 left-1/3 h-[350px] w-[350px] rounded-full bg-cyan-600/7 animate-soft-float"
          style={{ animationDelay: '5s', filter: 'blur(90px)' }}
        />
        <div
          className="absolute -bottom-20 right-1/4 h-[300px] w-[300px] rounded-full bg-rose-600/6 animate-soft-float"
          style={{ animationDelay: '3s', filter: 'blur(60px)' }}
        />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage: `linear-gradient(rgb(129 140 248) 1px, transparent 1px), linear-gradient(90deg, rgb(129 140 248) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── Screenshot exit button ── */}
      <AnimatePresence>
        {isScreenshotMode && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsScreenshotMode(false)}
            className="fixed top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 btn-secondary text-xs"
          >
            <X size={13} />
            <span>Thoát</span>
          </motion.button>
        )}
      </AnimatePresence>

      <div
        className={`relative z-10 mx-auto max-w-4xl px-4 sm:px-6 flex flex-col ${
          isScreenshotMode ? 'gap-2' : 'gap-3 md:gap-4'
        }`}
      >
        {/* ── Header ── */}
        {!isScreenshotMode && (
          <motion.header
            {...fadeUp}
            className="flex items-center justify-between pb-4 border-b border-white/[0.06]"
          >
            <div className="flex items-center gap-2.5">
              <motion.img
                src="/icon.png"
                alt="icon"
                className="h-10 w-10 object-contain"
                animate={{ rotate: [0, -8, 8, -5, 5, 0] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
                style={{ filter: 'drop-shadow(0 0 8px rgba(129,140,248,0.5))' }}
              />
              <h1 className="text-base font-bold text-slate-100">
                🚢Tàu Titanic『镇海潮生』
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isSaving ? 'saving' : 'saved'}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.2 }}
                  className="glass hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-medium text-slate-500"
                >
                  <div className={`h-1.5 w-1.5 rounded-full transition-colors ${isSaving ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  <Cloud size={11} className={isSaving ? 'text-amber-400' : 'text-emerald-400'} />
                  <span>{isSaving ? 'Đang lưu...' : 'Đã lưu'}</span>
                </motion.div>
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                id="btn-toggle-screenshot"
                type="button"
                onClick={() => setIsScreenshotMode(true)}
                className="flex items-center gap-2 px-4 py-2 btn-primary text-xs"
                title="Chụp ảnh đội hình"
              >
                <Camera size={14} />
                <span className="hidden sm:inline">Chụp ảnh</span>
              </motion.button>
            </div>
          </motion.header>
        )}

        {/* ── Banner ── */}
        <motion.section
          id="banner-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <BannerHeader
            settings={settings}
            onUpdateSettings={setSettings}
            isScreenshotMode={isScreenshotMode}
          />
        </motion.section>

        {/* ── Divider ── */}

        {/* ── Roster ── */}
        <motion.section
          id="roster-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <RaidRoster
            members={members}
            onUpdateMembers={setMembers}
            settings={settings}
            onClearRoster={handleClearRoster}
            isScreenshotMode={isScreenshotMode}
          />
        </motion.section>


      </div>
    </div>
  );
}
