import React from 'react';
import { Wallet, PlusCircle, LogOut, Sun, Moon, User as UserIcon, MessageSquarePlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface UserNavbarProps {
  openDepositModal: () => void;
  openProfileModal: () => void;
  onLogoClick?: () => void;
}

export const UserNavbar: React.FC<UserNavbarProps> = ({ 
  openDepositModal, 
  openProfileModal,
  onLogoClick 
}) => {
  const { user, logout } = useAuth();
  const { resolvedTheme, setMode } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#0a0e17]/95 border-b border-slate-200 dark:border-slate-800/80 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-2.5 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-4">
        
        {/* Brand Logo - Clickable to open Dashboard */}
        <div 
          onClick={() => {
            if (onLogoClick) {
              onLogoClick();
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition group select-none shrink-0"
          title="FBStore Dashboard"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#1877F2] text-white flex items-center justify-center font-black text-base sm:text-lg shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform">
            FB
          </div>
          <div>
            <span className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white font-['Space_Grotesk'] tracking-tight">
              FB<span className="text-[#1877F2]">Store</span>
            </span>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1 sm:gap-2.5">
          
          {/* Theme Toggle Button */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setMode(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-1 sm:p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition cursor-pointer"
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {resolvedTheme === 'dark' ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" />}
            </button>
          </div>

          {/* Wallet Balance */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl p-1 pl-2 sm:pl-3 shadow-inner">
            <div className="flex items-center gap-1.5 mr-1.5 sm:mr-2">
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[8px] sm:text-[9px] text-slate-500 dark:text-slate-400 uppercase font-semibold leading-none">Wallet</span>
                <span className="text-[11px] sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 leading-tight whitespace-nowrap">
                  Rs. {(user?.walletBalance || 0).toLocaleString()} <span className="hidden sm:inline text-[10px]">PKR</span>
                </span>
              </div>
            </div>
            
            <button
              onClick={openDepositModal}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg shadow-md transition cursor-pointer shrink-0"
            >
              <PlusCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Deposit</span>
            </button>
          </div>

          {/* Customer Feedback Button */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('fbstore_open_feedback'))}
            className="flex items-center gap-1 text-[11px] sm:text-xs text-purple-700 dark:text-purple-300 font-semibold px-2 sm:px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition cursor-pointer shrink-0"
            title="Feedback & Feature Suggestions"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-purple-500" />
            <span className="hidden sm:inline">Feedback</span>
          </button>

          {/* User Profile & Password Change Button */}
          <button
            type="button"
            onClick={openProfileModal}
            className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 font-semibold px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition cursor-pointer shrink-0"
            title="Profile & Change Password"
          >
            <UserIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#1877F2]" />
            <span className="hidden sm:inline">@{user?.username}</span>
            <span className="sm:hidden text-[10px]">Profile</span>
          </button>

          {/* Sign Out */}
          <button
            onClick={logout}
            className="p-1.5 sm:p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:border-slate-800 transition cursor-pointer shrink-0"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
