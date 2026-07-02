import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Users } from 'lucide-react';
import { CLASS_OPTIONS } from '../data/classes';
import { ClassIcon } from './ClassIcon';
import { useAuth } from '../context/AuthContext';
import { supabase, Profile } from '../lib/supabase';

interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectClass: (classId: string) => void;
  selectedClassId: string;
  /** Nếu có, hiển thị section Điền nhanh và gọi callback với tên + phái */
  onQuickFill?: (name: string, classId: string) => void;
}

// ── MemberCard với sub-popup chọn phái ──────────────────────────────────────
interface ClassOption { id: string; name: string; iconName: string; hex: string; }

const MemberCard: React.FC<{
  m: Profile;
  mainCls?: ClassOption;
  subCls?: ClassOption;
  onFill: (name: string, classId: string) => void;
}> = ({ m, mainCls, subCls, onFill }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPopupStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        zIndex: 9999,
      });
    }
    setOpen(v => !v);
  };

  return (
    <div className="relative w-full">
      {/* Card compact */}
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className={`w-full flex items-center justify-between gap-1.5 rounded-xl border transition-all px-2.5 py-2 ${
          open ? 'bg-white/[0.07] border-white/[0.15]' : 'bg-white/[0.025] border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.04]'
        }`}
      >
        <p className="text-xs font-semibold text-slate-200 min-w-0 truncate">{m.display_name}</p>
        <div className="flex items-center gap-1 shrink-0">
          {mainCls && <img src={`/icon-phai/${mainCls.iconName}`} className="w-5 h-5 object-contain" alt={mainCls.name} title={mainCls.name} />}
          {subCls && <img src={`/icon-phai/${subCls.iconName}`} className="w-5 h-5 object-contain opacity-70" alt={subCls.name} title={subCls.name} />}
        </div>
      </button>

      {/* Sub-popup chọn phái — render qua portal để không bị overflow cắt */}
      {createPortal(
        <AnimatePresence>
          {open && (
            <>
              <motion.div className="fixed inset-0 z-[9998]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setOpen(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 6 }}
                transition={{ duration: 0.15 }}
                style={{ ...popupStyle, background: '#0f1520', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', minWidth: 160 }}
                onClick={e => e.stopPropagation()}
              >
                {mainCls && (
                  <button type="button"
                    onClick={() => { onFill(m.display_name, mainCls.id); setOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 hover:bg-white/[0.06] transition-all text-left">
                    <img src={`/icon-phai/${mainCls.iconName}`} className="w-6 h-6 object-contain shrink-0" alt="" />
                    <div>
                      <p className="text-sm font-bold" style={{ color: mainCls.hex }}>{mainCls.name}</p>
                      <p className="text-[10px] text-slate-500">Phái chính</p>
                    </div>
                  </button>
                )}
                {mainCls && subCls && <div className="h-px bg-white/[0.06]" />}
                {subCls && (
                  <button type="button"
                    onClick={() => { onFill(m.display_name, subCls.id); setOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 hover:bg-white/[0.06] transition-all text-left">
                    <img src={`/icon-phai/${subCls.iconName}`} className="w-6 h-6 object-contain shrink-0" alt="" />
                    <div>
                      <p className="text-sm font-bold" style={{ color: subCls.hex }}>{subCls.name}</p>
                      <p className="text-[10px] text-slate-500">Phái phụ</p>
                    </div>
                  </button>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export const ClassModal: React.FC<ClassModalProps> = ({
  isOpen, onClose, onSelectClass, selectedClassId, onQuickFill,
}) => {
  const { profile, isAdmin, isSuperAdmin } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'class' | 'quick'>('quick');

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  // Load members list for admin — fetch sớm, không đợi modal mở
  useEffect(() => {
    if (!onQuickFill || !(isAdmin || isSuperAdmin)) return;
    supabase.from('profiles')
      .select('*')
      .in('role', ['member', 'admin', 'superadmin'])
      .order('display_name')
      .then(({ data }) => setMembers(data ?? []));
  }, [isAdmin, isSuperAdmin, onQuickFill]);

  // Reset tab khi mở
  useEffect(() => {
    if (isOpen && onQuickFill) { setTab('quick'); setSearch(''); setTabChanged(false); }
    else if (isOpen) { setTab('class'); setTabChanged(false); }
  }, [isOpen, onQuickFill]);

  const handleSelect = (classId: string) => {
    onSelectClass(classId);
    onClose();
  };

  const [tabChanged, setTabChanged] = useState(false);

  const switchTab = (t: 'class' | 'quick') => {
    setTabChanged(true);
    setTab(t);
  };

  const handleQuickFill = (name: string, classId: string) => {
    if (onQuickFill) {
      onQuickFill(name, classId);
      onClose();
    }
  };

  const sortedClasses = [...CLASS_OPTIONS].sort((a, b) => a.name.localeCompare(b.name, 'vi'));

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="glass-backdrop absolute inset-0"
            onClick={onClose}
          />

          <motion.div
            role="dialog" aria-modal="true"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="glass-modal relative z-[201] w-full max-w-2xl rounded-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] border border-white/[0.07] p-1">
                {onQuickFill && (
                  <button
                    type="button"
                    onClick={() => switchTab('quick')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      tab === 'quick'
                        ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-500/30'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Zap size={11} /> Điền nhanh
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => switchTab('class')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    tab === 'class'
                      ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-500/30'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Điền thủ công
                </button>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.2 }}
                type="button" onClick={onClose}
                className="glass rounded-xl p-1.5 text-slate-500 hover:text-slate-200 transition-colors"
              >
                <X size={15} />
              </motion.button>
            </div>

            {/* ── Tab content with animation ── */}
            <AnimatePresence mode="wait">
              {tab === 'quick' && onQuickFill ? (
                <motion.div key="quick"
                  initial={tabChanged ? { opacity: 0, x: -16 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  exit={tabChanged ? { opacity: 0, x: -16 } : undefined}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="px-5 pb-5 flex flex-col gap-3 max-h-[60vh] overflow-y-auto"
                >
                  {/* Bản thân */}
                  {profile && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Zap size={9} /> Chọn phái của <span className="text-yellow-300 normal-case">{profile.display_name}</span> để điền nhanh
                      </p>
                      <div className="flex gap-2">
                        {(() => {
                          const cls = CLASS_OPTIONS.find(c => c.id === profile.main_class);
                          if (!cls) return null;
                          return (
                            <button type="button"
                              onClick={() => handleQuickFill(profile.display_name, cls.id)}
                              className="inline-flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-all hover:border-white/[0.15] hover:bg-white/[0.05]"
                              style={{ background: `${cls.hex}10`, borderColor: `${cls.hex}30` }}>
                              <img src={`/icon-phai/${cls.iconName}`} className="w-6 h-6 object-contain shrink-0" alt="" />
                              <p className="text-xs font-bold" style={{ color: cls.hex }}>{cls.name}</p>
                            </button>
                          );
                        })()}
                        {(() => {
                          const cls = CLASS_OPTIONS.find(c => c.id === profile.sub_class);
                          if (!cls) return null;
                          return (
                            <button type="button"
                              onClick={() => handleQuickFill(profile.display_name, cls.id)}
                              className="inline-flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-all hover:border-white/[0.15] hover:bg-white/[0.05]"
                              style={{ background: `${cls.hex}10`, borderColor: `${cls.hex}30` }}>
                              <img src={`/icon-phai/${cls.iconName}`} className="w-6 h-6 object-contain shrink-0" alt="" />
                              <p className="text-xs font-bold" style={{ color: cls.hex }}>{cls.name}</p>
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Danh sách thành viên — chỉ admin */}
                  {(isAdmin || isSuperAdmin) && members.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Users size={9} /> Thành viên
                      </p>
                      <div className="relative mb-2">
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                          placeholder="Tìm thành viên..."
                          className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] pl-3 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500/40 transition-all" />
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[...members]
                          .sort((a, b) => a.display_name.localeCompare(b.display_name, 'vi'))
                          .filter(m => !search || m.display_name.toLowerCase().includes(search.toLowerCase()))
                          .map(m => {
                            const mainCls = CLASS_OPTIONS.find(c => c.id === m.main_class);
                            const subCls  = CLASS_OPTIONS.find(c => c.id === m.sub_class);
                            if (!mainCls && !subCls) return null;
                            return <MemberCard key={m.id} m={m} mainCls={mainCls} subCls={subCls} onFill={handleQuickFill} />;
                          })}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="class"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="px-5 pb-5"
                >
                  <div className="grid grid-cols-4 gap-3">
                    {sortedClasses.map((opt) => {
                      const isSelected = opt.id === selectedClassId;
                      return (
                        <motion.button key={opt.id} type="button"
                          onClick={() => handleSelect(opt.id)}
                          whileHover={{ scale: 1.08, y: -2 }} whileTap={{ scale: 0.94 }}
                          className="relative flex flex-col items-center gap-2 rounded-xl py-3 px-1 transition-all duration-200"
                          style={isSelected ? {
                            backgroundColor: `${opt.hex}22`, border: `1px solid ${opt.hex}60`,
                            boxShadow: `0 0 20px ${opt.hex}30, inset 0 0 12px ${opt.hex}10`,
                          } : { backgroundColor: 'rgb(255 255 255 / 0.03)', border: '1px solid rgb(255 255 255 / 0.07)' }}
                        >
                          {isSelected && (
                            <motion.div layoutId="selected-dot" initial={{ scale: 0 }} animate={{ scale: 1 }}
                              className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: opt.hex, boxShadow: `0 0 6px ${opt.hex}` }} />
                          )}
                          <ClassIcon name={opt.iconName} size={38} />
                          <span className="text-center text-[11px] font-semibold leading-tight"
                            style={{ color: isSelected ? opt.hex : '#94a3b8' }}>{opt.name}</span>
                        </motion.button>
                      );
                    })}

                    {/* Slot trống */}
                    {(() => {
                      const isSelected = selectedClassId === '';
                      return (
                        <motion.button key="empty" type="button"
                          onClick={() => handleSelect('')}
                          whileHover={{ scale: 1.08, y: -2 }} whileTap={{ scale: 0.94 }}
                          className="relative flex flex-col items-center gap-2 rounded-xl py-3 px-1 transition-all duration-200"
                          style={isSelected ? {
                            backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.25)',
                            boxShadow: '0 0 16px rgba(255,255,255,0.08)',
                          } : { backgroundColor: 'rgb(255 255 255 / 0.03)', border: '1px dashed rgb(255 255 255 / 0.12)' }}
                        >
                          {isSelected && (
                            <motion.div layoutId="selected-dot" initial={{ scale: 0 }} animate={{ scale: 1 }}
                              className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-slate-400"
                              style={{ boxShadow: '0 0 6px rgba(148,163,184,0.8)' }} />
                          )}
                          <span className="flex items-center justify-center"
                            style={{ width: 38, height: 38, color: isSelected ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', fontSize: 28, fontWeight: 800, lineHeight: 1 }}>?</span>
                          <span className="text-center text-[11px] font-semibold leading-tight"
                            style={{ color: isSelected ? '#94a3b8' : '#475569' }}>Slot trống</span>
                        </motion.button>
                      );
                    })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
