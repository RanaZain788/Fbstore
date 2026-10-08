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
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PurchaseOrder, DepositRequest } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

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

  const [activeTab, setActiveTab] = useState<'store' | 'purchases' | 'deposits'>('store');

  useEffect(() => {
    if (resetToStoreTrigger) {
      setActiveTab('store');
    }
  }, [resetToStoreTrigger]);

  // Store information (Initialized from cache to prevent flashing old default 12 PKR)
  const [pricePerId, setPricePerId] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('fbstore_cached_price');
      if (cached && !isNaN(Number(cached)) && Number(cached) > 0) {
        return Number(cached);
      }
    }
    return 0; // 0 indicates waiting for live fetch, prevents flashing old 12
  });
  const [availableStock, setAvailableStock] = useState<number>(0);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Buy Modal State
  const [showBuyModal, setShowBuyModal] = useState(false);
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
        if (typeof d.pricePerId === 'number') {
          setPricePerId(d.pricePerId);
          localStorage.setItem('fbstore_cached_price', String(d.pricePerId));
        }
        setAvailableStock(d.availableStockCount || 0);
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

  // Real-time stock, price, and live deposit updates via SSE
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      const targetParam = user?.id ? `?userId=${user.id}` : '';
      eventSource = new EventSource(`/api/events${targetParam}`);
      
      eventSource.addEventListener('stock_updated', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.availableCount !== undefined) {
            setAvailableStock(d.availableCount);
          }
        } catch (err) {}
      });

      // Realtime price update: directly updates state without reload!
      eventSource.addEventListener('price_updated', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (typeof d.pricePerId === 'number') {
            setPricePerId(d.pricePerId);
            localStorage.setItem('fbstore_cached_price', String(d.pricePerId));
          }
        } catch (err) {}
      });

      eventSource.addEventListener('settings_updated', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.settings && typeof d.settings.pricePerId === 'number') {
            setPricePerId(d.settings.pricePerId);
            localStorage.setItem('fbstore_cached_price', String(d.settings.pricePerId));
          }
        } catch (err) {}
      });

      // Live deposit approval
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

      // Live deposit rejection
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

      // Live deposit status change (pending <-> approved <-> rejected)
      eventSource.addEventListener('deposit_status_updated', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.deposit) {
            setDeposits(prev => prev.map(item => item.id === d.deposit.id ? { ...item, ...d.deposit } : item));
            if (typeof d.newBalance === 'number' && user && d.deposit.userId === user.id) {
              updateBalanceLocally(d.newBalance);
            }
          }
        } catch (err) {}
        fetchStoreData();
      });

      // Live new deposit created
      eventSource.addEventListener('deposit_created', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.deposit && user && d.deposit.userId === user.id) {
            setDeposits(prev => {
              if (prev.some(item => item.id === d.deposit.id)) return prev;
              return [d.deposit, ...prev];
            });
          }
        } catch (err) {}
        fetchStoreData();
      });

      // Live wallet balance update
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

  const totalCost = (buyQuantity || 1) * pricePerId;
  const userBalance = user?.walletBalance || 0;
  const isBalanceSufficient = userBalance >= totalCost;
  const shortfall = Math.max(0, totalCost - userBalance);

  // Handle Buy Action
  const handleConfirmPurchase = async () => {
    if (!token) return;

    if (availableStock < buyQuantity) {
      showToast('Out of Stock', `Only ${availableStock} accounts currently available.`, 'error');
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
        body: JSON.stringify({ quantity: buyQuantity }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('Purchase Failed', data.error || 'Could not complete purchase.', 'error');
        setIsBuying(false);
        return;
      }

      // Update local wallet balance
      if (typeof data.remainingBalance === 'number') {
        updateBalanceLocally(data.remainingBalance);
      }

      // Confetti celebration (visual only, silent)
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (err) {}

      setRecentOrder(data.order);
      setShowBuyModal(false);
      setPurchases(prev => [data.order, ...prev]);
      setAvailableStock(prev => Math.max(0, prev - buyQuantity));
      showToast('Purchase Successful', `Purchased ${buyQuantity} Facebook account(s).`, 'success');
    } catch (err: any) {
      showToast('Error', err.message || 'Network error occurred.', 'error');
    } finally {
      setIsBuying(false);
    }
  };

  // Download .txt file
  const downloadTxtFile = (order: PurchaseOrder) => {
    const textContent = order.ids.join('\n');
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `facebook_accounts_${order.id.slice(-6)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Downloaded', 'Text file downloaded to your device.', 'success');
  };

  // Copy all IDs to clipboard
  const copyAllIds = (order: PurchaseOrder) => {
    const textContent = order.ids.join('\n');
    navigator.clipboard.writeText(textContent);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
    showToast('Copied', 'All UID:Password credentials copied.', 'info');
  };

  return (
    <div className="space-y-6">
      
      {/* Overview Top Card */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm dark:shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Welcome,</span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            @{user?.username}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Instant Facebook accounts store with UID:Password handover.
          </p>
        </div>

        {/* User Balance Card - Clean Mobile & Desktop Presentation */}
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

      {/* Navigation Tabs - Horizontally scrollable and crystal clear on mobile */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto no-scrollbar scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0">
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
      </div>

      {/* TAB 1: SINGLE PRODUCT STORE BOX */}
      {activeTab === 'store' && (
        <div className="space-y-6">
          
          {/* THE SINGLE PRODUCT HERO BOX */}
          <div className="relative bg-gradient-to-br from-blue-50/70 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-950 border border-blue-100 dark:border-slate-800 rounded-3xl p-5 sm:p-8 shadow-md dark:shadow-2xl overflow-hidden transition-colors">
            
            {/* Subtle glow badge */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              {/* Product Info */}
              <div className="space-y-3 max-w-xl">
                
                {/* Stock Status Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/90 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className={`w-2.5 h-2.5 rounded-full ${availableStock > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  <span className={availableStock > 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold'}>
                    {availableStock > 0 ? `${availableStock} Accounts in Stock` : 'Currently Out of Stock'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center font-black text-xl shadow-lg shadow-blue-600/30 shrink-0">
                    FB
                  </div>
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-['Space_Grotesk']">
                      Facebook Accounts
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      Standard format <code className="text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200/60 dark:border-blue-900/60">UID:Password</code> instant delivery.
                    </p>
                  </div>
                </div>

                {/* Features List */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1.5 p-2 bg-white/80 dark:bg-slate-950/60 rounded-xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span>Instant .txt file</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 bg-white/80 dark:bg-slate-950/60 rounded-xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                    <span>UID:Password format</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 bg-white/80 dark:bg-slate-950/60 rounded-xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span>JazzCash / Wallet</span>
                  </div>
                </div>
              </div>

              {/* Price & Buy Action Box */}
              <div className="bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center text-center min-w-[240px] shrink-0 space-y-4 shadow-sm dark:shadow-xl transition-colors">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Price per Account</span>
                  <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-['Space_Grotesk'] tracking-tight mt-0.5">
                    {pricePerId > 0 ? (
                      <>Rs. {pricePerId} <span className="text-xs font-bold text-slate-500 dark:text-slate-400">PKR</span></>
                    ) : (
                      <span className="text-lg text-blue-500 animate-pulse font-mono">Loading...</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={availableStock <= 0}
                  onClick={() => {
                    setBuyQuantity(1);
                    setShowBuyModal(true);
                  }}
                  className={`w-full py-3 px-6 rounded-xl font-bold text-sm shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                    availableStock > 0
                      ? 'bg-[#1877F2] hover:bg-blue-600 text-white shadow-blue-600/30'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{availableStock > 0 ? 'Buy Accounts Now' : 'Out of Stock'}</span>
                </button>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {availableStock > 0 ? 'Instant credential handover' : 'Admin will restock soon'}
                </p>
              </div>

            </div>
          </div>

          {/* Quick Info Bar */}
          <div className="p-4 bg-blue-50/60 dark:bg-slate-900/60 border border-blue-100 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 transition-colors">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
              <span>Need balance to purchase? Deposit instantly using EasyPaisa.</span>
            </div>
            <button
              onClick={() => openDepositModalWithAmount(undefined)}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>Open Deposit System</span>
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
                When you buy Facebook accounts, your UID:Password credentials and download links will be safely stored here.
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
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[#1877F2] flex items-center justify-center font-bold text-xs shrink-0">
                      {order.quantity}x
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        {order.quantity} Facebook Account{order.quantity > 1 ? 's' : ''}
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

                {/* Delivered IDs list */}
                <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-800 dark:text-slate-300 space-y-1.5 max-h-48 overflow-y-auto select-all">
                  {order.ids.map((idLine, idx) => (
                    <div key={idx} className="flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-900/60 p-1 rounded">
                      <span className="break-all">{idLine}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(idLine);
                          showToast('Copied', idLine, 'info');
                        }}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 ml-2 shrink-0 cursor-pointer"
                        title="Copy single ID"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
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
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Your EasyPaisa Deposit Requests</h3>
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
                When you send money to the EasyPaisa account, submit your request here. Admin will approve it to add balance.
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

      {/* POPUP 1: BUY MODAL */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 transition-colors">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#1877F2] text-white flex items-center justify-center font-black text-xs shadow-md">
                  FB
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Buy Facebook Accounts</h3>
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
                Select Quantity (Max Available: {availableStock})
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
                  max={availableStock}
                  value={buyQuantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setBuyQuantity(isNaN(val) ? 1 : Math.min(availableStock, Math.max(1, val)));
                  }}
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl py-2 text-center text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#1877F2]"
                />
                <button
                  type="button"
                  onClick={() => setBuyQuantity(prev => Math.min(availableStock, prev + 1))}
                  className="w-10 h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl flex items-center justify-center text-lg cursor-pointer transition"
                >
                  +
                </button>
              </div>

              {/* Quick Quantity Buttons */}
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                {[1, 2, 5, 10, availableStock].filter((v, i, a) => v <= availableStock && a.indexOf(v) === i).map((qty) => (
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
                    {qty === availableStock && qty > 10 ? `Max (${qty})` : `${qty}x`}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Calculation Card */}
            <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Calculation</span>
                <span>{buyQuantity} accounts × Rs. {pricePerId}</span>
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
                  <span>Deposit Rs. {shortfall} PKR via EasyPaisa</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isBuying}
                  onClick={handleConfirmPurchase}
                  className="w-full py-3 bg-[#1877F2] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
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

      {/* POPUP 2: INSTANT DELIVERY MODAL (AFTER PURCHASE) */}
      {recentOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 transition-colors">
            
            <div className="text-center pb-2">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Purchase Successful!</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Your Facebook account credentials in <code className="text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60 px-1 py-0.5 rounded">UID:Password</code> format:
              </p>
            </div>

            {/* Delivered Box */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-800 dark:text-slate-200 space-y-1.5 max-h-52 overflow-y-auto select-all">
              {recentOrder.ids.map((idLine, idx) => (
                <div key={idx} className="p-1.5 bg-white dark:bg-slate-900/60 rounded border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                  <span className="break-all">{idLine}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(idLine);
                      showToast('Copied', idLine, 'info');
                    }}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 ml-2 shrink-0 cursor-pointer"
                    title="Copy"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
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

    </div>
  );
};
