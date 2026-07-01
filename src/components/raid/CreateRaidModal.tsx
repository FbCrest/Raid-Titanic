import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Plus, Repeat, CalendarDays } from 'lucide-react';
import { useRaids } from '../../hooks/useRaids';
import { DateTimePicker } from '../DateTimePicker';

interface CreateRaidModalProps {
  onClose: () => void;
}

// Parse "21:00 - Thứ Tư (01/07)" → { dateStr: "2026-07-01", timeStr: "21:00" }
function parseDisplayValue(display: string): { dateStr: string; timeStr: string } | null {
  // Format: "HH:MM - DowName (DD/MM)"
  const match = display.match(/^(\d{2}:\d{2}) - .+\((\d{2})\/(\d{2})\)$/);
  if (!match) return null;
  const timeStr = match[1];
  const dd = match[2];
  const mm = match[3];
  const year = new Date().getFullYear();
  // Nếu tháng đã qua trong năm nay, dùng năm sau
  const now = new Date();
  const monthNum = parseInt(mm);
  const dayNum = parseInt(dd);
  let y = year;
  if (monthNum < now.getMonth() + 1 || (monthNum === now.getMonth() + 1 && dayNum < now.getDate())) {
    y = year + 1;
  }
  return { dateStr: `${y}-${mm}-${dd}`, timeStr };
}

const now = new Date();
const dow = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'][now.getDay()];
const dd = String(now.getDate()).padStart(2, '0');
const mm = String(now.getMonth() + 1).padStart(2, '0');
const DEFAULT_DISPLAY = `21:00 - ${dow} (${dd}/${mm})`;

export const CreateRaidModal: React.FC<CreateRaidModalProps> = ({ onClose }) => {
  const { createRaid, ensureRecurringRaids } = useRaids();
  const [title, setTitle] = useState('');
  const [dateTimeDisplay, setDateTimeDisplay] = useState(DEFAULT_DISPLAY);
  const [creating, setCreating] = useState(false);
  const [ensuring, setEnsuring] = useState(false);

  const parsed = parseDisplayValue(dateTimeDisplay);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !parsed) return;
    setCreating(true);
    await createRaid(title.trim(), parsed.dateStr, parsed.timeStr);
    setCreating(false);
    onClose();
  };

  const handleEnsure = async () => {
    setEnsuring(true);
    await ensureRecurringRaids();
    setEnsuring(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm rounded-2xl bg-[#0d1117] border border-white/[0.08] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-bold text-slate-100">Thêm lịch raid</h2>
          <button type="button" onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Lịch cố định */}
          <button type="button" onClick={handleEnsure} disabled={ensuring}
            className="flex items-center gap-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 px-4 py-3 text-left hover:bg-emerald-500/12 transition-all disabled:opacity-50">
            {ensuring
              ? <span className="h-5 w-5 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin shrink-0" />
              : <Repeat size={18} className="text-emerald-400 shrink-0" />
            }
            <div>
              <p className="text-sm font-semibold text-emerald-300">Tạo lịch cố định tuần này</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Tự động tạo Thứ 3, Thứ 4, Thứ 7 của tuần hiện tại</p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] text-slate-600">hoặc tạo thủ công</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Form */}
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            {/* Tên raid */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">Tên raid</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: 🚢 Raid đặc biệt..."
                required
                className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>

            {/* Ngày & giờ — dùng DateTimePicker sẵn có */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">Ngày & giờ</label>
              <div className="flex items-center gap-2 rounded-xl bg-white/[0.05] border border-white/[0.08] px-3.5 py-2.5">
                <CalendarDays size={14} className="text-slate-500 shrink-0" />
                <DateTimePicker value={dateTimeDisplay} onChange={setDateTimeDisplay} />
              </div>
            </div>

            <button type="submit" disabled={creating || !parsed}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 py-2.5 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/30 transition-all disabled:opacity-50">
              {creating
                ? <span className="h-4 w-4 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
                : <Plus size={15} />
              }
              {creating ? 'Đang tạo...' : 'Tạo raid'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
