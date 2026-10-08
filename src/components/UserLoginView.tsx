import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  Sun,
  Moon,
  Monitor,
  MessageCircle,
  X,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';

export const UserLoginView: React.FC = () => {
  const { login, register } = useAuth();
  const { showToast } = useNotifications();
  const { mode, resolvedTheme, setMode } = useTheme();

  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  
  // Login State
  const [loginInput, setLoginInput] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Register State (Direct Account Creation - Zero OTP)
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regConfirmPass, setRegConfirmPass] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);

  // Forgot Password via WhatsApp Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotUsernameInput, setForgotUsernameInput] = useState('');
  const [adminWhatsapp, setAdminWhatsapp] = useState('923001234567');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch admin WhatsApp number for forgot password support
  useEffect(() => {
    fetch('/api/store/info')
      .then(r => r.json())
      .then(d => {
        if (d.whatsappNumber) setAdminWhatsapp(d.whatsappNumber);
      })
      .catch(() => {});
  }, []);

  // 1. Direct Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!loginInput.trim() || !loginPass) {
      setErrorMsg('Please enter your username or email, and password.');
      return;
    }

    setIsLoading(true);
    const res = await login(loginInput.trim(), loginPass);
    setIsLoading(false);

    if (res.success) {
      showToast('Welcome Back', 'Logged in successfully.', 'success');
    } else {
      setErrorMsg(res.error || 'Invalid credentials. Please try again.');
    }
  };

  // 2. Direct Register Submit (No OTP - instant account creation)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanUsername = regUsername.trim();
    const cleanEmail = regEmail.trim().toLowerCase();

    if (!cleanUsername || !cleanEmail || !regPass) {
      setErrorMsg('Please fill in all registration fields.');
      return;
    }

    if (cleanUsername.length < 3) {
      setErrorMsg('Username must be at least 3 characters.');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (regPass.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (regPass !== regConfirmPass) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    const res = await register(cleanUsername, cleanEmail, regPass);
    setIsLoading(false);

    if (res.success) {
      showToast('Account Created', 'Welcome to FBStore! Your wallet balance is Rs. 0 PKR.', 'success');
    } else {
      setErrorMsg(res.error || 'Registration failed. Please try another username or email.');
    }
  };

  const handleOpenWhatsAppForgot = () => {
    const userParam = forgotUsernameInput.trim() || loginInput.trim() || 'My Account';
    const text = encodeURIComponent(`Assalam-o-Alaikum Admin! I forgot the password for my FBStore account: @${userParam}. Please help me reset it.`);
    const cleanNumber = adminWhatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanNumber}?text=${text}`, '_blank');
    setShowForgotModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080c14] text-slate-800 dark:text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-[#1877F2] selection:text-white transition-colors duration-300 relative">
      
      {/* Top Controls: Theme Toggle */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <button
          type="button"
          onClick={() => setMode('light')}
          className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
            mode === 'light' ? 'bg-blue-50 dark:bg-blue-900/40 text-[#1877F2]' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          title="Light Theme"
        >
          <Sun className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Light</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('dark')}
          className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
            mode === 'dark' ? 'bg-blue-50 dark:bg-blue-900/40 text-[#1877F2]' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          title="Dark Theme"
        >
          <Moon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Dark</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('system')}
          className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
            mode === 'system' ? 'bg-blue-50 dark:bg-blue-900/40 text-[#1877F2]' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          title="Auto / System Theme"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">System</span>
        </button>
      </div>

      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-[140px]" />
      </div>

      <div className="relative w-full max-w-md my-auto">
        
        {/* Brand Header with Capital FB in Logo */}
        <div className="text-center mb-6">
          <div 
            onClick={() => {
              setIsRegisterMode(false);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1877F2] text-white font-black text-2xl mb-3 shadow-xl shadow-blue-500/25 ring-4 ring-blue-500/15 cursor-pointer hover:scale-105 transition-transform"
            title="FBStore Home"
          >
            FB
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-['Space_Grotesk']">
            FB<span className="text-[#1877F2]">Store</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Facebook Accounts Marketplace • Instant UID:Password Handover
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl dark:shadow-2xl p-6 sm:p-8 transition-colors duration-200">
          
          {/* Main Navigation Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950/70 rounded-xl mb-6 border border-slate-200 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(false);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                !isRegisterMode
                  ? 'bg-[#1877F2] text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(true);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                isRegisterMode
                  ? 'bg-[#1877F2] text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Feedback Notices */}
          {errorMsg && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1: SIGN IN */}
          {/* ========================================================= */}
          {!isRegisterMode && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Username or Email
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    required
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    placeholder="Enter your username or email"
                    className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotUsernameInput(loginInput);
                      setShowForgotModal(true);
                    }}
                    className="text-xs text-[#1877F2] hover:underline font-semibold cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-500" />
                  <input
                    type={showLoginPass ? 'text' : 'password'}
                    required
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPass(!showLoginPass)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 bg-[#1877F2] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* TAB 2: CREATE ACCOUNT (DIRECT REGISTRATION - ZERO OTP) */}
          {/* ========================================================= */}
          {isRegisterMode && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Choose Username
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g. hasnain481"
                    className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Password (min 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-500" />
                  <input
                    type={showRegPass ? 'text' : 'password'}
                    required
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPass(!showRegPass)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showRegPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-500" />
                  <input
                    type={showRegPass ? 'text' : 'password'}
                    required
                    value={regConfirmPass}
                    onChange={(e) => setRegConfirmPass(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 bg-[#1877F2] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Account & Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

        </div>

        {/* Feature Highlights */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span>Secure Firebase & Local Storage</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            <span>Instant UID:Password Handover</span>
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* MODAL: FORGOT PASSWORD VIA WHATSAPP SUPPORT */}
      {/* ========================================================= */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-sm w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <MessageCircle className="w-5 h-5 text-emerald-500" />
                <span>Forgot Password?</span>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <p>
                Agar aap apna password bhool gaye hain to apna <strong>Username</strong> enter karein aur WhatsApp par Admin se rabta karein.
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Admin aapka password apne Admin Panel se direct reset kar k aapko instant new password de dega.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Aapka Username
              </label>
              <input
                type="text"
                value={forgotUsernameInput}
                onChange={(e) => setForgotUsernameInput(e.target.value)}
                placeholder="Enter your username"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleOpenWhatsAppForgot}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Contact Admin on WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
