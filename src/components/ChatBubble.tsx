import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, ChevronDown, Trash2, Users, Pin, PinOff, CornerUpLeft, Smile } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CLASS_OPTIONS } from '../data/classes';

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  reply_to_id: string | null;
  pinned: boolean;
  created_at: string;
  profiles: { display_name: string; avatar_url: string; main_class: string; role: string; } | null;
  reply_to?: { content: string; profiles: { display_name: string } | null } | null;
}

const ROLE_COLOR: Record<string, string> = {
  superadmin: '#fde047', admin: '#fda4af', member: '#6ee7b7', pending: '#fcd34d',
};
const ROLE_LABEL_MAP: Record<string, string> = {
  superadmin: 'Super Admin', admin: 'Admin', member: 'Thành viên',
};
const ROLE_CLASS: Record<string, string> = {
  superadmin: 'text-yellow-300', admin: 'text-rose-300', member: 'text-emerald-300',
};
const ROLE_ICON: Record<string, string> = {
  superadmin: '/Super Admin.gif', admin: '/Admin.gif', member: '/Member.gif',
};
const EMOJI_GROUPS = {
  '😊': ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕'],
  '👋': ['👍','👎','👏','🙌','🤲','🤝','🙏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋','🤚','🖐️','🖖','👋','🤏','💪','🦾','🖕','✍️','🤳','💅','🦵','🦶','👂','🦻','👃','👀','👁️','👅','🦷','🦴'],
  '🎮': ['⚔️','🗡️','🛡️','🏹','🪄','💀','💥','✨','🔥','❄️','⚡','🌊','🌪️','☄️','💫','⭐','🌟','💎','👑','🎯','🎲','🎮','🕹️','🃏','🎰','🏆','🥇','🥈','🥉','🎖️','🏅'],
  '❤️': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☯️','🔱','♾️','🕊️','🌈','🌸','🌺','🌻','🌹','🪷'],
};

const EMOJI_TAB_LABELS: Record<string, string> = {
  '😊': 'Mặt', '👋': 'Tay', '🎮': 'Game', '❤️': 'Tim',
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

export const ChatBubble: React.FC = () => {
  const { profile } = useAuth();
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);
  const [unread, setUnread]       = useState(0);
  const [atBottom, setAtBottom]   = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replyTo, setReplyTo]     = useState<ChatMessage | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiTab, setEmojiTab]   = useState<keyof typeof EMOJI_GROUPS>('😊');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showPinned, setShowPinned]   = useState(false);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const scrollRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const openRef      = useRef(open);
  const atBottomRef  = useRef(atBottom);
  const typingTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { atBottomRef.current = atBottom; }, [atBottom]);

  const STORAGE_KEY = `chat_last_read_${profile?.id ?? 'anon'}`;
  const CHANNEL_NAME = 'chat-v4';
  const TYPING_CHANNEL = 'chat-typing';

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select(`id,user_id,content,reply_to_id,pinned,created_at,
        profiles(display_name,avatar_url,main_class,role),
        reply_to:reply_to_id(content,profiles(display_name))`)
      .order('created_at', { ascending: true })
      .limit(100);
    if (data) {
      setMessages(data as ChatMessage[]);
      const lastRead = localStorage.getItem(STORAGE_KEY) ?? '1970-01-01';
      const newCount = (data as ChatMessage[]).filter(
        m => m.user_id !== profile?.id && m.created_at > lastRead
      ).length;
      if (newCount > 0 && !openRef.current) setUnread(newCount);
    }
  }, [profile?.id, STORAGE_KEY]);

  /* ── Subscribe once ── */
  useEffect(() => {
    fetchMessages();
    const ch = supabase.channel(CHANNEL_NAME)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          const { data } = await supabase
            .from('chat_messages')
            .select(`id,user_id,content,reply_to_id,pinned,created_at,
              profiles(display_name,avatar_url,main_class,role),
              reply_to:reply_to_id(content,profiles(display_name))`)
            .eq('id', payload.new.id).single();
          if (!data) return;
          const msg = data as ChatMessage;
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
          if (msg.user_id !== profile?.id && (!openRef.current || !atBottomRef.current))
            setUnread(n => n + 1);
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
        (payload) => setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m)))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' },
        (payload) => setMessages(prev => prev.filter(m => m.id !== payload.old.id)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []); // eslint-disable-line

  /* ── Typing indicator (Supabase Presence) ── */
  useEffect(() => {
    if (!profile) return;
    const ch = supabase.channel(TYPING_CHANNEL, { config: { presence: { key: profile.id } } })
      .on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState<{ name: string; typing: boolean }>();
        const typing = Object.entries(state)
          .filter(([key, v]) => key !== profile.id && Array.isArray(v) && (v as any[])[0]?.typing)
          .map(([, v]) => (v as any[])[0]?.name ?? '???');
        setTypingUsers(typing);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.id]); // eslint-disable-line

  const broadcastTyping = (isTyping: boolean) => {
    if (!profile) return;
    supabase.channel(TYPING_CHANNEL).track({ name: profile.display_name, typing: isTyping });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
    broadcastTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => broadcastTyping(false), 2000);
  };

  /* ── Scroll ── */
  useEffect(() => {
    if (atBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, atBottom]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 120);
      setTimeout(() => inputRef.current?.focus(), 160);
    }
  }, [open]); // eslint-disable-line

  const handleScroll = () => {
    const el = scrollRef.current; if (!el) return;
    const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    setAtBottom(isBottom);
    if (isBottom) setUnread(0);
  };

  /* ── Send ── */
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !profile || sending) return;
    setSending(true); setInput(''); setReplyTo(null); setShowEmoji(false);
    broadcastTyping(false);
    // Reset textarea height
    if (inputRef.current) { inputRef.current.style.height = '32px'; }
    const tempId = `tmp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId, user_id: profile.id, content: text,
      reply_to_id: replyTo?.id ?? null, pinned: false,
      created_at: new Date().toISOString(),
      profiles: { display_name: profile.display_name, avatar_url: profile.avatar_url, main_class: profile.main_class, role: profile.role },
      reply_to: replyTo ? { content: replyTo.content, profiles: { display_name: replyTo.profiles?.display_name ?? '' } } : null,
    };
    setMessages(prev => [...prev, optimistic]);
    setAtBottom(true);
    const { data } = await supabase.from('chat_messages')
      .insert({ user_id: profile.id, content: text, reply_to_id: replyTo?.id ?? null })
      .select('id').single();
    if (data) setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.id } : m));
    setSending(false);
  };

  const deleteMessage = async (id: string) => {
    setDeletingId(id);
    await supabase.from('chat_messages').delete().eq('id', id);
    setMessages(prev => prev.filter(m => m.id !== id));
    setDeletingId(null);
  };

  const togglePin = async (msg: ChatMessage) => {
    await supabase.from('chat_messages').update({ pinned: !msg.pinned }).eq('id', msg.id);
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, pinned: !m.pinned } : m));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    if (e.key === 'Escape') { setReplyTo(null); setShowEmoji(false); }
  };

  const canDelete = (msg: ChatMessage) =>
    profile?.role === 'superadmin' || profile?.role === 'admin' || msg.user_id === profile?.id;
  const canPin = profile?.role === 'superadmin' || profile?.role === 'admin';
  const pinnedMessages = messages.filter(m => m.pinned);
  const charCount = input.length;
  const charWarning = charCount > 900;

  if (!profile || profile.role === 'pending' || profile.role === 'rejected') return null;

  return (
    <div ref={containerRef} className="fixed bottom-5 right-5 z-[200] flex flex-col items-end gap-3 select-none">
      {open && <div className="fixed inset-0 z-[-1]" onClick={() => { setOpen(false); setShowEmoji(false); }} />}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex flex-col rounded-2xl"
            style={{ width: '380px', height: '520px', background: 'linear-gradient(165deg,#0d1322 0%,#080c16 100%)', border: '1px solid rgba(99,102,241,0.2)', boxShadow: '0 0 0 1px rgba(255,255,255,0.04),0 32px 64px -8px rgba(0,0,0,0.9),0 0 60px -10px rgba(99,102,241,0.15)', borderRadius: '16px' }}
            onClick={() => showEmoji && setShowEmoji(false)}
          >
            <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.7),transparent)' }} />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 rounded-t-2xl" style={{ background: 'linear-gradient(90deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08))' }}>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}>
                    <Users size={13} className="text-indigo-300" />
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border" style={{ borderColor: '#0d1322' }} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-100">Chat nhóm</p>
                  <p className="text-[9px] text-slate-500">{messages.length} tin nhắn{pinnedMessages.length > 0 ? ` · ${pinnedMessages.length} đã ghim` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {pinnedMessages.length > 0 && (
                  <button type="button" onClick={() => setShowPinned(v => !v)}
                    className={`h-6 w-6 rounded-lg flex items-center justify-center transition-all ${showPinned ? 'text-amber-300 bg-amber-500/15' : 'text-slate-500 hover:text-amber-300 hover:bg-amber-500/10'}`}>
                    <Pin size={12} />
                  </button>
                )}
                <button type="button" onClick={() => setOpen(false)}
                  className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/[0.08] transition-all">
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Pinned messages panel */}
            <AnimatePresence>
              {showPinned && pinnedMessages.length > 0 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-amber-500/15" style={{ background: 'rgba(234,179,8,0.05)' }}>
                  <div className="px-3 py-2 flex flex-col gap-1 max-h-28 overflow-y-auto">
                    <p className="text-[9px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1"><Pin size={9}/> Tin đã ghim</p>
                    {pinnedMessages.map(m => (
                      <div key={m.id} className="text-[11px] text-slate-300 truncate pl-2 border-l-2 border-amber-500/40">
                        <span className="text-amber-300 font-semibold">{m.profiles?.display_name}: </span>{m.content}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div ref={scrollRef} onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-0.5"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.2) transparent' }}>
              {messages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <MessageCircle size={18} className="text-indigo-400/60" />
                  </div>
                  <p className="text-xs text-slate-600 text-center leading-relaxed">Chưa có tin nhắn.<br/>Hãy bắt đầu!</p>
                </div>
              )}

              {messages.map((msg) => {
                const isMe = msg.user_id === profile.id;
                const p = msg.profiles;
                const cls = CLASS_OPTIONS.find(c => c.id === p?.main_class);
                const role = p?.role ?? 'member';
                const roleColor = ROLE_COLOR[role] ?? '#6ee7b7';
                const roleIcon  = ROLE_ICON[role];
                const isHov = hoveredId === msg.id;
                const isDel = deletingId === msg.id;
                const d = new Date(msg.created_at);
                const ts = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

                return (
                  <motion.div key={msg.id}
                    initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`group flex items-start gap-2 rounded-xl px-2 py-1.5 transition-colors ${isMe ? 'hover:bg-indigo-500/[0.06]' : 'hover:bg-white/[0.03]'} ${msg.pinned ? 'bg-amber-500/[0.04] border border-amber-500/10' : ''}`}
                    onMouseEnter={() => setHoveredId(msg.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Avatar */}
                    <div className="shrink-0 mt-0.5">
                      <div className="h-8 w-8 rounded-lg overflow-hidden" style={{ border: `1.5px solid ${roleColor}40` }}>
                        {p?.avatar_url
                          ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                          : <div className="h-full w-full flex items-center justify-center text-[10px] font-black" style={{ background: `${roleColor}18`, color: roleColor }}>{p?.display_name?.[0] ?? '?'}</div>
                        }
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Dòng 1: tên, icon phái, icon role, role, time */}
                      <div className="flex items-center gap-1 flex-wrap pr-16">
                        <span className={`text-[11px] font-bold leading-tight shrink-0 ${ROLE_CLASS[role] ?? 'text-emerald-300'}`}>{p?.display_name ?? '???'}</span>
                        {cls && <img src={`/icon-phai/${cls.iconName}`} className="w-3.5 h-3.5 object-contain shrink-0" alt="" />}
                        {roleIcon && <img src={roleIcon} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />}
                        <span className={`text-[9px] font-semibold shrink-0 ${ROLE_CLASS[role] ?? 'text-emerald-300'}`}>{ROLE_LABEL_MAP[role] ?? role}</span>
                        <span className="text-[9px] text-slate-400 font-mono shrink-0">{ts}</span>
                        {msg.pinned && <Pin size={9} className="text-amber-400 shrink-0" />}
                      </div>

                      {/* Reply quote */}
                      {msg.reply_to && (
                        <div className="mt-0.5 mb-0.5 pl-2 border-l-2 border-indigo-500/40 text-[10px] text-slate-500 truncate">
                          <span className="text-indigo-400">{msg.reply_to.profiles?.display_name}: </span>{msg.reply_to.content}
                        </div>
                      )}

                    {/* Dòng 2: nội dung */}
                    <div className="relative mt-0.5">
                      <p className={`text-sm leading-snug break-words pr-1 ${isMe ? 'text-slate-200' : 'text-slate-400'}`}>{msg.content}</p>
                      {/* Action buttons — absolute góc phải dòng 1, không đè nội dung */}
                      <AnimatePresence>
                        {isHov && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.1 }}
                            className="absolute -top-6 right-0 flex items-center gap-0.5 bg-[#0d1322] rounded-lg border border-white/[0.07] px-1 py-0.5 z-10"
                            onClick={e => e.stopPropagation()}
                          >
                            <button type="button" onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }}
                              className="h-5 w-5 rounded flex items-center justify-center text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/15 transition-all" title="Trả lời">
                              <CornerUpLeft size={10} />
                            </button>
                            {canPin && (
                              <button type="button" onClick={() => togglePin(msg)}
                                className={`h-5 w-5 rounded flex items-center justify-center transition-all ${msg.pinned ? 'text-amber-300 hover:bg-amber-500/15' : 'text-slate-500 hover:text-amber-300 hover:bg-amber-500/10'}`} title={msg.pinned ? 'Bỏ ghim' : 'Ghim'}>
                                {msg.pinned ? <PinOff size={10} /> : <Pin size={10} />}
                              </button>
                            )}
                            {canDelete(msg) && (
                              <button type="button" onClick={() => deleteMessage(msg.id)} disabled={isDel}
                                className="h-5 w-5 rounded flex items-center justify-center text-slate-500 hover:text-rose-300 hover:bg-rose-500/15 transition-all disabled:opacity-40" title="Xóa">
                                {isDel ? <span className="h-2.5 w-2.5 rounded-full border border-rose-500/30 border-t-rose-400 animate-spin" /> : <Trash2 size={10} />}
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Scroll to bottom */}
            <AnimatePresence>
              {!atBottom && (
                <motion.button initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                  type="button" onClick={() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); setUnread(0); }}
                  className="absolute bottom-[72px] right-3 flex items-center gap-1.5 rounded-full pl-2.5 pr-2 py-1.5 text-[10px] font-semibold text-indigo-200 transition-all"
                  style={{ background: 'rgba(99,102,241,0.3)', border: '1px solid rgba(99,102,241,0.4)' }}>
                  {unread > 0 && <span className="text-amber-300 font-black">{unread} mới</span>}
                  <ChevronDown size={11} />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Typing indicator */}
            <AnimatePresence>
              {typingUsers.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-1 text-[10px] text-slate-500 italic">
                  {typingUsers.join(', ')} đang nhập...
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reply preview */}
            <AnimatePresence>
              {replyTo && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mx-3 px-3 py-1.5 rounded-t-xl flex items-center justify-between gap-2 border-b-0"
                  style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <div className="min-w-0">
                    <p className="text-[9px] text-indigo-400 font-semibold">Trả lời {replyTo.profiles?.display_name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{replyTo.content}</p>
                  </div>
                  <button type="button" onClick={() => setReplyTo(null)} className="shrink-0 text-slate-600 hover:text-slate-300 transition-colors">
                    <X size={12} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <div className="relative px-3 py-2 flex items-end gap-2 rounded-b-2xl" style={{ borderTop: '1px solid rgba(99,102,241,0.12)', background: 'rgba(0,0,0,0.2)' }}>
              {/* Emoji picker — absolute phía trên input row */}
              <AnimatePresence>
                {showEmoji && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute bottom-full left-0 right-0 mb-1 mx-0 rounded-xl z-20 flex flex-col overflow-hidden"
                    style={{ background: '#0d1322', border: '1px solid rgba(99,102,241,0.25)', boxShadow: '0 -4px 20px rgba(0,0,0,0.5)' }}
                    onClick={e => e.stopPropagation()}                  >
                    {/* Tabs */}
                    <div className="relative flex border-b border-white/[0.06]">
                      {(Object.keys(EMOJI_GROUPS) as Array<keyof typeof EMOJI_GROUPS>).map(tab => (
                        <button key={tab} type="button"
                          onClick={() => setEmojiTab(tab)}
                          className="relative flex-1 py-2 text-xs transition-colors z-10">
                          {emojiTab === tab && (
                            <motion.div
                              layoutId="emoji-tab-indicator"
                              className="absolute inset-0"
                              style={{ background: 'rgba(99,102,241,0.15)', borderBottom: '2px solid rgba(99,102,241,0.6)' }}
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                          )}
                          <span className={`relative z-10 transition-colors ${emojiTab === tab ? 'text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}>
                            {tab} <span className="text-[9px]">{EMOJI_TAB_LABELS[tab]}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                    {/* Emoji grid with crossfade */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={emojiTab}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="p-2 grid grid-cols-8 gap-0.5 max-h-32 overflow-y-auto"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.2) transparent' }}>
                        {EMOJI_GROUPS[emojiTab].map(e => (
                          <button key={e} type="button"
                            onClick={() => { setInput(i => i + e); setShowEmoji(false); inputRef.current?.focus(); }}
                            className="text-base hover:scale-125 transition-transform leading-none p-1 rounded hover:bg-white/[0.06]">{e}</button>
                        ))}
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              <button type="button" onClick={() => setShowEmoji(v => !v)}
                className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all shrink-0 self-center ${showEmoji ? 'text-amber-300 bg-amber-500/15' : 'text-slate-500 hover:text-amber-300 hover:bg-white/[0.06]'}`}>
                <Smile size={16} />
              </button>
              <div className="flex-1 relative">
                <textarea ref={inputRef} value={input} onChange={handleInputChange} onKeyDown={handleKeyDown}
                  placeholder="Nhắn tin… (Enter để gửi)" rows={1} maxLength={1000}
                  className="block w-full resize-none rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all overflow-hidden"
                  style={{ height: '36px', background: 'rgba(255,255,255,0.04)', border: input ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.07)' }} />
                {charWarning && (
                  <span className={`absolute bottom-1 right-2 text-[9px] font-mono ${charCount >= 1000 ? 'text-rose-400' : 'text-amber-400'}`}>{charCount}/1000</span>
                )}
              </div>
              <button type="button" onClick={sendMessage} disabled={!input.trim() || sending}
                className="h-8 w-8 rounded-xl flex items-center justify-center transition-all shrink-0 self-center disabled:opacity-30 active:scale-90"
                style={{ background: input.trim() ? 'linear-gradient(135deg,rgba(99,102,241,0.5),rgba(139,92,246,0.4))' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,102,241,0.3)' }}>
                <Send size={13} className={input.trim() ? 'text-indigo-200' : 'text-slate-600'} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button type="button" onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
        className="relative h-14 w-14 rounded-2xl flex items-center justify-center"
        style={{ background: open ? 'linear-gradient(135deg,rgba(99,102,241,0.7),rgba(139,92,246,0.6))' : 'linear-gradient(135deg,rgba(99,102,241,0.45),rgba(139,92,246,0.35))', border: '1.5px solid rgba(99,102,241,0.5)', boxShadow: open ? '0 8px 32px rgba(99,102,241,0.5)' : '0 8px 32px rgba(99,102,241,0.25)' }}>
        <AnimatePresence mode="wait">
          {open
            ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}><X size={22} className="text-white" /></motion.div>
            : <motion.div key="msg" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}><MessageCircle size={22} className="text-white" /></motion.div>
          }
        </AnimatePresence>
        <AnimatePresence>
          {unread > 0 && !open && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
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
