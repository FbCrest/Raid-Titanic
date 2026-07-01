import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { CLASS_OPTIONS } from '../data/classes';
import { ClassIcon } from './ClassIcon';

interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectClass: (classId: string) => void;
  selectedClassId: string;
}

export const ClassModal: React.FC<ClassModalProps> = ({ isOpen, onClose, onSelectClass, selectedClassId }) => {
  useEffect(() => {
    if (!isOpen) return;
    // Tính scrollbar width để bù vào, tránh layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  const handleSelect = (classId: string) => {
    onSelectClass(classId);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="glass-backdrop absolute inset-0"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="glass-modal relative z-[201] w-full max-w-lg rounded-2xl p-5"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-100">Chọn phái</h2>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.2 }}
                type="button"
                onClick={onClose}
                className="glass rounded-xl p-1.5 text-slate-500 hover:text-slate-200 transition-colors"
              >
                <X size={15} />
              </motion.button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-4 gap-3">
              {[...CLASS_OPTIONS].sort((a, b) => a.name.localeCompare(b.name, 'vi')).map((opt) => {
                const isSelected = opt.id === selectedClassId;
                return (
                  <motion.button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelect(opt.id)}
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.94 }}
                    className="relative flex flex-col items-center gap-2 rounded-xl py-3 px-1 transition-all duration-200"
                    style={isSelected ? {
                      backgroundColor: `${opt.hex}22`,
                      border: `1px solid ${opt.hex}60`,
                      boxShadow: `0 0 20px ${opt.hex}30, inset 0 0 12px ${opt.hex}10`,
                    } : {
                      backgroundColor: 'rgb(255 255 255 / 0.03)',
                      border: '1px solid rgb(255 255 255 / 0.07)',
                    }}
                  >
                    {/* Selected dot */}
                    {isSelected && (
                      <motion.div
                        layoutId="selected-dot"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: opt.hex, boxShadow: `0 0 6px ${opt.hex}` }}
                      />
                    )}

                    {/* Icon — no background */}
                    <ClassIcon name={opt.iconName} size={38} />

                    {/* Name */}
                    <span
                      className="text-center text-[11px] font-semibold leading-tight"
                      style={{ color: isSelected ? opt.hex : '#94a3b8' }}
                    >
                      {opt.name}
                    </span>
                  </motion.button>
                );
              })}

              {/* Empty slot — bottom right */}
              {(() => {
                const isSelected = selectedClassId === '';
                return (
                  <motion.button
                    key="empty"
                    type="button"
                    onClick={() => handleSelect('')}
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.94 }}
                    className="relative flex flex-col items-center gap-2 rounded-xl py-3 px-1 transition-all duration-200"
                    style={isSelected ? {
                      backgroundColor: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.25)',
                      boxShadow: '0 0 16px rgba(255,255,255,0.08)',
                    } : {
                      backgroundColor: 'rgb(255 255 255 / 0.03)',
                      border: '1px dashed rgb(255 255 255 / 0.12)',
                    }}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="selected-dot"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-slate-400"
                        style={{ boxShadow: '0 0 6px rgba(148,163,184,0.8)' }}
                      />
                    )}
                    <span
                      className="flex items-center justify-center"
                      style={{ width: 38, height: 38, color: isSelected ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', fontSize: 28, fontWeight: 800, lineHeight: 1, fontFamily: 'sans-serif' }}
                    >?</span>
                    <span
                      className="text-center text-[11px] font-semibold leading-tight"
                      style={{ color: isSelected ? '#94a3b8' : '#475569' }}
                    >
                      Slot trống
                    </span>
                  </motion.button>
                );
              })()}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
