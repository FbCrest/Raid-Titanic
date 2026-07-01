import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Edit2, KeyRound, Shield, Clock, Eye, EyeOff, Save, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { CLASS_OPTIONS } from '../data/classes';
import { ClassDropdown } from './ClassDropdown';

interface ProfileModalProps {
  onClose: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', member: 'Thành viên', pending: 'Chờ duyệt',
};
const ROLE_STYLE: Record<string, string> = {
  admin: 'text-indigo-300 bg-indigo-500/15 border-indigo-500/25',
  member: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  pending: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
};

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { profile, refreshProfile } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [editingInfo, setEditingInfo] = useState(false);
  const [form, setForm] = useState({
    display_name: profile?.display_name ?? '',
    main_class: profile?.main_class ?? '',
    sub_class: profile?.sub_class ?? '',
    discord: profile?.discord ?? '',
    facebook: profile?.facebook ?? '',
    zalo: profile?.zalo ?? '',
    avatar_url: profile?.avatar_url ?? '',
  });
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoError, setInfoError] = useState('');

  // Password
  const [showPwForm, setShowPwForm] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState('');

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Compress
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 200;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Crop center square
          const min = Math.min(img.width, img.height);
          const sx = (img.width - min) / 2;
          const sy = (img.height - min) / 2;
          ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
          setForm((prev) => ({ ...prev, avatar_url: canvas.toDataURL('image/jpeg', 0.8) }));
        }
      };
    };
    reader.readAsDataURL(file);
  };  const [pwSuccess, setPwSuccess] = useState(false);

  const handleSaveInfo = async () => {
    if (!form.display_name.trim()) { setInfoError('Tên hiển thị không được để trống.'); return; }
    setSavingInfo(true);
    setInfoError('');
    const { error } = await supabase.from('profiles').update({
      display_name: form.display_name.trim(),
      main_class: form.main_class,
      sub_class: form.sub_class,
      discord: form.discord.trim(),
      facebook: form.facebook.trim(),
      zalo: form.zalo.trim(),
      avatar_url: form.avatar_url,
    }).eq('id', profile!.id);
    if (error) {
      setInfoError('Lỗi khi lưu. Thử lại nhé.');
    } else {
      await refreshProfile();
      setEditingInfo(false);
    }
    setSavingInfo(false);
  };

  const handleChangePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (newPw.length < 6) { setPwError('Mật khẩu mới tối thiểu 6 ký tự.'); return; }
    if (newPw !== confirmPw) { setPwError('Mật khẩu xác nhận không khớp.'); return; }
    setSavingPw(true);
    const email = `${profile?.username}@gmail.com`;
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPw });
    if (signInError) { setPwError('Mật khẩu hiện tại không đúng.'); setSavingPw(false); return; }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) {
      setPwError('Đổi mật khẩu thất bại: ' + error.message);
    } else {
      setPwSuccess(true);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => { setPwSuccess(false); setShowPwForm(false); }, 2000);
    }
    setSavingPw(false);
  };

  const mainClassData = CLASS_OPTIONS.find((c) => c.id === (editingInfo ? form.main_class : profile?.main_class));
  const subClassData = CLASS_OPTIONS.find((c) => c.id === (editingInfo ? form.sub_class : profile?.sub_class));

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md rounded-2xl bg-[#0d1117] border border-white/[0.08] overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <User size={15} className="text-slate-400" />
            <h2 className="text-sm font-bold text-slate-100">Hồ sơ</h2>
          </div>
          <div className="flex items-center gap-2">
            {editingInfo && (
              <button type="button" onClick={handleSaveInfo} disabled={savingInfo}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/30 transition-all disabled:opacity-50">
                {savingInfo ? <span className="h-3 w-3 rounded-full border border-indigo-400/30 border-t-indigo-400 animate-spin" /> : <Save size={12} />}
                Lưu
              </button>
            )}
            {!editingInfo && (
              <button type="button" onClick={() => { setForm({ display_name: profile?.display_name ?? '', main_class: profile?.main_class ?? '', sub_class: profile?.sub_class ?? '', discord: profile?.discord ?? '', facebook: profile?.facebook ?? '', zalo: profile?.zalo ?? '' }); setEditingInfo(true); }}
                className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/[0.07] transition-all">
                <Edit2 size={12} /> Chỉnh sửa
              </button>
            )}
            <button type="button" onClick={onClose}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-4">
          {/* Avatar + basic */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="h-14 w-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 overflow-hidden flex items-center justify-center">
                {(editingInfo ? form.avatar_url : profile?.avatar_url) ? (
                  <img
                    src={editingInfo ? form.avatar_url : profile?.avatar_url}
                    alt="avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-black text-indigo-300">
                    {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
                  </span>
                )}
              </div>
              {editingInfo && (
                <>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-indigo-500 border-2 border-[#0d1117] flex items-center justify-center hover:bg-indigo-400 transition-colors"
                    title="Đổi ảnh đại diện"
                  >
                    <Camera size={11} className="text-white" />
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {editingInfo ? (
                <input type="text" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-sm font-bold text-slate-100 outline-none focus:border-indigo-500/50 transition-all mb-1" />
              ) : (
                <p className="text-base font-bold text-slate-100 truncate">{profile?.display_name}</p>
              )}
              <p className="text-xs text-slate-500">@{profile?.username}</p>
              <span className={`inline-flex mt-1 items-center gap-1 text-[10px] font-semibold border rounded-full px-2 py-0.5 ${ROLE_STYLE[profile?.role ?? 'member']}`}>
                {profile?.role === 'admin' ? <Shield size={10} /> : <Clock size={10} />}
                {ROLE_LABEL[profile?.role ?? 'member']}
              </span>
            </div>
          </div>

          {infoError && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{infoError}</p>}

          <div className="h-px bg-white/[0.06]" />

          {/* Phái chính & phụ */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">Phái chính</label>
              {editingInfo ? (
                <ClassDropdown value={form.main_class} onChange={(id) => setForm({ ...form, main_class: id })} placeholder="— Chưa chọn —" />
              ) : (
                <div className="flex items-center gap-2 px-1 py-1">
                  {form.main_class && CLASS_OPTIONS.find(c => c.id === (profile?.main_class ?? '')) ? (
                    (() => {
                      const cls = CLASS_OPTIONS.find(c => c.id === profile?.main_class);
                      return cls ? (
                        <div className="flex items-center gap-2">
                          <img src={`/icon-phai/${cls.iconName}`} alt={cls.name} className="w-5 h-5 object-contain" />
                          <span className="text-sm font-semibold" style={{ color: cls.hex }}>{cls.name}</span>
                        </div>
                      ) : null;
                    })()
                  ) : <span className="text-sm text-slate-600 italic">Chưa có</span>}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">Phái phụ</label>
              {editingInfo ? (
                <ClassDropdown value={form.sub_class} onChange={(id) => setForm({ ...form, sub_class: id })} placeholder="— Chưa chọn —" />
              ) : (
                <div className="flex items-center gap-2 px-1 py-1">
                  {profile?.sub_class ? (
                    (() => {
                      const cls = CLASS_OPTIONS.find(c => c.id === profile.sub_class);
                      return cls ? (
                        <div className="flex items-center gap-2">
                          <img src={`/icon-phai/${cls.iconName}`} alt={cls.name} className="w-5 h-5 object-contain" />
                          <span className="text-sm font-semibold" style={{ color: cls.hex }}>{cls.name}</span>
                        </div>
                      ) : null;
                    })()
                  ) : <span className="text-sm text-slate-600 italic">Chưa có</span>}
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* Liên hệ */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Liên hệ</p>

            {(['discord', 'facebook', 'zalo'] as const).map((field) => {
              const icons: Record<string, string> = { discord: '🎮', facebook: '📘', zalo: '💬' };
              const labels: Record<string, string> = { discord: 'Discord', facebook: 'Facebook', zalo: 'Zalo' };
              const val = editingInfo ? form[field] : (profile?.[field] ?? '');
              return (
                <div key={field} className="flex items-center gap-3">
                  <span className="text-base shrink-0">{icons[field]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-600 mb-0.5">{labels[field]}</p>
                    {editingInfo ? (
                      <input type="text" value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                        placeholder={`Nhập ${labels[field]}...`}
                        className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-3 py-1.5 text-sm text-slate-100 placeholder-slate-700 outline-none focus:border-indigo-500/50 transition-all" />
                    ) : (
                      <p className="text-sm text-slate-300 truncate">{val || <span className="text-slate-600 italic">Chưa có</span>}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* Đổi mật khẩu */}
          <div>
            <button type="button" onClick={() => { setShowPwForm(!showPwForm); setPwError(''); setPwSuccess(false); }}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors">
              <KeyRound size={13} />
              {showPwForm ? 'Ẩn đổi mật khẩu' : 'Đổi mật khẩu'}
            </button>

            <AnimatePresence>
              {showPwForm && (
                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleChangePw} className="overflow-hidden">
                  <div className="flex flex-col gap-3 pt-3">
                    {[
                      { label: 'Mật khẩu hiện tại', val: currentPw, set: setCurrentPw, show: showCurrent, toggle: () => setShowCurrent(!showCurrent) },
                      { label: 'Mật khẩu mới', val: newPw, set: setNewPw, show: showNew, toggle: () => setShowNew(!showNew), placeholder: 'Tối thiểu 6 ký tự' },
                    ].map(({ label, val, set, show, toggle, placeholder }) => (
                      <div key={label} className="flex flex-col gap-1.5">
                        <label className="text-xs text-slate-500">{label}</label>
                        <div className="relative">
                          <input type={show ? 'text' : 'password'} value={val} onChange={(e) => set(e.target.value)} required placeholder={placeholder}
                            className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-3 py-2 pr-9 text-sm text-slate-100 placeholder-slate-700 outline-none focus:border-indigo-500/50 transition-all" />
                          <button type="button" onClick={toggle} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                            {show ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-slate-500">Xác nhận mật khẩu mới</label>
                      <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required
                        className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500/50 transition-all" />
                    </div>
                    {pwError && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{pwError}</p>}
                    {pwSuccess && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">✓ Đổi mật khẩu thành công!</p>}
                    <button type="submit" disabled={savingPw}
                      className="flex items-center justify-center gap-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/30 transition-all disabled:opacity-50">
                      {savingPw ? <span className="h-3.5 w-3.5 rounded-full border border-indigo-400/30 border-t-indigo-400 animate-spin" /> : <KeyRound size={13} />}
                      {savingPw ? 'Đang đổi...' : 'Xác nhận đổi mật khẩu'}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
