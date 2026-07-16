import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, ChevronDown, Trash2, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CLASS_OPTIONS } from '../data/classes';

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    display_name: string;
    avatar_url: string;
    main_class: string;
    role: string;
  } | null;
}

const ROLE_COLOR: Record<string, string> = {
  superadmin: '#fde047', // Tailwind v4 yellow-300
  admin:      '#fda4af', // rose-300
  member:     '#6ee7b7', // emerald-300
  pending:    '#fcd34d',
};

const ROLE_LABEL_MAP: Record<string, string> = {
  superadmin: 'Super Admin', admin: 'Admin', member: 'Thành viên',
};

const ROLE_LABEL_COLOR: Record<string, string> = {
  superadmin: '#fde047',
  admin:      '#fda4af',
  member:     '#6ee7b7',
};

const ROLE_ICON: Record<string, string> = {
  superadmin: '/Super Admin.gif',
  admin:      '/Admin.gif',
  member:     '/Member.gif',
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

export const ChatBubble: React.FC = () => {
  const { profile } = useAuth();
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]     = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread]   = useState(0);
  const [atBottom, setAtBottom] = useState(true);
  const [hoveredId, setHoveredId]   = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const openRef     = useRef(open);
  const atBottomRef = useRef(atBottom);

  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { atBottomRef.current = atBottom; }, [atBottom]);

  const STORAGE_KEY = `chat_last_read_${profile?.id ?? 'anon'}`;

  /* ── fetch + tính unread từ lần cuối đọc ── */
  const fetchMessages = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('id,user_id,content,created_at,profiles(display_name,avatar_url,main_class,role)')
      .order('created_at', { ascending: true })
      .limit(100);
    if (data) {
      setMessages(data as ChatMessage[]);
      // Đếm tin nhắn của người khác sau lần cuối đọc
      const lastRead = localStorage.getItem(STORAGE_KEY) ?? '1970-01-01';
      const newCount = (data as ChatMessage[]).filter(
        m => m.user_id !== profile?.id && m.created_at > lastRead
      ).length;
      if (newCount > 0 && !openRef.current) setUnread(newCount);
    }
  };

  /* ── subscribe once ── */
  useEffect(() => {
    fetchMessages();
    const ch = supabase
      .channel('chat-v3')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          const { data } = await supabase
            .from('chat_messages')
            .select('id,user_id,content,created_at,profiles(display_name,avatar_url,main_class,role)')
            .eq('id', payload.new.id)
            .single();
          if (!data) return;
          const msg = data as ChatMessage;
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
          // Chỉ tăng unread nếu là tin của người khác và không đang xem
          if (msg.user_id !== profile?.id && (!openRef.current || !atBottomRef.current)) {
            setUnread(n => n + 1);
          }
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' },
        (payload) => setMessages(prev => prev.filter(m => m.id !== payload.old.id)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []); // eslint-disable-line

  /* ── auto scroll ── */
  useEffect(() => {
    if (atBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, atBottom]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      // Lưu thời điểm đọc
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 120);
      setTimeout(() => inputRef.current?.focus(), 160);
    }
  }, [open]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    setAtBottom(isBottom);
    if (isBottom) setUnread(0);
  };

  /* ── send ── */
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !profile || sending) return;
    setSending(true);
    setInput('');
    const tempId = `tmp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId, user_id: profile.id, content: text,
      created_at: new Date().toISOString(),
      profiles: { display_name: profile.display_name, avatar_url: profile.avatar_url, main_class: profile.main_class, role: profile.role },
    };
    setMessages(prev => [...prev, optimistic]);
    setAtBottom(true);
    const { data } = await supabase.from('chat_messages').insert({ user_id: profile.id, content: text }).select('id').single();
    if (data) setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.id } : m));
    setSending(false);
  };

  const deleteMessage = async (id: string) => {
    setDeletingId(id);
    await supabase.from('chat_messages').delete().eq('id', id);
    setMessages(prev => prev.filter(m => m.id !== id));
    setDeletingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const canDelete = (msg: ChatMessage) =>
    profile?.role === 'superadmin' || profile?.role === 'admin' || msg.user_id === profile?.id;

  if (!profile || profile.role === 'pending' || profile.role === 'rejected') return null;

  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col items-end gap-3 select-none">

      {/* ── Chat Window ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0,  scale: 1     }}
            exit  ={{ opacity: 0, y: 24, scale: 0.94   }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex flex-col rounded-2xl overflow-hidden"
            style={{
              width: '340px', height: '500px',
              background: 'linear-gradient(165deg, #0d1322 0%, #080c16 100%)',
              border: '1px solid rgba(99,102,241,0.2)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 32px 64px -8px rgba(0,0,0,0.9), 0 0 60px -10px rgba(99,102,241,0.15)',
            }}
          >
            {/* top accent line */}
            <div className="absolute inset-x-0 top-0 h-px"
              style={{ background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.7),transparent)' }} />

            {/* ── Header ── */}
            <div className="relative flex items-center justify-between px-4 py-3"
              style={{ background: 'linear-gradient(90deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08))' }}>
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="h-8 w-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}>
                    <Users size={14} className="text-indigo-300" />
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2"
                    style={{ borderColor: '#0d1322' }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-100 leading-tight">Chat nhóm</p>
                  <p className="text-[10px] text-slate-500">{messages.length} tin nhắn</p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/[0.08] transition-all">
                <X size={14} />
              </button>
            </div>

            {/* ── Messages ── */}
            <div ref={scrollRef} onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.2) transparent' }}>

              {messages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <MessageCircle size={20} className="text-indigo-400/60" />
                  </div>
                  <p className="text-xs text-slate-600 text-center leading-relaxed">Chưa có tin nhắn.<br/>Hãy bắt đầu cuộc trò chuyện!</p>
                </div>
              )}

              {messages.map((msg) => {
                const isMe      = msg.user_id === profile.id;
                const p         = msg.profiles;
                const cls       = CLASS_OPTIONS.find(c => c.id === p?.main_class);
                const role      = p?.role ?? 'member';
                const roleColor = ROLE_COLOR[role] ?? '#6ee7b7';
                const roleIcon  = ROLE_ICON[role];
                const isHovered  = hoveredId === msg.id;
                const isDeleting = deletingId === msg.id;

                const d = new Date(msg.created_at);
                const ts = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

                const ROLE_CLASS: Record<string, string> = {
                  superadmin: 'text-yellow-300',
                  admin:      'text-rose-300',
                  member:     'text-emerald-300',
                };

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit   ={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="group flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.03]"
                    onMouseEnter={() => setHoveredId(msg.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Phần 1: Avatar */}
                    <div className="shrink-0 mt-0.5">
                      <div className="h-8 w-8 rounded-lg overflow-hidden"
                        style={{ border: `1.5px solid ${roleColor}40` }}>
                        {p?.avatar_url
                          ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                          : <div className="h-full w-full flex items-center justify-center text-[10px] font-black"
                              style={{ background: `${roleColor}18`, color: roleColor }}>
                              {p?.display_name?.[0] ?? '?'}
                            </div>
                        }
                      </div>
                    </div>

                    {/* Phần 2: 2 dòng */}
                    <div className="flex-1 min-w-0">
                      {/* Dòng 1: tên · icon phái · icon role · role · thời gian */}
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={`text-[11px] font-bold leading-tight shrink-0 ${ROLE_CLASS[role] ?? 'text-emerald-300'}`}>
                          {p?.display_name ?? '???'}
                        </span>
                        {cls && (
                          <img src={`/icon-phai/${cls.iconName}`} className="w-3.5 h-3.5 object-contain shrink-0" alt="" />
                        )}
                        {roleIcon && (
                          <img src={roleIcon} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
                        )}
                        <span className={`text-[9px] font-semibold shrink-0 ${ROLE_CLASS[role] ?? 'text-emerald-300'}`}>
                          {ROLE_LABEL_MAP[role] ?? role}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono shrink-0">{ts}</span>
                      </div>
                      {/* Dòng 2: nội dung tin nhắn */}
                      <div className="flex items-start justify-between gap-1 mt-0.5">
                        <p className={`text-sm leading-snug break-words ${isMe ? 'text-slate-200' : 'text-slate-400'}`}>
                          {msg.content}
                        </p>
                        <AnimatePresence>
                          {isHovered && canDelete(msg) && (
                            <motion.button
                              initial={{ opacity: 0, scale: 0.7 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit  ={{ opacity: 0, scale: 0.7 }}
                              transition={{ duration: 0.1 }}
                              type="button"
                              onClick={() => deleteMessage(msg.id)}
                              disabled={isDeleting}
                              className="shrink-0 h-5 w-5 rounded-md flex items-center justify-center text-rose-500 hover:text-rose-300 hover:bg-rose-500/15 transition-all disabled:opacity-40"
                            >
                              {isDeleting
                                ? <span className="h-2.5 w-2.5 rounded-full border border-rose-500/30 border-t-rose-400 animate-spin" />
                                : <Trash2 size={10} />}
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* ── Scroll to bottom ── */}
            <AnimatePresence>
              {!atBottom && (
                <motion.button
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                  type="button" onClick={() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); setUnread(0); }}
                  className="absolute bottom-[60px] right-3 flex items-center gap-1.5 rounded-full pl-2.5 pr-2 py-1.5 text-[10px] font-semibold text-indigo-200 transition-all"
                  style={{ background: 'rgba(99,102,241,0.3)', border: '1px solid rgba(99,102,241,0.4)', backdropFilter: 'blur(8px)' }}>
                  {unread > 0 && <span className="text-amber-300 font-black">{unread} mới</span>}
                  <ChevronDown size={12} />
                </motion.button>
              )}
            </AnimatePresence>

            {/* ── Input ── */}
            <div className="px-3 py-2.5 flex items-end gap-2"
              style={{ borderTop: '1px solid rgba(99,102,241,0.12)', background: 'rgba(0,0,0,0.2)' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhắn tin… (Enter để gửi)"
                rows={1}
                className="flex-1 resize-none rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                style={{
                  maxHeight: '80px',
                  background: 'rgba(255,255,255,0.04)',
                  border: input ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.07)',
                }}
              />
              <motion.button
                type="button" onClick={sendMessage}
                disabled={!input.trim() || sending}
                whileTap={{ scale: 0.9 }}
                className="h-9 w-9 rounded-xl flex items-center justify-center transition-all shrink-0 disabled:opacity-30"
                style={{
                  background: input.trim() ? 'linear-gradient(135deg,rgba(99,102,241,0.5),rgba(139,92,246,0.4))' : 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(99,102,241,0.3)',
                }}>
                <Send size={14} className={input.trim() ? 'text-indigo-200' : 'text-slate-600'} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toggle Button ── */}
      <motion.button
        type="button"
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.1 }}
        whileTap  ={{ scale: 0.92 }}
        className="relative h-14 w-14 rounded-2xl flex items-center justify-center"
        style={{
          background: open
            ? 'linear-gradient(135deg,rgba(99,102,241,0.7),rgba(139,92,246,0.6))'
            : 'linear-gradient(135deg,rgba(99,102,241,0.45),rgba(139,92,246,0.35))',
          border: '1.5px solid rgba(99,102,241,0.5)',
          boxShadow: open
            ? '0 8px 32px rgba(99,102,241,0.5)'
            : '0 8px 32px rgba(99,102,241,0.25)',
        }}
      >
        <AnimatePresence mode="wait">
          {open
            ? <motion.div key="x"
                initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
                <X size={22} className="text-white" />
              </motion.div>
            : <motion.div key="msg"
                initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}>
                <MessageCircle size={22} className="text-white" />
              </motion.div>
          }
        </AnimatePresence>

        {/* Unread badge */}
        <AnimatePresence>
          {unread > 0 && !open && (
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="absolute -top-1.5 -right-1.5 h-5 min-w-5 rounded-full bg-rose-500 flex items-center justify-center px-1"
              style={{ border: '2px solid #080a10', boxShadow: '0 2px 8px rgba(239,68,68,0.5)' }}>
              <span className="text-[9px] font-black text-white leading-none">{unread > 99 ? '99+' : unread}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};
