import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { UserLoginView } from './components/UserLoginView';
import { UserNavbar } from './components/UserNavbar';
import { FBStoreDashboard } from './components/FBStoreDashboard';
import { DepositModal } from './components/DepositModal';
import { UserProfileModal } from './components/UserProfileModal';
import { AdminPortal } from './components/AdminPortal';
import { Lock, ShieldCheck } from 'lucide-react';

function AppContent() {
  const { user, isLoading } = useAuth();
  const { resolvedTheme } = useTheme();
  
  // Check if user is navigating to /admin or ?portal=admin or #admin
  const [isAdminRoute, setIsAdminRoute] = useState(() => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search;
    const hash = window.location.hash;
    return path === '/admin' || path.startsWith('/admin/') || search.includes('portal=admin') || hash === '#admin';
  });

  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number | undefined>(undefined);
  const [resetToStoreTrigger, setResetToStoreTrigger] = useState(0);

  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search;
      const hash = window.location.hash;
      setIsAdminRoute(path === '/admin' || path.startsWith('/admin/') || search.includes('portal=admin') || hash === '#admin');
    };
    window.addEventListener('popstate', checkRoute);
    window.addEventListener('hashchange', checkRoute);
    return () => {
      window.removeEventListener('popstate', checkRoute);
      window.removeEventListener('hashchange', checkRoute);
    };
  }, []);

  // 1. Separate Admin URL at /admin
  if (isAdminRoute) {
    return <AdminPortal />;
  }

  // 2. Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#080c14] text-slate-600 dark:text-slate-400 flex items-center justify-center text-xs transition-colors duration-200">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-2" />
        Loading FBStore...
      </div>
    );
  }

  // 3. Unauthenticated: Direct Login / Signup screen (Zero landing page)
  if (!user) {
    return <UserLoginView />;
  }

  // 4. Authenticated User: Direct FBStore Dashboard
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080c14] text-slate-800 dark:text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* User Navbar (Zero Admin Mentions) */}
      <UserNavbar
        openDepositModal={() => {
          setDepositAmount(undefined);
          setIsDepositOpen(true);
        }}
        openProfileModal={() => setIsProfileOpen(true)}
        onLogoClick={() => {
          setIsDepositOpen(false);
          setIsProfileOpen(false);
          setResetToStoreTrigger(prev => prev + 1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Main Single-Product Dashboard */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <FBStoreDashboard
          openDepositModalWithAmount={(amt) => {
            setDepositAmount(amt);
            setIsDepositOpen(true);
          }}
          resetToStoreTrigger={resetToStoreTrigger}
        />
      </main>

      {/* Clean User Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950 py-6 text-center text-xs text-slate-500 transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-extrabold text-slate-700 dark:text-slate-400 font-['Space_Grotesk']">
            FB<span className="text-[#1877F2]">Store</span> • Facebook Accounts Market
          </span>
          <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              Instant UID:Password Handover
            </span>
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              Instant .txt Download (PKR)
            </span>
          </div>
        </div>
      </footer>

      {/* Manual Deposit Modal */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        initialAmount={depositAmount}
      />

      {/* User Profile & Password Change Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
