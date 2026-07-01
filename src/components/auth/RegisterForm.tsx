import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserPlus, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ClassDropdown } from '../ClassDropdown';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [mainClass, setMainClass] = useState('');
  const [subClass, setSubClass] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUsername = username.toLowerCase().trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmedUsername)) {
      setError('Tên tài khoản 3-20 ký tự, chỉ dùng a-z, 0-9, _');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu tối thiểu 6 ký tự.');
      return;
    }
    if (!displayName.trim()) {
      setError('Vui lòng nhập tên hiển thị.');
      return;
    }

    setLoading(true);

    const email = `${trimmedUsername}@gmail.com`;

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message.includes('already registered')
        ? 'Tên tài khoản đã tồn tại.'
        : signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        username: trimmedUsername,
        display_name: displayName.trim(),
        role: 'pending',
        main_class: mainClass,
        sub_class: subClass,
        discord: '',
        facebook: '',
        zalo: '',
      });

      if (profileError) {
        setError('Lỗi tạo hồ sơ. Tên tài khoản có thể đã tồn tại.');
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    setDone(true);
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 text-center py-6"
      >
        <div className="h-14 w-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
          <CheckCircle size={28} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-200 mb-1">Đăng ký thành công!</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Tài khoản của bạn đang chờ Admin duyệt.<br />
            Vui lòng đợi thông báo từ Admin.
          </p>
        </div>
        <button type="button" onClick={onSwitchToLogin}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Quay lại đăng nhập
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Tên tài khoản */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-400">Tên tài khoản</label>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
          placeholder="vd: nguyenvana" required title=""
          className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500/50 focus:bg-white/[0.07] transition-all" />
        <p className="text-[10px] text-slate-600">3-20 ký tự, chỉ dùng a-z, 0-9, dấu _</p>
      </div>

      {/* Tên hiển thị */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-400">Tên hiển thị</label>
        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
          placeholder="vd: Nguyễn Văn A" required title=""
          className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500/50 focus:bg-white/[0.07] transition-all" />
      </div>

      {/* Phái chính & phụ */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400">Phái chính</label>
          <ClassDropdown value={mainClass} onChange={setMainClass} placeholder="— Chọn —" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400">Phái phụ</label>
          <ClassDropdown value={subClass} onChange={setSubClass} placeholder="— Chọn —" />
        </div>
      </div>

      {/* Mật khẩu */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-400">Mật khẩu</label>
        <div className="relative">
          <input type={showPw ? 'text' : 'password'} value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tối thiểu 6 ký tự..." required title=""
            className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-3.5 py-2.5 pr-10 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500/50 focus:bg-white/[0.07] transition-all" />
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {error && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
          {error}
        </motion.p>
      )}

      <motion.button type="submit" disabled={loading}
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        className="flex items-center justify-center gap-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 py-2.5 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
        {loading
          ? <span className="h-4 w-4 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
          : <UserPlus size={15} />}
        {loading ? 'Đang đăng ký...' : 'Đăng ký'}
      </motion.button>
    </form>
  );
};
