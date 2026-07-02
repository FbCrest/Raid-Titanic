import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users } from 'lucide-react';
import { Raid, RaidSlot } from '../../lib/supabase';
import { useRaidSlots } from '../../hooks/useRaidSlots';
import { useAuth } from '../../context/AuthContext';
import { getClassById } from '../../data/classes';
import { ClassSelector } from '../ClassSelector';

interface RaidViewProps {
  raid: Raid;
  isScreenshotMode?: boolean;
}

const DOW_FULL = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

export const RaidView: React.FC<RaidViewProps> = ({ raid, isScreenshotMode = false }) => {
  const { slots, loading, registerSlot, unregisterSlot, adminUpdateSlot, adminClearSlot } = useRaidSlots(raid.id);
  const { profile, isAdmin } = useAuth();

  const team1 = slots.filter((s) => s.team_group === 1).sort((a, b) => a.slot_order - b.slot_order);
  const team2 = slots.filter((s) => s.team_group === 2).sort((a, b) => a.slot_order - b.slot_order);

  const raidDate = new Date(raid.raid_date + 'T00:00:00');
  const dateLabel = `${DOW_FULL[raidDate.getDay()]}, ${String(raidDate.getDate()).padStart(2, '0')}/${String(raidDate.getMonth() + 1).padStart(2, '0')}`;
  const filledCount = slots.filter((s) => s.member_name.trim()).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Raid header — ẩn luôn vì đã có nav bar ở trên */}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="h-6 w-6 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
        </div>
      ) : (
        <div className={`grid grid-cols-2 ${isScreenshotMode ? 'gap-1' : 'gap-3'}`}>
          <TeamPanel teamNumber={1} slots={team1} raid={raid} profile={profile} isAdmin={isAdmin} isScreenshotMode={isScreenshotMode}
            onRegister={registerSlot} onUnregister={unregisterSlot} onAdminUpdate={adminUpdateSlot} onAdminClear={adminClearSlot} />
          <TeamPanel teamNumber={2} slots={team2} raid={raid} profile={profile} isAdmin={isAdmin} isScreenshotMode={isScreenshotMode}
            onRegister={registerSlot} onUnregister={unregisterSlot} onAdminUpdate={adminUpdateSlot} onAdminClear={adminClearSlot} />
        </div>
      )}
    </div>
  );
};

// ── Team Panel ────────────────────────────────────────────────────────────────

interface TeamPanelProps {
  teamNumber: 1 | 2;
  slots: RaidSlot[];
  raid: Raid;
  profile: ReturnType<typeof useAuth>['profile'];
  isAdmin: boolean;
  isScreenshotMode?: boolean;
  onRegister: (slotId: string, name: string, classId: string, userId: string) => Promise<any>;
  onUnregister: (slotId: string, userId: string) => Promise<any>;
  onAdminUpdate: (slotId: string, updates: Partial<Pick<RaidSlot, 'member_name' | 'class_id' | 'registered_by'>>) => Promise<any>;
  onAdminClear: (slotId: string) => Promise<any>;
}

const TEAM_STYLES = {
  1: { dot: 'bg-rose-400', header: 'border-rose-500/15', accent: 'text-rose-300', badge: 'border-rose-500/25 text-rose-300',
       progressBg: 'bg-gradient-to-r from-rose-500 to-rose-400', cardClass: 'card-team-1' },
  2: { dot: 'bg-sky-400',  header: 'border-sky-500/15',  accent: 'text-sky-300',  badge: 'border-sky-500/25 text-sky-300',
       progressBg: 'bg-gradient-to-r from-sky-500 to-sky-400',   cardClass: 'card-team-2' },
} as const;

const TeamPanel: React.FC<TeamPanelProps> = ({
  teamNumber, slots, raid, profile, isAdmin, isScreenshotMode = false,
  onRegister, onUnregister, onAdminUpdate, onAdminClear,
}) => {
  const styles = TEAM_STYLES[teamNumber];
  const filled = slots.filter((s) => s.member_name.trim()).length;
  const fillPct = Math.round((filled / Math.max(slots.length, 1)) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: teamNumber * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className={`card-soft shimmer-card overflow-hidden rounded-2xl ${styles.cardClass}`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 md:px-5 md:py-3.5 bg-gradient-to-r from-transparent to-transparent border-b ${styles.header}`}>
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <div className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
            {filled === slots.length && slots.length > 0 && (
              <div className={`absolute h-2.5 w-2.5 rounded-full ${styles.dot} animate-ping-subtle opacity-60`} />
            )}
          </div>
          <span className={`text-sm font-bold tracking-wide ${styles.accent}`}>Đội {teamNumber}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2">
            <div className="progress-bar w-20">
              <div className={`progress-bar-fill ${styles.progressBg}`} style={{ width: `${fillPct}%` }} />
            </div>
          </div>
          <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold glass ${styles.badge}`}>
            <Users size={9} />
            <span>{filled}/{slots.length}</span>
          </div>
        </div>
      </div>

      {/* Slots */}
      <div className={`flex flex-col ${isScreenshotMode ? 'gap-1 p-2' : 'gap-2 p-3 md:p-4'}`}>
        {slots.map((slot, index) => (
          <SlotRow
            key={slot.id}
            slot={slot}
            index={index}
            raid={raid}
            profile={profile}
            isAdmin={isAdmin}
            isScreenshotMode={isScreenshotMode}
            onRegister={onRegister}
            onUnregister={onUnregister}
            onAdminUpdate={onAdminUpdate}
            onAdminClear={onAdminClear}
          />
        ))}
      </div>
    </motion.div>
  );
};

// ── Slot Row ──────────────────────────────────────────────────────────────────

interface SlotRowProps {
  slot: RaidSlot;
  index: number;
  raid: Raid;
  profile: ReturnType<typeof useAuth>['profile'];
  isAdmin: boolean;
  isScreenshotMode?: boolean;
  onRegister: (slotId: string, name: string, classId: string, userId: string) => Promise<any>;
  onUnregister: (slotId: string, userId: string) => Promise<any>;
  onAdminUpdate: (slotId: string, updates: Partial<Pick<RaidSlot, 'member_name' | 'class_id' | 'registered_by'>>) => Promise<any>;
  onAdminClear: (slotId: string) => Promise<any>;
}

const SlotRow: React.FC<SlotRowProps> = ({
  slot, index, raid, profile, isAdmin, isScreenshotMode = false,
  onRegister, onUnregister, onAdminUpdate, onAdminClear,
}) => {
  const classData = getClassById(slot.class_id);
  const hex = classData?.hex ?? '#818cf8';
  const isEmpty = !slot.class_id && !slot.member_name.trim();
  const isFilled = !!slot.member_name.trim();
  const isMySlot = profile && slot.registered_by === profile.id;
  const isOpen = raid.status === 'open';

  // Quyền thao tác
  const canEdit = isAdmin || (isOpen && isMySlot);
  const canRegister = isOpen && isEmpty && !!profile && !isAdmin;

  // Local state cho name đang nhập (chưa save)
  const [localName, setLocalName] = useState(slot.member_name);
  const [saving, setSaving] = useState(false);

  // Sync khi realtime cập nhật từ ngoài
  React.useEffect(() => {
    setLocalName(slot.member_name);
  }, [slot.member_name]);

  // Save name khi blur hoặc Enter
  const handleNameSave = async () => {
    if (localName === slot.member_name) return;
    setSaving(true);
    if (isAdmin) {
      await onAdminUpdate(slot.id, {
        member_name: localName,
        class_id: slot.class_id,
        registered_by: localName.trim() ? (slot.registered_by ?? null) : null,
      });
    } else if (isMySlot) {
      await onAdminUpdate(slot.id, { member_name: localName });
    }
    setSaving(false);
  };

  // Admin hoặc member tự đăng ký: chọn phái
  const handleClassChange = async (classId: string) => {
    setSaving(true);
    if (isAdmin) {
      await onAdminUpdate(slot.id, { class_id: classId });
    } else if (canRegister) {
      await onRegister(slot.id, profile!.display_name, classId, profile!.id);
      setLocalName(profile!.display_name);
    } else if (isMySlot) {
      await onAdminUpdate(slot.id, { class_id: classId });
    }
    setSaving(false);
  };

  // Quick fill: điền tên + phái cùng lúc
  const handleQuickFill = async (name: string, classId: string) => {
    setSaving(true);
    if (isAdmin) {
      await onAdminUpdate(slot.id, {
        member_name: name,
        class_id: classId,
        registered_by: slot.registered_by ?? null,
      });
      setLocalName(name);
    } else if (canRegister) {
      await onRegister(slot.id, name, classId, profile!.id);
      setLocalName(name);
    } else if (isMySlot) {
      await onAdminUpdate(slot.id, { member_name: name, class_id: classId });
      setLocalName(name);
    }
    setSaving(false);
  };

  // Xóa slot
  const handleClear = async () => {
    setSaving(true);
    setLocalName('');
    let result;
    if (isAdmin) {
      result = await onAdminClear(slot.id);
    } else if (isMySlot) {
      result = await onUnregister(slot.id, profile!.id);
    }
    if (result?.error) {
      console.error('Clear slot error:', result.error);
      setLocalName(slot.member_name); // rollback
    }
    setSaving(false);
  };

  // Khi focus vào input của slot trống → mở modal chọn phái trước
  const handleNameFocus = () => {
    if (isEmpty && (isAdmin || canRegister)) {
      document.getElementById(`online-slot-${slot.id}-trigger`)?.click();
    }
  };

  const slotStyle = isEmpty
    ? { backgroundColor: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.09)', borderStyle: 'dashed' as const, boxShadow: 'none' }
    : { backgroundColor: `${hex}40`, borderColor: `${hex}60`, boxShadow: `inset 0 0 24px ${hex}15, 0 0 0 1px ${hex}28` };

  // Có được phép tương tác với slot này không
  const interactive = !isScreenshotMode && (isAdmin || canRegister || isMySlot);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: 'easeOut' }}
      className={`group flex items-center gap-2.5 rounded-xl border transition-all duration-150 ${
        isScreenshotMode ? 'p-1.5' : 'p-2 md:p-2.5'
      }`}
      style={slotStyle}
    >
      {/* Class icon / selector */}
      <div className="w-12 md:w-14 shrink-0">
        <ClassSelector
          id={`online-slot-${slot.id}`}
          selectedClassId={slot.class_id}
          onSelectClass={handleClassChange}
          disabled={isScreenshotMode || (!isAdmin && !canRegister && !isMySlot)}
          empty={isEmpty}
          onQuickFill={interactive ? handleQuickFill : undefined}
        />
      </div>

      {/* Name input / display */}
      <div className="min-w-0 flex-1">
        {isScreenshotMode ? (
          <div
            className="select-none px-2 py-1 text-lg"
            style={{ color: isFilled ? `${hex}ee` : `${hex}55`, fontFamily: "'Nunito', sans-serif", fontWeight: 900 }}
          >
            {slot.member_name || '—'}
          </div>
        ) : (isAdmin || isMySlot) ? (
          <input
            type="text"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onFocus={handleNameFocus}
            onBlur={handleNameSave}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            placeholder="Tên người chơi..."
            className="slot-name-input w-full bg-transparent px-2.5 py-1.5 text-lg outline-none"
            style={{ color: localName ? `${hex}ee` : `rgba(255,255,255,0.25)`, caretColor: hex, fontFamily: "'Nunito', sans-serif", fontWeight: 900 }}
          />
        ) : (
          <div
            className="px-2.5 py-1.5 text-lg"
            style={isEmpty
              ? { color: 'rgba(255,255,255,0.2)', fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontStyle: 'italic' }
              : { color: `${hex}ee`, fontFamily: "'Nunito', sans-serif", fontWeight: 900 }
            }
          >
            {slot.member_name || (canRegister ? 'Chọn phái để đăng ký...' : 'Slot trống')}
          </div>
        )}
      </div>

      {/* Clear button */}
      <AnimatePresence>
        {!isScreenshotMode && (isFilled || !!slot.class_id) && (isAdmin || isMySlot) && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15 }}
            type="button"
            onClick={handleClear}
            disabled={saving}
            className="tooltip shrink-0 flex h-6 w-6 items-center justify-center rounded-lg text-slate-600 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500/15 hover:text-rose-400 disabled:opacity-30"
            data-tip="Xóa slot"
          >
            {saving ? <span className="h-3 w-3 rounded-full border border-indigo-400/30 border-t-indigo-400 animate-spin" /> : <X size={12} />}
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
