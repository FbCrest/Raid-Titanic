import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Calendar, Lock, Unlock, Trash2, ChevronRight, Repeat } from 'lucide-react';
import { Raid } from '../../lib/supabase';
import { useRaids } from '../../hooks/useRaids';
import { useAuth } from '../../context/AuthContext';

const DOW_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const DOW_FULL = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = DOW_FULL[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dow}, ${dd}/${mm}`;
}

function isToday(dateStr: string) {
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
}

const STATUS_STYLE: Record<Raid['status'], string> = {
  open: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  closed: 'text-slate-500 bg-white/[0.04] border-white/[0.08]',
  cancelled: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
};
const STATUS_LABEL: Record<Raid['status'], string> = {
  open: 'Mở',
  closed: 'Đã đóng',
  cancelled: 'Huỷ',
};

interface RaidListProps {
  selectedRaidId: string | null;
  onSelectRaid: (id: string) => void;
}

export const RaidList: React.FC<RaidListProps> = ({ selectedRaidId, onSelectRaid }) => {
  const { raids, loading, ensureRecurringRaids, createRaid, updateRaidStatus, deleteRaid } = useRaids();
  const { isAdmin } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('21:00');
  const [creating, setCreating] = useState(false);
  const [ensuring, setEnsuring] = useState(false);

  const handleEnsure = async () => {
    setEnsuring(true);
    await ensureRecurringRaids();
    setEnsuring(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;
    setCreating(true);
    await createRaid(newTitle.trim(), newDate, newTime);
    setNewTitle('');
    setNewDate('');
    setNewTime('21:00');
    setShowCreate(false);
    setCreating(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Xóa raid này?')) return;
    await deleteRaid(id);
    if (selectedRaidId === id) onSelectRaid('');
  };

  const handleToggleStatus = async (e: React.MouseEvent, raid: Raid) => {
    e.stopPropagation();
    const next = raid.status === 'open' ? 'closed' : 'open';
    await updateRaidStatus(raid.id, next);
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Danh sách Raid</h2>
        {isAdmin && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleEnsure}
              disabled={ensuring}
              title="Tạo raid cố định tuần này"
              className="flex items-center gap-1 rounded-lg bg-white/[0.04] border border-white/[0.08] px-2 py-1 text-[10px] text-slate-500 hover:text-emerald-300 hover:border-emerald-500/20 transition-all disabled:opacity-50"
            >
              {ensuring
                ? <span className="h-3 w-3 rounded-full border border-emerald-400/30 border-t-emerald-400 animate-spin" />
                : <Repeat size={11} />
              }
              Lịch cố định
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-1 rounded-lg bg-indigo-500/15 border border-indigo-500/25 px-2 py-1 text-[10px] text-indigo-300 hover:bg-indigo-500/25 transition-all"
            >
              <Plus size={11} />
              Thêm
            </button>
          </div>
        )}
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreate}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 rounded-xl bg-white/[0.03] border border-white/[0.08] p-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Tên raid..."
                required
                className="w-full rounded-lg bg-white/[0.05] border border-white/[0.07] px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500/40 transition-all"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                  className="flex-1 rounded-lg bg-white/[0.05] border border-white/[0.07] px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500/40 transition-all"
                />
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-24 rounded-lg bg-white/[0.05] border border-white/[0.07] px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500/40 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-indigo-500/20 border border-indigo-500/30 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/30 transition-all disabled:opacity-50"
              >
                {creating ? 'Đang tạo...' : 'Tạo raid'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <span className="h-5 w-5 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
        </div>
      ) : raids.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-xs text-slate-600">Chưa có raid nào.</p>
          {isAdmin && (
            <button type="button" onClick={handleEnsure} className="mt-2 text-xs text-indigo-400 hover:text-indigo-300">
              Tạo lịch cố định tuần này →
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 overflow-y-auto flex-1">
          {raids.map((raid) => {
            const isSelected = raid.id === selectedRaidId;
            const today = isToday(raid.raid_date);
            return (
              <motion.div
                key={raid.id}
                onClick={() => onSelectRaid(raid.id)}
                whileHover={{ x: 2 }}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-500/15 border border-indigo-500/30'
                    : 'bg-white/[0.025] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.09]'
                }`}
              >
                {/* Date badge */}
                <div className={`shrink-0 flex flex-col items-center justify-center w-9 h-9 rounded-lg text-center ${
                  today ? 'bg-indigo-500/20 border border-indigo-500/30' : 'bg-white/[0.04] border border-white/[0.07]'
                }`}>
                  <span className={`text-[9px] font-bold ${today ? 'text-indigo-300' : 'text-slate-500'}`}>
                    {DOW_SHORT[new Date(Date.UTC(...(raid.raid_date.split('-').map(Number) as [number,number,number]))).getUTCDay()]}
                  </span>
                  <span className={`text-sm font-black leading-none ${today ? 'text-indigo-200' : 'text-slate-300'}`}>
                    {parseInt(raid.raid_date.split('-')[2])}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate leading-tight">{raid.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-600">{raid.raid_time}</span>
                    <span className={`text-[9px] font-semibold border rounded-full px-1.5 py-0.5 ${STATUS_STYLE[raid.status]}`}>
                      {STATUS_LABEL[raid.status]}
                    </span>
                    {raid.is_recurring && <Repeat size={9} className="text-slate-600" />}
                  </div>
                </div>

                {isAdmin ? (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleToggleStatus(e, raid)}
                      className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-600 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                      title={raid.status === 'open' ? 'Đóng raid' : 'Mở raid'}
                    >
                      {raid.status === 'open' ? <Lock size={11} /> : <Unlock size={11} />}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, raid.id)}
                      className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      title="Xóa raid"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ) : (
                  <ChevronRight size={13} className={`shrink-0 transition-colors ${isSelected ? 'text-indigo-400' : 'text-slate-700'}`} />
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
