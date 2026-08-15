import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Save, Shield, KeyRound, Swords, Trash2, Pencil, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { supabase, Profile } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CLASS_OPTIONS } from '../data/classes';
import { ClassDropdown } from './ClassDropdown';

// ── Reset Password Section ──────────────────────────────────
const ResetPasswordSection: React.FC<{ targetId: string; targetName: string }> = ({ targetId, targetName }) => {
  const [newPw, setNewPw]       = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState('');

  const handleReset = async () => {
    if (newPw.length < 6) { setError('Mật khẩu tối thiểu 6 ký tự.'); return; }
    setLoading(true); setError(''); setSuccess(false);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ userId: targetId, newPassword: newPw }),
      }
    );
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? 'Lỗi không xác định.'); }
    else { setSuccess(true); setNewPw(''); setTimeout(() => setSuccess(false), 3000); }
    setLoading(false);
  };

  return (
    <>
      <div className="mx-5 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
      <div className="px-5 py-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <KeyRound size={11} /> Đặt lại mật khẩu
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showPw ? 'text' : 'password'}
              value={newPw}
              onChange={e => { setNewPw(e.target.value); setError(''); setSuccess(false); }}
              placeholder="Mật khẩu mới (≥ 6 ký tự)"
              className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2 pr-9 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500/50 transition-all"
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
              {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
          <button type="button" onClick={handleReset} disabled={loading || !newPw}
            className="shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-indigo-200 border border-indigo-500/30 hover:bg-indigo-500/15 transition-all disabled:opacity-40"
            style={{ background: 'rgba(99,102,241,0.12)' }}>
            {loading ? <span className="h-3.5 w-3.5 rounded-full border border-indigo-400/30 border-t-indigo-400 animate-spin inline-block" /> : 'Đặt lại'}
          </button>
        </div>
        {error   && <p className="mt-2 text-xs text-rose-400">{error}</p>}
        {success && <p className="mt-2 text-xs text-emerald-400">✓ Đã đặt lại mật khẩu cho {targetName}.</p>}
      </div>
    </>
  );
};

interface MemberProfileModalProps {
  target: Profile;
  onClose: () => void;
  onUpdated: (updated: Profile) => void;
  onDelete?: (id: string) => void;
  onApprove?: (id: string) => void;
  isAdmin?: boolean;
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
} as const;

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  target, onClose, onUpdated, onDelete, onApprove, isAdmin,
}) => {
  const { profile: myProfile, isSuperAdmin } = useAuth();
  const isMe = target.id === myProfile?.id;
  const canDelete = !isMe && (isSuperAdmin || (isAdmin && target.role !== 'superadmin'));

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    display_name: target.display_name,
    main_class: target.main_class,
    sub_class: target.sub_class,
    discord: target.discord,
    facebook: target.facebook,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const mainClassData = CLASS_OPTIONS.find(c => c.id === (editing ? form.main_class : target.main_class));
  const subClassData  = CLASS_OPTIONS.find(c => c.id === (editing ? form.sub_class  : target.sub_class));
  const accentColor   = ROLE_ACCENT[target.role] ?? '#818cf8';

  const handleSave = async () => {
    if (!form.display_name.trim()) { setError('Tên không được để trống.'); return; }
    setSaving(true);
    setError('');
    const { data, error: err } = await supabase
      .from('profiles')
      .update({ ...form, display_name: form.display_name.trim() })
      .eq('id', target.id)
      .select()
      .single();
    if (err) { setError('Lỗi khi lưu.'); setSaving(false); return; }
    onUpdated(data as Profile);
    setEditing(false);
    setSaving(false);
  };

  const cancelEdit = () => {
    setForm({
      display_name: target.display_name,
      main_class: target.main_class,
      sub_class: target.sub_class,
      discord: target.discord,
      facebook: target.facebook,
    });
    setError('');
    setEditing(false);
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      />

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

        {/* ── HERO SECTION ── */}
        <div className="relative px-5 pt-5 pb-4">
          {/* Close btn */}
          <button type="button" onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/[0.07] transition-all">
            <X size={16} />
          </button>

          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="h-16 w-16 rounded-2xl overflow-hidden"
                style={{ border: `2px solid ${accentColor}30`, boxShadow: `0 0 20px ${accentColor}20` }}>
                {target.avatar_url
                  ? <img src={target.avatar_url} alt="" className="h-full w-full object-cover" />
                  : <div className="h-full w-full flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}08)` }}>
                      <span className="text-2xl font-black" style={{ color: accentColor }}>
                        {target.display_name[0]}
                      </span>
                    </div>
                }
              </div>
              {/* Role badge dot */}
              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-[#0a0d14]"
                style={{ background: accentColor }} />
            </div>

            {/* Name + username + role */}
            <div className="flex-1 min-w-0 pr-8">
              {editing ? (
                <input
                  type="text"
                  value={form.display_name}
                  onChange={e => setForm({ ...form, display_name: e.target.value })}
                  className="w-full rounded-xl bg-white/[0.06] border border-white/[0.1] px-3 py-2 text-base font-bold text-slate-100 outline-none focus:border-indigo-500/50 transition-all mb-1"
                />
              ) : (
                <p className="text-lg font-black text-slate-100 truncate leading-tight">{target.display_name}</p>
              )}
              <p className="text-xs text-slate-500 mt-0.5">@{target.username}</p>
              <span className={`inline-flex mt-2 items-center gap-1.5 text-xs font-bold border rounded-full px-2.5 py-1 ${ROLE_STYLE[target.role] ?? ROLE_STYLE.member}`}>
                {target.role === 'superadmin' && <img src="/Super Admin.gif" alt="" className="w-4 h-4 object-contain" />}
                {target.role === 'admin'      && <img src="/Admin.gif"       alt="" className="w-4 h-4 object-contain" />}
                {target.role === 'member'     && <img src="/Member.gif"      alt="" className="w-4 h-4 object-contain" />}
                {ROLE_LABEL[target.role] ?? target.role}
              </span>
              {target.created_at && (() => {
                const d = new Date(target.created_at);
                const h = d.getHours();
                const session = h < 6 ? 'đêm' : h < 12 ? 'sáng' : h < 14 ? 'trưa' : h < 18 ? 'chiều' : 'tối';
                const pad = (n: number) => String(n).padStart(2, '0');
                return (
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    Tham gia: <span className="text-slate-300 font-semibold">{pad(h)}:{pad(d.getMinutes())} </span>
                    <span className="text-amber-400 font-semibold">{session}</span>
                    <span className="text-slate-500"> — {pad(d.getDate())}/{pad(d.getMonth()+1)}/{d.getFullYear()}</span>
                  </p>
                );
              })()}
            </div>
          </div>

          {error && (
            <p className="mt-3 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">{error}</p>
          )}
        </div>

        {/* ── DIVIDER ── */}
        <div className="mx-5 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

        {/* ── PHÁI ── */}
        <div className="px-5 py-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Phái</p>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Phái chính */}
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
                  {mainClassData ? (
                    <>
                      <img src={`/icon-phai/${mainClassData.iconName}`} className="w-5 h-5 object-contain shrink-0" alt="" />
                      <span className="text-sm font-bold truncate" style={{ color: mainClassData.hex }}>{mainClassData.name}</span>
                    </>
                  ) : <span className="text-sm text-slate-700 italic w-full text-center">Chưa có</span>}
                </div>
              )}
            </div>
            {/* Phái phụ */}
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
                  {subClassData ? (
                    <>
                      <img src={`/icon-phai/${subClassData.iconName}`} className="w-5 h-5 object-contain shrink-0" alt="" />
                      <span className="text-sm font-bold truncate" style={{ color: subClassData.hex }}>{subClassData.name}</span>
                    </>
                  ) : <span className="text-sm text-slate-700 italic w-full text-center">Chưa có</span>}
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
          <div className="grid grid-cols-2 gap-2">
            {(['discord', 'facebook'] as const).map(field => {
              const meta = CONTACT_META[field];
              const val = target[field];
              return (
                <div key={field}>
                  {editing ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-slate-500">{meta.label}</label>
                      <input
                        type="text"
                        value={form[field]}
                        onChange={e => setForm({ ...form, [field]: e.target.value })}
                        placeholder="..."
                        className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-2.5 py-2 text-sm text-slate-100 placeholder-slate-700 outline-none focus:border-indigo-500/50 transition-all"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl px-3 py-2.5 flex flex-col gap-1"
                      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</span>
                      <span className={`text-xs truncate ${val ? 'text-slate-300' : 'text-slate-600 italic'}`}>
                        {val || 'Chưa có'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── QUYỀN HẠN (Super Admin) ── */}
        {isSuperAdmin && !isMe && (
          <>
            <div className="mx-5 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-yellow-500/70 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <KeyRound size={11} /> Quyền hạn
              </p>
              <div className="flex gap-2">
                {(['member', 'admin', 'superadmin'] as const).map(role => (
                  <button key={role} type="button"
                    disabled={target.role === role}
                    onClick={async () => {
                      await supabase.from('profiles').update({ role }).eq('id', target.id);
                      onUpdated({ ...target, role });
                      onClose();
                    }}
                    className={`flex-1 rounded-xl py-2 text-sm font-bold border transition-all ${
                      target.role === role
                        ? `${ROLE_STYLE[role]} cursor-default`
                        : 'bg-white/[0.03] border-white/[0.07] text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] hover:border-white/[0.12]'
                    }`}
                  >
                    {ROLE_LABEL[role]}{target.role === role ? ' ✓' : ''}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── RESET MẬT KHẨU (Super Admin) ── */}
        {isSuperAdmin && !isMe && (
          <ResetPasswordSection targetId={target.id} targetName={target.display_name} />
        )}

        {/* ── PENDING ACTIONS (Admin xem user chờ duyệt) ── */}
        {target.role === 'pending' && (isAdmin || isSuperAdmin) && !isMe && (
          <>
            <div className="mx-5 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <CheckCircle size={11} /> Xét duyệt
              </p>
              <div className="flex gap-2">
                {onApprove && (
                  <button type="button"
                    onClick={() => { onApprove(target.id); onClose(); }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
                    style={{ background: 'rgba(52,211,153,0.1)' }}>
                    <CheckCircle size={14} /> Duyệt thành viên
                  </button>
                )}
                {onDelete && (
                  <button type="button"
                    onClick={() => { onDelete(target.id); onClose(); }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-rose-300 border border-rose-500/25 hover:bg-rose-500/15 transition-all"
                    style={{ background: 'rgba(239,68,68,0.07)' }}>
                    <XCircle size={14} /> Từ chối
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── FOOTER: Edit / Save / Delete ── */}
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
                {saving
                  ? <span className="h-3.5 w-3.5 rounded-full border border-indigo-400/30 border-t-indigo-400 animate-spin" />
                  : <Save size={13} />
                }
                Lưu
              </button>
            </>
          ) : (
            <>
              {(isMe || isAdmin || isSuperAdmin) && (
                <button type="button" onClick={() => setEditing(true)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-slate-400 bg-white/[0.03] border border-white/[0.07] hover:text-slate-200 hover:bg-white/[0.06] transition-all">
                  <Pencil size={13} /> Chỉnh sửa
                </button>
              )}
              {canDelete && onDelete && (
                <button type="button" onClick={() => onDelete(target.id)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 hover:border-rose-500/35 transition-all"
                  style={{ background: 'rgba(239,68,68,0.05)' }}>
                  <Trash2 size={13} /> Xóa thành viên
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
