import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users, Shield, X } from 'lucide-react';
import { MemberManager } from './MemberManager';

interface AdminPanelProps {
  onClose: () => void;
}

type AdminTab = 'members';

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [tab, setTab] = useState<AdminTab>('members');

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-2xl rounded-2xl bg-[#0d1117] border border-white/[0.08] overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <Shield size={16} className="text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-100">Quản lý Admin</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all"
          >
            <X size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 pt-3 gap-2 border-b border-white/[0.06] pb-0">
          <button
            type="button"
            onClick={() => setTab('members')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
              tab === 'members'
                ? 'text-indigo-300 border-indigo-500'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            <Users size={13} />
            Thành viên
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'members' && <MemberManager />}
        </div>
      </motion.div>
    </div>
  );
};
