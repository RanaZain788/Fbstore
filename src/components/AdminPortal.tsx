import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Layers, 
  Settings, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Copy, 
  Check, 
  ZoomIn, 
  X, 
  Clock, 
  MessageCircle, 
  LogOut,
  Lock,
  ExternalLink,
  DollarSign,
  AlertCircle,
  Database,
  Users,
  Search,
  Wallet,
  Edit3,
  Mail,
  KeyRound,
  Download,
  Upload,
  MoreVertical,
  Minus,
  Eye,
  EyeOff,
  Megaphone,
  Send,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  Cookie,
  RefreshCw,
  Video,
  Play,
  Film,
  CheckCheck,
  FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { DepositRequest, FbIdStockItem, StoreSettings, Announcement, AnnouncementType, MarqueeAnnouncement, AdminMessage } from '../types';
import { firebaseService } from '../services/firebaseService';

interface UserStatsItem {
  id: string;
  username: string;
  email: string;
  plainPassword?: string;
  walletBalance: number;
  createdAt: string;
  ordersCount: number;
  totalAccountsBought: number;
  totalSpent: number;
}

export const AdminPortal: React.FC = () => {
  const { user, token, logout } = useAuth();
  const { showToast } = useNotifications();

  // Admin login credentials - COMPLETELY EMPTY by default for security
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggedInAsAdmin, setIsLoggedInAsAdmin] = useState(false);

  const [activeTab, setActiveTab] = useState<'deposits' | 'users' | 'stock' | 'announcements' | 'messages' | 'tutorial' | 'backup' | 'settings'>('deposits');
  
  // Data
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [usersList, setUsersList] = useState<UserStatsItem[]>([]);
  const [stock, setStock] = useState<FbIdStockItem[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Announcements & Marquee State
  const [announcementsList, setAnnouncementsList] = useState<Announcement[]>([]);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annType, setAnnType] = useState<AnnouncementType>('info');
  const [annTargetType, setAnnTargetType] = useState<'all' | 'user'>('all');
  const [annTargetUserId, setAnnTargetUserId] = useState('');
  const [annShowAsPopup, setAnnShowAsPopup] = useState(false);
  const [annFrequency, setAnnFrequency] = useState<'every_refresh' | 'once_only'>('every_refresh');
  const [annActive, setAnnActive] = useState(true);
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);

  // Marquee Ticker Settings State
  const [marqueeSettings, setMarqueeSettings] = useState<MarqueeAnnouncement>({
    enabled: true,
    text: '⚡ Welcome to FBStore! Instant Facebook Accounts Delivery • 24/7 JazzCash & EasyPaisa Deposit • Guaranteed Fresh UIDs',
    speed: 'normal',
    showBadge: true,
    targetType: 'all',
  });
  const [isSavingMarquee, setIsSavingMarquee] = useState(false);

  // Welcome New User Greeting Settings State
  const [welcomeSettings, setWelcomeSettings] = useState<{
    enabled: boolean;
    title: string;
    message: string;
  }>({
    enabled: true,
    title: 'Welcome to FBStore, {username}! 🎉',
    message: 'Assalam-o-Alaikum {username}! Welcome to FBStore.\n\nYour account is now ready with Rs. 0 wallet balance. You can add balance via JazzCash / EasyPaisa and purchase verified Facebook accounts with instant delivery.\n\nThank you for choosing us!',
  });
  const [isSavingWelcome, setIsSavingWelcome] = useState(false);

  // Direct Admin Messages State
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageTargetUser, setMessageTargetUser] = useState<UserStatsItem | null>(null);
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgPriority, setMsgPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sentMessagesList, setSentMessagesList] = useState<AdminMessage[]>([]);

  // Search User
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Balance Adjustment Modal
  const [balanceModalUser, setBalanceModalUser] = useState<UserStatsItem | null>(null);
  const [adjustMode, setAdjustMode] = useState<'add' | 'deduct' | 'set'>('add');
  const [adjustAmount, setAdjustAmount] = useState<number>(120);
  const [adjustReason, setAdjustReason] = useState('WhatsApp screenshot verified');
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);

  // Total Lifetime Balance Adjustment Modal
  const [totalBalanceModalOpen, setTotalBalanceModalOpen] = useState(false);
  const [totalBalanceMode, setTotalBalanceMode] = useState<'deduct' | 'reset' | 'set'>('deduct');
  const [totalBalanceInput, setTotalBalanceInput] = useState<number>(100);
  const [isAdjustingTotal, setIsAdjustingTotal] = useState(false);

  // Stock addition
  const [stockAddMode, setStockAddMode] = useState<'individual' | 'builder' | 'bulk'>('individual');
  const [singleUid, setSingleUid] = useState('');
  const [singlePassword, setSinglePassword] = useState('');
  const [singleCookie, setSingleCookie] = useState('');
  const [pasteStockText, setPasteStockText] = useState('');
  const [bulkDelimiter, setBulkDelimiter] = useState<':' | '|' | '----' | '\t' | ','>(':');
  const [builderRows, setBuilderRows] = useState<Array<{ uid: string; password: string; cookie: string }>>([
    { uid: '', password: '', cookie: '' },
    { uid: '', password: '', cookie: '' },
    { uid: '', password: '', cookie: '' }
  ]);
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);

  // Tutorial Video ("How to login with cookies")
  const [tutorialTitle, setTutorialTitle] = useState('How to Login Facebook ID with Cookie (Video Tutorial) 🍪');
  const [tutorialVideoUrl, setTutorialVideoUrl] = useState('');
  const [tutorialInstructions, setTutorialInstructions] = useState(
    '1. Install "Cookie-Editor" extension in your Chrome, Brave or Edge browser.\n2. Open https://www.facebook.com in a new tab.\n3. Click the "Copy Cookie" button for your purchased account in FBStore.\n4. Click the Cookie-Editor extension icon on Facebook, click "Import", paste the cookie, and click Import.\n5. Refresh the Facebook page — you will be instantly logged in without needing a password!'
  );
  const [tutorialEnabled, setTutorialEnabled] = useState(true);
  const [isSavingTutorial, setIsSavingTutorial] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  // Database Backup & Firestore Sync Manager
  const [backupRawInput, setBackupRawInput] = useState('');
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [backupStatsResult, setBackupStatsResult] = useState<any>(null);
  const [priceInput, setPriceInput] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('fbstore_cached_price');
      if (cached && Number(cached) > 0) return Number(cached);
    }
    return 12;
  });

  // Lifetime Added Balance & Stock Filters
  const [totalLifetimeBalanceAdded, setTotalLifetimeBalanceAdded] = useState<number>(0);
  const [stockFilter, setStockFilter] = useState<'all' | 'available' | 'sold'>('all');

  // Screenshot Zoom Modal
  const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null);

  // Reject modal
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Change User Password Modal
  const [passwordModalUser, setPasswordModalUser] = useState<UserStatsItem | null>(null);
  const [adminNewPasswordInput, setAdminNewPasswordInput] = useState('');
  const [isUpdatingUserPassword, setIsUpdatingUserPassword] = useState(false);
  const [showModalPassword, setShowModalPassword] = useState(false);

  // Reveal password in user list
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  const toggleRevealPassword = (userId: string) => {
    setRevealedPasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleCopyPassword = (pass: string, username: string) => {
    if (!pass) {
      showToast('Notice', `Password for @${username} is encrypted/not saved yet. You can set a new one anytime.`, 'info');
      return;
    }
    navigator.clipboard.writeText(pass);
    showToast('Copied', `Password for @${username} copied to clipboard!`, 'success');
  };

  // Delete User Confirmation Modal
  const [deleteUserModal, setDeleteUserModal] = useState<UserStatsItem | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Deposit Three-Dots Action Menu
  const [activeMenuDepositId, setActiveMenuDepositId] = useState<string | null>(null);

  // Close Three-Dots menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.deposit-action-menu')) {
        setActiveMenuDepositId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Copy rule
  const [copiedRules, setCopiedRules] = useState(false);

  // Settings form (JazzCash, EasyPaisa, WhatsApp & SMTP)
  const [settingsForm, setSettingsForm] = useState({
    adminUsername: 'arslan481',
    adminPassword: 'Zain786081@&#',
    whatsappNumber: '923001234567',
    accountTitle: 'Muhammad Arslan',
    accountNumber: '03064887388',
    easypaisaTitle: 'Muhammad Arslan',
    easypaisaNumber: '03064887388',
    jazzcashTitle: 'Muhammad Arslan',
    jazzcashNumber: '03064887388',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
  });

  const checkAdminAuth = async () => {
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (currentToken) {
      try {
        const res = await fetch('/api/admin/overview', {
          headers: { Authorization: `Bearer ${currentToken}` }
        });
        if (res.ok) {
          setIsLoggedInAsAdmin(true);
          fetchAdminData();
          return;
        }
      } catch (e) {}
    }
    setIsLoggedInAsAdmin(false);
  };

  useEffect(() => {
    checkAdminAuth();
  }, [token]);

  const fetchAdminData = async () => {
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    try {
      setLoading(true);
      const [resDep, resStock, resUsers, resOverview, resAnn, resMarq, resMsg, resWelcome] = await Promise.all([
        fetch('/api/deposits', { headers: { Authorization: `Bearer ${currentToken}` } }),
        fetch('/api/admin/stock', { headers: { Authorization: `Bearer ${currentToken}` } }),
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${currentToken}` } }),
        fetch('/api/admin/overview', { headers: { Authorization: `Bearer ${currentToken}` } }),
        fetch('/api/admin/announcements', { headers: { Authorization: `Bearer ${currentToken}` } }),
        fetch('/api/marquee'),
        fetch('/api/admin/messages', { headers: { Authorization: `Bearer ${currentToken}` } }),
        fetch('/api/admin/welcome-settings', { headers: { Authorization: `Bearer ${currentToken}` } })
      ]);

      if (resDep.ok) {
        const d = await resDep.json();
        setDeposits(d.deposits || []);
      }
      if (resStock.ok) {
        const d = await resStock.json();
        setStock(d.stock || []);
      }
      if (resUsers.ok) {
        const d = await resUsers.json();
        setUsersList(d.users || []);
      }
      if (resAnn.ok) {
        const d = await resAnn.json();
        setAnnouncementsList(d.announcements || []);
      }
      if (resMarq.ok) {
        const d = await resMarq.json();
        if (d.marquee) setMarqueeSettings(d.marquee);
      }
      if (resMsg.ok) {
        const d = await resMsg.json();
        setSentMessagesList(d.messages || []);
      }
      if (resWelcome && resWelcome.ok) {
        const d = await resWelcome.json();
        if (d.welcomeConfig) setWelcomeSettings(d.welcomeConfig);
      }

      // Direct Firestore Users Recovery (Restores any users registered in Firebase Auth & Firestore)
      try {
        const fsUsers = await firebaseService.getUsersFirestore();
        if (fsUsers && fsUsers.length > 0) {
          setUsersList(prev => {
            const map = new Map<string, UserStatsItem>();
            prev.forEach(u => map.set(u.id, u));
            fsUsers.forEach(fsu => {
              if (!map.has(fsu.id)) {
                map.set(fsu.id, {
                  id: fsu.id,
                  username: fsu.username,
                  email: fsu.email,
                  plainPassword: fsu.plainPassword,
                  walletBalance: fsu.walletBalance || 0,
                  createdAt: fsu.createdAt,
                  ordersCount: 0,
                  totalAccountsBought: 0,
                  totalSpent: 0
                });
              }
            });
            return Array.from(map.values());
          });

          fetch('/api/admin/sync-firestore-users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${currentToken}`
            },
            body: JSON.stringify({ users: fsUsers })
          }).catch(() => {});
        }
      } catch (err) {}
      if (resOverview.ok) {
        const d = await resOverview.json();
        if (d.totalBalanceAddedLifetime !== undefined) {
          setTotalLifetimeBalanceAdded(d.totalBalanceAddedLifetime);
        } else if (d.settings?.totalBalanceAddedLifetime !== undefined) {
          setTotalLifetimeBalanceAdded(d.settings.totalBalanceAddedLifetime);
        }
        if (d.settings) {
          setStoreSettings(d.settings);
          if (typeof d.settings.pricePerId === 'number') {
            setPriceInput(d.settings.pricePerId);
            localStorage.setItem('fbstore_cached_price', String(d.settings.pricePerId));
          }
          const pTitle = d.settings.accountTitle || d.settings.jazzcashTitle || d.settings.easypaisaTitle || 'Muhammad Arslan';
          const pNumber = d.settings.accountNumber || d.settings.jazzcashNumber || d.settings.easypaisaNumber || '03064887388';
          setSettingsForm({
            adminUsername: d.settings.adminUsername || 'arslan481',
            adminPassword: d.settings.adminPassword || 'Zain786081@&#',
            whatsappNumber: d.settings.whatsappNumber || '923001234567',
            accountTitle: pTitle,
            accountNumber: pNumber,
            easypaisaTitle: pTitle,
            easypaisaNumber: pNumber,
            jazzcashTitle: pTitle,
            jazzcashNumber: pNumber,
            smtpHost: d.settings.smtp?.host || d.settings.smtpHost || 'smtp.gmail.com',
            smtpPort: d.settings.smtp?.port || d.settings.smtpPort || 587,
            smtpUser: d.settings.smtp?.user || d.settings.smtpUser || '',
            smtpPass: d.settings.smtp?.pass || d.settings.smtpPass || '',
          });
        }
      }
    } catch (e) {
      console.error('Admin fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Real-time synchronization for Admin Portal (Zero Refresh Needed)
  useEffect(() => {
    if (!isLoggedInAsAdmin) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events?userId=admin');

      // 1. New deposit request created live
      eventSource.addEventListener('deposit_created', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.deposit) {
            setDeposits(prev => {
              if (prev.some(item => item.id === d.deposit.id)) return prev;
              return [d.deposit, ...prev];
            });
            confetti({ particleCount: 30, spread: 60, origin: { y: 0.2 } });
            showToast('New Deposit Received', `Rs. ${d.deposit.amount} PKR from @${d.deposit.username}`, 'info');
          }
        } catch (err) {}
      });

      // 2. Deposit status changed live
      eventSource.addEventListener('deposit_status_updated', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.deposit) {
            setDeposits(prev => prev.map(item => item.id === d.deposit.id ? { ...item, ...d.deposit } : item));
          }
        } catch (err) {}
      });

      eventSource.addEventListener('deposit_approved', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.deposit) {
            setDeposits(prev => prev.map(item => item.id === d.deposit.id ? { ...item, status: 'approved' } : item));
          }
          fetchAdminData();
        } catch (err) {}
      });

      eventSource.addEventListener('deposit_rejected', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.deposit) {
            setDeposits(prev => prev.map(item => item.id === d.deposit.id ? { ...item, status: 'rejected' } : item));
          }
        } catch (err) {}
      });

      eventSource.addEventListener('deposit_deleted', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.depositId) {
            setDeposits(prev => prev.filter(item => item.id !== d.depositId));
          }
        } catch (err) {}
      });

      // 3. Stock list updated live
      eventSource.addEventListener('stock_updated', () => {
        fetchAdminData();
      });

      // 4. Wallet balance stats updated live
      eventSource.addEventListener('wallet_updated', () => {
        fetchAdminData();
      });

      // 5. Announcements updated live
      eventSource.addEventListener('announcements_updated', () => {
        fetchAdminData();
      });

      // 6. Marquee ticker updated live
      eventSource.addEventListener('marquee_updated', () => {
        fetchAdminData();
      });

      // 7. Users updated live
      eventSource.addEventListener('users_updated', () => {
        fetchAdminData();
      });
    } catch (err) {}

    // Firestore real-time snapshot listeners for Admin
    const unsubUsers = firebaseService.subscribeToUsers((fsUsers) => {
      if (fsUsers && fsUsers.length > 0) {
        setUsersList(prev => {
          const map = new Map<string, UserStatsItem>();
          prev.forEach(u => map.set(u.id, u));
          fsUsers.forEach(fsu => {
            if (!map.has(fsu.id)) {
              map.set(fsu.id, {
                id: fsu.id,
                username: fsu.username,
                email: fsu.email,
                plainPassword: fsu.plainPassword,
                walletBalance: fsu.walletBalance || 0,
                createdAt: fsu.createdAt,
                ordersCount: 0,
                totalAccountsBought: 0,
                totalSpent: 0
              });
            }
          });
          return Array.from(map.values());
        });
      }
    });

    const unsubAnn = firebaseService.subscribeToAnnouncements((annList) => {
      if (annList) setAnnouncementsList(annList);
    });

    const unsubMarq = firebaseService.subscribeToMarquee((marq) => {
      if (marq) setMarqueeSettings(marq);
    });

    return () => {
      eventSource?.close();
      unsubUsers();
      unsubAnn();
      unsubMarq();
    };
  }, [isLoggedInAsAdmin]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!adminUsername.trim() || !adminPassword) {
      setLoginError('Please enter your admin username and password.');
      return;
    }

    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: adminUsername.trim(),
          password: adminPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Invalid admin credentials.');
        setIsLoggingIn(false);
        return;
      }

      localStorage.setItem('fbstore_auth_token', data.token);
      setIsLoggedInAsAdmin(true);
      showToast('Admin Authenticated', 'Welcome to FBStore Administration.', 'success');
      window.location.reload();
    } catch (err: any) {
      setLoginError(err.message || 'Network error occurred.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 1. Direct User Wallet Adjustment (when user sends screenshot on WhatsApp)
  const handleUpdateUserBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceModalUser) return;
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    setIsUpdatingBalance(true);
    try {
      let payload: any;
      if (adjustMode === 'add') {
        payload = { addAmount: Math.abs(Number(adjustAmount)), reason: adjustReason };
      } else if (adjustMode === 'deduct') {
        payload = { addAmount: -Math.abs(Number(adjustAmount)), reason: adjustReason };
      } else {
        payload = { newBalance: Math.max(0, Number(adjustAmount)), reason: adjustReason };
      }

      const res = await fetch(`/api/admin/users/${balanceModalUser.id}/balance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('Update Failed', data.error || 'Could not update user balance.', 'error');
        setIsUpdatingBalance(false);
        return;
      }

      // Mirror to Firestore
      try {
        const finalBal = data.user?.walletBalance ?? (
          adjustMode === 'add' 
            ? balanceModalUser.walletBalance + adjustAmount 
            : adjustMode === 'deduct' 
              ? Math.max(0, balanceModalUser.walletBalance - adjustAmount) 
              : adjustAmount
        );
        await firebaseService.setUserBalanceDirect(balanceModalUser.id, finalBal);
      } catch (fsErr) {
        console.warn('Firestore user balance notice:', fsErr);
      }

      // Visual confetti if adding
      if (adjustMode === 'add') {
        try {
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
        } catch (err) {}
      }

      const verb = adjustMode === 'add' ? 'Added funds to' : adjustMode === 'deduct' ? 'Deducted balance from' : 'Set balance for';
      showToast('Balance Updated', `${verb} @${balanceModalUser.username}. New: Rs. ${data.user?.walletBalance ?? adjustAmount} PKR.`, 'success');
      setBalanceModalUser(null);
      fetchAdminData();
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to update balance.', 'error');
    } finally {
      setIsUpdatingBalance(false);
    }
  };

  // 2. Approve Deposit Request
  const handleApproveDeposit = async (dep: DepositRequest) => {
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/deposits/${dep.id}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${currentToken}` }
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('Approval Failed', data.error || 'Could not approve deposit.', 'error');
        setIsProcessing(false);
        return;
      }

      // Mirror to Firestore
      try {
        await firebaseService.approveDeposit(dep.id, dep.userId, dep.amount);
      } catch (fsErr) {
        console.warn('Firestore approve notice:', fsErr);
      }

      // Visual confetti
      try {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
      } catch (err) {}

      showToast('Deposit Approved', `Added Rs. ${dep.amount} PKR to @${dep.username}'s wallet.`, 'success');
      fetchAdminData();
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to approve.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Reject Deposit Request
  const handleConfirmReject = async () => {
    if (!rejectId) return;
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/deposits/${rejectId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ reason: rejectReason || 'Transaction could not be verified.' })
      });

      if (!res.ok) {
        showToast('Reject Failed', 'Could not reject request.', 'error');
        setIsProcessing(false);
        return;
      }

      showToast('Request Rejected', 'Deposit request was rejected.', 'info');
      setRejectId(null);
      setRejectReason('');
      fetchAdminData();
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to reject.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3b. Change Deposit Status (pending <-> approved <-> rejected) with automatic balance sync
  const handleSetDepositStatus = async (depositId: string, newStatus: 'pending' | 'approved' | 'rejected', reason?: string) => {
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    try {
      setIsProcessing(true);
      const res = await fetch(`/api/admin/deposits/${depositId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ status: newStatus, reason })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('Error', data.error || 'Failed to update deposit status.', 'error');
        return;
      }

      setDeposits(prev => prev.map(d => d.id === depositId ? { ...d, status: newStatus, rejectionReason: reason || d.rejectionReason } : d));
      setActiveMenuDepositId(null);

      if (newStatus === 'approved') {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
        showToast('Deposit Approved', 'Balance credited to user wallet.', 'success');
      } else if (newStatus === 'rejected') {
        showToast('Deposit Rejected', 'Status marked as rejected.', 'info');
      } else {
        showToast('Status: Pending', 'Deposit moved back to pending queue.', 'info');
      }

      fetchAdminData();
    } catch (err: any) {
      showToast('Error', err.message || 'Network error', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Bulk Add Stock (UID:Password)
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteStockText.trim()) {
      showToast('Required', 'Please paste at least one UID:Password line.', 'error');
      return;
    }

    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    setIsAddingStock(true);
    try {
      const res = await fetch('/api/admin/stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ text: pasteStockText })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('Add Stock Failed', data.error || 'Failed to add stock.', 'error');
        setIsAddingStock(false);
        return;
      }

      // Also mirror items to Firestore if available
      try {
        if (data.items && Array.isArray(data.items)) {
          await firebaseService.addStockBatch(data.items);
        }
      } catch (fsErr) {
        console.warn('Firestore stock notice:', fsErr);
      }

      showToast('Stock Added', `Added ${data.addedCount} Facebook account(s) to stock.`, 'success');
      setPasteStockText('');
      fetchAdminData();
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to add stock.', 'error');
    } finally {
      setIsAddingStock(false);
    }
  };

  // 4a. Add Single Individual Stock Account with Cookie
  const handleAddSingleStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleUid.trim() || !singlePassword.trim()) {
      showToast('Required', 'Please enter both UID and Password.', 'error');
      return;
    }

    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    setIsAddingStock(true);
    try {
      const res = await fetch('/api/admin/stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ 
          uid: singleUid.trim(),
          password: singlePassword.trim(),
          cookie: singleCookie.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('Add Stock Failed', data.error || 'Failed to add account.', 'error');
        setIsAddingStock(false);
        return;
      }

      showToast('Account Added', `Account UID ${singleUid.trim()} added to stock!${singleCookie.trim() ? ' (Cookie attached 🍪)' : ''}`, 'success');
      setSingleUid('');
      setSinglePassword('');
      setSingleCookie('');
      fetchAdminData();
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to add account.', 'error');
    } finally {
      setIsAddingStock(false);
    }
  };

  // 4b. Firebase Firestore Sync Now
  const handleSyncFirebaseNow = async () => {
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;
    setIsSyncingFirebase(true);
    try {
      const res = await fetch('/api/admin/firebase-sync-now', {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('Firestore Synced', 'All current users, stock, and orders saved to Firebase Firestore!', 'success');
      } else {
        showToast('Sync Notice', data.error || 'Please check your Firestore rules.', 'warning');
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Firebase sync failed.', 'error');
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  // 4c. Firebase Firestore Restore Now
  const handlePullFirebaseNow = async () => {
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;
    setIsSyncingFirebase(true);
    try {
      const res = await fetch('/api/admin/firebase-pull-now', {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('Restored from Firestore', `Recovered ${data.pulledCounts?.users || 0} users and ${data.pulledCounts?.stock || 0} stock items!`, 'success');
        fetchAdminData();
      } else {
        showToast('Restore Notice', data.error || 'Could not pull from Firestore.', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Firebase restore failed.', 'error');
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  // 5. Update Price Per ID
  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    if (!priceInput || priceInput <= 0) {
      showToast('Invalid Price', 'Price must be greater than 0 PKR.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ pricePerId: priceInput })
      });

      if (!res.ok) {
        showToast('Error', 'Failed to update price.', 'error');
        return;
      }

      showToast('Price Updated', `Price set to Rs. ${priceInput} PKR per ID.`, 'success');
      fetchAdminData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  // 6. Delete single stock item (available or sold)
  const handleDeleteStockItem = async (id: string, status?: string) => {
    const isSold = status === 'sold';
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    try {
      const res = await fetch(`/api/admin/stock/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.ok) {
        showToast('Deleted', isSold ? 'Sold account removed.' : 'Stock item removed.', 'info');
        setStock(prev => prev.filter(i => i.id !== id));
      }
    } catch (e) {}
  };

  // 6b. Clear all sold stock accounts
  const handleClearAllSoldStock = async () => {
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    try {
      const res = await fetch('/api/admin/stock/sold/clear', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Cleared', `Deleted ${data.removedCount || soldStockCount} sold accounts.`, 'success');
        fetchAdminData();
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to clear sold stock.', 'error');
    }
  };

  // 6c. Admin Change Any User's Password
  const handleAdminChangeUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !adminNewPasswordInput) return;
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    setIsUpdatingUserPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${passwordModalUser.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ newPassword: adminNewPasswordInput })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('Error', data.error || 'Failed to update user password.', 'error');
        return;
      }

      showToast('Password Updated', `New password set for @${passwordModalUser.username}`, 'success');
      setUsersList(prev => prev.map(u => 
        u.id === passwordModalUser.id 
          ? { ...u, plainPassword: adminNewPasswordInput }
          : u
      ));
      setPasswordModalUser(null);
      setAdminNewPasswordInput('');
      setShowModalPassword(false);
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setIsUpdatingUserPassword(false);
    }
  };

  // 6d. Admin Delete User Account
  const handleAdminDeleteUser = async () => {
    if (!deleteUserModal) return;
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    setIsDeletingUser(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteUserModal.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.ok) {
        showToast('User Deleted', `Account @${deleteUserModal.username} has been deleted.`, 'info');
        setUsersList(prev => prev.filter(u => u.id !== deleteUserModal.id));
        firebaseService.deleteUserFirestore(deleteUserModal.id).catch(() => {});
        setDeleteUserModal(null);
      } else {
        const data = await res.json();
        showToast('Error', data.error || 'Failed to delete user.', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setIsDeletingUser(false);
    }
  };

  // 6e. Admin Delete Deposit Request
  const handleDeleteDeposit = async (depId: string) => {
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    try {
      const res = await fetch(`/api/admin/deposits/${depId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.ok) {
        showToast('Deleted', 'Deposit request deleted.', 'info');
        setDeposits(prev => prev.filter(d => d.id !== depId));
        firebaseService.deleteDepositFirestore(depId).catch(() => {});
      } else {
        const data = await res.json();
        showToast('Error', data.error || 'Failed to delete deposit.', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  // 6c. Reset lifetime balance added counter (safe without window.confirm)
  const handleResetLifetimeBalance = async () => {
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    setIsAdjustingTotal(true);
    try {
      const res = await fetch('/api/admin/balance-stats/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.ok) {
        setTotalLifetimeBalanceAdded(0);
        showToast('Counter Reset', 'Total added balance counter reset to 0 PKR.', 'success');
        setTotalBalanceModalOpen(false);
        fetchAdminData();
      } else {
        const d = await res.json();
        showToast('Error', d.error || 'Failed to reset counter.', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to reset counter.', 'error');
    } finally {
      setIsAdjustingTotal(false);
    }
  };

  // 6d. Deduct or set lifetime balance added counter
  const handleAdjustTotalLifetimeBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    if (totalBalanceMode === 'reset') {
      return handleResetLifetimeBalance();
    }

    setIsAdjustingTotal(true);
    try {
      const payload = totalBalanceMode === 'deduct'
        ? { deductAmount: Math.abs(Number(totalBalanceInput)) }
        : { newAmount: Math.max(0, Number(totalBalanceInput)) };

      const res = await fetch('/api/admin/balance-stats/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('Error', data.error || 'Failed to update total balance counter.', 'error');
        return;
      }

      setTotalLifetimeBalanceAdded(data.totalBalanceAddedLifetime);
      const msg = totalBalanceMode === 'deduct'
        ? `Deducted Rs. ${totalBalanceInput} PKR from total counter.`
        : `Set total counter to Rs. ${totalBalanceInput} PKR.`;
      showToast('Counter Updated', msg, 'success');
      setTotalBalanceModalOpen(false);
      fetchAdminData();
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to update total balance counter.', 'error');
    } finally {
      setIsAdjustingTotal(false);
    }
  };

  // 7. Save Store Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    try {
      const pTitle = (settingsForm.accountTitle || settingsForm.jazzcashTitle || settingsForm.easypaisaTitle || '').trim();
      const pNumber = (settingsForm.accountNumber || settingsForm.jazzcashNumber || settingsForm.easypaisaNumber || '').trim();

      const payload = {
        ...settingsForm,
        accountTitle: pTitle,
        accountNumber: pNumber,
        easypaisaTitle: pTitle,
        easypaisaNumber: pNumber,
        jazzcashTitle: pTitle,
        jazzcashNumber: pNumber,
        whatsappNumber: (settingsForm.whatsappNumber || '').trim(),
      };

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('Error', data.error || 'Failed to save settings.', 'error');
        return;
      }

      // Save to local cache so other components update instantly
      if (pTitle) localStorage.setItem('fbstore_cached_account_title', pTitle);
      if (pNumber) localStorage.setItem('fbstore_cached_account_number', pNumber);
      if (payload.whatsappNumber) localStorage.setItem('fbstore_cached_whatsapp', payload.whatsappNumber);

      // Mirror settings to Firestore
      try {
        await firebaseService.saveSettings(data.settings);
      } catch (fsErr) {
        console.warn('Firestore settings notice:', fsErr);
      }

      showToast('Settings Saved', 'JazzCash account and store settings updated live on main website.', 'success');
      fetchAdminData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  // 8. Download Full Database Backup (db.json)
  const handleDownloadBackup = async () => {
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    try {
      const res = await fetch('/api/admin/database/backup', {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (!res.ok) {
        showToast('Backup Failed', 'Could not download database backup.', 'error');
        return;
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fbstore-database-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Backup Downloaded', 'Full database backup saved to your device.', 'success');
    } catch (err: any) {
      showToast('Error', err.message || 'Backup failed', 'error');
    }
  };

  // 9. Restore Database from Backup File
  const handleRestoreBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const res = await fetch('/api/admin/database/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify(parsed)
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('Restore Failed', data.error || 'Failed to restore database.', 'error');
        return;
      }

      showToast('Database Restored', data.message || 'All users and data restored successfully!', 'success');
      fetchAdminData();
    } catch (err: any) {
      showToast('Error', 'Invalid backup file or parse error: ' + (err.message || ''), 'error');
    } finally {
      e.target.value = '';
    }
  };

  // 10. Save Marquee Ticker Settings
  const handleSaveMarquee = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    setIsSavingMarquee(true);
    try {
      const res = await fetch('/api/admin/marquee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify(marqueeSettings)
      });
      if (res.ok) {
        showToast('Marquee Updated', 'Top announcement ticker updated live across website.', 'success');
        firebaseService.saveMarquee(marqueeSettings).catch(() => {});
      } else {
        const d = await res.json();
        showToast('Error', d.error || 'Failed to save marquee.', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to update marquee.', 'error');
    } finally {
      setIsSavingMarquee(false);
    }
  };

  // 10.1 Save Welcome Greeting Settings
  const handleSaveWelcomeSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    setIsSavingWelcome(true);
    try {
      const res = await fetch('/api/admin/welcome-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify(welcomeSettings)
      });
      if (res.ok) {
        showToast('Welcome Template Saved', 'Auto-greeting for new registered users updated.', 'success');
      } else {
        const d = await res.json();
        showToast('Error', d.error || 'Failed to save welcome settings.', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to save welcome settings.', 'error');
    } finally {
      setIsSavingWelcome(false);
    }
  };

  // 11. Open Announcement Modal (New)
  const handleOpenCreateAnnouncementModal = () => {
    setEditingAnnouncement(null);
    setAnnTitle('');
    setAnnMessage('');
    setAnnType('info');
    setAnnTargetType('all');
    setAnnTargetUserId('');
    setAnnShowAsPopup(false);
    setAnnFrequency('every_refresh');
    setAnnActive(true);
    setAnnouncementModalOpen(true);
  };

  // 12. Open Announcement Modal (Edit)
  const handleOpenEditAnnouncementModal = (ann: Announcement) => {
    setEditingAnnouncement(ann);
    setAnnTitle(ann.title);
    setAnnMessage(ann.message);
    setAnnType(ann.type);
    setAnnTargetType(ann.targetType);
    setAnnTargetUserId(ann.targetUserId || '');
    setAnnShowAsPopup(Boolean(ann.showAsPopup));
    setAnnFrequency(ann.frequency || 'every_refresh');
    setAnnActive(ann.active);
    setAnnouncementModalOpen(true);
  };

  // 13. Save Announcement (Create or Update)
  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    if (!annTitle.trim() || !annMessage.trim()) {
      showToast('Validation Error', 'Title and message are required.', 'error');
      return;
    }

    setIsSavingAnnouncement(true);
    try {
      const targetUser = usersList.find(u => u.id === annTargetUserId);
      const payload = {
        title: annTitle.trim(),
        message: annMessage.trim(),
        type: annType,
        targetType: annTargetType,
        targetUserId: annTargetType === 'user' ? annTargetUserId : undefined,
        targetUsername: annTargetType === 'user' ? (targetUser?.username || '') : undefined,
        showAsPopup: annShowAsPopup,
        frequency: annFrequency,
        active: annActive
      };

      const url = editingAnnouncement 
        ? `/api/admin/announcements/${editingAnnouncement.id}` 
        : '/api/admin/announcements';
      const method = editingAnnouncement ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        showToast(
          editingAnnouncement ? 'Announcement Updated' : 'Announcement Published',
          'Announcement is now active and live for website users.',
          'success'
        );
        if (data.announcement) {
          firebaseService.saveAnnouncement(data.announcement).catch(() => {});
        }
        setAnnouncementModalOpen(false);
        fetchAdminData();
      } else {
        showToast('Error', data.error || 'Failed to save announcement.', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Network error occurred.', 'error');
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  // 14. Delete Announcement
  const handleDeleteAnnouncement = async (id: string) => {
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.ok) {
        showToast('Announcement Deleted', 'Announcement has been removed from site.', 'info');
        setAnnouncementsList(prev => prev.filter(a => a.id !== id));
        firebaseService.deleteAnnouncement(id).catch(() => {});
      } else {
        const d = await res.json();
        showToast('Error', d.error || 'Failed to delete announcement.', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to delete announcement.', 'error');
    }
  };

  // 15. Toggle Announcement Active/Inactive
  const handleToggleAnnouncementActive = async (ann: Announcement) => {
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    try {
      const nextActive = !ann.active;
      const res = await fetch(`/api/admin/announcements/${ann.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ active: nextActive })
      });
      if (res.ok) {
        setAnnouncementsList(prev => prev.map(a => a.id === ann.id ? { ...a, active: nextActive } : a));
        firebaseService.saveAnnouncement({ ...ann, active: nextActive }).catch(() => {});
        showToast('Status Changed', nextActive ? 'Announcement is now visible.' : 'Announcement is now hidden.', 'info');
      }
    } catch (err) {}
  };

  // 16. Open Send Message Modal for User
  const handleOpenSendMessageModal = (targetUser?: UserStatsItem) => {
    setMessageTargetUser(targetUser || null);
    setMsgTitle('');
    setMsgBody('');
    setMsgPriority('normal');
    setMessageModalOpen(true);
  };

  // 17. Send Message to User
  const handleSendMessageToUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    if (!msgTitle.trim() || !msgBody.trim()) {
      showToast('Validation Error', 'Title and message text are required.', 'error');
      return;
    }

    const recipientId = messageTargetUser ? messageTargetUser.id : 'all';
    const recipientUsername = messageTargetUser ? messageTargetUser.username : 'All Users';

    setIsSendingMessage(true);
    try {
      const payload = {
        userId: recipientId,
        targetUsername: recipientUsername,
        title: msgTitle.trim(),
        message: msgBody.trim(),
        priority: msgPriority
      };

      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Message Sent', `Official message sent to @${recipientUsername}.`, 'success');
        if (data.message) {
          firebaseService.sendAdminMessage(data.message).catch(() => {});
          setSentMessagesList(prev => [data.message, ...prev]);
        }
        setMessageModalOpen(false);
      } else {
        showToast('Error', data.error || 'Failed to send message.', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to send message.', 'error');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // 18. Delete Admin Message
  const handleDeleteAdminMessage = async (msgId: string) => {
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    try {
      const res = await fetch(`/api/admin/messages/${msgId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.ok) {
        showToast('Message Deleted', 'Admin message deleted.', 'info');
        setSentMessagesList(prev => prev.filter(m => m.id !== msgId));
      }
    } catch (err) {}
  };

  // Filtered Users List
  const filteredUsers = usersList.filter(u => {
    const q = userSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const pendingDeposits = deposits.filter(d => d.status === 'pending');
  const availableStockCount = stock.filter(s => s.status === 'available').length;
  const soldStockCount = stock.filter(s => s.status === 'sold').length;

  const copyFirestoreRule = () => {
    const ruleText = `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}`;
    navigator.clipboard.writeText(ruleText);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2500);
    showToast('Rules Copied', 'Firestore security rules copied to clipboard.', 'info');
  };

  // Render Login Screen if not authenticated as admin
  if (!isLoggedInAsAdmin) {
    return (
      <div className="min-h-screen bg-[#080c14] flex flex-col items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 text-[#1877F2] flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">Admin Portal</h1>
            <p className="text-xs text-slate-400">
              Sign in with your secret administrator credentials.
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Username
              </label>
              <input
                type="text"
                required
                autoComplete="off"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="Enter admin username"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#1877F2]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Password
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#1877F2]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2.5 bg-[#1877F2] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {isLoggingIn ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Authenticate to Admin Panel</span>
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    );
  }

  // Render Full Admin Dashboard
  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      
      {/* Admin Top Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 border-b border-slate-800 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1877F2] text-white flex items-center justify-center font-black text-sm">
              FB
            </div>
            <div>
              <span className="font-extrabold text-sm text-white font-['Space_Grotesk'] tracking-tight">
                FBStore <span className="text-[#1877F2] font-semibold text-xs ml-1 bg-blue-950/70 border border-blue-600/30 px-2 py-0.5 rounded-full">Admin Panel</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">
              Logged in as <strong className="text-white">@{settingsForm.adminUsername}</strong>
            </span>
            <button
              onClick={() => {
                logout();
                window.location.href = '/';
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-rose-950/50 hover:text-rose-400 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit Admin</span>
            </button>
          </div>
        </div>
      </header>

      {/* Admin Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <span className="text-[11px] text-slate-400 font-semibold block uppercase">Pending Deposits</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className={`text-2xl font-black ${pendingDeposits.length > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                {pendingDeposits.length}
              </span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <span className="text-[11px] text-slate-400 font-semibold block uppercase">Registered Users</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-indigo-400">
                {usersList.length}
              </span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <span className="text-[11px] text-slate-400 font-semibold block uppercase">Available Stock</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-emerald-400">
                {availableStockCount}
              </span>
              <Layers className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <span className="text-[11px] text-slate-400 font-semibold block uppercase">Price / ID</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-white font-mono">
                Rs. {priceInput || storeSettings?.pricePerId || 12}
              </span>
              <DollarSign className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* 5th Metric Card: Total Lifetime Balance Added with Deduct & Reset Options */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-semibold block uppercase">Total Balance Added</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setTotalBalanceMode('deduct');
                    setTotalBalanceInput(100);
                    setTotalBalanceModalOpen(true);
                  }}
                  className="text-[10px] font-bold text-amber-400 hover:text-white bg-amber-500/10 hover:bg-amber-500/80 px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-0.5"
                  title="Deduct/reduce amount from total balance added"
                >
                  <Minus className="w-2.5 h-2.5" />
                  <span>Deduct</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTotalBalanceMode('reset');
                    setTotalBalanceModalOpen(true);
                  }}
                  className="text-[10px] font-bold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/80 px-2 py-0.5 rounded transition cursor-pointer"
                  title="Reset total balance added counter"
                >
                  Reset
                </button>
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                Rs. {(totalLifetimeBalanceAdded || 0).toLocaleString()}
              </span>
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('deposits')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              activeTab === 'deposits'
                ? 'bg-[#1877F2] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Deposit Requests ({pendingDeposits.length} Pending)</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              activeTab === 'users'
                ? 'bg-[#1877F2] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customer Accounts & Wallets ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              activeTab === 'stock'
                ? 'bg-[#1877F2] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Manage Stock & Price</span>
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              activeTab === 'announcements'
                ? 'bg-[#1877F2] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Announcements & Marquee ({announcementsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              activeTab === 'messages'
                ? 'bg-[#1877F2] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Direct Messages ({sentMessagesList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#1877F2] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>EasyPaisa & Admin Settings</span>
          </button>
        </div>

        {/* TAB 1: DEPOSITS APPROVAL ENGINE */}
        {activeTab === 'deposits' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">Manual Deposit Verification</h3>
            
            {deposits.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center text-slate-400 text-xs">
                No deposit requests found yet.
              </div>
            ) : (
              <div className="space-y-3">
                {deposits.map((dep) => (
                  <div
                    key={dep.id}
                    className={`bg-slate-900/90 border rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      dep.status === 'pending'
                        ? 'border-amber-500/40 bg-amber-500/[0.02]'
                        : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      
                      {/* Screenshot Thumbnail */}
                      {dep.screenshotUrl && dep.screenshotUrl.startsWith('data:image') ? (
                        <div
                          onClick={() => setPreviewScreenshot(dep.screenshotUrl)}
                          className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-700 overflow-hidden shrink-0 cursor-pointer relative group"
                        >
                          <img src={dep.screenshotUrl} alt="Receipt" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <ZoomIn className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 flex flex-col items-center justify-center shrink-0 text-[10px] text-center p-1 font-mono">
                          <span>WhatsApp</span>
                          <span>Proof</span>
                        </div>
                      )}

                      {/* Request Details */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-white font-mono">
                            Rs. {dep.amount} PKR
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                              dep.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : dep.status === 'rejected'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                            }`}
                          >
                            {dep.status}
                          </span>
                        </div>

                        <div className="text-xs text-slate-300 mt-1 space-y-0.5">
                          <div>
                            User: <strong className="text-white">@{dep.username}</strong> ({dep.userEmail})
                          </div>
                          <div>
                            Sender Info: <span className="font-semibold text-emerald-400">{dep.senderAccountName}</span> ({dep.senderAccountNumber})
                          </div>
                          <div>
                            Trx ID: <span className="font-mono text-slate-400">{dep.transactionId}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {new Date(dep.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Action Buttons & Three-Dots Menu */}
                    <div className="flex items-center gap-2 md:self-center relative deposit-action-menu">
                      
                      {/* Open WhatsApp with User */}
                      {storeSettings?.whatsappNumber && (
                        <a
                          href={`https://wa.me/${storeSettings.whatsappNumber.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl transition cursor-pointer"
                          title="Open WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}

                      {dep.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectId(dep.id);
                              setRejectReason('');
                            }}
                            className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-bold rounded-xl transition cursor-pointer"
                          >
                            Reject
                          </button>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleApproveDeposit(dep)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Approve & Add Balance</span>
                          </button>
                        </>
                      )}

                      {/* Three-Dots Menu for Any Status */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuDepositId(activeMenuDepositId === dep.id ? null : dep.id);
                          }}
                          className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-center ${
                            activeMenuDepositId === dep.id 
                              ? 'bg-[#1877F2] text-white border-blue-500 shadow-md shadow-blue-500/20' 
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          }`}
                          title="Options / Change Status"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuDepositId === dep.id && (
                          <div 
                            onClick={(e) => e.stopPropagation()} 
                            className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-30 space-y-1 animate-in fade-in duration-100"
                          >
                            <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-800 pb-1 mb-1">
                              Deposit Status Actions
                            </div>

                            {dep.status !== 'approved' && (
                              <button
                                type="button"
                                onClick={() => handleSetDepositStatus(dep.id, 'approved')}
                                className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition text-left cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mark Approved (+Rs {dep.amount})</span>
                              </button>
                            )}

                            {dep.status !== 'pending' && (
                              <button
                                type="button"
                                onClick={() => handleSetDepositStatus(dep.id, 'pending')}
                                className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/10 rounded-lg transition text-left cursor-pointer"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>Revert to Pending</span>
                              </button>
                            )}

                            {dep.status !== 'rejected' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuDepositId(null);
                                  setRejectId(dep.id);
                                  setRejectReason('');
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg transition text-left cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Mark Rejected</span>
                              </button>
                            )}

                            <div className="border-t border-slate-800 my-1" />

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuDepositId(null);
                                handleDeleteDeposit(dep.id);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 rounded-lg transition text-left cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Deposit Request</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* TAB 2: USER ACCOUNTS & DIRECT BALANCE MANAGEMENT (Requested feature) */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">Customer Accounts Management</h3>
                <p className="text-xs text-slate-400">
                  Search any user when they send a payment screenshot on WhatsApp to instantly credit their wallet.
                </p>
              </div>

              {/* User Search Input */}
              <div className="relative min-w-[260px]">
                <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search by username or email..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#1877F2]"
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  {userSearchQuery ? 'No customer found matching your search.' : 'No registered customers yet.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400">
                      <tr>
                        <th className="p-3.5">Customer</th>
                        <th className="p-3.5">Email</th>
                        <th className="p-3.5">Password</th>
                        <th className="p-3.5">Wallet Balance</th>
                        <th className="p-3.5">Purchases</th>
                        <th className="p-3.5">Registered</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-800/40">
                          <td className="p-3.5 font-bold text-white">
                            @{u.username}
                          </td>
                          <td className="p-3.5 text-slate-400">
                            {u.email}
                          </td>
                          {/* Password with Eye Reveal & Copy */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              {u.plainPassword ? (
                                <>
                                  <span className="font-mono text-xs px-2 py-1 rounded bg-slate-950 border border-slate-700/80 text-slate-200 select-all font-semibold tracking-wider">
                                    {revealedPasswords[u.id] ? u.plainPassword : '••••••••'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => toggleRevealPassword(u.id)}
                                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
                                    title={revealedPasswords[u.id] ? "Hide password" : "Show password"}
                                  >
                                    {revealedPasswords[u.id] ? <EyeOff className="w-3.5 h-3.5 text-[#1877F2]" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyPassword(u.plainPassword || '', u.username)}
                                    className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition cursor-pointer"
                                    title="Copy password"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-[11px] text-slate-500 italic">
                                  Encrypted
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-emerald-400 text-sm">
                              Rs. {u.walletBalance.toLocaleString()} PKR
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-400">
                            {u.ordersCount || 0} orders ({u.totalAccountsBought || 0} IDs)
                          </td>
                          <td className="p-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                            <div className="font-semibold text-slate-300">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {new Date(u.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Add Balance */}
                              <button
                                type="button"
                                onClick={() => {
                                  setBalanceModalUser(u);
                                  setAdjustMode('add');
                                  setAdjustAmount(120);
                                  setAdjustReason('WhatsApp screenshot verified');
                                }}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer"
                                title="Add Funds to User"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </button>

                              {/* Deduct Balance */}
                              <button
                                type="button"
                                onClick={() => {
                                  setBalanceModalUser(u);
                                  setAdjustMode('deduct');
                                  setAdjustAmount(24);
                                  setAdjustReason('Admin balance deduction');
                                }}
                                className="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                title="Deduct balance from this user"
                              >
                                <Minus className="w-3.5 h-3.5" />
                                <span>Deduct</span>
                              </button>

                              {/* Change Password */}
                              <button
                                type="button"
                                onClick={() => {
                                  setPasswordModalUser(u);
                                  setAdminNewPasswordInput('');
                                }}
                                className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                title="Change User Password"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span>Password</span>
                              </button>

                              {/* Send Direct Message */}
                              <button
                                type="button"
                                onClick={() => handleOpenSendMessageModal(u)}
                                className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                title="Send Message to this User"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                <span>Message</span>
                              </button>

                              {/* Delete Account */}
                              <button
                                type="button"
                                onClick={() => setDeleteUserModal(u)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/20 transition cursor-pointer"
                                title="Delete User Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: MANAGE STOCK & PRICE */}
        {activeTab === 'stock' && (
          <div className="space-y-6">
            
            {/* Price Edit Box */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <h3 className="text-sm font-bold text-white mb-2">Set Price per Facebook ID</h3>
              <form onSubmit={handleUpdatePrice} className="flex items-center gap-3 max-w-sm">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-500">Rs.</span>
                  <input
                    type="number"
                    min={1}
                    required
                    value={priceInput}
                    onChange={(e) => setPriceInput(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-[#1877F2]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1877F2] hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Save Price
                </button>
              </form>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Default: 12 PKR per ID. This changes the live price for all customers.
              </p>
            </div>

            {/* Stock Addition Section: Individual vs Bulk */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span>Add Facebook Accounts to Stock</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Choose between adding an individual account with its cookie or pasting accounts in bulk.
                  </p>
                </div>

                {/* Mode Switcher */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setStockAddMode('individual')}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                      stockAddMode === 'individual'
                        ? 'bg-[#1877F2] text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Cookie className="w-3.5 h-3.5" />
                    <span>Single Account (Aleda)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockAddMode('bulk')}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                      stockAddMode === 'bulk'
                        ? 'bg-[#1877F2] text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Bulk Import</span>
                  </button>
                </div>
              </div>

              {/* OPTION A: INDIVIDUAL ACCOUNT ENTRY (ALEDA) */}
              {stockAddMode === 'individual' ? (
                <form onSubmit={handleAddSingleStock} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Facebook UID *</label>
                      <input
                        type="text"
                        required
                        value={singleUid}
                        onChange={(e) => setSingleUid(e.target.value)}
                        placeholder="e.g. 100089238472"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-[#1877F2]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Account Password *</label>
                      <input
                        type="text"
                        required
                        value={singlePassword}
                        onChange={(e) => setSinglePassword(e.target.value)}
                        placeholder="e.g. Pass123@#$"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-[#1877F2]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Cookie className="w-3.5 h-3.5 text-amber-400" />
                        <span>Account Cookie (Optional / Recommended)</span>
                      </label>
                      <span className="text-[11px] text-slate-500">Only copied by customer, never shown publicly</span>
                    </div>
                    <textarea
                      rows={3}
                      value={singleCookie}
                      onChange={(e) => setSingleCookie(e.target.value)}
                      placeholder="Paste c_user=100089...; xs=... or full JSON / Netscape cookie string here"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-amber-200/90 font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isAddingStock || !singleUid.trim() || !singlePassword.trim()}
                      className="px-5 py-2.5 bg-[#1877F2] hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{isAddingStock ? 'Adding Account...' : 'Add Account with Cookie to Stock'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* OPTION B: BULK IMPORT */
                <form onSubmit={handleAddStock} className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-400 mb-2">
                      Paste multiple accounts in <code className="text-blue-400 font-bold">UID:Password</code> or <code className="text-amber-400 font-bold">UID:Password:Cookie</code> format (or separated by <code className="text-emerald-400 font-bold">|</code>).
                    </p>
                    <textarea
                      rows={6}
                      required
                      value={pasteStockText}
                      onChange={(e) => setPasteStockText(e.target.value)}
                      placeholder={`100089238472:SecretPass123:c_user=100089238472;xs=2%3Aabc...
100089238473:AnotherPass456
100089238474:AlphaBravo789:datr=xyz...;c_user=100089238474`}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-[#1877F2]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Lines entered: <strong className="text-white">{pasteStockText.split('\n').filter(l => l.trim()).length}</strong>
                    </span>
                    <button
                      type="submit"
                      disabled={isAddingStock || !pasteStockText.trim()}
                      className="px-5 py-2.5 bg-[#1877F2] hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{isAddingStock ? 'Adding to Stock...' : 'Add Bulk to Stock'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Current Stock Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Current Stock Inventory ({stock.length})</h3>
                  <span className="text-xs text-slate-400">
                    <strong className="text-emerald-400">{availableStockCount}</strong> Available • <strong className="text-blue-400">{soldStockCount}</strong> Sold
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setStockFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                        stockFilter === 'all' ? 'bg-[#1877F2] text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({stock.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockFilter('available')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                        stockFilter === 'available' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Available ({availableStockCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockFilter('sold')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                        stockFilter === 'sold' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Sold ({soldStockCount})
                    </button>
                  </div>

                  {soldStockCount > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllSoldStock}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      title="Delete all sold accounts from database"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete All Sold ({soldStockCount})</span>
                    </button>
                  )}
                </div>
              </div>

              {stock.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  Stock is empty. Add accounts individually or in bulk above to restock.
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 sticky top-0">
                      <tr>
                        <th className="p-3">UID</th>
                        <th className="p-3">Password</th>
                        <th className="p-3">Cookie</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Sold To</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                      {stock
                        .filter(item => {
                          if (stockFilter === 'available') return item.status === 'available';
                          if (stockFilter === 'sold') return item.status === 'sold';
                          return true;
                        })
                        .map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/40">
                          <td className="p-3 text-white font-bold">{item.uid}</td>
                          <td className="p-3 text-slate-400">••••••••</td>
                          <td className="p-3">
                            {item.cookie ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  <Cookie className="w-3 h-3 text-amber-400" />
                                  <span>Attached</span>
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.cookie!);
                                    showToast('Cookie Copied', `Cookie for ID ${item.uid} copied!`, 'info');
                                  }}
                                  className="text-amber-400 hover:text-amber-300 p-1 cursor-pointer transition"
                                  title="Copy Cookie"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-600 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                item.status === 'available'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400 text-[11px]">
                            {item.status === 'sold' ? (
                              <span>@{item.soldToUsername || 'Customer'}</span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteStockItem(item.id, item.status)}
                              className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition"
                              title={item.status === 'sold' ? 'Delete Sold Account Record' : 'Remove Account'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 4: ANNOUNCEMENTS & MARQUEE TICKER */}
        {activeTab === 'announcements' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* 1. TOP MARQUEE TICKER (BLACK PATTI) SETTINGS CARD */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Marquee Announcement Ticker
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-amber-500/30 font-semibold uppercase">
                        Black Strip on All Pages
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Displays a continuous moving banner from right-to-left at the top of Login, Signup, Store, & User Dashboard.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMarqueeSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      marqueeSettings.enabled
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${marqueeSettings.enabled ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
                    <span>{marqueeSettings.enabled ? 'Ticker Active & Visible' : 'Ticker Disabled'}</span>
                  </button>
                </div>
              </div>

              {/* Form & Controls */}
              <form onSubmit={handleSaveMarquee} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Announcement Ticker Text (Right-to-Left Continuous Scroll)
                    </label>
                    <span className="text-[11px] text-slate-500">
                      {marqueeSettings.text.length} characters
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    required
                    value={marqueeSettings.text}
                    onChange={(e) => setMarqueeSettings(prev => ({ ...prev, text: e.target.value }))}
                    placeholder="Enter announcement text to move across the top of all pages..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400 text-[11px] font-semibold">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => setMarqueeSettings(prev => ({
                      ...prev,
                      text: '⚡ Welcome to FBStore! Instant Facebook Accounts Delivery • 24/7 JazzCash & EasyPaisa Deposit • Guaranteed Fresh UIDs'
                    }))}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-[11px] text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    Default Welcome
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarqueeSettings(prev => ({
                      ...prev,
                      text: '🔥 Fresh Stock Just Uploaded! Buy Facebook Accounts with Instant Password Handover • Safe & Verified UIDs'
                    }))}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-[11px] text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    Fresh Stock Alert
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarqueeSettings(prev => ({
                      ...prev,
                      text: '💳 Instant Deposit: Submit JazzCash / EasyPaisa screenshot for immediate wallet balance credit! Contact WhatsApp for support.'
                    }))}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-[11px] text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    Deposit Notice
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Scroll Speed (Animation Pace)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['slow', 'normal', 'fast'] as const).map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => setMarqueeSettings(prev => ({ ...prev, speed: spd }))}
                          className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer capitalize ${
                            marqueeSettings.speed === spd
                              ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {spd === 'normal' ? 'Normal (Standard)' : spd}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Badge Label
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-amber-400 font-semibold">
                        <input
                          type="checkbox"
                          checked={marqueeSettings.showBadge !== false}
                          onChange={(e) => setMarqueeSettings(prev => ({ ...prev, showBadge: e.target.checked }))}
                          className="w-3.5 h-3.5 rounded text-amber-500 bg-slate-950 border-slate-700"
                        />
                        <span>Enable Badge</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      disabled={marqueeSettings.showBadge === false}
                      value={marqueeSettings.badgeText || 'Announcement'}
                      onChange={(e) => setMarqueeSettings(prev => ({ ...prev, badgeText: e.target.value }))}
                      placeholder="e.g. Announcement, Notice, Alert"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Marquee Target Audience */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Marquee Target Audience (Who Sees This Top Ticker)
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-2">
                    <button
                      type="button"
                      onClick={() => setMarqueeSettings(prev => ({ ...prev, targetType: 'all', targetUserId: undefined, targetUsername: undefined }))}
                      className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                        marqueeSettings.targetType !== 'user'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All Users & Visitors (Global)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMarqueeSettings(prev => ({ ...prev, targetType: 'user' }))}
                      className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                        marqueeSettings.targetType === 'user'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Specific Single User
                    </button>
                  </div>

                  {marqueeSettings.targetType === 'user' && (
                    <div className="animate-fade-in">
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Select Target User for Marquee
                      </label>
                      <select
                        value={marqueeSettings.targetUserId || ''}
                        onChange={(e) => {
                          const uid = e.target.value;
                          const u = usersList.find(usr => usr.id === uid);
                          setMarqueeSettings(prev => ({
                            ...prev,
                            targetUserId: uid,
                            targetUsername: u?.username || ''
                          }));
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="">-- Choose User for this Private Marquee --</option>
                        {usersList.map((u) => (
                          <option key={u.id} value={u.id}>
                            @{u.username} ({u.email})
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-purple-300 mt-1">
                        ℹ️ This top marquee strip will only appear on the screen of the selected user.
                      </p>
                    </div>
                  )}
                </div>

                {/* LIVE PREVIEW BOX */}
                <div className="pt-2">
                  <span className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Live Real-Time Preview (As Visitors See It):
                  </span>
                  <div className="rounded-xl overflow-hidden border border-amber-500/30 bg-slate-950 shadow-inner p-2.5 flex items-center">
                    {marqueeSettings.showBadge !== false && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-300 text-[10px] font-bold mr-3 shrink-0">
                        <Megaphone className="w-3 h-3 text-amber-400" />
                        <span>{marqueeSettings.badgeText || 'Announcement'}</span>
                      </div>
                    )}
                    <div className="overflow-hidden whitespace-nowrap flex-1 text-xs text-slate-200">
                      <span className="inline-block animate-marquee-normal font-medium">
                        {marqueeSettings.text || 'Announcement text preview will scroll here...'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSavingMarquee}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-600/30 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    {isSavingMarquee ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save & Update Marquee Live</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* 1.1 NEW USER WELCOME ANNOUNCEMENT SETTINGS */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      New User Registration Welcome Message
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/30 font-semibold uppercase">
                        Shown Once On Signup
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Automatically greets every new registered user with a personalized popup dialog and username.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setWelcomeSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      welcomeSettings.enabled
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${welcomeSettings.enabled ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
                    <span>{welcomeSettings.enabled ? 'Auto-Greeting Active' : 'Greeting Disabled'}</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSaveWelcomeSettings} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Welcome Dialog Title Template
                    </label>
                    <span className="text-[11px] text-amber-400 font-mono">Use {'{username}'} for user's name</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={welcomeSettings.title}
                    onChange={(e) => setWelcomeSettings(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Welcome to FBStore, {username}! 🎉"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Welcome Dialog Message Template
                    </label>
                    <span className="text-[11px] text-slate-500">Supports multi-line text</span>
                  </div>
                  <textarea
                    rows={4}
                    required
                    value={welcomeSettings.message}
                    onChange={(e) => setWelcomeSettings(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Enter welcome message for new users. Use {username} anywhere in the text..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                {/* Quick Presets for Welcome Message */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400 text-[11px] font-semibold">Presets:</span>
                  <button
                    type="button"
                    onClick={() => setWelcomeSettings(prev => ({
                      ...prev,
                      title: 'Welcome to FBStore, {username}! 🎉',
                      message: 'Assalam-o-Alaikum {username}! Welcome to FBStore.\n\nYour account has been registered successfully with Rs. 0 wallet balance. You can deposit balance via JazzCash or EasyPaisa and purchase verified Facebook accounts with instant delivery.\n\nThank you for choosing us!'
                    }))}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-[11px] text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    Warm Greeting (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWelcomeSettings(prev => ({
                      ...prev,
                      title: 'Welcome Aboard @{username}! 🚀',
                      message: 'Hey {username}! Welcome to Pakistan\'s premier Facebook IDs platform.\n\nEnjoy guaranteed fresh UID:Password handover and fast EasyPaisa/JazzCash approvals. If you need any assistance, reach out directly to Admin via WhatsApp.'
                    }))}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-[11px] text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    Marketplace Intro
                  </button>
                </div>

                {/* Live Preview */}
                <div className="p-3.5 bg-slate-950/80 border border-emerald-500/30 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                      Preview for @arslan481
                    </span>
                    <span className="text-xs font-bold text-white">
                      {(welcomeSettings.title || '').replace(/{username}/gi, 'arslan481')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                    {(welcomeSettings.message || '').replace(/{username}/gi, 'arslan481')}
                  </p>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSavingWelcome}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    {isSavingWelcome ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save Welcome Message Template</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* 2. SITE & SCREEN NOTICES (VISUAL CARDS & DIALOGS) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Site Notices & Screen Alerts
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 font-bold">
                      {announcementsList.length} Total
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Custom visual banners or popup screen modals for all users or a specific single user.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateAnnouncementModal}
                  className="px-4 py-2 bg-[#1877F2] hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Announcement</span>
                </button>
              </div>

              {/* List of Announcements */}
              {announcementsList.length === 0 ? (
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                    <Megaphone className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-300">No Announcements Created</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Create your first announcement to show notices, important updates, or alerts to users.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenCreateAnnouncementModal}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer"
                  >
                    Create Now
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {announcementsList.map((ann) => {
                    const typeColors = {
                      offer: 'border-amber-400/60 bg-amber-950/30 text-amber-300 font-bold',
                      urgent: 'border-rose-500/40 bg-rose-950/20 text-rose-300',
                      alert: 'border-rose-500/30 bg-rose-950/15 text-rose-300',
                      warning: 'border-amber-500/30 bg-amber-950/15 text-amber-300',
                      success: 'border-emerald-500/30 bg-emerald-950/15 text-emerald-300',
                      info: 'border-blue-500/30 bg-blue-950/15 text-blue-300'
                    }[ann.type] || 'border-slate-800 bg-slate-950 text-slate-300';

                    return (
                      <div
                        key={ann.id}
                        className={`rounded-2xl border p-4 transition-all shadow-md ${
                          ann.active ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-950/40 border-slate-800/50 opacity-60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Type Badge */}
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wide border ${typeColors}`}>
                                {ann.type === 'offer' ? 'Special Offer' : ann.type}
                              </span>

                              {/* Target Badge */}
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                ann.targetType === 'user'
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}>
                                {ann.targetType === 'user' ? `Specific User: @${ann.targetUsername || ann.targetUserId}` : 'All Users (Global)'}
                              </span>

                              {/* Frequency Badge */}
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                ann.frequency === 'once_only'
                                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              }`}>
                                {ann.frequency === 'once_only' ? '1x Single Time' : '🔄 Every Refresh'}
                              </span>

                              {/* Popup badge */}
                              {ann.showAsPopup && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Screen Popup Modal
                                </span>
                              )}

                              {/* Active Status */}
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                ann.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
                              }`}>
                                {ann.active ? 'Active' : 'Hidden'}
                              </span>

                              <span className="text-[11px] text-slate-500 ml-auto flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(ann.createdAt).toLocaleDateString()} {new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <h4 className="text-sm font-bold text-white">
                              {ann.title}
                            </h4>

                            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                              {ann.message}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleAnnouncementActive(ann)}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                                ann.active
                                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/50'
                                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                              }`}
                              title={ann.active ? 'Hide Announcement' : 'Activate Announcement'}
                            >
                              {ann.active ? 'Active' : 'Inactive'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditAnnouncementModal(ann)}
                              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                              title="Edit Announcement"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteAnnouncement(ann.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                              title="Delete Announcement"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 5: DIRECT MESSAGES TO USERS */}
        {activeTab === 'messages' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Direct User Messages (User Dashboard Inbox)
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-bold">
                        {sentMessagesList.length} Sent
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Send official private messages or custom alerts that appear in the user's dashboard under "Admin Messages".
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenSendMessageModal()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
                >
                  <Send className="w-4 h-4" />
                  <span>Compose Message</span>
                </button>
              </div>

              {/* Messages History */}
              {sentMessagesList.length === 0 ? (
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-300">No Direct Messages Sent Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    You can send private messages to any individual user from here or directly from the Customer Accounts table.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleOpenSendMessageModal()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer"
                  >
                    Compose First Message
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {sentMessagesList.map((msg) => (
                    <div
                      key={msg.id}
                      className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              To: @{msg.targetUsername || msg.userId}
                            </span>
                            {msg.priority && msg.priority !== 'normal' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                                {msg.priority}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              msg.read ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              {msg.read ? 'Seen by user' : 'Unread'}
                            </span>
                            <span className="text-[11px] text-slate-500 ml-auto flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-white pt-1">
                            {msg.title}
                          </h4>

                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                            {msg.message}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteAdminMessage(msg.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition self-end sm:self-start cursor-pointer"
                          title="Delete Message"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: EASYPAISA & ADMIN SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg max-w-2xl">
              <h3 className="text-base font-bold text-white mb-1">JazzCash / EasyPaisa & Admin Credentials</h3>
              <p className="text-xs text-slate-400 mb-6">
                Update your payment receiving account details (shown on the website Deposit modal) and admin login.
              </p>

              <form onSubmit={handleSaveSettings} className="space-y-5">
                
                {/* Payment Account Section */}
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                      Deposit Receiving Account (JazzCash / EasyPaisa)
                    </h4>
                    <span className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                      Live on Website
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Account Title / Name (e.g. Muhammad Arslan)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Muhammad Arslan"
                      value={settingsForm.accountTitle || settingsForm.jazzcashTitle || settingsForm.easypaisaTitle}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSettingsForm(prev => ({ 
                          ...prev, 
                          accountTitle: val,
                          jazzcashTitle: val,
                          easypaisaTitle: val 
                        }));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Payment Account / Mobile Number (e.g. 03064887388)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 03064887388"
                      value={settingsForm.accountNumber || settingsForm.jazzcashNumber || settingsForm.easypaisaNumber}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSettingsForm(prev => ({ 
                          ...prev, 
                          accountNumber: val,
                          jazzcashNumber: val,
                          easypaisaNumber: val 
                        }));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      WhatsApp Support Number (for customer screenshots)
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.whatsappNumber}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Admin Credentials */}
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-4">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wide">
                    Admin Portal Credentials
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Admin Username
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.adminUsername}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, adminUsername: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#1877F2]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Admin Password
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.adminPassword}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, adminPassword: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#1877F2]"
                    />
                  </div>
                </div>

                {/* Email Delivery (SMTP) Section for OTP Mails */}
                <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-950 to-slate-900 border border-sky-500/30 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-sky-400" />
                      Live Email OTP Dispatch (Gmail SMTP)
                    </h4>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                      Real Inbox Delivery
                    </span>
                  </div>

                  <div className="p-3 bg-sky-950/40 border border-sky-500/20 rounded-xl space-y-1.5 text-xs text-slate-300 leading-relaxed">
                    <div className="font-bold text-sky-300 flex items-center gap-1.5">
                      <span>💡 Real Email (OTP) chalu karne ka tareeqa:</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-[11.5px] text-slate-300 pl-1">
                      <li>Apne Google Account par jayen aur <strong>2-Step Verification</strong> ON karein.</li>
                      <li>
                        <a 
                          href="https://myaccount.google.com/apppasswords" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-sky-400 underline font-semibold hover:text-sky-300"
                        >
                          myaccount.google.com/apppasswords
                        </a> par jakar App Name me "FBStore" likhein aur 16-digit <strong>App Password</strong> generate karein.
                      </li>
                      <li>Apna Gmail address aur wo 16-letter App Password neeche enter karein aur <strong>Send Test Email</strong> karein!</li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        SMTP Host
                      </label>
                      <input
                        type="text"
                        value={settingsForm.smtpHost || 'smtp.gmail.com'}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, smtpHost: e.target.value }))}
                        placeholder="smtp.gmail.com"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        SMTP Port
                      </label>
                      <input
                        type="number"
                        value={settingsForm.smtpPort || 587}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, smtpPort: Number(e.target.value) }))}
                        placeholder="587"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Sender Gmail Address
                    </label>
                    <input
                      type="email"
                      value={settingsForm.smtpUser || ''}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, smtpUser: e.target.value }))}
                      placeholder="e.g. hasnainhmad081@gmail.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Google 16-Letter App Password (not account password)
                    </label>
                    <input
                      type="password"
                      value={settingsForm.smtpPass || ''}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, smtpPass: e.target.value }))}
                      placeholder="e.g. abcd efgh ijkl mnop"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  {settingsForm.smtpUser && settingsForm.smtpPass && (
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            showToast('Sending...', 'Testing SMTP connection and sending verification mail...', 'info');
                            const res = await fetch('/api/admin/test-email', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token || localStorage.getItem('fbstore_auth_token')}`
                              },
                              body: JSON.stringify({ 
                                targetEmail: settingsForm.smtpUser,
                                smtpConfig: {
                                  host: settingsForm.smtpHost || 'smtp.gmail.com',
                                  port: Number(settingsForm.smtpPort) || 587,
                                  user: settingsForm.smtpUser,
                                  pass: settingsForm.smtpPass,
                                }
                              })
                            });
                            const data = await res.json();
                            if (res.ok) {
                              showToast('Email Sent!', data.message || 'Test email sent successfully.', 'success');
                            } else {
                              showToast('SMTP Test Failed', data.error || 'Failed to connect.', 'error');
                            }
                          } catch (err: any) {
                            showToast('Error', err.message, 'error');
                          }
                        }}
                        className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 shadow-lg shadow-sky-600/20"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Send Test Email to {settingsForm.smtpUser}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Persistent Database Backup & Restore */}
                <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-emerald-400" />
                      Persistent Database Backup & Restore
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                      Anti-Reset Protection
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate-300 leading-relaxed">
                    Whenever you add new features or publish the website, save a backup of your registered users, wallet balances, and stock here. If a fresh deployment ever resets data, simply click <strong>Restore Backup</strong> to bring back all user balances and accounts instantly.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadBackup}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Backup (db.json)</span>
                    </button>
                    <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      <span>Restore from Backup</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleRestoreBackupFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Firestore Database Connection & Cloud Persistence */}
                <div className="p-4 bg-blue-950/60 border border-blue-500/30 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-blue-400" />
                        <span>Firestore Cloud Persistence: fbstore-bf1e3</span>
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Saves all registered customer accounts, balances, stock inventory, and orders to Google Firestore so data is never lost.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isSyncingFirebase}
                        onClick={handleSyncFirebaseNow}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-md"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingFirebase ? 'animate-spin' : ''}`} />
                        <span>{isSyncingFirebase ? 'Syncing...' : 'Sync to Firestore Now'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSyncingFirebase}
                        onClick={handlePullFirebaseNow}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-md"
                        title="Pull all stored users, stock, and orders from Firestore"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Recover from Firestore</span>
                      </button>

                      <button
                        type="button"
                        onClick={copyFirestoreRule}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-lg flex items-center gap-1 transition cursor-pointer border border-slate-700"
                      >
                        {copiedRules ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedRules ? 'Copied!' : 'Copy Rule'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/90 rounded-lg border border-slate-800 space-y-1.5">
                    <span className="text-[11px] font-bold text-amber-300 block">
                      ⚠️ If Firestore shows permission error or rules expired:
                    </span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Open your Firebase Console → Firestore Database → <strong>Rules</strong> tab and replace with this rule to allow database access:
                    </p>
                    <pre className="p-2 bg-slate-900 rounded text-[10.5px] text-emerald-300 font-mono overflow-x-auto select-all border border-slate-800">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
                    </pre>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#1877F2] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition cursor-pointer"
                >
                  Save All Settings
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* MODAL 1: DIRECT USER BALANCE ADJUSTMENT */}
      {balanceModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Adjust Customer Balance</h3>
                  <span className="text-[11px] text-slate-400">User: @{balanceModalUser.username}</span>
                </div>
              </div>
              <button
                onClick={() => setBalanceModalUser(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Balance Display */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Current Wallet Balance:</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                Rs. {balanceModalUser.walletBalance.toLocaleString()} PKR
              </span>
            </div>

            <form onSubmit={handleUpdateUserBalance} className="space-y-4">
              
              {/* Mode Selector */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdjustMode('add')}
                  className={`py-2 text-xs font-bold rounded-lg transition ${
                    adjustMode === 'add'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  + Add
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustMode('deduct')}
                  className={`py-2 text-xs font-bold rounded-lg transition ${
                    adjustMode === 'deduct'
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  - Deduct
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustMode('set')}
                  className={`py-2 text-xs font-bold rounded-lg transition ${
                    adjustMode === 'set'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Set Total
                </button>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {adjustMode === 'add' ? 'Amount to Add (PKR)' : adjustMode === 'deduct' ? 'Amount to Deduct (PKR)' : 'New Total Balance (PKR)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-500">Rs.</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    required
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(Number(e.target.value))}
                    className={`w-full bg-slate-950 border rounded-xl pl-10 pr-4 py-2 text-sm font-mono font-bold text-white focus:outline-none ${
                      adjustMode === 'deduct' 
                        ? 'border-rose-900/60 focus:border-rose-500' 
                        : 'border-slate-700 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>

              {/* Quick Pick buttons */}
              {adjustMode === 'add' && (
                <div className="flex items-center gap-1.5">
                  {[24, 60, 120, 240, 600].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => setAdjustAmount(quick)}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition ${
                        adjustAmount === quick
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      +Rs {quick}
                    </button>
                  ))}
                </div>
              )}

              {adjustMode === 'deduct' && (
                <div className="flex items-center gap-1.5">
                  {[12, 24, 60, 120, 240].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => setAdjustAmount(quick)}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition ${
                        adjustAmount === quick
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      -Rs {quick}
                    </button>
                  ))}
                </div>
              )}

              {/* Result Preview */}
              <div className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs flex items-center justify-between text-slate-300">
                <span>New Balance Will Be:</span>
                <strong className={`font-mono text-sm ${adjustMode === 'deduct' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  Rs. {(adjustMode === 'add' 
                    ? balanceModalUser.walletBalance + adjustAmount 
                    : adjustMode === 'deduct'
                      ? Math.max(0, balanceModalUser.walletBalance - adjustAmount)
                      : adjustAmount
                  ).toLocaleString()} PKR
                </strong>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason / Note
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. WhatsApp screenshot verified"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setBalanceModalUser(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingBalance}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {isUpdatingBalance ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Update User Balance</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 1b: TOTAL LIFETIME BALANCE ADJUSTMENT (DEDUCT / RESET / SET) */}
      {totalBalanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Total Balance Added Counter</h3>
                  <span className="text-[11px] text-slate-400">Manage or adjust lifetime counter</span>
                </div>
              </div>
              <button
                onClick={() => setTotalBalanceModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Total Balance Display */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Current Total Added Counter:</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                Rs. {(totalLifetimeBalanceAdded || 0).toLocaleString()} PKR
              </span>
            </div>

            {/* Mode Selector */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setTotalBalanceMode('deduct')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  totalBalanceMode === 'deduct'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                - Deduct
              </button>
              <button
                type="button"
                onClick={() => setTotalBalanceMode('reset')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  totalBalanceMode === 'reset'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Reset to 0
              </button>
              <button
                type="button"
                onClick={() => setTotalBalanceMode('set')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  totalBalanceMode === 'set'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Set Amount
              </button>
            </div>

            <form onSubmit={handleAdjustTotalLifetimeBalance} className="space-y-4">
              {totalBalanceMode === 'reset' ? (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-200">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>Reset Counter Confirmation</span>
                  </div>
                  <p className="text-[11px] text-rose-300/90 leading-relaxed">
                    This will reset the total lifetime balance added counter back to <strong>Rs. 0 PKR</strong>. Individual user wallet balances will not be affected.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {totalBalanceMode === 'deduct' ? 'Amount to Deduct from Total (PKR)' : 'New Total Counter Value (PKR)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-500">Rs.</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        required
                        value={totalBalanceInput}
                        onChange={(e) => setTotalBalanceInput(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {totalBalanceMode === 'deduct' && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[50, 100, 250, 500, 1000].map((quick) => (
                        <button
                          key={quick}
                          type="button"
                          onClick={() => setTotalBalanceInput(quick)}
                          className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition ${
                            totalBalanceInput === quick
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          -Rs {quick}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Result Preview */}
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs flex items-center justify-between text-slate-300">
                    <span>New Counter Will Be:</span>
                    <strong className="text-emerald-400 font-mono text-sm">
                      Rs. {(totalBalanceMode === 'deduct' 
                        ? Math.max(0, (totalLifetimeBalanceAdded || 0) - totalBalanceInput)
                        : totalBalanceInput
                      ).toLocaleString()} PKR
                    </strong>
                  </div>
                </>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setTotalBalanceModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjustingTotal}
                  className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    totalBalanceMode === 'reset'
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                      : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                  }`}
                >
                  {isAdjustingTotal ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{totalBalanceMode === 'reset' ? 'Confirm Reset to 0' : totalBalanceMode === 'deduct' ? 'Deduct Amount' : 'Update Counter'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SCREENSHOT PREVIEW ZOOM */}
      {previewScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-sm font-bold text-white">Payment Receipt Zoom</h3>
              <button
                onClick={() => setPreviewScreenshot(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-black/40 rounded-xl p-2">
              <img src={previewScreenshot} alt="Receipt Full" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REJECT REASON */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Reject Deposit Request</h3>
            <p className="text-xs text-slate-400">
              Please enter the reason for rejecting this deposit:
            </p>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Invalid Transaction ID or payment not received"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
            />
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setRejectId(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ADMIN CHANGE USER PASSWORD */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[#1877F2] flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Change User Password</h3>
                  <span className="text-[11px] text-slate-400">Customer: @{passwordModalUser.username}</span>
                </div>
              </div>
              <button
                onClick={() => setPasswordModalUser(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5 text-slate-400">
              <div>Customer Email: <strong className="text-white">{passwordModalUser.email}</strong></div>
              <div>Current Balance: <strong className="text-emerald-400 font-mono">Rs. {passwordModalUser.walletBalance} PKR</strong></div>
              {passwordModalUser.plainPassword && (
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-800">
                  <span>Current Password:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200 select-all font-semibold">
                      {showModalPassword ? passwordModalUser.plainPassword : '••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowModalPassword(!showModalPassword)}
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
                      title={showModalPassword ? "Hide password" : "Show password"}
                    >
                      {showModalPassword ? <EyeOff className="w-3.5 h-3.5 text-[#1877F2]" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyPassword(passwordModalUser.plainPassword || '', passwordModalUser.username)}
                      className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition cursor-pointer"
                      title="Copy password"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleAdminChangeUserPassword} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    New Password (min 6 characters)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const randomPass = `fb_${Math.random().toString(36).substring(2, 8)}786`;
                      setAdminNewPasswordInput(randomPass);
                    }}
                    className="text-[11px] text-[#1877F2] hover:underline cursor-pointer"
                  >
                    Generate Random
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={adminNewPasswordInput}
                  onChange={(e) => setAdminNewPasswordInput(e.target.value)}
                  placeholder="Enter new password for customer"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#1877F2]"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingUserPassword || !adminNewPasswordInput.trim()}
                  className="px-4 py-2 bg-[#1877F2] hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {isUpdatingUserPassword ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Set New Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: CONFIRM DELETE USER ACCOUNT */}
      {deleteUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-sm w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Delete User Account?</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to permanently delete user <strong className="text-rose-400">@{deleteUserModal.username}</strong> ({deleteUserModal.email})?
              </p>
              <p className="text-[11px] text-slate-500">
                Wallet Balance: Rs. {deleteUserModal.walletBalance} PKR. This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteUserModal(null)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={handleAdminDeleteUser}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isDeletingUser ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Delete Account</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CREATE / EDIT ANNOUNCEMENT MODAL */}
      {announcementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 text-[#1877F2] flex items-center justify-center font-bold">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingAnnouncement ? 'Edit Site Announcement' : 'Create New Announcement'}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Visible on website as cards or screen dialogs
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAnnouncementModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Announcement Title
                </label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="e.g. Important Notice Regarding EasyPaisa Payments"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#1877F2]"
                />
              </div>

              {/* Message Body */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Announcement Message / Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={annMessage}
                  onChange={(e) => setAnnMessage(e.target.value)}
                  placeholder="Write full announcement details for users here..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#1877F2] font-normal"
                />
              </div>

              {/* Type / Color Style */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Announcement Visual Style & Color
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5">
                  {(['info', 'offer', 'success', 'warning', 'alert', 'urgent'] as AnnouncementType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAnnType(t)}
                      className={`py-2 text-[11px] font-bold rounded-xl border transition cursor-pointer capitalize ${
                        annType === t
                          ? t === 'offer'
                            ? 'bg-amber-500/30 border-amber-400 text-amber-300 font-extrabold shadow-sm'
                            : t === 'urgent' || t === 'alert'
                              ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                              : t === 'warning'
                                ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                                : t === 'success'
                                  ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                                  : 'bg-blue-600/30 border-blue-500 text-blue-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t === 'offer' ? '🔥 Offer' : t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Display Frequency / Re-show Behavior */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Display Frequency / Re-Show Behavior
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAnnFrequency('every_refresh')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      annFrequency === 'every_refresh'
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-xs'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="block text-xs font-bold text-white mb-0.5">🔄 Re-appear on every refresh</span>
                    <span className="block text-[10px] text-slate-400 leading-tight">
                      Agar user cut kare to page refresh par dubara show hoga.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnnFrequency('once_only')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      annFrequency === 'once_only'
                        ? 'bg-purple-600/20 border-purple-500 text-white shadow-xs'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="block text-xs font-bold text-white mb-0.5">1️⃣ Single ek hi baar (Once Only)</span>
                    <span className="block text-[10px] text-slate-400 leading-tight">
                      Agar user ek dafa cut karde to dubara kabhi show nahi hoga.
                    </span>
                  </button>
                </div>
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Target Audience
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-2">
                  <button
                    type="button"
                    onClick={() => setAnnTargetType('all')}
                    className={`py-2 text-xs font-bold rounded-lg transition ${
                      annTargetType === 'all'
                        ? 'bg-[#1877F2] text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All Users (Global)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnnTargetType('user')}
                    className={`py-2 text-xs font-bold rounded-lg transition ${
                      annTargetType === 'user'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Specific Single User
                  </button>
                </div>

                {annTargetType === 'user' && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Select Target User
                    </label>
                    <select
                      value={annTargetUserId}
                      onChange={(e) => setAnnTargetUserId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="">-- Choose User --</option>
                      {usersList.map((u) => (
                        <option key={u.id} value={u.id}>
                          @{u.username} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Extra Checkboxes */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={annShowAsPopup}
                    onChange={(e) => setAnnShowAsPopup(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700"
                  />
                  <span>Show as Screen Popup Dialog Modal (pops up on visitor screen)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={annActive}
                    onChange={(e) => setAnnActive(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700"
                  />
                  <span>Active & Visible immediately</span>
                </label>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setAnnouncementModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAnnouncement}
                  className="px-5 py-2 bg-[#1877F2] hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingAnnouncement ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingAnnouncement ? 'Save Changes' : 'Publish Announcement'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: COMPOSE DIRECT MESSAGE TO USER MODAL */}
      {messageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Send Direct Message</h3>
                  <span className="text-[11px] text-slate-400">
                    Appears in user's dashboard under "Admin Messages"
                  </span>
                </div>
              </div>
              <button
                onClick={() => setMessageModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendMessageToUser} className="space-y-4">
              {/* Recipient */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Recipient User
                </label>
                {messageTargetUser ? (
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">@{messageTargetUser.username}</span>
                      <span className="text-[11px] text-slate-400 ml-2">({messageTargetUser.email})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMessageTargetUser(null)}
                      className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <select
                    value=""
                    onChange={(e) => {
                      const u = usersList.find(item => item.id === e.target.value);
                      if (u) setMessageTargetUser(u);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Choose User Recipient --</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        @{u.username} ({u.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Message Subject / Title
                </label>
                <input
                  type="text"
                  required
                  value={msgTitle}
                  onChange={(e) => setMsgTitle(e.target.value)}
                  placeholder="e.g. Important instructions for your account"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Message Body */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Message Content
                </label>
                <textarea
                  rows={3}
                  required
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  placeholder="Type your message for this user here..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-normal"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Priority Tag
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['normal', 'high', 'urgent'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setMsgPriority(p)}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer capitalize ${
                        msgPriority === p
                          ? p === 'urgent'
                            ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                            : p === 'high'
                              ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                              : 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setMessageModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingMessage}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSendingMessage ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Direct Message</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
