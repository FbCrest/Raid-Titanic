import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  return (
    <div className="min-h-screen bg-[#080a10] flex items-center justify-center p-4">
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/10" style={{ filter: 'blur(80px)' }} />
        <div className="absolute bottom-10 right-1/4 h-[400px] w-[400px] rounded-full bg-violet-600/8" style={{ filter: 'blur(70px)' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <motion.img
            src="/icon.png"
            alt="icon"
            className="h-14 w-14 object-contain"
            animate={{ rotate: [0, -8, 8, -5, 5, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
            style={{ filter: 'drop-shadow(0 0 12px rgba(129,140,248,0.6))' }}
          />
          <h1 className="text-lg font-bold text-slate-100">🚢 Tàu Titanic</h1>
          <p className="text-xs text-slate-500">Hệ thống quản lý Raid</p>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-white/[0.04] border border-white/[0.07] p-1 mb-6">
          {(['login', 'register'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMode(tab)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all duration-200 ${
                mode === tab
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab === 'login' ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {mode === 'login'
              ? <LoginForm onSwitchToRegister={() => setMode('register')} />
              : <RegisterForm onSwitchToLogin={() => setMode('login')} />
            }
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
