import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Username → email format nội bộ (dùng gmail.com để pass Supabase validation)
    const email = `${username.toLowerCase().trim()}@gmail.com`;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('Tên tài khoản hoặc mật khẩu không đúng.');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-400">Tên tài khoản</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Nhập tên tài khoản..."
          required
          autoComplete="username"
          className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500/50 focus:bg-white/[0.07] transition-all"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-400">Mật khẩu</label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu..."
            required
            autoComplete="current-password"
            className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-3.5 py-2.5 pr-10 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500/50 focus:bg-white/[0.07] transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2"
        >
          {error}
        </motion.p>
      )}

      <motion.button
        type="submit"
        disabled={loading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center justify-center gap-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 py-2.5 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="h-4 w-4 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
        ) : (
          <LogIn size={15} />
        )}
        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </motion.button>

      <p className="text-center text-xs text-slate-600">
        Chưa có tài khoản?{' '}
        <button type="button" onClick={onSwitchToRegister} className="text-indigo-400 hover:text-indigo-300 transition-colors">
          Đăng ký ngay
        </button>
      </p>
    </form>
  );
};
