import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const isRegister = mode === 'register';

  // Ẩn scrollbar khi ở trang auth
  React.useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = ''; };
  }, []);

  return (
    <div className="min-h-screen h-screen bg-[#080a10] flex items-center justify-center p-4 overflow-hidden">
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/10" style={{ filter: 'blur(80px)' }} />
        <div className="absolute bottom-10 right-1/4 h-[400px] w-[400px] rounded-full bg-violet-600/8" style={{ filter: 'blur(70px)' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-5">
          <motion.img
            src="/icon.png"
            alt="icon"
            className="h-14 w-14 object-contain"
            animate={{ rotate: [0, -8, 8, -5, 5, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
            style={{ filter: 'drop-shadow(0 0 12px rgba(129,140,248,0.6))' }}
          />
          <h1 className="text-lg font-bold text-slate-100">🚢 Raid Tàu Titanic『镇海潮生』</h1>
        </div>

        {/* Tab switch với animated indicator */}
        <div className="relative flex rounded-xl bg-white/[0.04] border border-white/[0.07] p-1 mb-6">
          {/* Sliding indicator */}
          <motion.div
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-indigo-500/20 border border-indigo-500/30"
            animate={{ x: isRegister ? 'calc(100% + 8px)' : '0%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          />
          {(['login', 'register'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMode(tab)}
              className={`relative flex-1 rounded-lg py-2 text-xs font-semibold transition-colors duration-200 z-10 ${
                mode === tab ? 'text-indigo-300' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab === 'login' ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          ))}
        </div>

        {/* Form area */}
        <div className="relative">
          <AnimatePresence initial={false} mode="wait" custom={isRegister ? 1 : -1}>
            <motion.div
              key={mode}
              custom={isRegister ? 1 : -1}
              initial={(dir) => ({ opacity: 0, x: dir > 0 ? 30 : -30 })}
              animate={{ opacity: 1, x: 0 }}
              exit={(dir) => ({ opacity: 0, x: dir > 0 ? -30 : 30 })}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {mode === 'login'
                ? <LoginForm onSwitchToRegister={() => setMode('register')} />
                : <RegisterForm onSwitchToLogin={() => setMode('login')} />
              }
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
