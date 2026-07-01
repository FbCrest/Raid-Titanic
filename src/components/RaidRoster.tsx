import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, X } from 'lucide-react';
import { Member, RaidSettings } from '../types';
import { ClassSelector } from './ClassSelector';
import { getClassById } from '../data/classes';

interface RaidRosterProps {
  members: Member[];
  onUpdateMembers: (members: Member[]) => void;
  settings: RaidSettings;
  onClearRoster: () => void;
  isScreenshotMode?: boolean;
}

interface TeamCardProps {
  teamNumber: 1 | 2;
  members: Member[];
  draggedMemberId: number | null;
  dragOverMemberId: number | null;
  isScreenshotMode: boolean;
  onDragStart: (e: React.DragEvent, id: number) => void;
  onDragOver: (e: React.DragEvent, id: number) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, targetId: number) => void;
  onTouchStart: (id: number) => void;
  onTouchEnd: () => void;
  onUpdateMember: (id: number, updates: Partial<Member>) => void;
  onClearMember: (id: number) => void;
}

const TEAM_STYLES = {
  1: {
    accent: 'text-rose-300',
    badge: 'glass text-rose-300 border-rose-500/25',
    header: 'bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border-b border-rose-500/12',
    dot: 'bg-rose-400',
    dotShadow: 'shadow-[0_0_10px_theme(colors.rose.400),0_0_22px_theme(colors.rose.400/50)]',
    progressBg: 'bg-gradient-to-r from-rose-500 to-rose-400',
    cardClass: 'card-team-1',
  },
  2: {
    accent: 'text-sky-300',
    badge: 'glass text-sky-300 border-sky-500/25',
    header: 'bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent border-b border-sky-500/12',
    dot: 'bg-sky-400',
    dotShadow: 'shadow-[0_0_10px_theme(colors.sky.400),0_0_22px_theme(colors.sky.400/50)]',
    progressBg: 'bg-gradient-to-r from-sky-500 to-sky-400',
    cardClass: 'card-team-2',
  },
} as const;

const TeamCard: React.FC<TeamCardProps> = ({
  teamNumber, members, draggedMemberId, dragOverMemberId, isScreenshotMode,
  onDragStart, onDragOver, onDragEnd, onDrop, onTouchStart, onTouchEnd,
  onUpdateMember, onClearMember,
}) => {
  const styles = TEAM_STYLES[teamNumber];
  const filledCount = members.filter((m) => m.name.trim()).length;
  const fillPct = Math.round((filledCount / members.length) * 100);

  return (
    <motion.div
      id={`team-card-${teamNumber}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: teamNumber * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className={`card-soft shimmer-card overflow-hidden rounded-2xl ${styles.cardClass}`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 md:px-5 md:py-3.5 ${styles.header}`}>
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <div className={`h-2.5 w-2.5 rounded-full ${styles.dot} ${styles.dotShadow}`} />
            {filledCount === members.length && (
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
          <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${styles.badge}`}>
            <Users size={9} />
            <span>{filledCount}/{members.length}</span>
          </div>
        </div>
      </div>

      {/* Member slots */}
      <div className={`flex flex-col ${isScreenshotMode ? 'gap-1 p-2' : 'gap-2 p-3 md:p-4'}`}>
        {members.map((member, index) => {
          const isBeingDragged = draggedMemberId === member.id;
          const isDragOver = dragOverMemberId === member.id && draggedMemberId !== member.id;
          const isFilled = member.name.trim().length > 0;
          const classData = getClassById(member.classId);
          const hex = classData?.hex ?? '#818cf8';
          const isEmpty = !member.classId;

          // Empty slot style
          const emptyStyle = {
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderColor: 'rgba(255,255,255,0.10)',
            borderStyle: 'dashed' as const,
            boxShadow: 'none',
          };

          // Filled slot style
          const filledStyle = isBeingDragged ? {
            borderStyle: 'dashed' as const,
            borderColor: `${hex}90`,
            backgroundColor: `${hex}20`,
          } : isDragOver ? {
            borderColor: '#818cf8',
            backgroundColor: 'rgb(99 102 241 / 0.22)',
            boxShadow: '0 0 0 2px rgb(129 140 248 / 0.5), 0 0 24px rgb(99 102 241 / 0.35)',
            transform: 'scale(1.02)',
          } : {
            backgroundColor: `${hex}40`,
            borderColor: `${hex}60`,
            boxShadow: `inset 0 0 24px ${hex}15, 0 0 0 1px ${hex}28`,
          };

          return (
            <motion.div
              id={`slot-${member.id}`}
              key={member.id}
              draggable={!isScreenshotMode}
              onDragStart={(e) => onDragStart(e, member.id)}
              onDragOver={(e) => onDragOver(e, member.id)}
              onDragEnd={onDragEnd}
              onDrop={(e) => onDrop(e, member.id)}
              onTouchStart={() => onTouchStart(member.id)}
              onTouchEnd={onTouchEnd}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04, ease: 'easeOut' }}
              className={`group flex items-center gap-2.5 rounded-xl border transition-all duration-150 ${
                isScreenshotMode ? 'p-1.5' : 'p-2 md:p-2.5'
              } ${!isScreenshotMode ? 'active:cursor-grabbing' : 'pointer-events-none'}`}
              style={isEmpty ? emptyStyle : filledStyle}
              title={isScreenshotMode ? undefined : 'Kéo thả để sắp xếp'}
            >
              <div className="w-12 md:w-14 shrink-0">
                <ClassSelector
                  id={`class-select-${member.id}`}
                  selectedClassId={member.classId}
                  onSelectClass={(classId) => onUpdateMember(member.id, { classId })}
                  disabled={isScreenshotMode}
                  empty={isEmpty}
                />
              </div>

              <div className="min-w-0 flex-1">
                {isScreenshotMode ? (
                  <div
                    className="select-none px-2 py-1 text-lg"
                    style={{ color: member.name ? `${hex}ee` : `${hex}55`, fontFamily: "'Nunito', sans-serif", fontWeight: 900 }}
                  >
                    {member.name || '—'}
                  </div>
                ) : (
                  <input
                    id={`name-input-${member.id}`}
                    type="text"
                    value={member.name}
                    onChange={(e) => onUpdateMember(member.id, { name: e.target.value })}
                    placeholder={isEmpty ? 'Chọn phái & nhập tên...' : 'Tên người chơi...'}
                    className="slot-name-input w-full bg-transparent px-2.5 py-1.5 text-lg outline-none"
                    style={isEmpty
                      ? { color: 'rgba(255,255,255,0.22)', caretColor: '#fff', fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontStyle: 'italic' }
                      : { color: `${hex}ee`, caretColor: hex, fontFamily: "'Nunito', sans-serif", fontWeight: 900 }
                    }
                    onFocus={() => { if (isEmpty) document.getElementById(`class-select-${member.id}-trigger`)?.click(); }}
                  />
                )}
              </div>

              <AnimatePresence>
                {!isScreenshotMode && !isEmpty && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => onClearMember(member.id)}
                    className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg text-slate-600 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500/15 hover:text-rose-400"
                    title="Xóa thành viên"
                  >
                    <X size={12} />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export const RaidRoster: React.FC<RaidRosterProps> = ({
  members, onUpdateMembers, onClearRoster, isScreenshotMode = false
}) => {
  const [draggedMemberId, setDraggedMemberId] = useState<number | null>(null);
  const [dragOverMemberId, setDragOverMemberId] = useState<number | null>(null);

  // Touch drag state
  const touchDragId = useRef<number | null>(null);
  const touchGhost = useRef<HTMLElement | null>(null);
  const touchScrollBlocked = useRef(false);

  const handleUpdateMember = (id: number, updates: Partial<Member>) => {
    onUpdateMembers(members.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const handleClearMember = (id: number) => {
    onUpdateMembers(members.map((m) => (m.id === id ? { ...m, name: '', classId: '' } : m)));
  };

  const swapMembers = useCallback((sourceId: number, targetId: number) => {
    if (sourceId === targetId) return;
    const a = members.find((m) => m.id === sourceId);
    const b = members.find((m) => m.id === targetId);
    if (a && b) {
      onUpdateMembers(members.map((m) => {
        if (m.id === sourceId) return { ...m, name: b.name, classId: b.classId };
        if (m.id === targetId) return { ...m, name: a.name, classId: a.classId };
        return m;
      }));
    }
  }, [members, onUpdateMembers]);

  // ── Mouse drag handlers ──
  const handleDragStart = (e: React.DragEvent, id: number) => {
    if (isScreenshotMode) return;
    setDraggedMemberId(id);
    e.dataTransfer.setData('text/plain', id.toString());
    e.dataTransfer.effectAllowed = 'move';
    const target = e.currentTarget as HTMLElement;
    setTimeout(() => { target.style.opacity = '1'; }, 0);
  };

  const handleDragOver = (e: React.DragEvent, id: number) => {
    if (isScreenshotMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverMemberId(id);
  };

  const handleDragEnd = () => {
    setDraggedMemberId(null);
    setDragOverMemberId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    if (isScreenshotMode) return;
    e.preventDefault();
    const sourceId = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(sourceId)) swapMembers(sourceId, targetId);
    setDraggedMemberId(null);
    setDragOverMemberId(null);
  };

  // ── Touch drag handlers ──
  const handleTouchStart = (id: number) => {
    if (isScreenshotMode) return;
    touchDragId.current = id;
    setDraggedMemberId(id);
    touchScrollBlocked.current = false;
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (touchDragId.current === null) return;
    // Block scroll while dragging
    if (!touchScrollBlocked.current) {
      touchScrollBlocked.current = true;
    }
    e.preventDefault();

    const touch = e.touches[0];

    // Move ghost if exists
    if (touchGhost.current) {
      touchGhost.current.style.left = `${touch.clientX - 60}px`;
      touchGhost.current.style.top = `${touch.clientY - 20}px`;
    }

    // Find element under finger
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const slotEl = el?.closest('[id^="slot-"]');
    if (slotEl) {
      const targetId = parseInt(slotEl.id.replace('slot-', ''), 10);
      if (!isNaN(targetId) && targetId !== touchDragId.current) {
        setDragOverMemberId(targetId);
      }
    } else {
      setDragOverMemberId(null);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchDragId.current === null) return;

    // Swap if there's a valid target
    if (dragOverMemberId !== null && dragOverMemberId !== touchDragId.current) {
      swapMembers(touchDragId.current, dragOverMemberId);
    }

    // Cleanup
    touchDragId.current = null;
    touchScrollBlocked.current = false;
    if (touchGhost.current) {
      touchGhost.current.remove();
      touchGhost.current = null;
    }
    setDraggedMemberId(null);
    setDragOverMemberId(null);
  }, [dragOverMemberId, swapMembers]);

  // Attach touch events at document level to track movement outside slots
  const rosterRef = useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = rosterRef.current;
    if (!el) return;
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    return () => {
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchMove, handleTouchEnd]);

  const team1 = members.filter((m) => m.group === 1).sort((a, b) => a.id - b.id);
  const team2 = members.filter((m) => m.group === 2).sort((a, b) => a.id - b.id);

  const sharedProps = {
    draggedMemberId,
    dragOverMemberId,
    isScreenshotMode,
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragEnd: handleDragEnd,
    onDrop: handleDrop,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onUpdateMember: handleUpdateMember,
    onClearMember: handleClearMember,
  };

  return (
    <div ref={rosterRef} className="flex w-full flex-col gap-4" id="raid-roster-dashboard">
      <div className="grid grid-cols-2 gap-3">
        <TeamCard teamNumber={1} members={team1} {...sharedProps} />
        <TeamCard teamNumber={2} members={team2} {...sharedProps} />
      </div>
    </div>
  );
};
