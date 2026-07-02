import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Shield, KeyRound, Swords, Pencil, Eye, EyeOff, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { CLASS_OPTIONS } from '../data/classes';
import { ClassDropdown } from './ClassDropdown';

interface ProfileModalProps {
  onClose: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Super Admin', admin: 'Admin', member: 'Thành viên', pending: 'Chờ duyệt',
};
const ROLE_STYLE: Record<string, string> = {
  superadmin: 'text-yellow-300 bg-yellow-500/15 border-yellow-500/25',
  admin: 'text-rose-300 bg-rose-500/15 border-rose-500/25',
  member: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  pending: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
};
const ROLE_ACCENT: Record<string, string> = {
  superadmin: '#fde68a', admin: '#fca5a5', member: '#6ee7b7', pending: '#fcd34d',
};

const CONTACT_META = {
  discord:  { label: 'Discord',  color: '#5865F2' },
  facebook: { label: 'Facebook', color: '#1877F2' },
  zalo:     { label: 'Zalo',     color: '#0068FF' },
} as const;

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { profile, refreshProfile } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({
    display_name: profile?.display_name ?? '',
    main_class: profile?.main_class ?? '',
    sub_class: profile?.sub_class ?? '',
    discord: profile?.discord ?? '',
    facebook: profile?.facebook ?? '',
    zalo: profile?.zalo ?? '',
    avatar_url: profile?.avatar_url ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Password
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const accentColor = ROLE_ACCENT[profile?.role ?? 'member'] ?? '#818cf8';
  const mainClassData = CLASS_OPTIONS.find(c => c.id === (editing ? form.main_class : profile?.main_class));
  const subClassData  = CLASS_OPTIONS.find(c => c.id === (editing ? form.sub_class  : profile?.sub_class));

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 200;
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const min = Math.min(img.width, img.height);
          const sx = (img.width - min) / 2;
          const sy = (img.height - min) / 2;
          ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
          setForm(prev => ({ ...prev, avatar_url: canvas.toDataURL('image/jpeg', 0.8) }));
        }
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.display_name.trim()) { setError('Tên không được để trống.'); return; }
    setSaving(true); setError('');
    const { error: err } = await supabase.from('profiles').update({
      display_name: form.display_name.trim(),
      main_class: form.main_class,
      sub_class: form.sub_class,
      discord: form.discord.trim(),
      facebook: form.facebook.trim(),
      zalo: form.zalo.trim(),
      avatar_url: form.avatar_url,
    }).eq('id', profile!.id);
    if (err) { setError('Lỗi khi lưu.'); } else { await refreshProfile(); setEditing(false); }
    setSaving(false);
  };

  const cancelEdit = () => {
    setForm({
      display_name: profile?.display_name ?? '',
      main_class: profile?.main_class ?? '',
      sub_class: profile?.sub_class ?? '',
      discord: profile?.discord ?? '',
      facebook: profile?.facebook ?? '',
      zalo: profile?.zalo ?? '',
      avatar_url: profile?.avatar_url ?? '',
    });
    setError(''); setEditing(false);
  };

  const handleChangePw = async (e: React.FormEvent) => {
    e.preventDefault(); setPwError('');
    if (newPw.length < 6) { setPwError('Mật khẩu mới tối thiểu 6 ký tự.'); return; }
    if (newPw !== confirmPw) { setPwError('Mật khẩu xác nhận không khớp.'); return; }
    setSavingPw(true);
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: `${profile?.username}@gmail.com`, password: currentPw,
    });
    if (signInErr) { setPwError('Mật khẩu hiện tại không đúng.'); setSavingPw(false); return; }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) { setPwError('Đổi mật khẩu thất bại: ' + error.message); }
    else {
      setPwSuccess(true); setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => { setPwSuccess(false); setShowPw(false); }, 2000);
    }
    setSavingPw(false);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0f1520 0%, #0a0d14 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 32px 64px -12px rgba(0,0,0,0.8), 0 0 80px -20px ${accentColor}18`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Accent glow top */}
        <div className="absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${accentColor}50, transparent)` }} />

        {/* ── HERO ── */}
        <div className="relative px-5 pt-5 pb-4">
          <button type="button" onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/[0.07] transition-all">
            <X size={16} />
          </button>

          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="h-16 w-16 rounded-2xl overflow-hidden"
                style={{ border: `2px solid ${accentColor}30`, boxShadow: `0 0 20px ${accentColor}20` }}>
                {(editing ? form.avatar_url : profile?.avatar_url)
                  ? <img src={editing ? form.avatar_url : profile?.avatar_url} alt="" className="h-full w-full object-cover" />
                  : <div className="h-full w-full flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}08)` }}>
                      <span className="text-2xl font-black" style={{ color: accentColor }}>
                        {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
                      </span>
                    </div>
                }
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-[#0a0d14]"
                style={{ background: accentColor }} />
              {editing && (
                <>
                  <button type="button" onClick={() => avatarInputRef.current?.click()}
                    className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-indigo-500 border-2 border-[#0a0d14] flex items-center justify-center hover:bg-indigo-400 transition-colors">
                    <Camera size={11} className="text-white" />
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </>
              )}
            </div>

            {/* Name + username + role */}
            <div className="flex-1 min-w-0 pr-8">
              {editing ? (
                <input type="text" value={form.display_name}
                  onChange={e => setForm({ ...form, display_name: e.target.value })}
                  className="w-full rounded-xl bg-white/[0.06] border border-white/[0.1] px-3 py-2 text-base font-bold text-slate-100 outline-none focus:border-indigo-500/50 transition-all mb-1" />
              ) : (
                <p className="text-lg font-black text-slate-100 truncate leading-tight">{profile?.display_name}</p>
              )}
              <p className="text-xs text-slate-500 mt-0.5">@{profile?.username}</p>
              <span className={`inline-flex mt-2 items-center gap-1.5 text-xs font-bold border rounded-full px-2.5 py-1 ${ROLE_STYLE[profile?.role ?? 'member']}`}>
                {profile?.role === 'superadmin' && <img src="/Super Admin.gif" alt="" className="w-4 h-4 object-contain" />}
                {profile?.role === 'admin'      && <img src="/Admin.gif"       alt="" className="w-4 h-4 object-contain" />}
                {(profile?.role === 'member' || !profile?.role) && <img src="/Member.gif" alt="" className="w-4 h-4 object-contain" />}
                {ROLE_LABEL[profile?.role ?? 'member']}
              </span>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">{error}</p>}
        </div>

        {/* ── DIVIDER ── */}
        <div className="mx-5 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

        {/* ── PHÁI ── */}
        <div className="px-5 py-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Phái</p>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <p className="text-xs text-slate-500 mb-2">Chính</p>
              {editing ? (
                <ClassDropdown value={form.main_class} onChange={id => setForm({ ...form, main_class: id })} />
              ) : (
                <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 h-11"
                  style={{
                    background: mainClassData ? `${mainClassData.hex}10` : 'rgba(255,255,255,0.02)',
                    border: mainClassData ? `1px solid ${mainClassData.hex}25` : '1px solid rgba(255,255,255,0.05)',
                  }}>
                  {mainClassData
                    ? <><img src={`/icon-phai/${mainClassData.iconName}`} className="w-5 h-5 object-contain shrink-0" alt="" /><span className="text-sm font-bold truncate" style={{ color: mainClassData.hex }}>{mainClassData.name}</span></>
                    : <span className="text-sm text-slate-700 italic w-full text-center">Chưa có</span>}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-2">Phụ</p>
              {editing ? (
                <ClassDropdown value={form.sub_class} onChange={id => setForm({ ...form, sub_class: id })} />
              ) : (
                <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 h-11"
                  style={{
                    background: subClassData ? `${subClassData.hex}10` : 'rgba(255,255,255,0.02)',
                    border: subClassData ? `1px solid ${subClassData.hex}25` : '1px solid rgba(255,255,255,0.05)',
                  }}>
                  {subClassData
                    ? <><img src={`/icon-phai/${subClassData.iconName}`} className="w-5 h-5 object-contain shrink-0" alt="" /><span className="text-sm font-bold truncate" style={{ color: subClassData.hex }}>{subClassData.name}</span></>
                    : <span className="text-sm text-slate-700 italic w-full text-center">Chưa có</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── DIVIDER ── */}
        <div className="mx-5 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

        {/* ── LIÊN HỆ ── */}
        <div className="px-5 py-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Liên hệ</p>
          <div className="grid grid-cols-3 gap-2">
            {(['discord', 'facebook', 'zalo'] as const).map(field => {
              const meta = CONTACT_META[field];
              const val = editing ? form[field] : (profile?.[field] ?? '');
              return (
                <div key={field}>
                  {editing ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-slate-500">{meta.label}</label>
                      <input type="text" value={form[field]}
                        onChange={e => setForm({ ...form, [field]: e.target.value })}
                        placeholder="..."
                        className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-2.5 py-2 text-sm text-slate-100 placeholder-slate-700 outline-none focus:border-indigo-500/50 transition-all" />
                    </div>
                  ) : (
                    <div className="rounded-xl px-3 py-2.5 flex flex-col gap-1"
                      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</span>
                      <span className={`text-xs truncate ${val ? 'text-slate-300' : 'text-slate-600 italic'}`}>{val || 'Chưa có'}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── ĐỔI MẬT KHẨU (collapsible) ── */}
        <div className="mx-5 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="px-5 py-3">
          <button type="button" onClick={() => { setShowPw(v => !v); setPwError(''); setPwSuccess(false); }}
            className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors">
            <KeyRound size={12} />
            {showPw ? 'Ẩn đổi mật khẩu' : 'Đổi mật khẩu'}
          </button>
          <AnimatePresence>
            {showPw && (
              <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                onSubmit={handleChangePw} className="overflow-hidden">
                <div className="flex flex-col gap-2.5 pt-3">
                  {/* Current password */}
                  <div className="relative">
                    <input type={showCurrentPw ? 'text' : 'password'} value={currentPw}
                      onChange={e => setCurrentPw(e.target.value)} required placeholder="Mật khẩu hiện tại"
                      className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2 pr-9 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500/50 transition-all" />
                    <button type="button" onClick={() => setShowCurrentPw(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showCurrentPw ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  {/* New password */}
                  <div className="relative">
                    <input type={showNewPw ? 'text' : 'password'} value={newPw}
                      onChange={e => setNewPw(e.target.value)} required placeholder="Mật khẩu mới (≥ 6 ký tự)"
                      className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2 pr-9 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500/50 transition-all" />
                    <button type="button" onClick={() => setShowNewPw(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showNewPw ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  {/* Confirm */}
                  <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required
                    placeholder="Xác nhận mật khẩu mới"
                    className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500/50 transition-all" />
                  {pwError && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">{pwError}</p>}
                  {pwSuccess && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">✓ Đổi mật khẩu thành công!</p>}
                  <button type="submit" disabled={savingPw}
                    className="flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold text-indigo-200 border border-indigo-500/30 transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.08))' }}>
                    {savingPw ? <span className="h-3.5 w-3.5 rounded-full border border-indigo-400/30 border-t-indigo-400 animate-spin" /> : <KeyRound size={13} />}
                    {savingPw ? 'Đang đổi...' : 'Xác nhận'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* ── FOOTER ── */}
        <div className="px-5 pb-5 pt-1 flex items-center gap-2.5">
          {editing ? (
            <>
              <button type="button" onClick={cancelEdit}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-slate-500 bg-white/[0.03] border border-white/[0.07] hover:text-slate-300 hover:bg-white/[0.06] transition-all">
                Huỷ
              </button>
              <button type="button" onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-indigo-200 border border-indigo-500/30 transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(99,102,241,0.12))' }}>
                {saving ? <span className="h-3.5 w-3.5 rounded-full border border-indigo-400/30 border-t-indigo-400 animate-spin" /> : <Save size={13} />}
                Lưu
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setEditing(true)}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-slate-400 bg-white/[0.03] border border-white/[0.07] hover:text-slate-200 hover:bg-white/[0.06] transition-all">
              <Pencil size={13} /> Chỉnh sửa
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
