import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';
import { CLASS_OPTIONS, ClassOption } from '../data/classes';

interface ClassDropdownProps {
  value: string; // classId hoặc ''
  onChange: (classId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const sorted = [...CLASS_OPTIONS].sort((a, b) => a.name.localeCompare(b.name, 'vi'));

export const ClassDropdown: React.FC<ClassDropdownProps> = ({
  value, onChange, placeholder = '— Chưa chọn —', disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = CLASS_OPTIONS.find((c) => c.id === value) ?? null;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`w-full flex items-center gap-2.5 px-3 h-[46px] rounded-xl border transition-all duration-150 text-left ${
          disabled ? 'opacity-50 cursor-default' : 'cursor-pointer'
        }`}
        style={{
          borderColor: open
            ? `${selected?.hex ?? '#818cf8'}80`
            : selected
            ? `${selected.hex}40`
            : 'rgba(255,255,255,0.08)',
          borderStyle: selected || open ? 'solid' : 'dashed',
          backgroundColor: open || selected
            ? `${selected?.hex ?? '#818cf8'}15`
            : 'rgba(255,255,255,0.03)',
        }}
      >
        {selected ? (
          <>
            <img src={`/icon-phai/${selected.iconName}`} alt={selected.name}
              className="w-7 h-7 object-contain shrink-0" draggable={false} />
            <span className="flex-1 text-sm font-bold truncate" style={{ color: selected.hex }}>
              {selected.name}
            </span>
          </>
        ) : (
          <span className="flex-1 text-sm text-slate-600 text-center">{placeholder}</span>
        )}
        <ChevronDown
          size={13}
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          style={{ color: 'rgba(255,255,255,0.3)' }}
        />
      </button>

      {/* Dropdown list */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute top-full mt-1.5 left-0 right-0 z-[500] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden border border-white/[0.08]"
            style={{ backgroundColor: '#0d1117' }}
          >
            <div className="p-1.5 max-h-56 overflow-y-auto">
              {/* Slot trống */}
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-100 text-left"
                style={{
                  backgroundColor: value === '' ? 'rgba(255,255,255,0.06)' : 'transparent',
                  color: value === '' ? '#e2e8f0' : 'rgba(255,255,255,0.3)',
                }}
                onMouseEnter={(e) => { if (value !== '') (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = value === '' ? 'rgba(255,255,255,0.06)' : 'transparent'; }}
              >
                <span className="w-7 h-7 flex items-center justify-center text-lg font-bold shrink-0"
                  style={{ color: 'rgba(255,255,255,0.2)' }}>?</span>
                <span className="text-sm font-medium">Chưa chọn</span>
                {value === '' && <Check size={13} strokeWidth={3} className="ml-auto shrink-0 text-slate-400" />}
              </button>

              {sorted.map((opt) => {
                const isActive = value === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => { onChange(opt.id); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-100 text-left"
                    style={{
                      backgroundColor: isActive ? `${opt.hex}18` : 'transparent',
                      color: isActive ? opt.hex : 'rgba(255,255,255,0.75)',
                    }}
                    onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = isActive ? `${opt.hex}18` : 'transparent'; }}
                  >
                    <img src={`/icon-phai/${opt.iconName}`} alt={opt.name}
                      className="w-7 h-7 object-contain shrink-0" draggable={false} />
                    <span className="text-sm font-bold flex-1 truncate">{opt.name}</span>
                    {isActive && <Check size={13} strokeWidth={3} className="ml-auto shrink-0" style={{ color: opt.hex }} />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
