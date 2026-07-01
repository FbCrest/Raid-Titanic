import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { PendingPage } from './components/auth/PendingPage';
import { RejectedPage } from './components/auth/RejectedPage';
import { OnlineApp } from './components/OnlineApp';
import { AvailabilityPage } from './pages/AvailabilityPage';
import { MembersPage } from './pages/MembersPage';

function SetupPage() {
  return (
    <div className="min-h-screen bg-[#080a10] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl bg-[#0d1117] border border-amber-500/20 p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚙️</span>
          <h1 className="text-base font-bold text-amber-300">Chưa cấu hình Supabase</h1>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">
          Bạn cần điền thông tin Supabase vào file <code className="text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded">.env.local</code> trước khi chạy app.
        </p>
        <div className="rounded-xl bg-black/40 border border-white/[0.06] p-4 text-xs font-mono text-emerald-300 leading-relaxed">
          <p className="text-slate-500 mb-2"># .env.local</p>
          <p>VITE_SUPABASE_URL=https://xxxx.supabase.co</p>
          <p>VITE_SUPABASE_ANON_KEY=eyJhbG...</p>
        </div>
        <ol className="text-xs text-slate-500 leading-relaxed list-decimal list-inside space-y-1">
          <li>Vào <span className="text-indigo-400">supabase.com</span> → tạo project mới</li>
          <li>Project Settings → API → copy URL và anon key</li>
          <li>Dán vào file <code className="text-amber-300">.env.local</code></li>
          <li>Chạy SQL trong file <code className="text-amber-300">supabase_schema.sql</code></li>
          <li>Restart dev server</li>
        </ol>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="min-h-screen bg-[#080a10] flex items-center justify-center">
      <span className="h-8 w-8 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
    </div>
  );
}

function ProtectedRoutes() {
  const { session, profile, loading, profileLoaded, isConfigured } = useAuth();

  if (!isConfigured) return <SetupPage />;
  if (loading) return <Spinner />;
  if (!session) return <AuthPage />;
  if (!profileLoaded) return <Spinner />; // session có nhưng profile đang fetch
  if (!profile) return <AuthPage />;      // profile null sau khi load xong → session orphan, về login
  if (profile.role === 'pending') return <PendingPage />;
  if (profile.role === 'rejected') return <RejectedPage />;

  return (
    <Routes>
      <Route path="/" element={<OnlineApp />} />
      <Route path="/bao-ban" element={<AvailabilityPage />} />
      <Route path="/thanh-vien" element={<MembersPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return <ProtectedRoutes />;
}
