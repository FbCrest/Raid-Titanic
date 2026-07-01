import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Shield, Clock, CheckCircle, XCircle, Search, AlertTriangle } from 'lucide-react';
import { supabase, Profile } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CLASS_OPTIONS } from '../data/classes';
import { MemberProfileModal } from '../components/MemberProfileModal';

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Super Admin', admin: 'Admin', member: 'Thành viên', pending: 'Chờ duyệt',
};
const ROLE_STYLE: Record<string, string> = {
  superadmin: 'text-yellow-300 bg-yellow-500/15 border-yellow-500/25',
  admin: 'text-rose-300 bg-rose-500/15 border-rose-500/25',
  member: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  pending: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
};

// ── Confirm Dialog ───────────────────────────────────────────
interface ConfirmDialogProps {
  message: string;
  subMessage?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  message, subMessage, confirmLabel = 'Xác nhận', onConfirm, onCancel,
}) => (
  <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 12 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-10 w-full max-w-xs rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #0f1520 0%, #0a0d14 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 32px 64px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Top accent */}
      <div className="absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.5), transparent)' }} />

      <div className="p-5 flex flex-col items-center gap-3 text-center">
        <div className="h-11 w-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
          <AlertTriangle size={20} className="text-rose-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-100">{message}</p>
          {subMessage && <p className="text-xs text-slate-500 mt-1">{subMessage}</p>}
        </div>
      </div>

      <div className="px-4 pb-4 flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-slate-400 bg-white/[0.04] border border-white/[0.08] hover:text-slate-200 hover:bg-white/[0.07] transition-all">
          Huỷ
        </button>
        <button type="button" onClick={onConfirm}
          className="flex-1 rounded-xl py-2.5 text-sm font-bold text-rose-300 border border-rose-500/25 hover:bg-rose-500/15 transition-all"
          style={{ background: 'rgba(239,68,68,0.08)' }}>
          {confirmLabel}
        </button>
      </div>
    </motion.div>
  </div>
);

interface MemberCardProps {
  p: Profile; idx: number; isMe: boolean; isAdmin: boolean; isSuperAdmin: boolean;
  updating: string | null;
  updateRole: (id: string, role: Profile['role']) => void;
  rejectUser: (id: string) => void;
  onViewProfile: (p: Profile) => void;
}

// Roles admin thường có thể set (không set superadmin)
const ADMIN_ROLES: Profile['role'][] = ['member', 'admin'];
// Roles superadmin có thể set
const SUPERADMIN_ROLES: Profile['role'][] = ['member', 'admin', 'superadmin'];

// ── Role Modal ──────────────────────────────────────────────
interface RoleModalProps {
  target: Profile;
  availableRoles: Profile['role'][];
  updating: string | null;
  onSelectRole: (role: Profile['role']) => void;
  onClose: () => void;
}
const RoleModal: React.FC<RoleModalProps> = ({ target, availableRoles, updating, onSelectRole, onClose }) => {
  const [selected, setSelected] = useState<Profile['role'] | null>(null);

  const handleSelect = async (role: Profile['role']) => {
    if (role === target.role) return;
    setSelected(role);
    await onSelectRole(role);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-xs rounded-2xl bg-[#0d1117] border border-white/[0.08] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <p className="text-sm font-bold text-slate-100">Đổi quyền</p>
          <p className="text-xs text-slate-500 mt-0.5">Chọn quyền cho <span className="text-slate-300">{target.display_name}</span></p>
        </div>
        <div className="p-3 flex flex-col gap-1.5">
          {availableRoles.map(role => {
            const isActive = target.role === role;
            const isLoading = selected === role;
            return (
              <button key={role} type="button"
                disabled={isActive || !!updating}
                onClick={() => handleSelect(role)}
                className={`w-full flex items-center justify-between rounded-xl px-4 py-3 transition-all border ${
                  isActive
                    ? `${ROLE_STYLE[role]} cursor-default`
                    : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:bg-white/[0.07] hover:text-slate-200 hover:border-white/[0.12]'
                } disabled:cursor-default`}
              >
                <span className="text-sm font-semibold">{ROLE_LABEL[role]}</span>
                {isActive && <span className="text-xs opacity-70">✓ Hiện tại</span>}
                {isLoading && !isActive && <span className="h-3.5 w-3.5 rounded-full border-2 border-slate-500/30 border-t-slate-400 animate-spin" />}
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

// ── Member Card ──────────────────────────────────────────────
interface MemberCardProps {
  p: Profile; idx: number; isMe: boolean; isAdmin: boolean; isSuperAdmin: boolean;
  updating: string | null;
  updateRole: (id: string, role: Profile['role']) => void;
  rejectUser: (id: string) => void;
  onViewProfile: (p: Profile) => void;
}

const MemberCard: React.FC<MemberCardProps> = ({ p, idx, isMe, isAdmin, isSuperAdmin, updating, updateRole, rejectUser, onViewProfile }) => {
  const mainClass = CLASS_OPTIONS.find(c => c.id === p.main_class);
  const subClass = CLASS_OPTIONS.find(c => c.id === p.sub_class);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: idx * 0.03 }}
        className={`rounded-2xl border transition-all overflow-hidden ${
          isMe ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-white/[0.025] border-white/[0.06]'
        }`}
      >
        {/* Click area — xem profile */}
        <button type="button" onClick={() => onViewProfile(p)}
          className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-white/[0.025] transition-colors">
          {/* Avatar */}
          <div className="h-12 w-12 rounded-lg overflow-hidden border border-white/[0.08] shrink-0">
            {p.avatar_url
              ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
              : <div className="h-full w-full bg-indigo-500/20 flex items-center justify-center">
                  <span className="text-base font-black text-indigo-200">{p.display_name[0]}</span>
                </div>
            }
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-100 truncate">{p.display_name}</span>
              {isMe && <span className="text-[9px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded px-1.5 py-0.5 shrink-0">Bạn</span>}
              {/* Tag role luôn hiện, kể cả của mình */}
              <span className={`text-[9px] font-bold border rounded px-1.5 py-0.5 shrink-0 ${ROLE_STYLE[p.role] ?? ROLE_STYLE.member}`}>
                {ROLE_LABEL[p.role] ?? p.role}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">@{p.username}</p>
            {/* Phái — 1 dòng ngang */}
            {(mainClass || subClass) && (
              <div className="flex items-center gap-1.5 mt-1.5">
                {mainClass && (
                  <div className="flex items-center gap-1 rounded-md bg-white/[0.04] border border-white/[0.05] px-1.5 py-0.5">
                    <img src={`/icon-phai/${mainClass.iconName}`} className="w-3.5 h-3.5 object-contain" alt="" />
                    <span className="text-[10px] font-semibold" style={{ color: mainClass.hex }}>{mainClass.name}</span>
                  </div>
                )}
                {subClass && (
                  <div className="flex items-center gap-1 rounded-md bg-white/[0.04] border border-white/[0.05] px-1.5 py-0.5">
                    <img src={`/icon-phai/${subClass.iconName}`} className="w-3.5 h-3.5 object-contain" alt="" />
                    <span className="text-[10px] font-semibold" style={{ color: subClass.hex }}>{subClass.name}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </button>


      </motion.div>

    </>
  );
};

export const MembersPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile: myProfile, isAdmin, isSuperAdmin } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [viewingProfile, setViewingProfile] = useState<Profile | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setProfiles(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchProfiles(); }, []);

  const rejectUser = (id: string) => {
    const p = profiles.find(p => p.id === id);
    setConfirmDelete({ id, name: p?.display_name ?? 'thành viên này' });
  };

  const doDelete = async (id: string) => {
    setConfirmDelete(null);
    setUpdating(id);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ userId: id }),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      console.error('Lỗi xóa:', err.error ?? 'Không xóa được');
    }
    await fetchProfiles();
    setUpdating(null);
  };

  const updateRole = async (id: string, role: Profile['role']) => {
    setUpdating(id);
    await supabase.from('profiles').update({ role }).eq('id', id);
    await fetchProfiles();
    setUpdating(null);
  };

  const pending = profiles.filter(p => p.role === 'pending');
  const members = profiles.filter(p => p.role !== 'pending');
  const filteredAdmins = members.filter(p =>
    (p.role === 'admin' || p.role === 'superadmin') &&
    (p.display_name.toLowerCase().includes(search.toLowerCase()) ||
     p.username.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredMembers = members.filter(p =>
    p.role === 'member' &&
    (p.display_name.toLowerCase().includes(search.toLowerCase()) ||
     p.username.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="relative min-h-screen bg-[#080a10] text-slate-300 antialiased">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/8 animate-soft-float" style={{ filter: 'blur(80px)' }} />
        <div className="absolute bottom-20 right-1/3 h-[400px] w-[400px] rounded-full bg-violet-600/6" style={{ filter: 'blur(70px)' }} />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="flex items-center gap-4">
          <button type="button" onClick={() => navigate('/')}
            className="h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-all">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
              <Users size={16} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100">Thành viên</h1>
              <p className="text-xs text-slate-500">{members.filter(p => p.role === 'member').length} thành viên • {members.filter(p => p.role === 'admin' || p.role === 'superadmin').length} admin</p>
            </div>
          </div>
        </motion.div>

        {/* Pending — chỉ admin */}
        {isAdmin && pending.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock size={12} /> Chờ duyệt ({pending.length})
            </p>
            <div className="flex flex-col gap-2">
              {pending.map(p => (
                <motion.div key={p.id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 rounded-2xl bg-amber-500/5 border border-amber-500/15 px-4 py-3">
                  <div className="h-10 w-10 rounded-xl overflow-hidden border border-amber-500/20 shrink-0">
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                      : <div className="h-full w-full bg-amber-500/15 flex items-center justify-center">
                          <span className="text-sm font-black text-amber-300">{p.display_name[0]}</span>
                        </div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">{p.display_name}</p>
                    <p className="text-xs text-slate-600">@{p.username}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" disabled={updating === p.id} onClick={() => updateRole(p.id, 'member')}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 transition-all disabled:opacity-50">
                      <CheckCircle size={12} /> Duyệt
                    </button>
                    <button type="button" disabled={updating === p.id} onClick={() => rejectUser(p.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-all disabled:opacity-50">
                      <XCircle size={12} /> Từ chối
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên..."
            className="w-full rounded-xl bg-white/[0.04] border border-white/[0.07] pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500/40 focus:bg-white/[0.06] transition-all" />
        </motion.div>

        {/* Members list */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="h-6 w-6 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* Admin group */}
              {filteredAdmins.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield size={11} /> Admin ({filteredAdmins.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredAdmins.map((p, idx) => <MemberCard key={p.id} p={p} idx={idx} isMe={p.id === myProfile?.id} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} updating={updating} updateRole={updateRole} rejectUser={rejectUser} onViewProfile={setViewingProfile} />)}
                  </div>
                </div>
              )}

              {/* Member group */}
              {filteredMembers.length > 0 && (
                <div className="flex flex-col gap-3 mt-2">
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={11} /> Thành viên ({filteredMembers.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredMembers.map((p, idx) => <MemberCard key={p.id} p={p} idx={idx} isMe={p.id === myProfile?.id} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} updating={updating} updateRole={updateRole} rejectUser={rejectUser} onViewProfile={setViewingProfile} />)}
                  </div>
                </div>
              )}

              {filteredAdmins.length === 0 && filteredMembers.length === 0 && (
                <p className="text-sm text-slate-600 text-center py-8">Không tìm thấy thành viên nào.</p>
              )}
            </>
          )}
        </motion.section>
      </div>

      {/* Member profile modal */}
      <AnimatePresence>
        {viewingProfile && (
          <MemberProfileModal
            target={viewingProfile}
            onClose={() => setViewingProfile(null)}
            isAdmin={isAdmin}
            onDelete={(id) => {
              setViewingProfile(null);
              rejectUser(id);
            }}
            onUpdated={(updated) => {
              setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
              setViewingProfile(updated);
            }}
          />
        )}
      </AnimatePresence>

      {/* Confirm delete dialog */}
      <AnimatePresence>
        {confirmDelete && (
          <ConfirmDialog
            message={`Xóa "${confirmDelete.name}"?`}
            subMessage="Hành động này không thể hoàn tác. Tài khoản sẽ bị xóa vĩnh viễn."
            confirmLabel="Xóa"
            onConfirm={() => doDelete(confirmDelete.id)}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
