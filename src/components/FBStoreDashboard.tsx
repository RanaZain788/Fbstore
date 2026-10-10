import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Check, 
  Copy, 
  Clock, 
  ShoppingBag, 
  PlusCircle, 
  Download, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  X,
  FileText,
  Wallet,
  Sparkles,
  ArrowRight,
  Mail,
  Cookie,
  BadgeCheck,
  Flame,
  MessageSquarePlus,
  ShieldCheck,
  Star
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PurchaseOrder, DepositRequest, AccountCategory } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { AnnouncementsView } from './AnnouncementsView';
import { UserAdminMessages } from './UserAdminMessages';
import { FeedbackModal } from './FeedbackModal';

interface FBStoreDashboardProps {
  openDepositModalWithAmount: (amount?: number) => void;
  resetToStoreTrigger?: number;
}

export const FBStoreDashboard: React.FC<FBStoreDashboardProps> = ({
  openDepositModalWithAmount,
  resetToStoreTrigger,
}) => {
  const { user, token, updateBalanceLocally } = useAuth();
  const { showToast } = useNotifications();

  const [activeTab, setActiveTab] = useState<'store' | 'purchases' | 'deposits' | 'messages'>('store');
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // Store information
  const [pricePerIdSimple, setPricePerIdSimple] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('fbstore_cached_price_simple');
      if (cached && !isNaN(Number(cached)) && Number(cached) > 0) return Number(cached);
    }
    return 12;
  });

  const [pricePerIdVerified, setPricePerIdVerified] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('fbstore_cached_price_verified');
      if (cached && !isNaN(Number(cached)) && Number(cached) > 0) return Number(cached);
    }
    return 25;
  });

  const [availableStockSimple, setAvailableStockSimple] = useState<number>(0);
  const [availableStockVerified, setAvailableStockVerified] = useState<number>(0);

  // Box visibility controls (Admin can toggle each box)
  const [simpleAccountsEnabled, setSimpleAccountsEnabled] = useState<boolean>(true);
  const [verifiedAccountsEnabled, setVerifiedAccountsEnabled] = useState<boolean>(true);

  // Offer effect controls
  const [simpleOfferEnabled, setSimpleOfferEnabled] = useState<boolean>(false);
  const [simpleOfferMessage, setSimpleOfferMessage] = useState<string>('');
  const [verifiedOfferEnabled, setVerifiedOfferEnabled] = useState<boolean>(false);
  const [verifiedOfferMessage, setVerifiedOfferMessage] = useState<string>('');

  const [whatsappNumber, setWhatsappNumber] = useState<string>('923001234567');
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Buy Modal State
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyCategory, setBuyCategory] = useState<AccountCategory>('simple');
  const [buyQuantity, setBuyQuantity] = useState<number>(1);
  const [isBuying, setIsBuying] = useState(false);

  // Newly Unlocked Purchase Order Modal
  const [recentOrder, setRecentOrder] = useState<PurchaseOrder | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      const resStore = await fetch('/api/store/info');
      if (resStore.ok) {
        const d = await resStore.json();
        if (typeof d.pricePerIdSimple === 'number') {
          setPricePerIdSimple(d.pricePerIdSimple);
          localStorage.setItem('fbstore_cached_price_simple', String(d.pricePerIdSimple));
        }
        if (typeof d.pricePerIdVerified === 'number') {
          setPricePerIdVerified(d.pricePerIdVerified);
          localStorage.setItem('fbstore_cached_price_verified', String(d.pricePerIdVerified));
        }

        setAvailableStockSimple(d.availableStockSimple || 0);
        setAvailableStockVerified(d.availableStockVerified || 0);

        setSimpleAccountsEnabled(d.simpleAccountsEnabled !== false);
        setVerifiedAccountsEnabled(d.verifiedAccountsEnabled !== false);

        setSimpleOfferEnabled(Boolean(d.simpleOfferEnabled));
        setSimpleOfferMessage(d.simpleOfferMessage || '');
        setVerifiedOfferEnabled(Boolean(d.verifiedOfferEnabled));
        setVerifiedOfferMessage(d.verifiedOfferMessage || '');

        if (d.whatsappNumber) setWhatsappNumber(d.whatsappNumber);
      }

      if (token) {
        const [resOrders, resDeposits] = await Promise.all([
          fetch('/api/store/my-orders', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/deposits', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (resOrders.ok) {
          const d = await resOrders.json();
          setPurchases(d.orders || []);
        }
        if (resDeposits.ok) {
          const d = await resDeposits.json();
          setDeposits(d.deposits || []);
        }
      }
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
  }, [token]);

  useEffect(() => {
    const checkUnread = async () => {
      const currentToken = token || localStorage.getItem('fbstore_auth_token');
      if (!currentToken) return;
      try {
        const res = await fetch('/api/user/messages', {
          headers: { Authorization: `Bearer ${currentToken}` }
        });
        if (res.ok) {
          const d = await res.json();
          const unread = (d.messages || []).filter((m: any) => !m.read).length;
          setUnreadMessagesCount(unread);
        }
      } catch (e) {}
    };
    checkUnread();
  }, [token, activeTab]);

  useEffect(() => {
    if (resetToStoreTrigger) {
      setActiveTab('store');
    }
  }, [resetToStoreTrigger]);

  useEffect(() => {
    const handleOpenFeedback = () => setIsFeedbackOpen(true);
    window.addEventListener('fbstore_open_feedback', handleOpenFeedback);
    return () => window.removeEventListener('fbstore_open_feedback', handleOpenFeedback);
  }, []);

  // Real-time updates via SSE
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      const targetParam = user?.id ? `?userId=${user.id}` : '';
      eventSource = new EventSource(`/api/events${targetParam}`);
      
      eventSource.addEventListener('stock_updated', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.availableSimple !== undefined) setAvailableStockSimple(d.availableSimple);
          if (d.availableVerified !== undefined) setAvailableStockVerified(d.availableVerified);
        } catch (err) {}
      });

      eventSource.addEventListener('settings_updated', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.settings) {
            if (typeof d.settings.pricePerIdSimple === 'number') setPricePerIdSimple(d.settings.pricePerIdSimple);
            if (typeof d.settings.pricePerIdVerified === 'number') setPricePerIdVerified(d.settings.pricePerIdVerified);
            if (d.settings.simpleAccountsEnabled !== undefined) setSimpleAccountsEnabled(Boolean(d.settings.simpleAccountsEnabled));
            if (d.settings.verifiedAccountsEnabled !== undefined) setVerifiedAccountsEnabled(Boolean(d.settings.verifiedAccountsEnabled));
            if (d.settings.simpleOfferEnabled !== undefined) setSimpleOfferEnabled(Boolean(d.settings.simpleOfferEnabled));
            if (d.settings.simpleOfferMessage !== undefined) setSimpleOfferMessage(d.settings.simpleOfferMessage);
            if (d.settings.verifiedOfferEnabled !== undefined) setVerifiedOfferEnabled(Boolean(d.settings.verifiedOfferEnabled));
            if (d.settings.verifiedOfferMessage !== undefined) setVerifiedOfferMessage(d.settings.verifiedOfferMessage);
          }
        } catch (err) {}
      });

      eventSource.addEventListener('price_updated', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (typeof d.pricePerIdSimple === 'number') setPricePerIdSimple(d.pricePerIdSimple);
          if (typeof d.pricePerIdVerified === 'number') setPricePerIdVerified(d.pricePerIdVerified);
        } catch (err) {}
      });

      eventSource.addEventListener('deposit_approved', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.deposit) {
            setDeposits(prev => prev.map(item => item.id === d.deposit.id ? { ...item, status: 'approved' } : item));
            if (user && (d.deposit.userId === user.id || !d.deposit.userId)) {
              confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
              showToast('Deposit Approved!', `Rs. ${d.deposit.amount} PKR added to your wallet!`, 'success');
              if (typeof d.newBalance === 'number') {
                updateBalanceLocally(d.newBalance);
              }
            }
          }
        } catch (err) {}
        fetchStoreData();
      });

      eventSource.addEventListener('deposit_rejected', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.deposit) {
            setDeposits(prev => prev.map(item => item.id === d.deposit.id ? { ...item, status: 'rejected', rejectionReason: d.deposit.rejectionReason } : item));
            if (user && d.deposit.userId === user.id) {
              showToast('Deposit Rejected', d.deposit.rejectionReason || 'Deposit could not be verified.', 'error');
            }
          }
        } catch (err) {}
        fetchStoreData();
      });

      eventSource.addEventListener('wallet_updated', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (typeof d.newBalance === 'number' && (!d.userId || (user && d.userId === user.id))) {
            updateBalanceLocally(d.newBalance);
          }
        } catch (err) {}
      });

    } catch (e) {}

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [user?.id]);

  const activePrice = buyCategory === 'verified' ? pricePerIdVerified : pricePerIdSimple;
  const activeStock = buyCategory === 'verified' ? availableStockVerified : availableStockSimple;
  const totalCost = (buyQuantity || 1) * activePrice;
  const userBalance = user?.walletBalance || 0;
  const isBalanceSufficient = userBalance >= totalCost;
  const shortfall = Math.max(0, totalCost - userBalance);

  // Handle Buy Action
  const handleConfirmPurchase = async () => {
    if (!token) return;
    if (activeStock < buyQuantity) {
      showToast('Out of Stock', `Only ${activeStock} accounts currently available.`, 'error');
      return;
    }
    if (!isBalanceSufficient) {
      showToast('Insufficient Balance', `You need Rs ${shortfall} PKR more. Please deposit.`, 'warning');
      openDepositModalWithAmount(shortfall);
      setShowBuyModal(false);
      return;
    }

    setIsBuying(true);
    try {
      const res = await fetch('/api/store/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          quantity: buyQuantity,
          category: buyCategory
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('Purchase Failed', data.error || 'Could not complete purchase.', 'error');
        setIsBuying(false);
        return;
      }

      if (typeof data.remainingBalance === 'number') {
        updateBalanceLocally(data.remainingBalance);
      }

      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } catch (err) {}

      setRecentOrder(data.order);
      setShowBuyModal(false);
      setPurchases(prev => [data.order, ...prev]);

      if (buyCategory === 'verified') {
        setAvailableStockVerified(prev => Math.max(0, prev - buyQuantity));
      } else {
        setAvailableStockSimple(prev => Math.max(0, prev - buyQuantity));
      }

      const label = buyCategory === 'verified' ? 'Verified Facebook Account(s)' : 'Simple Facebook Account(s)';
      showToast('Purchase Successful', `Purchased ${buyQuantity} ${label}.`, 'success');
    } catch (err: any) {
      showToast('Error', err.message || 'Network error occurred.', 'error');
    } finally {
      setIsBuying(false);
    }
  };

  const getOrderAccounts = (order: PurchaseOrder) => {
    if (order.accounts && order.accounts.length > 0) {
      return order.accounts.map(acc => ({
        uid: acc.uid,
        password: acc.password,
        cookie: acc.cookie || undefined,
        category: acc.category || order.category || 'simple',
        rawLine: `${acc.uid}:${acc.password}`
      }));
    }
    return (order.ids || []).map(line => {
      let uid = '';
      let password = '';
      let cookie: string | undefined = undefined;

      if (line.includes('|')) {
        const parts = line.split('|');
        uid = parts[0]?.trim() || '';
        password = parts[1]?.trim() || '';
        if (parts.length >= 3) cookie = parts.slice(2).join('|').trim() || undefined;
      } else if (line.includes(':')) {
        const parts = line.split(':');
        uid = parts[0]?.trim() || '';
        password = parts[1]?.trim() || '';
        if (parts.length >= 3) cookie = parts.slice(2).join(':').trim() || undefined;
      } else {
        uid = line;
        password = '';
      }
      return { uid, password, cookie, category: order.category || 'simple', rawLine: `${uid}:${password}` };
    });
  };

  const downloadTxtFile = (order: PurchaseOrder) => {
    const accounts = getOrderAccounts(order);
    const hasAnyCookie = accounts.some(a => Boolean(a.cookie));
    
    let textContent = '';
    if (hasAnyCookie) {
      textContent = accounts.map((a, idx) => {
        let block = `[Account #${idx + 1} - ${a.category === 'verified' ? 'Verified Account' : 'Simple Account'}]\nUID: ${a.uid}\nPassword: ${a.password}`;
        if (a.cookie) {
          block += `\nCookie: ${a.cookie}`;
        }
        return block;
      }).join('\n\n----------------------------------------\n\n');
    } else {
      textContent = accounts.map(a => `${a.uid}:${a.password}`).join('\n');
    }

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `facebook_${order.category || 'accounts'}_${order.id.slice(-6)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Downloaded', 'Text file downloaded to your device.', 'success');
  };

  const copyAllIds = (order: PurchaseOrder) => {
    const textContent = order.ids.join('\n');
    navigator.clipboard.writeText(textContent);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
    showToast('Copied', 'All UID:Password credentials copied.', 'info');
  };

  return (
    <div className="space-y-6">
      
      {/* Real-time Announcements & Screen Notices */}
      <AnnouncementsView />

      {/* Overview Top Card */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm dark:shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Welcome,</span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            @{user?.username}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Instant Facebook accounts store with UID:Password & Cookie handover.
          </p>
        </div>

        {/* User Balance Card & Quick Feedback trigger */}
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3 sm:gap-4 p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl shadow-inner transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block leading-tight">
                Wallet Balance
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono leading-tight whitespace-nowrap">
                Rs. {userBalance.toLocaleString()} <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-sans">PKR</span>
              </span>
            </div>
          </div>
          <button
            onClick={() => openDepositModalWithAmount(undefined)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md transition cursor-pointer shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Deposit</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setActiveTab('store')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'store'
                ? 'bg-[#1877F2] text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>Buy Facebook Accounts</span>
          </button>

          <button
            onClick={() => setActiveTab('purchases')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'purchases'
                ? 'bg-[#1877F2] text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <Key className="w-4 h-4 shrink-0" />
            <span>My Purchased Accounts ({purchases.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('deposits')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'deposits'
                ? 'bg-[#1877F2] text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span>Deposit History ({deposits.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 relative ${
              activeTab === 'messages'
                ? 'bg-[#1877F2] text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <Mail className="w-4 h-4 shrink-0" />
            <span>Admin Messages</span>
            {unreadMessagesCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                {unreadMessagesCount}
              </span>
            )}
          </button>
        </div>

        {/* Feedback Trigger Button */}
        <button
          type="button"
          onClick={() => setIsFeedbackOpen(true)}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 transition cursor-pointer shrink-0"
          title="Give Feedback or Suggest Features"
        >
          <MessageSquarePlus className="w-4 h-4 text-purple-500" />
          <span className="hidden sm:inline">Suggestions / Feedback</span>
          <span className="sm:hidden text-[10px]">Feedback</span>
        </button>
      </div>

      {/* TAB 1: PRODUCT STORE BOXES (SIMPLE & VERIFIED) */}
      {activeTab === 'store' && (
        <div className="space-y-6">

          {/* Fallback if both boxes are disabled by admin */}
          {!simpleAccountsEnabled && !verifiedAccountsEnabled && (
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-slate-500 text-xs">
              No products are currently available in the store. Please check back shortly.
            </div>
          )}

          {/* ========================================================================= */}
          {/* BOX 1: FACEBOOK SIMPLE ACCOUNTS */}
          {/* ========================================================================= */}
          {simpleAccountsEnabled && (
            <div 
              className={`relative rounded-3xl p-5 sm:p-7 transition-all duration-300 overflow-hidden ${
                simpleOfferEnabled
                  ? 'border-2 border-amber-400 dark:border-amber-400 bg-gradient-to-br from-amber-100/70 via-orange-50/80 to-amber-50/60 dark:from-amber-950/60 dark:via-slate-900 dark:to-orange-950/40 shadow-2xl ring-2 ring-amber-400/40 animate-offer-glow'
                  : 'border border-blue-100 dark:border-slate-800 bg-gradient-to-br from-blue-50/70 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-950 shadow-md dark:shadow-2xl'
              }`}
            >
              {/* Offer Banner if active */}
              {simpleOfferEnabled && (
                <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md animate-pulse">
                  <Flame className="w-4 h-4" />
                  <span>SPECIAL OFFER!</span>
                  {simpleOfferMessage && (
                    <span className="font-medium text-[11px] text-amber-100 border-l border-amber-300/40 pl-2">
                      {simpleOfferMessage}
                    </span>
                  )}
                </div>
              )}

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                {/* Product Info */}
                <div className="space-y-3 max-w-xl">
                  {/* Stock Status Badge */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/90 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <span className={`w-2.5 h-2.5 rounded-full ${availableStockSimple > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    <span className={availableStockSimple > 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold'}>
                      {availableStockSimple > 0 ? `${availableStockSimple} Simple Accounts in Stock` : 'Currently Out of Stock'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center font-black text-xl shadow-lg shadow-blue-600/30 shrink-0">
                      FB
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-['Space_Grotesk'] flex items-center gap-2">
                        <span>Facebook Simple Accounts</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-700">
                          Standard
                        </span>
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                        Fresh standard Facebook accounts with instant <code className="text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60 px-1 py-0.5 rounded">UID:Password</code> delivery & cookies.
                      </p>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 p-2 bg-white/80 dark:bg-slate-950/60 rounded-xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Instant .txt file</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-2 bg-white/80 dark:bg-slate-950/60 rounded-xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>UID:Password & Cookie</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-2 bg-white/80 dark:bg-slate-950/60 rounded-xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Manual Deposit (PKR)</span>
                    </div>
                  </div>
                </div>

                {/* Price & Buy Action Box */}
                <div className="bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center text-center min-w-[240px] shrink-0 space-y-4 shadow-sm dark:shadow-xl transition-colors">
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Simple ID Price</span>
                    <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-['Space_Grotesk'] tracking-tight mt-0.5">
                      Rs. {pricePerIdSimple} <span className="text-xs font-bold text-slate-500 dark:text-slate-400">PKR</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={availableStockSimple <= 0}
                    onClick={() => {
                      setBuyCategory('simple');
                      setBuyQuantity(1);
                      setShowBuyModal(true);
                    }}
                    className={`w-full py-3 px-6 rounded-xl font-bold text-sm shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                      availableStockSimple > 0
                        ? 'bg-[#1877F2] hover:bg-blue-600 text-white shadow-blue-600/30'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>{availableStockSimple > 0 ? 'Buy Simple Accounts' : 'Out of Stock'}</span>
                  </button>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {availableStockSimple > 0 ? 'Instant credential delivery' : 'Admin will restock soon'}
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* BOX 2: FACEBOOK VERIFIED ACCOUNTS (NEW ULTRA COOL DESIGN) */}
          {/* ========================================================================= */}
          {verifiedAccountsEnabled && (
            <div 
              className={`relative rounded-3xl p-5 sm:p-7 transition-all duration-300 overflow-hidden ${
                verifiedOfferEnabled
                  ? 'border-2 border-cyan-400 dark:border-cyan-400 bg-gradient-to-br from-cyan-100/80 via-indigo-50/70 to-purple-100/80 dark:from-indigo-950/80 dark:via-purple-950/60 dark:to-cyan-950/50 shadow-2xl ring-2 ring-cyan-400/40 animate-verified-aura'
                  : 'border-2 border-indigo-500/40 dark:border-indigo-500/60 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900/90 shadow-xl dark:shadow-2xl'
              }`}
            >
              {/* Cool Iridescent Ambient Glow */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/15 via-indigo-500/20 to-purple-600/20 rounded-full blur-3xl pointer-events-none" />

              {/* Offer Banner if active */}
              {verifiedOfferEnabled && (
                <div className="mb-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-lg animate-pulse">
                  <Flame className="w-4 h-4" />
                  <span>VERIFIED SPECIAL OFFER!</span>
                  {verifiedOfferMessage && (
                    <span className="font-medium text-[11px] text-emerald-100 border-l border-emerald-300/40 pl-2">
                      {verifiedOfferMessage}
                    </span>
                  )}
                </div>
              )}

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                {/* Product Info */}
                <div className="space-y-3 max-w-xl">
                  {/* Stock Status Badge */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/90 dark:bg-slate-950/90 border border-emerald-500/30 shadow-xs">
                    <span className={`w-2.5 h-2.5 rounded-full ${availableStockVerified > 0 ? 'bg-cyan-400 animate-pulse' : 'bg-rose-500'}`} />
                    <span className={availableStockVerified > 0 ? 'text-cyan-600 dark:text-cyan-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-semibold'}>
                      {availableStockVerified > 0 ? `${availableStockVerified} Verified Accounts in Stock` : 'Currently Out of Stock'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-600/40 shrink-0">
                      <BadgeCheck className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-['Space_Grotesk'] flex items-center gap-2">
                        <span>Facebook Verified Accounts</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-700 dark:text-cyan-300 font-black border border-cyan-500/40 flex items-center gap-1 shadow-xs">
                          <Star className="w-3 h-3 text-cyan-400 fill-cyan-400" />
                          <span>VIP Verified</span>
                        </span>
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                        High-trust, fully verified Facebook profiles with cookies & complete UID:Password login access.
                      </p>
                    </div>
                  </div>

                  {/* Verified Specific Features List */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-xs text-slate-700 dark:text-slate-200">
                    <div className="flex items-center gap-1.5 p-2 bg-white/80 dark:bg-slate-950/70 rounded-xl border border-indigo-500/30 shadow-xs">
                      <BadgeCheck className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                      <span>Verified Trust Score</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-2 bg-white/80 dark:bg-slate-950/70 rounded-xl border border-indigo-500/30 shadow-xs">
                      <Cookie className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Cookie & UID Included</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-2 bg-white/80 dark:bg-slate-950/70 rounded-xl border border-indigo-500/30 shadow-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Low Checkpoint Risk</span>
                    </div>
                  </div>
                </div>

                {/* Price & Buy Action Box */}
                <div className="bg-white dark:bg-slate-950/90 border border-indigo-500/40 rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center text-center min-w-[240px] shrink-0 space-y-4 shadow-xl">
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Verified ID Price</span>
                    <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent font-['Space_Grotesk'] tracking-tight mt-0.5">
                      Rs. {pricePerIdVerified} <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">PKR</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={availableStockVerified <= 0}
                    onClick={() => {
                      setBuyCategory('verified');
                      setBuyQuantity(1);
                      setShowBuyModal(true);
                    }}
                    className={`w-full py-3 px-6 rounded-xl font-bold text-sm shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                      availableStockVerified > 0
                        ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:opacity-95 text-white shadow-indigo-600/30'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <BadgeCheck className="w-4 h-4" />
                    <span>{availableStockVerified > 0 ? 'Buy Verified Accounts' : 'Out of Stock'}</span>
                  </button>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {availableStockVerified > 0 ? 'Instant verified credential delivery' : 'Admin will restock verified soon'}
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* Customer Feedback Banner Bar */}
          <div className="p-4 bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-300 transition-colors">
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>Have a feature idea, pricing question, or issue to report? Send direct feedback to the Admin!</span>
            </div>
            <button
              onClick={() => setIsFeedbackOpen(true)}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-sm"
            >
              <span>Submit Suggestion / Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      )}

      {/* TAB 2: MY PURCHASED ACCOUNTS */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          {purchases.length === 0 ? (
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-10 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full flex items-center justify-center mx-auto">
                <Key className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No Accounts Purchased Yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                When you buy Facebook accounts, your credentials and cookies will be safely stored here with download links.
              </p>
              <button
                onClick={() => setActiveTab('store')}
                className="px-4 py-2 bg-[#1877F2] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                Go to Store
              </button>
            </div>
          ) : (
            purchases.map((order) => (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs dark:shadow-lg space-y-4 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      order.category === 'verified'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-blue-500/10 text-[#1877F2] border border-blue-500/20'
                    }`}>
                      {order.quantity}x
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
                        <span>{order.quantity} {order.category === 'verified' ? 'Verified Account' : 'Simple Account'}{order.quantity > 1 ? 's' : ''}</span>
                        {order.category === 'verified' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold">
                            Verified
                          </span>
                        )}
                      </h4>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {new Date(order.purchasedAt).toLocaleString()} • Rs. {order.totalPrice} PKR
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyAllIds(order)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy All</span>
                    </button>
                    <button
                      onClick={() => downloadTxtFile(order)}
                      className="px-3 py-1.5 bg-[#1877F2] hover:bg-blue-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .txt</span>
                    </button>
                  </div>
                </div>

                {/* Delivered IDs list with copy credentials and copy cookie buttons */}
                <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2 max-h-56 overflow-y-auto">
                  {getOrderAccounts(order).map((acc, idx) => (
                    <div 
                      key={idx} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 rounded-lg hover:border-blue-400/50 transition-colors"
                    >
                      <div className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all flex items-center gap-1.5">
                        <span className="text-slate-400 text-[10px]">#{idx + 1}</span>
                        <span className="font-bold text-[#1877F2] dark:text-blue-400">{acc.uid}</span>
                        <span className="text-slate-400">:</span>
                        <span className="text-slate-700 dark:text-slate-300 font-semibold">{acc.password}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${acc.uid}:${acc.password}`);
                            showToast('Copied Login', `${acc.uid}:${acc.password}`, 'info');
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                          title="Copy UID:Password"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Login</span>
                        </button>
                        {acc.cookie && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(acc.cookie!);
                              showToast('Cookie Copied! 🍪', `Cookie for ID ${acc.uid} copied to clipboard!`, 'success');
                            }}
                            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-md text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
                            title="Copy Cookie"
                          >
                            <Cookie className="w-3 h-3 text-amber-500" />
                            <span>Copy Cookie</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: DEPOSIT HISTORY */}
      {activeTab === 'deposits' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Your Deposit Requests</h3>
            <button
              onClick={() => openDepositModalWithAmount(undefined)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md transition cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Deposit</span>
            </button>
          </div>

          {deposits.length === 0 ? (
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-10 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No Deposit Requests Yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                When you send payment via EasyPaisa or JazzCash, submit your request here. Admin will approve it to add balance.
              </p>
            </div>
          ) : (
            deposits.map((dep) => (
              <div
                key={dep.id}
                className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs dark:shadow-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                    Rs.
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">
                        Rs. {dep.amount} PKR
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          dep.status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : dep.status === 'rejected'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {dep.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      TrxID: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{dep.transactionId}</span> • {new Date(dep.createdAt).toLocaleString()}
                    </span>
                    {dep.rejectionReason && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium">
                        Reason: {dep.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right sm:self-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Sender: <strong className="text-slate-800 dark:text-white font-medium">{dep.senderAccountName}</strong>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: ADMIN MESSAGES */}
      {activeTab === 'messages' && (
        <UserAdminMessages />
      )}

      {/* POPUP 1: BUY MODAL (SUPPORTS SIMPLE OR VERIFIED CATEGORY) */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 transition-colors">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-md ${
                  buyCategory === 'verified' 
                    ? 'bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white' 
                    : 'bg-[#1877F2] text-white'
                }`}>
                  {buyCategory === 'verified' ? <BadgeCheck className="w-4 h-4" /> : 'FB'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    Buy {buyCategory === 'verified' ? 'Verified Accounts' : 'Simple Accounts'}
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Category: {buyCategory === 'verified' ? 'Facebook VIP Verified' : 'Facebook Standard Simple'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowBuyModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quantity Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Select Quantity (Max Available: {activeStock})
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBuyQuantity(prev => Math.max(1, prev - 1))}
                  className="w-10 h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl flex items-center justify-center text-lg cursor-pointer transition"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={activeStock}
                  value={buyQuantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setBuyQuantity(isNaN(val) ? 1 : Math.min(activeStock, Math.max(1, val)));
                  }}
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl py-2 text-center text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#1877F2]"
                />
                <button
                  type="button"
                  onClick={() => setBuyQuantity(prev => Math.min(activeStock, prev + 1))}
                  className="w-10 h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl flex items-center justify-center text-lg cursor-pointer transition"
                >
                  +
                </button>
              </div>

              {/* Quick Quantity Buttons */}
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                {[1, 2, 5, 10, activeStock].filter((v, i, a) => v <= activeStock && a.indexOf(v) === i).map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setBuyQuantity(qty)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      buyQuantity === qty
                        ? 'bg-blue-600/15 border-blue-500 text-[#1877F2] dark:text-blue-300'
                        : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {qty === activeStock && qty > 10 ? `Max (${qty})` : `${qty}x`}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Calculation Card */}
            <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Calculation</span>
                <span>{buyQuantity} accounts × Rs. {activePrice}</span>
              </div>
              <div className="flex items-center justify-between text-slate-900 dark:text-white font-bold pt-1 border-t border-slate-200 dark:border-slate-800/80">
                <span>Total Cost</span>
                <span className="text-base text-slate-900 dark:text-white font-mono">Rs. {totalCost} PKR</span>
              </div>
              <div className="flex items-center justify-between pt-1 text-slate-600 dark:text-slate-400">
                <span>Your Wallet Balance</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">Rs. {userBalance} PKR</span>
              </div>
            </div>

            {/* Shortfall warning */}
            {!isBalanceSufficient && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <div>
                  <span className="font-bold block">Insufficient Balance</span>
                  <span>You need Rs {shortfall} PKR more to buy {buyQuantity} account(s).</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2">
              {!isBalanceSufficient ? (
                <button
                  type="button"
                  onClick={() => {
                    openDepositModalWithAmount(shortfall);
                    setShowBuyModal(false);
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Deposit Rs. {shortfall} PKR via EasyPaisa / JazzCash</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isBuying}
                  onClick={handleConfirmPurchase}
                  className={`w-full py-3 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 ${
                    buyCategory === 'verified'
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:opacity-95 shadow-indigo-600/30'
                      : 'bg-[#1877F2] hover:bg-blue-600 shadow-blue-600/30'
                  }`}
                >
                  {isBuying ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Purchase (Rs. {totalCost} PKR)</span>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* POPUP 2: INSTANT DELIVERY MODAL */}
      {recentOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 transition-colors">
            
            <div className="text-center pb-2">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Purchase Successful!</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Your credentials ({recentOrder.category === 'verified' ? 'Verified Accounts' : 'Simple Accounts'}) with cookies:
              </p>
            </div>

            {/* Delivered Box */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2 max-h-56 overflow-y-auto">
              {getOrderAccounts(recentOrder).map((acc, idx) => (
                <div 
                  key={idx} 
                  className="p-2 bg-white dark:bg-slate-900/60 rounded border border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all flex items-center gap-1.5">
                    <span className="text-slate-400 text-[10px]">#{idx + 1}</span>
                    <span className="font-bold text-[#1877F2] dark:text-blue-400">{acc.uid}</span>
                    <span className="text-slate-400">:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">{acc.password}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${acc.uid}:${acc.password}`);
                        showToast('Copied Login', `${acc.uid}:${acc.password}`, 'info');
                      }}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                      title="Copy UID:Password"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy Login</span>
                    </button>
                    {acc.cookie && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(acc.cookie!);
                          showToast('Cookie Copied! 🍪', `Cookie for ID ${acc.uid} copied to clipboard!`, 'success');
                        }}
                        className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
                        title="Copy Cookie"
                      >
                        <Cookie className="w-3 h-3 text-amber-500" />
                        <span>Copy Cookie</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions: Copy All & Download .txt */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => copyAllIds(recentOrder)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copiedSuccess ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSuccess ? 'Copied All!' : 'Copy All IDs'}</span>
              </button>
              <button
                type="button"
                onClick={() => downloadTxtFile(recentOrder)}
                className="py-2.5 bg-[#1877F2] hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download .txt File</span>
              </button>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setRecentOrder(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Close & View in Dashboard
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Customer Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        adminWhatsapp={whatsappNumber}
      />

    </div>
  );
};
