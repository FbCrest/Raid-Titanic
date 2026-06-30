import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarDays, Clock, ChevronLeft, ChevronRight, Check } from 'lucide-react';
interface DateTimePickerProps {
  value: string; // display string stored in settings
  onChange: (display: string) => void;
  isScreenshotMode?: boolean;
}

const DAYS_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const DAYS_FULL_VI = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const MONTHS_VI = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

function formatDisplay(date: Date, hour: number, minute: number): string {
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  const dow = DAYS_FULL_VI[date.getDay()];
  const d = String(date.getDate()).padStart(2, '0');
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  return `${hh}:${mm} - ${dow} (${d}/${mo})`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange, isScreenshotMode }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(now);
  const [hour, setHour] = useState(21);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Reset to today when opening
  const handleOpen = () => {
    if (isScreenshotMode) return;
    const now = new Date();
    setSelectedDate(now);
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setOpen(true);
  };

  const handleConfirm = () => {
    onChange(formatDisplay(selectedDate, hour, minute));
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);

  const isToday = (d: number) => {
    const t = new Date();
    return d === t.getDate() && viewMonth === t.getMonth() && viewYear === t.getFullYear();
  };
  const isSelected = (d: number) =>
    d === selectedDate.getDate() && viewMonth === selectedDate.getMonth() && viewYear === selectedDate.getFullYear();

  const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => handleOpen()}
        className={`group flex items-center gap-2 transition select-none ${
          isScreenshotMode ? 'pointer-events-none cursor-default' : 'cursor-pointer hover:text-indigo-100'
        }`}
        title={isScreenshotMode ? undefined : 'Chọn ngày giờ'}
      >
        <CalendarDays size={14} className="shrink-0 text-indigo-200" />
        <span>{value}</span>
        {!isScreenshotMode && (
          <CalendarDays size={10} className="shrink-0 opacity-0 transition group-hover:opacity-60" />
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-backdrop absolute inset-0"
                onClick={() => setOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 14 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="glass-modal relative z-[301] w-full max-w-sm rounded-2xl p-4"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-100">Chọn ngày & giờ</h3>
                  <button onClick={() => setOpen(false)} className="glass rounded-lg p-1.5 text-slate-500 hover:text-slate-200 transition">
                    <Check size={14} />
                  </button>
                </div>

                {/* Calendar */}
                <div className="mb-4">
                  {/* Month nav */}
                  <div className="mb-3 flex items-center justify-between">
                    <button onClick={prevMonth} className="glass rounded-lg p-1.5 text-slate-400 hover:text-slate-100 transition">
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-xs font-semibold text-slate-200">
                      {MONTHS_VI[viewMonth]} {viewYear}
                    </span>
                    <button onClick={nextMonth} className="glass rounded-lg p-1.5 text-slate-400 hover:text-slate-100 transition">
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  {/* Day headers */}
                  <div className="mb-1 grid grid-cols-7 gap-0.5">
                    {DAYS_VI.map(d => (
                      <div key={d} className="text-center text-[10px] font-semibold text-slate-600 py-1">{d}</div>
                    ))}
                  </div>

                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-0.5">
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`e${i}`} />)}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                      <button
                        key={d}
                        onClick={() => setSelectedDate(new Date(viewYear, viewMonth, d))}
                        className={`relative flex h-8 w-full items-center justify-center rounded-lg text-xs font-medium transition-all ${
                          isSelected(d)
                            ? 'bg-indigo-500 text-white shadow-[0_0_12px_rgb(99_102_241/0.5)]'
                            : isToday(d)
                            ? 'glass border border-indigo-400/40 text-indigo-300'
                            : 'text-slate-300 hover:bg-white/8'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="divider-glow mb-4" />

                {/* Time picker */}
                <div className="mb-4">
                  <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <Clock size={11} />
                    <span>Giờ raid</span>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    {/* Hour */}
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Giờ</span>
                      <input
                        type="number"
                        min={0} max={23}
                        value={String(hour).padStart(2, '0')}
                        onChange={e => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v)) setHour(Math.min(23, Math.max(0, v)));
                        }}
                        onFocus={e => e.target.select()}
                        className="glass h-14 w-20 rounded-xl text-center text-2xl font-bold text-slate-100 tabular-nums outline-none bg-transparent focus:border-indigo-400/70 focus:shadow-[0_0_14px_rgb(99_102_241/0.35)] transition-all"
                      />
                    </div>

                    <span className="text-3xl font-bold text-slate-500 mt-5">:</span>

                    {/* Minute */}
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Phút</span>
                      <input
                        type="number"
                        min={0} max={59}
                        value={String(minute).padStart(2, '0')}
                        onChange={e => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v)) setMinute(Math.min(59, Math.max(0, v)));
                        }}
                        onBlur={() => {
                          // snap to nearest 5 on blur
                          setMinute(Math.min(55, Math.round(minute / 5) * 5));
                        }}
                        onFocus={e => e.target.select()}
                        className="glass h-14 w-20 rounded-xl text-center text-2xl font-bold text-slate-100 tabular-nums outline-none bg-transparent focus:border-indigo-400/70 focus:shadow-[0_0_14px_rgb(99_102_241/0.35)] transition-all"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-center text-[10px] text-slate-600">Phút tự làm tròn đến bội số của 5</p>
                </div>

                {/* Preview + confirm */}
                <div className="flex items-center justify-between gap-3">
                  <div className="glass rounded-xl px-3 py-2 text-xs text-slate-300 flex-1 text-center">
                    {formatDisplay(selectedDate, hour, minute)}
                  </div>
                  <button
                    onClick={handleConfirm}
                    className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs"
                  >
                    <Check size={13} />
                    Xác nhận
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};
