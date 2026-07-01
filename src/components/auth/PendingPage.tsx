import React from 'react';
import { motion } from 'motion/react';
import { Clock, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const PendingPage: React.FC = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[#080a10] flex items-center justify-center p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-amber-600/8" style={{ filter: 'blur(80px)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex flex-col items-center gap-5 text-center max-w-sm"
      >
        <motion.div
          animate={{ rotate: [0, -5, 5, -3, 3, 0] }}
          transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }}
          className="h-16 w-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center"
        >
          <Clock size={30} className="text-amber-400" />
        </motion.div>

        <div>
          <p className="text-base font-bold text-slate-200 mb-2">Chờ duyệt tài khoản</p>
          <p className="text-sm text-slate-500 leading-relaxed">
            Xin chào <span className="text-amber-300 font-semibold">{profile?.display_name}</span>!<br />
            Tài khoản của bạn đang chờ Admin duyệt.<br />
            Vui lòng liên hệ Admin để được cấp quyền truy cập.
          </p>
        </div>

        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2 text-xs text-slate-500 hover:text-slate-300 hover:bg-white/[0.07] transition-all"
        >
          <LogOut size={13} />
          Đăng xuất
        </button>
      </motion.div>
    </div>
  );
};
