import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Shield, Clock, CheckCircle, XCircle, Search, UserCheck } from 'lucide-react';
import { supabase, Profile } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CLASS_OPTIONS } from '../data/classes';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', member: 'Thành viên', pending: 'Chờ duyệt',
};
const ROLE_STYLE: Record<string, string> = {
  admin: 'text-indigo-300 bg-indigo-500/15 border-indigo-500/25',
  member: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  pending: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
};

export const MembersPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile: myProfile, isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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

  const pending = profiles.filter(p => p.role === 'pending');
  const members = profiles.filter(p => p.role !== 'pending');
  const filtered = members.filter(p =>
    p.display_name.toLowerCase().includes(search.toLowerCase()) ||
    p.username.toLowerCase().includes(search.toLowerCase())
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
              <p className="text-xs text-slate-500">{members.length} thành viên đang hoạt động</p>
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
                    <button type="button" disabled={updating === p.id} onClick={() => updateRole(p.id, 'pending')}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all disabled:opacity-50">
                      <XCircle size={12} />
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
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-8">Không tìm thấy thành viên nào.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((p, idx) => {
                const mainClass = CLASS_OPTIONS.find(c => c.id === p.main_class);
                const subClass = CLASS_OPTIONS.find(c => c.id === p.sub_class);
                const isMe = p.id === myProfile?.id;
                return (
                  <motion.div key={p.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.03 }}
                    className={`rounded-2xl border p-4 flex flex-col gap-3 transition-all ${
                      isMe ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-white/[0.025] border-white/[0.06]'
                    }`}
                  >
                    {/* Top row */}
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl overflow-hidden border border-white/[0.08] shrink-0">
                        {p.avatar_url
                          ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                          : <div className="h-full w-full bg-indigo-500/20 flex items-center justify-center">
                              <span className="text-base font-black text-indigo-200">{p.display_name[0]}</span>
                            </div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-bold text-slate-100 truncate">{p.display_name}</p>
                          {isMe && <span className="text-[9px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded px-1.5 py-0.5">Bạn</span>}
                        </div>
                        <p className="text-xs text-slate-600">@{p.username}</p>
                      </div>
                      <span className={`shrink-0 text-[9px] font-bold border rounded-md px-1.5 py-0.5 ${ROLE_STYLE[p.role]}`}>
                        {ROLE_LABEL[p.role]}
                      </span>
                    </div>

                    {/* Phái */}
                    {(mainClass || subClass) && (
                      <div className="flex items-center gap-2">
                        {mainClass && (
                          <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] px-2 py-1">
                            <img src={`/icon-phai/${mainClass.iconName}`} className="w-4 h-4 object-contain" alt="" />
                            <span className="text-xs font-semibold" style={{ color: mainClass.hex }}>{mainClass.name}</span>
                          </div>
                        )}
                        {subClass && (
                          <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] px-2 py-1 opacity-70">
                            <img src={`/icon-phai/${subClass.iconName}`} className="w-4 h-4 object-contain" alt="" />
                            <span className="text-xs" style={{ color: subClass.hex }}>{subClass.name}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Liên hệ */}
                    {(p.discord || p.zalo || p.facebook) && (
                      <div className="flex flex-wrap gap-1.5">
                        {p.discord && <span className="text-[10px] text-slate-500 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2 py-0.5">🎮 {p.discord}</span>}
                        {p.zalo && <span className="text-[10px] text-slate-500 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2 py-0.5">💬 {p.zalo}</span>}
                        {p.facebook && <span className="text-[10px] text-slate-500 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2 py-0.5">📘 {p.facebook}</span>}
                      </div>
                    )}

                    {/* Admin actions */}
                    {isAdmin && !isMe && (
                      <div className="flex items-center gap-2 pt-1 border-t border-white/[0.05]">
                        {p.role === 'member' && (
                          <button type="button" disabled={updating === p.id} onClick={() => updateRole(p.id, 'admin')}
                            className="text-[10px] text-slate-600 hover:text-indigo-400 transition-colors disabled:opacity-50">
                            → Nâng Admin
                          </button>
                        )}
                        {p.role === 'admin' && (
                          <button type="button" disabled={updating === p.id} onClick={() => updateRole(p.id, 'member')}
                            className="text-[10px] text-slate-600 hover:text-rose-400 transition-colors disabled:opacity-50">
                            → Hạ Member
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
};
