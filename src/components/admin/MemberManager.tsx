import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, Clock, Shield, User } from 'lucide-react';
import { supabase, Profile } from '../../lib/supabase';

const ROLE_LABEL: Record<Profile['role'], string> = {
  pending: 'Chờ duyệt',
  member: 'Thành viên',
  admin: 'Admin',
};

const ROLE_STYLE: Record<Profile['role'], string> = {
  pending: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  member: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  admin: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
};

export const MemberManager: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setProfiles(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchProfiles(); }, []);

  const updateRole = async (id: string, role: Profile['role']) => {
    setUpdating(id);
    await supabase.from('profiles').update({ role }).eq('id', id);
    await fetchProfiles();
    setUpdating(null);
  };

  const pending = profiles.filter((p) => p.role === 'pending');
  const members = profiles.filter((p) => p.role !== 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="h-6 w-6 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Pending approvals */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-amber-400 mb-3 flex items-center gap-1.5">
            <Clock size={12} />
            Chờ duyệt ({pending.length})
          </h3>
          <div className="flex flex-col gap-2">
            <AnimatePresence>
              {pending.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8, height: 0 }}
                  className="flex items-center justify-between gap-3 rounded-xl bg-amber-500/5 border border-amber-500/15 px-4 py-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                      <User size={14} className="text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">{p.display_name}</p>
                      <p className="text-xs text-slate-600">@{p.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={updating === p.id}
                      onClick={() => updateRole(p.id, 'member')}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 transition-all disabled:opacity-50"
                    >
                      <CheckCircle size={12} />
                      Duyệt
                    </button>
                    <button
                      type="button"
                      disabled={updating === p.id}
                      onClick={() => updateRole(p.id, 'pending')}
                      className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 px-2 py-1.5 text-xs text-rose-400 hover:bg-rose-500/20 transition-all disabled:opacity-50"
                      title="Từ chối / Giữ pending"
                    >
                      <XCircle size={12} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* All members */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-1.5">
          <Users size={12} />
          Tất cả thành viên ({members.length})
        </h3>
        <div className="flex flex-col gap-2">
          {members.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.025] border border-white/[0.06] px-4 py-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                  {p.role === 'admin'
                    ? <Shield size={14} className="text-indigo-400" />
                    : <User size={14} className="text-slate-400" />
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{p.display_name}</p>
                  <p className="text-xs text-slate-600">@{p.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${ROLE_STYLE[p.role]}`}>
                  {ROLE_LABEL[p.role]}
                </span>
                {p.role === 'member' && (
                  <button
                    type="button"
                    disabled={updating === p.id}
                    onClick={() => updateRole(p.id, 'admin')}
                    className="text-[10px] text-slate-600 hover:text-indigo-400 transition-colors disabled:opacity-50"
                    title="Nâng lên Admin"
                  >
                    → Admin
                  </button>
                )}
                {p.role === 'admin' && (
                  <button
                    type="button"
                    disabled={updating === p.id}
                    onClick={() => updateRole(p.id, 'member')}
                    className="text-[10px] text-slate-600 hover:text-rose-400 transition-colors disabled:opacity-50"
                    title="Hạ xuống Member"
                  >
                    → Member
                  </button>
                )}
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <p className="text-xs text-slate-600 text-center py-4">Chưa có thành viên nào được duyệt.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Fix missing import
function Users({ size, className }: { size: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
