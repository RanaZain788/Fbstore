import React, { useState, useEffect, useMemo } from 'react';
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
  FileText,
  BadgeCheck,
  Flame,
  MessageSquarePlus,
  HelpCircle,
  Filter,
  Star,
  ArrowUpDown,
  Palette,
  ArrowUp,
  ArrowDown,
  Crown,
  Tag
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  DepositRequest, 
  FbIdStockItem, 
  StoreSettings, 
  Announcement, 
  AnnouncementType, 
  MarqueeAnnouncement, 
  AdminMessage,
  CustomerFeedback,
  AccountCategory
} from '../types';
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

  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggedInAsAdmin, setIsLoggedInAsAdmin] = useState(false);

  const [activeTab, setActiveTab] = useState<'deposits' | 'users' | 'stock' | 'feedback' | 'announcements' | 'messages' | 'backup' | 'settings'>('deposits');

  // Database Backup & Restore State
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [backupRestorePreview, setBackupRestorePreview] = useState<{
    fileName: string;
    usersCount: number;
    stockCount: number;
    purchasesCount: number;
    depositsCount: number;
    announcementsCount: number;
    feedbacksCount: number;
  } | null>(null);
  const [pendingRestoreData, setPendingRestoreData] = useState<any>(null);

  // Data
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [usersList, setUsersList] = useState<UserStatsItem[]>([]);
  const [stock, setStock] = useState<FbIdStockItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<CustomerFeedback[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Stock addition
  const [stockAddCategory, setStockAddCategory] = useState<AccountCategory>('simple');
  const [stockAddMode, setStockAddMode] = useState<'bulk' | 'individual'>('bulk');
  const [singleUid, setSingleUid] = useState('');
  const [singlePassword, setSinglePassword] = useState('');
  const [singleCookie, setSingleCookie] = useState('');
  const [pasteStockText, setPasteStockText] = useState('');
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);

  // Pricing & Box Configuration State
  const [priceSimpleInput, setPriceSimpleInput] = useState<number>(12);
  const [priceVerifiedInput, setPriceVerifiedInput] = useState<number>(25);

  // Stock Filter by Category & Status
  const [stockFilterCategory, setStockFilterCategory] = useState<'all' | 'simple' | 'verified'>('all');
  const [stockFilterStatus, setStockFilterStatus] = useState<'all' | 'available' | 'sold'>('all');

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

  // Marquee State
  const [marqueeSettings, setMarqueeSettings] = useState<MarqueeAnnouncement>({
    enabled: true,
    text: '🚀 Welcome to FBStore! Instant Facebook Accounts Delivery | 24/7 JazzCash & EasyPaisa Deposit | Guaranteed Fresh UIDs',
    speed: 'normal',
    showBadge: true,
    badgeText: 'Stock Update',
    targetType: 'all',
  });
  const [isSavingMarquee, setIsSavingMarquee] = useState(false);

  // Direct Admin Messages State
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageTargetUser, setMessageTargetUser] = useState<UserStatsItem | null>(null);
  const [msgTargetType, setMsgTargetType] = useState<'all' | 'user'>('user');
  const [msgSelectedUserId, setMsgSelectedUserId] = useState<string>('');
  const [manualRecipientInput, setManualRecipientInput] = useState<string>('');
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgPriority, setMsgPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sentMessagesList, setSentMessagesList] = useState<AdminMessage[]>([]);
  const [msgFilterSearch, setMsgFilterSearch] = useState('');

  // Search User
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [activeUserMenuId, setActiveUserMenuId] = useState<string | null>(null);

  // Balance Adjustment Modal
  const [balanceModalUser, setBalanceModalUser] = useState<UserStatsItem | null>(null);
  const [adjustMode, setAdjustMode] = useState<'add' | 'deduct' | 'set'>('add');
  const [adjustAmount, setAdjustAmount] = useState<number>(120);
  const [adjustReason, setAdjustReason] = useState('WhatsApp screenshot verified');
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);

  // Total Lifetime Balance Adjustment Modal
  const [totalBalanceModalOpen, setTotalBalanceModalOpen] = useState(false);
  const [totalBalanceMode, setTotalBalanceMode] = useState<'add' | 'deduct' | 'reset' | 'set'>('add');
  const [totalBalanceInput, setTotalBalanceInput] = useState<number>(100);
  const [isAdjustingTotal, setIsAdjustingTotal] = useState(false);

  const [totalLifetimeBalanceAdded, setTotalLifetimeBalanceAdded] = useState<number>(0);
  const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Password Reveal & Update
  const [passwordModalUser, setPasswordModalUser] = useState<UserStatsItem | null>(null);
  const [adminNewPasswordInput, setAdminNewPasswordInput] = useState('');
  const [isUpdatingUserPassword, setIsUpdatingUserPassword] = useState(false);
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  const [deleteUserModal, setDeleteUserModal] = useState<UserStatsItem | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [activeMenuDepositId, setActiveMenuDepositId] = useState<string | null>(null);
  const [copiedRules, setCopiedRules] = useState(false);

  // Settings Form
  const [settingsForm, setSettingsForm] = useState({
    adminUsername: 'arslan481',
    adminPassword: 'Zain786081@&#',
    whatsappNumber: '+92 306 4887388',
    accountTitle: 'Muhammad Arslan',
    accountNumber: '03064887388',
    easypaisaTitle: 'Muhammad Arslan',
    easypaisaNumber: '03064887388',
    jazzcashTitle: 'Muhammad Arslan',
    jazzcashNumber: '03064887388',
    pricePerIdSimple: 12,
    pricePerIdVerified: 25,
    simpleAccountsEnabled: true,
    verifiedAccountsEnabled: true,
    simpleOfferEnabled: false,
    simpleOfferMessage: 'Special Limited Discount Available!',
    simpleOfferColor: '#f59e0b',
    verifiedOfferEnabled: false,
    verifiedOfferMessage: 'Premium VIP Verified Accounts Sale!',
    verifiedOfferColor: '#06b6d4',
    boxesDisplayOrder: 'simple_first' as 'simple_first' | 'verified_first',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
  });

  // Robust Clipboard Copy Helper with ExecCommand fallback for iframes
  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {}
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-999999px';
      textarea.style.top = '-999999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful;
    } catch (err) {
      return false;
    }
  };

  // Smart Live Parser for Bulk Textarea
  const parsedBulkPreview = useMemo(() => {
    const rawJoined = pasteStockText.trim();
    if (!rawJoined) return [];

    const result: Array<{ uid: string; password: string; cookie?: string; hasCookie: boolean; cookiePreview?: string }> = [];

    const addAccount = (uid: string, password: string, cookie?: string) => {
      const cleanUid = uid.replace(/^["']|["']$/g, '').trim();
      const cleanPass = password.replace(/^["']|["']$/g, '').trim();
      const cleanCookie = cookie ? cookie.replace(/^["']|["']$/g, '').trim() : undefined;
      if (!cleanUid) return;

      result.push({
        uid: cleanUid,
        password: cleanPass || '(none)',
        cookie: cleanCookie,
        hasCookie: Boolean(cleanCookie),
        cookiePreview: cleanCookie ? (cleanCookie.length > 30 ? cleanCookie.slice(0, 30) + '...' : cleanCookie) : undefined
      });
    };

    // 1. JSON Array format: [{"uid": "...", "password": "...", "cookie": "..."}]
    if (rawJoined.startsWith('[') && rawJoined.endsWith(']')) {
      try {
        const parsed = JSON.parse(rawJoined);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && typeof item === 'object') {
              const u = String(item.uid || item.id || item.username || '').trim();
              const p = String(item.password || item.pass || item.pwd || '').trim();
              const c = item.cookie || item.cookies || item.token ? String(item.cookie || item.cookies || item.token).trim() : undefined;
              if (u) addAccount(u, p, c);
            }
          }
          if (result.length > 0) return result;
        }
      } catch (e) {}
    }

    // 2. Multi-line Block Format (UID:\nPASS:\nCOOKIE: or separated by blank lines / dashes)
    const hasBlockLabels = /(?:^|\n)\s*(?:uid|id|user)\s*:/i.test(rawJoined) && 
                           /(?:^|\n)\s*(?:pass|password|pwd)\s*:/i.test(rawJoined);

    if (hasBlockLabels) {
      const blocks = rawJoined.split(/\n\s*(?:\n|---|===|___|\*\*\*)\s*\n?/);
      let parsedBlocks = 0;

      for (const block of blocks) {
        if (!block.trim()) continue;
        let bUid = '';
        let bPass = '';
        let bCookie = '';

        const blockLines = block.split('\n');
        for (const bl of blockLines) {
          const trimmedBl = bl.trim();
          if (!trimmedBl || trimmedBl.startsWith('#')) continue;

          const uidMatch = trimmedBl.match(/^(?:uid|id|username|user)\s*[:=]\s*(.+)$/i);
          if (uidMatch) {
            bUid = uidMatch[1].trim();
            continue;
          }

          const passMatch = trimmedBl.match(/^(?:password|pass|pwd)\s*[:=]\s*(.+)$/i);
          if (passMatch) {
            bPass = passMatch[1].trim();
            continue;
          }

          const cookieMatch = trimmedBl.match(/^(?:cookie|cookies|token|session)\s*[:=]\s*(.+)$/i);
          if (cookieMatch) {
            bCookie = cookieMatch[1].trim();
            continue;
          }

          const twoFaMatch = trimmedBl.match(/^(?:2fa|twofa|code|secret)\s*[:=]\s*(.+)$/i);
          if (twoFaMatch) {
            bPass = bPass ? `${bPass} [2FA: ${twoFaMatch[1].trim()}]` : `[2FA: ${twoFaMatch[1].trim()}]`;
            continue;
          }

          if (/c_user=|xs=|datr=|sb=/.test(trimmedBl)) {
            bCookie = bCookie ? `${bCookie}; ${trimmedBl}` : trimmedBl;
          }
        }

        if (bUid) {
          addAccount(bUid, bPass, bCookie || undefined);
          parsedBlocks++;
        }
      }

      if (parsedBlocks > 0) return result;
    }

    // 3. Line by Line parser
    const lines = pasteStockText.split('\n');
    for (const raw of lines) {
      let trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const lower = trimmed.toLowerCase();
      if (lower.startsWith('uid|password') || lower.startsWith('uid:password') || lower === 'uid:pass:cookie' || lower === 'uid|pass|cookie') {
        continue;
      }

      let uid = '';
      let password = '';
      let cookie: string | undefined = undefined;

      // Labels inside single line: "UID: 1000 | PASS: abc | Cookie: c_user=..."
      if (/uid\s*[:=]/i.test(trimmed) && /pass/i.test(trimmed)) {
        const uM = trimmed.match(/uid\s*[:=]\s*([^|:;\n\s]+)/i);
        const pM = trimmed.match(/pass(?:word)?\s*[:=]\s*([^|;\n]+)/i);
        const cM = trimmed.match(/cookie[s]?\s*[:=]\s*(.+)$/i);
        if (uM && uM[1]) uid = uM[1].trim();
        if (pM && pM[1]) password = pM[1].trim();
        if (cM && cM[1]) cookie = cM[1].trim();

        if (uid) {
          addAccount(uid, password, cookie);
          continue;
        }
      }

      trimmed = trimmed.replace(/^(?:uid|id|user)\s*[:=]\s*/i, '');

      let sep = '';
      if (trimmed.includes('----') || trimmed.includes('---')) {
        sep = trimmed.includes('----') ? '----' : '---';
      } else if (trimmed.includes('\t')) {
        sep = '\t';
      } else if (trimmed.includes('|')) {
        sep = '|';
      }

      if (sep) {
        const parts = trimmed.split(sep).map(p => p.trim());
        uid = parts[0] || '';
        password = parts[1] || '';

        if (parts.length === 3) {
          cookie = parts[2] || undefined;
        } else if (parts.length >= 4) {
          const part3IsCookie = /c_user=|xs=|datr=|sb=|\[|\{/.test(parts[2]);
          const part4IsCookie = /c_user=|xs=|datr=|sb=|\[|\{/.test(parts[3]);

          if (part4IsCookie) {
            password = `${parts[1]} [2FA: ${parts[2]}]`;
            cookie = parts.slice(3).join(sep).trim() || undefined;
          } else if (part3IsCookie) {
            cookie = parts.slice(2).join(sep).trim() || undefined;
          } else {
            cookie = parts.slice(2).join(sep).trim() || undefined;
          }
        }
      } else if (trimmed.includes(':')) {
        const firstColon = trimmed.indexOf(':');
        uid = trimmed.slice(0, firstColon).trim();
        const remainder = trimmed.slice(firstColon + 1).trim();

        const cookieIndex = remainder.search(/c_user=|xs=|datr=|sb=|\[\s*\{/i);
        if (cookieIndex > 0) {
          const beforeCookie = remainder.slice(0, cookieIndex).trim().replace(/[:|;\s]+$/, '');
          cookie = remainder.slice(cookieIndex).trim();

          const subColon = beforeCookie.indexOf(':');
          if (subColon !== -1) {
            const p = beforeCookie.slice(0, subColon).trim();
            const twoFa = beforeCookie.slice(subColon + 1).trim();
            password = twoFa ? `${p} [2FA: ${twoFa}]` : p;
          } else {
            password = beforeCookie;
          }
        } else {
          const secondColon = remainder.indexOf(':');
          if (secondColon !== -1) {
            password = remainder.slice(0, secondColon).trim();
            cookie = remainder.slice(secondColon + 1).trim() || undefined;
          } else {
            password = remainder;
          }
        }
      } else if (trimmed.includes(',')) {
        const parts = trimmed.split(',').map(p => p.trim());
        uid = parts[0] || '';
        password = parts[1] || '';
        if (parts.length >= 3) {
          cookie = parts.slice(2).join(',').trim() || undefined;
        }
      } else {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
          uid = parts[0].trim();
          password = parts[1].trim();
          if (parts.length >= 3) {
            cookie = parts.slice(2).join(' ').trim() || undefined;
          }
        } else {
          uid = trimmed;
          password = '';
        }
      }

      if (uid) {
        addAccount(uid, password, cookie);
      }
    }

    return result;
  }, [pasteStockText]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.deposit-action-menu')) {
        setActiveMenuDepositId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

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
      const [resDep, resStock, resUsers, resOverview, resAnn, resMarq, resMsg, resFeedbacks] = await Promise.all([
        fetch('/api/deposits', { headers: { Authorization: `Bearer ${currentToken}` } }),
        fetch('/api/admin/stock', { headers: { Authorization: `Bearer ${currentToken}` } }),
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${currentToken}` } }),
        fetch('/api/admin/overview', { headers: { Authorization: `Bearer ${currentToken}` } }),
        fetch('/api/admin/announcements', { headers: { Authorization: `Bearer ${currentToken}` } }),
        fetch('/api/marquee'),
        fetch('/api/admin/messages', { headers: { Authorization: `Bearer ${currentToken}` } }),
        fetch('/api/admin/feedbacks', { headers: { Authorization: `Bearer ${currentToken}` } })
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
        if (d.marquee) {
          setMarqueeSettings({
            enabled: d.marquee.enabled !== false,
            text: d.marquee.text || '',
            speed: d.marquee.speed || 'normal',
            showBadge: d.marquee.showBadge !== false,
            badgeText: d.marquee.badgeText || 'Stock Update',
            targetType: d.marquee.targetType || 'all',
            targetUserId: d.marquee.targetUserId,
            targetUsername: d.marquee.targetUsername,
          });
        }
      }
      if (resMsg.ok) {
        const d = await resMsg.json();
        setSentMessagesList(d.messages || []);
      }
      if (resFeedbacks.ok) {
        const d = await resFeedbacks.json();
        setFeedbacks(d.feedbacks || []);
      }

      if (resOverview.ok) {
        const d = await resOverview.json();
        if (d.totalBalanceAddedLifetime !== undefined) {
          setTotalLifetimeBalanceAdded(d.totalBalanceAddedLifetime);
        }
        if (d.settings) {
          setStoreSettings(d.settings);
          setPriceSimpleInput(d.settings.pricePerIdSimple || 12);
          setPriceVerifiedInput(d.settings.pricePerIdVerified || 25);

          const pTitle = d.settings.accountTitle || d.settings.jazzcashTitle || d.settings.easypaisaTitle || 'Muhammad Arslan';
          const pNumber = d.settings.accountNumber || d.settings.jazzcashNumber || d.settings.easypaisaNumber || '03064887388';

          setSettingsForm({
            adminUsername: d.settings.adminUsername || 'arslan481',
            adminPassword: d.settings.adminPassword || 'Zain786081@&#',
            whatsappNumber: d.settings.whatsappNumber || '+92 306 4887388',
            accountTitle: pTitle,
            accountNumber: pNumber,
            easypaisaTitle: pTitle,
            easypaisaNumber: pNumber,
            jazzcashTitle: pTitle,
            jazzcashNumber: pNumber,
            pricePerIdSimple: d.settings.pricePerIdSimple || 12,
            pricePerIdVerified: d.settings.pricePerIdVerified || 25,
            simpleAccountsEnabled: d.settings.simpleAccountsEnabled !== false,
            verifiedAccountsEnabled: d.settings.verifiedAccountsEnabled !== false,
            simpleOfferEnabled: Boolean(d.settings.simpleOfferEnabled),
            simpleOfferMessage: d.settings.simpleOfferMessage || 'Special Limited Discount Available!',
            simpleOfferColor: d.settings.simpleOfferColor || '#f59e0b',
            verifiedOfferEnabled: Boolean(d.settings.verifiedOfferEnabled),
            verifiedOfferMessage: d.settings.verifiedOfferMessage || 'Premium VIP Verified Accounts Sale!',
            verifiedOfferColor: d.settings.verifiedOfferColor || '#06b6d4',
            boxesDisplayOrder: (d.settings.boxesDisplayOrder === 'verified_first' ? 'verified_first' : 'simple_first') as 'simple_first' | 'verified_first',
            smtpHost: d.settings.smtp?.host || 'smtp.gmail.com',
            smtpPort: d.settings.smtp?.port || 587,
            smtpUser: d.settings.smtp?.user || '',
            smtpPass: d.settings.smtp?.pass || '',
          });
        }
      }
    } catch (e) {
      console.error('Admin fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Real-time synchronization for Admin Portal
  useEffect(() => {
    if (!isLoggedInAsAdmin) return;
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events?userId=admin');
      
      eventSource.addEventListener('deposit_created', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.deposit) {
            setDeposits(prev => [d.deposit, ...prev]);
            confetti({ particleCount: 30, spread: 60, origin: { y: 0.2 } });
            showToast('New Deposit Received', `Rs. ${d.deposit.amount} PKR from @${d.deposit.username}`, 'info');
          }
        } catch (err) {}
      });

      eventSource.addEventListener('stock_updated', () => fetchAdminData());
      eventSource.addEventListener('wallet_updated', () => fetchAdminData());
      eventSource.addEventListener('feedback_received', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.feedback) {
            setFeedbacks(prev => [d.feedback, ...prev]);
            showToast('New Customer Feedback', d.feedback.subject || 'Feedback received', 'info');
          }
        } catch (err) {}
      });
    } catch (err) {}

    return () => {
      eventSource?.close();
    };
  }, [isLoggedInAsAdmin]);

  // Close user dropdown menu when clicking anywhere outside
  useEffect(() => {
    if (!activeUserMenuId) return;
    const handleOutsideClick = () => {
      setActiveUserMenuId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [activeUserMenuId]);

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

  // 1. Direct User Wallet Adjustment
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

      try {
        const finalBal = data.user?.walletBalance ?? (
          adjustMode === 'add' 
            ? balanceModalUser.walletBalance + adjustAmount 
            : adjustMode === 'deduct'
              ? Math.max(0, balanceModalUser.walletBalance - adjustAmount)
              : adjustAmount
        );
        await firebaseService.setUserBalanceDirect(balanceModalUser.id, finalBal);
      } catch (fsErr) {}

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

      try {
        await firebaseService.approveDeposit(dep.id, dep.userId, dep.amount);
      } catch (fsErr) {}

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

  // 3b. Change Deposit Status
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

  // 4. Bulk Add Stock with Smart Cookie Parsing & Category
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteStockText.trim() && parsedBulkPreview.length === 0) {
      showToast('Required', 'Please paste at least one line of accounts or upload a file.', 'error');
      return;
    }
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    setIsAddingStock(true);
    try {
      const accountsPayload = parsedBulkPreview.map(p => ({
        uid: p.uid,
        password: p.password,
        cookie: p.cookie
      }));

      const res = await fetch('/api/admin/stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ 
          text: pasteStockText,
          accounts: accountsPayload.length > 0 ? accountsPayload : undefined,
          category: stockAddCategory
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('Add Stock Failed', data.error || 'Failed to add stock.', 'error');
        setIsAddingStock(false);
        return;
      }

      const catLabel = stockAddCategory === 'verified' ? 'Verified' : 'Simple';
      showToast('Stock Added', `Added ${data.addedCount} ${catLabel} Facebook account(s) to stock!`, 'success');
      setPasteStockText('');
      fetchAdminData();
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to add stock.', 'error');
    } finally {
      setIsAddingStock(false);
    }
  };

  // 4a. Add Single Individual Stock Account
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
          cookie: singleCookie.trim() || undefined,
          category: stockAddCategory
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('Add Stock Failed', data.error || 'Failed to add account.', 'error');
        setIsAddingStock(false);
        return;
      }

      const catLabel = stockAddCategory === 'verified' ? 'Verified Account' : 'Simple Account';
      showToast('Account Added', `${catLabel} UID ${singleUid.trim()} added to stock!${singleCookie.trim() ? ' (Cookie attached 🍪)' : ''}`, 'success');
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

  // 5. Copy UIDs (All / Available / Sold) Helper
  const handleCopyUids = async (status: 'all' | 'available' | 'sold') => {
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    try {
      const catParam = stockFilterCategory !== 'all' ? `&category=${stockFilterCategory}` : '';
      const res = await fetch(`/api/admin/stock/uids?status=${status}${catParam}`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      const data = await res.json();
      if (res.ok && data.uids && data.uids.length > 0) {
        const ok = await copyTextToClipboard(data.text);
        if (ok) {
          showToast('UIDs Copied', `Copied ${data.count} ${status.toUpperCase()} UID(s) to clipboard!`, 'success');
        } else {
          showToast('Copy Failed', 'Clipboard access denied. Please allow clipboard permissions.', 'error');
        }
      } else {
        showToast('No UIDs', `No ${status} accounts found in this filter.`, 'info');
      }
    } catch (err: any) {
      showToast('Error', 'Failed to copy UIDs.', 'error');
    }
  };

  // 6. Delete single stock item
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
      const catParam = stockFilterCategory !== 'all' ? `?category=${stockFilterCategory}` : '';
      const res = await fetch(`/api/admin/stock/sold/clear${catParam}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Cleared', `Deleted ${data.removedCount || 0} sold accounts.`, 'success');
        fetchAdminData();
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to clear sold stock.', 'error');
    }
  };

  // 7. Save Store Settings (Prices, Toggles, Offers, Credentials)
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
        pricePerIdSimple: Number(settingsForm.pricePerIdSimple),
        pricePerIdVerified: Number(settingsForm.pricePerIdVerified),
        pricePerId: Number(settingsForm.pricePerIdSimple),
        simpleAccountsEnabled: Boolean(settingsForm.simpleAccountsEnabled),
        verifiedAccountsEnabled: Boolean(settingsForm.verifiedAccountsEnabled),
        simpleOfferEnabled: Boolean(settingsForm.simpleOfferEnabled),
        simpleOfferMessage: String(settingsForm.simpleOfferMessage || '').trim(),
        simpleOfferColor: String(settingsForm.simpleOfferColor || '#f59e0b').trim(),
        verifiedOfferEnabled: Boolean(settingsForm.verifiedOfferEnabled),
        verifiedOfferMessage: String(settingsForm.verifiedOfferMessage || '').trim(),
        verifiedOfferColor: String(settingsForm.verifiedOfferColor || '#06b6d4').trim(),
        boxesDisplayOrder: settingsForm.boxesDisplayOrder || 'simple_first',
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

      showToast('Settings Saved', 'Prices, box visibility, offers, and payment details updated live across website.', 'success');
      fetchAdminData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  // 8. Save Marquee Ticker Settings with INSTANT local & storage broadcast
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
        // Immediate local & storage & BroadcastChannel broadcast so website updates in real-time with 0-second delay!
        localStorage.setItem('fbstore_cached_marquee', JSON.stringify(marqueeSettings));
        window.dispatchEvent(new CustomEvent('fbstore_marquee_updated', { detail: marqueeSettings }));
        try {
          const ch = new BroadcastChannel('fbstore_realtime_channel');
          ch.postMessage({ type: 'marquee_updated', marquee: marqueeSettings });
          ch.close();
        } catch (err) {}
        firebaseService.saveMarquee(marqueeSettings).catch(() => {});
        showToast('Marquee Updated', 'Top announcement ticker updated live across website.', 'success');
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

  // 9. Feedback Management
  const handleUpdateFeedbackStatus = async (id: string, status: 'new' | 'reviewed' | 'resolved') => {
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;
    try {
      const res = await fetch(`/api/admin/feedbacks/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status } : f));
        showToast('Status Updated', `Feedback marked as ${status}.`, 'info');
      }
    } catch (err) {}
  };

  const handleDeleteFeedback = async (id: string) => {
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;
    try {
      const res = await fetch(`/api/admin/feedbacks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.ok) {
        setFeedbacks(prev => prev.filter(f => f.id !== id));
        showToast('Deleted', 'Feedback item removed.', 'info');
      }
    } catch (err) {}
  };

  // 10. Site Announcements Management
  const handleOpenNewAnnouncement = () => {
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

  const handleOpenEditAnnouncement = (ann: Announcement) => {
    setEditingAnnouncement(ann);
    setAnnTitle(ann.title);
    setAnnMessage(ann.message);
    setAnnType(ann.type || 'info');
    setAnnTargetType(ann.targetType || 'all');
    setAnnTargetUserId(ann.targetUserId || ann.targetUsername || '');
    setAnnShowAsPopup(Boolean(ann.showAsPopup));
    setAnnFrequency(ann.frequency || 'every_refresh');
    setAnnActive(ann.active !== false);
    setAnnouncementModalOpen(true);
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    if (!annTitle.trim() || !annMessage.trim()) {
      showToast('Missing Fields', 'Title and announcement message are required.', 'error');
      return;
    }

    setIsSavingAnnouncement(true);
    try {
      const payload = {
        title: annTitle.trim(),
        message: annMessage.trim(),
        type: annType,
        targetType: annTargetType,
        targetUserId: annTargetType === 'user' ? annTargetUserId.trim() : undefined,
        targetUsername: annTargetType === 'user' ? annTargetUserId.trim() : undefined,
        showAsPopup: annShowAsPopup,
        frequency: annFrequency,
        active: annActive
      };

      const res = editingAnnouncement
        ? await fetch(`/api/admin/announcements/${editingAnnouncement.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${currentToken}`
            },
            body: JSON.stringify(payload)
          })
        : await fetch('/api/admin/announcements', {
            method: 'POST',
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
          'Announcement is now live on customer dashboards.',
          'success'
        );
        setAnnouncementModalOpen(false);
        setEditingAnnouncement(null);
        await fetchAdminData();
      } else {
        showToast('Error', data.error || 'Failed to save announcement.', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to save announcement.', 'error');
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  const handleToggleAnnouncementActive = async (ann: Announcement) => {
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    const nextState = !ann.active;
    try {
      const res = await fetch(`/api/admin/announcements/${ann.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ active: nextState })
      });
      if (res.ok) {
        setAnnouncementsList(prev => prev.map(a => a.id === ann.id ? { ...a, active: nextState } : a));
        showToast('Status Updated', `Announcement ${nextState ? 'activated' : 'paused'}.`, 'info');
      }
    } catch (err) {}
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.ok) {
        setAnnouncementsList(prev => prev.filter(a => a.id !== id));
        showToast('Deleted', 'Announcement removed from site.', 'info');
      }
    } catch (err) {}
  };

  // 11. Database Backup Export & Restore
  const handleDownloadBackup = async () => {
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    setIsExportingBackup(true);
    try {
      const res = await fetch('/api/admin/database/backup', {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (!res.ok) throw new Error('Failed to generate backup snapshot');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fbstore-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Backup Exported', 'Complete database snapshot downloaded successfully.', 'success');
    } catch (err: any) {
      showToast('Export Error', err.message || 'Failed to download backup.', 'error');
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleSelectRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') {
          showToast('Invalid File', 'File is not a valid JSON database backup.', 'error');
          return;
        }

        const usersCount = Array.isArray(parsed.users) ? parsed.users.length : 0;
        const stockCount = Array.isArray(parsed.idsStock) 
          ? parsed.idsStock.length 
          : (Array.isArray(parsed.stock) ? parsed.stock.length : 0);
        const purchasesCount = Array.isArray(parsed.purchases) 
          ? parsed.purchases.length 
          : (Array.isArray(parsed.orders) ? parsed.orders.length : 0);
        const depositsCount = Array.isArray(parsed.deposits) ? parsed.deposits.length : 0;
        const announcementsCount = Array.isArray(parsed.announcements) ? parsed.announcements.length : 0;
        const feedbacksCount = Array.isArray(parsed.feedbacks) ? parsed.feedbacks.length : 0;

        setBackupRestorePreview({
          fileName: file.name,
          usersCount,
          stockCount,
          purchasesCount,
          depositsCount,
          announcementsCount,
          feedbacksCount
        });
        setPendingRestoreData(parsed);
        showToast('Backup Verified', 'Backup file analyzed. Review details below and click Confirm Restore.', 'info');
      } catch (err) {
        showToast('Parse Error', 'Failed to parse JSON backup file.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmRestoreDatabase = async () => {
    if (!pendingRestoreData) return;
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    setIsRestoringBackup(true);
    try {
      const res = await fetch('/api/admin/database/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify(pendingRestoreData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPendingRestoreData(null);
        setBackupRestorePreview(null);
        await fetchAdminData();
        showToast('Restore Complete', 'Database successfully restored! All users, stock, and orders are live.', 'success');
      } else {
        showToast('Restore Failed', data.error || 'Failed to restore database.', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Restore request failed.', 'error');
    } finally {
      setIsRestoringBackup(false);
    }
  };

  // 12. Direct Admin Messaging Handlers
  const handleOpenMessageModal = (targetUser?: UserStatsItem | null, initialTitle?: string, initialBody?: string) => {
    if (targetUser) {
      setMessageTargetUser(targetUser);
      setMsgTargetType('user');
      setMsgSelectedUserId(targetUser.id);
      setManualRecipientInput(targetUser.username || targetUser.email || targetUser.id);
    } else {
      setMessageTargetUser(null);
      setMsgTargetType('all');
      setMsgSelectedUserId(usersList[0]?.id || '');
      setManualRecipientInput('');
    }
    setMsgTitle(initialTitle || '');
    setMsgBody(initialBody || '');
    setMsgPriority('normal');
    setMessageModalOpen(true);
  };

  const handleSendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    if (!msgTitle.trim() || !msgBody.trim()) {
      showToast('Missing Fields', 'Message title and body are required.', 'error');
      return;
    }

    const isBroadcast = msgTargetType === 'all';
    let targetUserId = 'all';
    let targetUsername = 'All Registered Users';

    if (!isBroadcast) {
      targetUserId = (manualRecipientInput.trim() || msgSelectedUserId || messageTargetUser?.id || '').trim();
      if (!targetUserId) {
        showToast('Missing Recipient', 'Please select or type a recipient username, email, or user ID.', 'error');
        return;
      }
      const matched = usersList.find(u => 
        u.id.toLowerCase() === targetUserId.toLowerCase() || 
        u.username.toLowerCase() === targetUserId.toLowerCase() || 
        u.email.toLowerCase() === targetUserId.toLowerCase()
      );
      if (matched) {
        targetUserId = matched.id;
        targetUsername = matched.username;
      } else {
        targetUsername = messageTargetUser?.username || manualRecipientInput.trim();
      }
    }

    setIsSendingMessage(true);
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          userId: targetUserId,
          targetUsername,
          title: msgTitle.trim(),
          message: msgBody.trim(),
          priority: msgPriority
        })
      });

      const data = await res.json();
      if (res.ok && data.message) {
        setSentMessagesList(prev => [data.message, ...prev.filter(m => m.id !== data.message.id)]);
        showToast(
          'Message Dispatched',
          `Direct notification sent to ${isBroadcast ? 'all users' : `@${targetUsername}`}.`,
          'success'
        );
        setMessageModalOpen(false);
        setMsgTitle('');
        setMsgBody('');
        setManualRecipientInput('');
      } else {
        showToast('Error', data.error || 'Failed to send direct message.', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to send message.', 'error');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleDeleteAdminMessage = async (id: string) => {
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    try {
      const res = await fetch(`/api/admin/messages/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.ok) {
        setSentMessagesList(prev => prev.filter(m => m.id !== id));
        showToast('Deleted', 'Direct message removed.', 'info');
      }
    } catch (err) {}
  };

  // 13. Admin Password Management for Any User
  const handleUpdateUserPasswordByAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    if (!adminNewPasswordInput.trim() || adminNewPasswordInput.trim().length < 6) {
      showToast('Invalid Password', 'New password must be at least 6 characters.', 'error');
      return;
    }

    setIsUpdatingUserPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${passwordModalUser.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ newPassword: adminNewPasswordInput.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Password Changed', `New password saved for @${passwordModalUser.username}.`, 'success');
        setPasswordModalUser(null);
        setAdminNewPasswordInput('');
        await fetchAdminData();
      } else {
        showToast('Error', data.error || 'Failed to update user password.', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to update password.', 'error');
    } finally {
      setIsUpdatingUserPassword(false);
    }
  };

  // 14. Admin Delete User Account
  const handleDeleteUserByAdmin = async () => {
    if (!deleteUserModal) return;
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    setIsDeletingUser(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteUserModal.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUsersList(prev => prev.filter(u => u.id !== deleteUserModal.id));
        showToast('User Deleted', `Account @${deleteUserModal.username} deleted from database.`, 'info');
        setDeleteUserModal(null);
        await fetchAdminData();
      } else {
        showToast('Error', data.error || 'Failed to delete user.', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to delete user.', 'error');
    } finally {
      setIsDeletingUser(false);
    }
  };

  // 15. Admin Adjust Total Lifetime Balance Added
  const handleAdjustTotalLifetimeBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    setIsAdjustingTotal(true);
    try {
      if (totalBalanceMode === 'reset') {
        const res = await fetch('/api/admin/balance-stats/reset', {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentToken}` }
        });
        if (res.ok) {
          setTotalLifetimeBalanceAdded(0);
          showToast('Counter Reset', 'Total lifetime balance counter reset to Rs. 0 PKR.', 'info');
          setTotalBalanceModalOpen(false);
        }
      } else {
        const res = await fetch('/api/admin/balance-stats/adjust', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`
          },
          body: JSON.stringify({ 
            mode: totalBalanceMode, 
            amount: Number(totalBalanceInput),
            addAmount: totalBalanceMode === 'add' ? Number(totalBalanceInput) : undefined,
            deductAmount: totalBalanceMode === 'deduct' ? Number(totalBalanceInput) : undefined,
            newAmount: totalBalanceMode === 'set' ? Number(totalBalanceInput) : undefined
          })
        });
        const d = await res.json();
        if (res.ok) {
          const newVal = d.totalBalanceAddedLifetime ?? totalBalanceInput;
          setTotalLifetimeBalanceAdded(newVal);
          showToast('Updated', `Total balance stat adjusted to Rs. ${newVal.toLocaleString()} PKR.`, 'success');
          setTotalBalanceModalOpen(false);
          fetchAdminData();
        } else {
          showToast('Failed', d.error || 'Could not update total balance stat.', 'error');
        }
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to adjust balance stat.', 'error');
    } finally {
      setIsAdjustingTotal(false);
    }
  };

  // Filtered Stock List
  const filteredStock = stock.filter(item => {
    const cat = item.category || 'simple';
    if (stockFilterCategory !== 'all' && cat !== stockFilterCategory) return false;
    if (stockFilterStatus === 'available' && item.status !== 'available') return false;
    if (stockFilterStatus === 'sold' && item.status !== 'sold') return false;
    return true;
  });

  const availableSimpleCount = stock.filter(s => (s.category || 'simple') === 'simple' && s.status === 'available').length;
  const availableVerifiedCount = stock.filter(s => s.category === 'verified' && s.status === 'available').length;
  const soldSimpleCount = stock.filter(s => (s.category || 'simple') === 'simple' && s.status === 'sold').length;
  const soldVerifiedCount = stock.filter(s => s.category === 'verified' && s.status === 'sold').length;
  const pendingDeposits = deposits.filter(d => d.status === 'pending');
  const unreadFeedbacks = feedbacks.filter(f => f.status === 'new');

  // Render Login Screen if not authenticated
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
      {/* Top Header */}
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

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
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
            <span className="text-[11px] text-slate-400 font-semibold block uppercase">Simple Stock</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-blue-400">
                {availableSimpleCount}
              </span>
              <span className="text-[10px] font-bold text-slate-500">Rs. {settingsForm.pricePerIdSimple}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <span className="text-[11px] text-slate-400 font-semibold block uppercase">Verified Stock</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-cyan-400">
                {availableVerifiedCount}
              </span>
              <span className="text-[10px] font-bold text-slate-500">Rs. {settingsForm.pricePerIdVerified}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <span className="text-[11px] text-slate-400 font-semibold block uppercase">Feedback / Inbox</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className={`text-2xl font-black ${unreadFeedbacks.length > 0 ? 'text-purple-400' : 'text-slate-300'}`}>
                {feedbacks.length}
              </span>
              <MessageSquarePlus className="w-4 h-4 text-purple-400" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <span className="text-[11px] text-slate-400 font-semibold block uppercase">Customers</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-indigo-400">
                {usersList.length}
              </span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
          </div>

          <div 
            onClick={() => setTotalBalanceModalOpen(true)}
            className="bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 cursor-pointer transition group"
            title="Click to adjust or reset lifetime balance added counter"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 group-hover:text-emerald-300 font-semibold uppercase">Total Balance</span>
              <Edit3 className="w-3 h-3 text-slate-500 group-hover:text-emerald-400" />
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-emerald-400 font-mono">
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
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              activeTab === 'stock'
                ? 'bg-[#1877F2] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Manage Stock & Categories</span>
          </button>

          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              activeTab === 'feedback'
                ? 'bg-[#1877F2] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>Feedback & Suggestions ({feedbacks.length})</span>
            {unreadFeedbacks.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                {unreadFeedbacks.length}
              </span>
            )}
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
            <span>Customer Accounts ({usersList.length})</span>
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
            <span>Announcements & Marquee</span>
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
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-[#1877F2] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Database Backup & Restore</span>
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
            <span>Pricing, Boxes, Offers & Settings</span>
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

                    <div className="flex items-center gap-2 md:self-center relative deposit-action-menu">
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

                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuDepositId(activeMenuDepositId === dep.id ? null : dep.id);
                          }}
                          className="p-2.5 rounded-xl border bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 cursor-pointer"
                          title="Options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {activeMenuDepositId === dep.id && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-30 space-y-1"
                          >
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
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuDepositId(null);
                                const matched = usersList.find(u => u.id === dep.userId || u.username === dep.username || u.email === dep.userEmail);
                                handleOpenMessageModal(matched || {
                                  id: dep.userId,
                                  username: dep.username,
                                  email: dep.userEmail,
                                  walletBalance: 0,
                                  createdAt: dep.createdAt,
                                  ordersCount: 0,
                                  totalAccountsBought: 0,
                                  totalSpent: 0
                                }, 'Regarding Your Deposit Request', `Hello @${dep.username}, regarding your recent deposit of Rs. ${dep.amount} (TID: ${dep.transactionId}): `);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-500/10 rounded-lg transition text-left cursor-pointer"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>Message @{dep.username}</span>
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

        {/* TAB 2: MANAGE STOCK & PRICE WITH SEPARATE SIMPLE & VERIFIED CATEGORIES */}
        {activeTab === 'stock' && (
          <div className="space-y-6">
            
            {/* ADD STOCK CARD - EASY BULK WITH COOKIES & CATEGORY SELECTOR */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-400" />
                    <span>Add Accounts to Stock (With Cookies)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select account category (Simple or Verified) and paste in bulk. Cookies are automatically detected!
                  </p>
                </div>

                {/* Mode Selector */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setStockAddMode('bulk')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      stockAddMode === 'bulk' ? 'bg-[#1877F2] text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Bulk Import (Easy)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockAddMode('individual')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      stockAddMode === 'individual' ? 'bg-[#1877F2] text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Single Account
                  </button>
                </div>
              </div>

              {/* Category Picker (Simple vs Verified) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Select Target Category:
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <button
                    type="button"
                    onClick={() => setStockAddCategory('simple')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-3 ${
                      stockAddCategory === 'simple'
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      FB
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-white">Simple Accounts</span>
                      <span className="text-[10px] text-slate-400">Standard UID:Password accounts</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStockAddCategory('verified')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-3 ${
                      stockAddCategory === 'verified'
                        ? 'bg-indigo-600/20 border-cyan-400 text-white shadow-sm ring-1 ring-cyan-400/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center font-bold text-xs">
                      <BadgeCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-white flex items-center gap-1">
                        <span>Verified Accounts</span>
                        <Star className="w-3 h-3 text-cyan-400 fill-cyan-400" />
                      </span>
                      <span className="text-[10px] text-slate-400">High trust VIP verified accounts</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* OPTION 1: BULK INPUT WITH LIVE PARSER */}
              {stockAddMode === 'bulk' ? (
                <form onSubmit={handleAddStock} className="space-y-4">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Paste Accounts in Bulk (Supports any delimiter: <code className="text-blue-400 font-bold">:</code>, <code className="text-cyan-400 font-bold">|</code>, <code className="text-amber-400 font-bold">----</code>, multi-line blocks, or JSON)
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-lg border border-slate-700 cursor-pointer transition flex items-center gap-1.5 shrink-0">
                          <Upload className="w-3.5 h-3.5 text-blue-400" />
                          <span>Upload File (.txt/.csv)</span>
                          <input
                            type="file"
                            accept=".txt,.csv,.json"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const content = event.target?.result;
                                  if (typeof content === 'string') {
                                    setPasteStockText(content);
                                    showToast('File Loaded', `Loaded ${file.name}. Accounts detected and ready below!`, 'success');
                                  }
                                };
                                reader.readAsText(file);
                              }
                            }}
                          />
                        </label>
                        {pasteStockText && (
                          <button
                            type="button"
                            onClick={() => setPasteStockText('')}
                            className="text-[11px] text-slate-400 hover:text-rose-400 transition cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                        <span className="text-[11px] text-slate-500 font-mono">
                          {pasteStockText.split('\n').filter(l => l.trim()).length} lines
                        </span>
                      </div>
                    </div>
                    <textarea
                      rows={6}
                      required
                      value={pasteStockText}
                      onChange={(e) => setPasteStockText(e.target.value)}
                      placeholder={`100089238472:SecretPass123:c_user=100089238472;xs=2%3Aabc...;datr=xyz\n100089238473|AnotherPass456|c_user=100089238473;xs=def\n100089238474----AlphaBravo789----c_user=100089238474\n100089238475:NoCookiePass`}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-[#1877F2]"
                    />
                  </div>

                  {/* Smart Live Parsing Preview Indicator */}
                  {parsedBulkPreview.length > 0 && (
                    <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Detected {parsedBulkPreview.length} accounts ready to add:</span>
                        </span>
                        <span className="text-[11px] text-amber-300 font-medium">
                          {parsedBulkPreview.filter(p => p.hasCookie).length} with cookies attached 🍪
                        </span>
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1 font-mono text-[11px]">
                        {parsedBulkPreview.slice(0, 5).map((p, idx) => (
                          <div key={idx} className="flex items-center justify-between p-1.5 bg-slate-900 rounded border border-slate-800">
                            <span className="text-white font-bold">{p.uid} : ••••••••</span>
                            {p.hasCookie ? (
                              <span className="text-[10px] text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                                Cookie Detected
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">No Cookie</span>
                            )}
                          </div>
                        ))}
                        {parsedBulkPreview.length > 5 && (
                          <div className="text-[10px] text-slate-500 text-center py-0.5">
                            ...and {parsedBulkPreview.length - 5} more accounts
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isAddingStock || parsedBulkPreview.length === 0}
                      className="px-6 py-2.5 bg-[#1877F2] hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        {isAddingStock ? 'Adding to Stock...' : `Add ${parsedBulkPreview.length || 0} ${stockAddCategory === 'verified' ? 'Verified' : 'Simple'} Accounts`}
                      </span>
                    </button>
                  </div>
                </form>
              ) : (
                /* OPTION 2: SINGLE ACCOUNT ENTRY */
                <form onSubmit={handleAddSingleStock} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Facebook UID *</label>
                      <input
                        type="text"
                        required
                        value={singleUid}
                        onChange={(e) => setSingleUid(e.target.value)}
                        placeholder="e.g. 100089238472"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#1877F2]"
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
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#1877F2]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Cookie className="w-3.5 h-3.5 text-amber-400" />
                      <span>Account Cookie (Optional / Recommended)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={singleCookie}
                      onChange={(e) => setSingleCookie(e.target.value)}
                      placeholder="Paste c_user=100089...; xs=... or JSON cookie here"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-amber-200/90 font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isAddingStock || !singleUid.trim() || !singlePassword.trim()}
                      className="px-6 py-2.5 bg-[#1877F2] hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Single {stockAddCategory === 'verified' ? 'Verified' : 'Simple'} Account</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* INVENTORY TABLE & COPY UIDS BUTTONS */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Stock Inventory</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                      {filteredStock.length} Shown / {stock.length} Total
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Filter by category or status, and easily copy UIDs in 1-click!
                  </p>
                </div>

                {/* 1-CLICK COPY UIDS BUTTONS (REQUESTED FEATURE) */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyUids('available')}
                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    title="Copy UIDs of available stock"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Available UIDs</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-950/60 text-emerald-300 text-[10px]">
                      {stock.filter(s => s.status === 'available' && (stockFilterCategory === 'all' || (s.category || 'simple') === stockFilterCategory)).length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyUids('sold')}
                    className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    title="Copy UIDs of sold accounts"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Sold UIDs</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-950/60 text-rose-300 text-[10px]">
                      {stock.filter(s => s.status === 'sold' && (stockFilterCategory === 'all' || (s.category || 'simple') === stockFilterCategory)).length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyUids('all')}
                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    title="Copy all UIDs in current view"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy All UIDs</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-blue-950/60 text-blue-300 text-[10px]">
                      {stock.filter(s => stockFilterCategory === 'all' || (s.category || 'simple') === stockFilterCategory).length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearAllSoldStock}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Sold</span>
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Category Filter */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setStockFilterCategory('all')}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      stockFilterCategory === 'all' ? 'bg-[#1877F2] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All Categories
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockFilterCategory('simple')}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      stockFilterCategory === 'simple' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Simple ({stock.filter(s => (s.category || 'simple') === 'simple').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockFilterCategory('verified')}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      stockFilterCategory === 'verified' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Verified ({stock.filter(s => s.category === 'verified').length})
                  </button>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setStockFilterStatus('all')}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      stockFilterStatus === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All Status
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockFilterStatus('available')}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      stockFilterStatus === 'available' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Available
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockFilterStatus('sold')}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      stockFilterStatus === 'sold' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Sold
                  </button>
                </div>
              </div>

              {/* Table */}
              {filteredStock.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500">
                  No accounts found matching this filter.
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 sticky top-0">
                      <tr>
                        <th className="p-3">Category</th>
                        <th className="p-3">UID</th>
                        <th className="p-3">Password</th>
                        <th className="p-3">Cookie</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Sold To</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                      {filteredStock.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/40">
                          <td className="p-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              item.category === 'verified'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}>
                              {item.category === 'verified' ? 'Verified' : 'Simple'}
                            </span>
                          </td>
                          <td className="p-3 text-white font-bold select-all">{item.uid}</td>
                          <td className="p-3 text-slate-400">••••••••</td>
                          <td className="p-3">
                            {item.cookie ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  <Cookie className="w-3 h-3 text-amber-400" />
                                  <span>Attached</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.cookie!);
                                    showToast('Cookie Copied', `Cookie for UID ${item.uid} copied!`, 'info');
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
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                              item.status === 'available'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400 text-[11px]">
                            {item.status === 'sold' ? `@${item.soldToUsername || 'Customer'}` : '—'}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteStockItem(item.id, item.status)}
                              className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition"
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

        {/* TAB 3: CUSTOMER FEEDBACK & SUGGESTIONS */}
        {activeTab === 'feedback' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MessageSquarePlus className="w-5 h-5 text-purple-400" />
                  <span>Customer Suggestions, Reports & Feature Requests</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                    {feedbacks.length} Total
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Customers submit feature ideas, price questions, or problem reports through the website.
                </p>
              </div>
            </div>

            {feedbacks.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center text-slate-500 text-xs">
                No customer suggestions or reports submitted yet.
              </div>
            ) : (
              <div className="space-y-3">
                {feedbacks.map((fb) => (
                  <div
                    key={fb.id}
                    className={`bg-slate-900/90 border rounded-2xl p-5 shadow-lg space-y-3 ${
                      fb.status === 'new' ? 'border-purple-500/40 bg-purple-500/[0.02]' : 'border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            fb.type === 'feature_request' 
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : fb.type === 'pricing_issue'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : fb.type === 'bug_report'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}>
                            {fb.type.replace('_', ' ')}
                          </span>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            fb.status === 'new'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : fb.status === 'reviewed'
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-slate-800 text-slate-400'
                          }`}>
                            {fb.status}
                          </span>

                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(fb.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-white pt-1">
                          {fb.subject}
                        </h4>
                        <div className="text-xs text-slate-400">
                          Customer: <strong className="text-white">@{fb.username}</strong>
                          {fb.email && <span className="ml-2 text-slate-400 font-mono">({fb.email})</span>}
                        </div>
                      </div>

                      {/* Status Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {(fb.username || fb.email || fb.userId) && (
                          <button
                            type="button"
                            onClick={() => {
                              const matched = usersList.find(u => u.id === fb.userId || u.username === fb.username || u.email === fb.email);
                              handleOpenMessageModal(matched || {
                                id: fb.userId || fb.username || 'customer',
                                username: fb.username || 'Customer',
                                email: fb.email || '',
                                walletBalance: 0,
                                createdAt: fb.createdAt,
                                ordersCount: 0,
                                totalAccountsBought: 0,
                                totalSpent: 0
                              }, `Response: ${fb.subject}`, `Hello @${fb.username || 'Customer'},\n\nThank you for your feedback regarding "${fb.subject}". `);
                            }}
                            className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                            title="Send direct response message to this customer"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Reply</span>
                          </button>
                        )}
                        {fb.status !== 'resolved' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateFeedbackStatus(fb.id, 'resolved')}
                            className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            Mark Resolved
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteFeedback(fb.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg cursor-pointer transition"
                          title="Delete Feedback"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                      {fb.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: USERS & BALANCE */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">Customer Accounts Management</h3>
                <p className="text-xs text-slate-400">
                  Search any user when they send a payment screenshot on WhatsApp to instantly credit their wallet.
                </p>
              </div>
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

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400">
                    <tr>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Email</th>
                      <th className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                          <span>Password</span>
                          <button
                            type="button"
                            onClick={() => setShowAllPasswords(prev => !prev)}
                            className="ml-1.5 px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                            title={showAllPasswords ? 'Hide all user passwords' : 'Show all user passwords'}
                          >
                            {showAllPasswords ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3 text-slate-400" />}
                            <span>{showAllPasswords ? 'Hide All' : 'Show All'}</span>
                          </button>
                        </div>
                      </th>
                      <th className="p-3.5">Wallet Balance</th>
                      <th className="p-3.5">IDs Bought / Purchases</th>
                      <th className="p-3.5">Created Date & Time</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {usersList
                      .filter(u => !userSearchQuery || u.username.toLowerCase().includes(userSearchQuery.toLowerCase()))
                      .map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-bold text-white">@{u.username}</td>
                        <td className="p-3.5 text-slate-400">{u.email}</td>
                        <td className="p-3.5">
                          {u.plainPassword ? (
                            <div className="inline-flex items-center gap-1.5 bg-slate-950/90 px-2.5 py-1 rounded-xl border border-slate-800 font-mono text-xs">
                              <span className="text-amber-300 font-medium select-all">
                                {showAllPasswords || revealedPasswords[u.id] ? u.plainPassword : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setRevealedPasswords(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                                className="text-slate-400 hover:text-white p-0.5 transition cursor-pointer"
                                title={showAllPasswords || revealedPasswords[u.id] ? 'Hide' : 'Reveal'}
                              >
                                {showAllPasswords || revealedPasswords[u.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (u.plainPassword) {
                                    navigator.clipboard.writeText(u.plainPassword);
                                    showToast('Copied', `Password for @${u.username} copied!`, 'success');
                                  }
                                }}
                                className="text-slate-400 hover:text-white p-0.5 transition cursor-pointer"
                                title="Copy password"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setPasswordModalUser(u);
                                setAdminNewPasswordInput('');
                                setShowModalPassword(false);
                              }}
                              className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
                              title="Set password for this user"
                            >
                              Set Password
                            </button>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="font-mono font-bold text-emerald-400 text-sm">
                            Rs. {u.walletBalance.toLocaleString()} PKR
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {u.totalAccountsBought || 0} IDs Bought
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {u.ordersCount || 0} orders • Rs. {(u.totalSpent || 0).toLocaleString()} PKR
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-col text-[11px] font-mono">
                            <span className="text-slate-200 font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-emerald-400" />
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                            </span>
                            <span className="text-slate-400 text-[10px] pl-4">
                              {u.createdAt ? new Date(u.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 text-right relative">
                          <div className="inline-block text-left relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveUserMenuId(activeUserMenuId === u.id ? null : u.id);
                              }}
                              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700/60"
                              title="User actions menu"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeUserMenuId === u.id && (
                              <div 
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 mt-1 w-48 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl z-30 p-1.5 space-y-1 animate-fade-in text-left"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveUserMenuId(null);
                                    setBalanceModalUser(u);
                                    setAdjustMode('add');
                                    setAdjustAmount(120);
                                    setAdjustReason('WhatsApp payment verified');
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition text-left cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>+ Add Balance</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveUserMenuId(null);
                                    setBalanceModalUser(u);
                                    setAdjustMode('deduct');
                                    setAdjustAmount(24);
                                    setAdjustReason('Admin balance deduction');
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg transition text-left cursor-pointer"
                                >
                                  <Minus className="w-3.5 h-3.5 text-rose-400" />
                                  <span>- Deduct Balance</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveUserMenuId(null);
                                    handleOpenMessageModal(u);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-500/10 rounded-lg transition text-left cursor-pointer"
                                >
                                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                                  <span>Send Message</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveUserMenuId(null);
                                    setPasswordModalUser(u);
                                    setAdminNewPasswordInput('');
                                    setShowModalPassword(false);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/10 rounded-lg transition text-left cursor-pointer"
                                >
                                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Change Password</span>
                                </button>

                                <div className="h-px bg-slate-800 my-1" />

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveUserMenuId(null);
                                    setDeleteUserModal(u);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/20 rounded-lg transition text-left cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                  <span>Delete Account</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ANNOUNCEMENTS & MARQUEE */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            {/* MARQUEE CARD */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Marquee Announcement Ticker</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        marqueeSettings.enabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {marqueeSettings.enabled ? 'Broadcasting Live' : 'Ticker Inactive'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Top scrolling banner seen across the storefront by all visitors in real-time
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setMarqueeSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      marqueeSettings.enabled ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {marqueeSettings.enabled ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    <span>{marqueeSettings.enabled ? 'Ticker Active' : 'Ticker Disabled'}</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSaveMarquee} className="space-y-6">
                {/* 1. BADGE / LABEL CONFIGURATION (EXPLICIT USER REQUEST) */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-amber-400" />
                        <span>Left Ticker Badge Label</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Controls the prominent label displayed at the beginning of the marquee ticker (currently &quot;Stock Update&quot;)
                      </p>
                    </div>

                    {/* Enable / Disable Badge Toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-medium">Badge Display:</span>
                      <button
                        type="button"
                        onClick={() => setMarqueeSettings(prev => ({ 
                          ...prev, 
                          showBadge: prev.showBadge === false ? true : false 
                        }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          marqueeSettings.showBadge !== false
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {marqueeSettings.showBadge !== false ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>{marqueeSettings.showBadge !== false ? 'Label Badge Visible' : 'Label Badge Hidden'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Badge Text Input & Presets */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <span>Label Text:</span>
                        <span className="text-[10px] text-slate-500">(Displayed in all-caps badge)</span>
                      </label>
                      <span className="text-[10px] text-amber-400/90 font-mono">
                        Current: &ldquo;{marqueeSettings.badgeText?.trim() || 'Stock Update'}&rdquo;
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={marqueeSettings.badgeText ?? 'Stock Update'}
                        onChange={(e) => setMarqueeSettings(prev => ({ ...prev, badgeText: e.target.value }))}
                        placeholder="e.g. Stock Update, Alert, Notice, Special Offer..."
                        disabled={marqueeSettings.showBadge === false}
                        className={`w-full bg-slate-900 border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold tracking-wide transition ${
                          marqueeSettings.showBadge === false ? 'opacity-40 border-slate-800 cursor-not-allowed' : 'border-slate-700'
                        }`}
                      />
                    </div>

                    {/* Quick Preset Chips */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        Quick Preset Labels:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          'Stock Update',
                          'Urgent Alert',
                          'Special Offer',
                          'Important Notice',
                          'New Stock',
                          'Maintenance',
                          'Notice',
                          'Announcement'
                        ].map((preset) => {
                          const isSelected = (marqueeSettings.badgeText?.trim() || 'Stock Update').toLowerCase() === preset.toLowerCase();
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setMarqueeSettings(prev => ({ 
                                ...prev, 
                                badgeText: preset,
                                showBadge: true 
                              }))}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                                isSelected
                                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              {preset}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. MARQUEE TEXT & SCROLL SPEED */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>Marquee Message Content</span>
                    </label>

                    {/* Speed Selector */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-medium">Scroll Speed:</span>
                      {(['slow', 'normal', 'fast'] as const).map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => setMarqueeSettings(prev => ({ ...prev, speed: spd }))}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition cursor-pointer border ${
                            marqueeSettings.speed === spd
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900'
                          }`}
                        >
                          {spd}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    required
                    value={marqueeSettings.text}
                    onChange={(e) => setMarqueeSettings(prev => ({ ...prev, text: e.target.value }))}
                    placeholder="Enter announcement text to scroll continuously across visitor screens..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium leading-relaxed"
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span>💡 Tip: Keep message clear with key product announcements, timings, or payment details.</span>
                    <span className="font-mono">{marqueeSettings.text.length} characters</span>
                  </div>
                </div>

                {/* 3. LIVE INTERACTIVE TICKER PREVIEW */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Live Storefront Preview</span>
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {marqueeSettings.enabled ? 'Preview as seen by visitors' : 'Ticker currently disabled (hidden on site)'}
                    </span>
                  </div>

                  <div className={`relative w-full rounded-xl border overflow-hidden p-2.5 sm:p-3 transition ${
                    marqueeSettings.enabled 
                      ? 'bg-amber-500/[0.08] border-amber-500/30 text-amber-100' 
                      : 'bg-slate-950/60 border-slate-800 text-slate-500 opacity-60'
                  }`}>
                    <div className="flex items-center gap-3">
                      {/* Badge Preview */}
                      {marqueeSettings.showBadge !== false ? (
                        <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/50 rounded-lg text-amber-300 text-[10px] sm:text-xs font-bold shadow-xs">
                          <Megaphone className="w-3 h-3 text-amber-400 animate-pulse" />
                          <span className="tracking-wide uppercase text-[10px]">
                            {(marqueeSettings.badgeText?.trim()) || 'STOCK UPDATE'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-800">
                          (No Badge)
                        </div>
                      )}

                      {/* Text Preview */}
                      <div className="flex-1 overflow-hidden whitespace-nowrap text-xs font-medium text-slate-200">
                        <span>{marqueeSettings.text || 'Welcome to FBStore! Instant Delivery Guaranteed.'}</span>
                      </div>

                      {/* Dismiss Mock */}
                      <div className="flex-shrink-0 p-1 text-slate-500">
                        <X className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. SUBMIT ACTION */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
                  <div className="text-[11px] text-slate-400">
                    Saves to database and broadcasts instantly via Real-time Stream &amp; Firestore.
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingMarquee}
                    className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-900/30 flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
                  >
                    {isSavingMarquee ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>{isSavingMarquee ? 'Broadcasting Update...' : 'Save & Update Marquee Live'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* SITE ANNOUNCEMENTS, PROMOTIONS & POPUP NOTICES */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Site Announcements, Offers & Popup Alerts</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-blue-600/20 text-[#1877F2] border border-blue-500/30">
                      {announcementsList.length} Total
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Broadcast promotional offers, critical alerts, maintenance notices, and modal popups to all users or specific accounts
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenNewAnnouncement}
                  className="px-4 py-2 bg-[#1877F2] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Announcement</span>
                </button>
              </div>

              {/* Announcements List */}
              {announcementsList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                  <Megaphone className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="font-semibold text-slate-400">No site announcements created yet.</p>
                  <p>Click "Create New Announcement" to post your first offer, deal alert, or popup notice.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {announcementsList.map(ann => {
                    const isOffer = ann.type === 'offer';
                    const isUrgent = ann.type === 'urgent' || ann.type === 'alert';
                    const isWarning = ann.type === 'warning';
                    const isSuccess = ann.type === 'success';

                    return (
                      <div
                        key={ann.id}
                        className={`p-4 rounded-xl border transition-all ${
                          ann.active
                            ? isOffer
                              ? 'bg-amber-950/20 border-amber-500/30'
                              : isUrgent
                              ? 'bg-rose-950/20 border-rose-500/30'
                              : isWarning
                              ? 'bg-orange-950/20 border-orange-500/30'
                              : 'bg-slate-950/80 border-slate-800'
                            : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Type Badge */}
                              <span
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                  isOffer
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : isUrgent
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : isWarning
                                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                    : isSuccess
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                }`}
                              >
                                {ann.type || 'info'}
                              </span>

                              {/* Target Audience Badge */}
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-800 text-slate-300">
                                {ann.targetType === 'all' ? 'All Users' : `@${ann.targetUsername || ann.targetUserId}`}
                              </span>

                              {/* Popup Indicator */}
                              {ann.showAsPopup && (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  Popup Modal ({ann.frequency === 'once_only' ? 'Once Only' : 'Every Refresh'})
                                </span>
                              )}

                              {/* Status Badge */}
                              <span
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                  ann.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                                }`}
                              >
                                {ann.active ? 'Active' : 'Paused'}
                              </span>
                            </div>

                            <h4 className="text-sm font-bold text-white break-words">{ann.title}</h4>
                            <p className="text-xs text-slate-300 whitespace-pre-line break-words">{ann.message}</p>
                            
                            <span className="text-[10px] text-slate-500 block">
                              Created: {new Date(ann.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleAnnouncementActive(ann)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                ann.active
                                  ? 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30'
                                  : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {ann.active ? 'Pause' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditAnnouncement(ann)}
                              className="p-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                              title="Edit Announcement"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAnnouncement(ann.id)}
                              className="p-2 rounded-xl text-xs font-bold bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 transition cursor-pointer"
                              title="Delete Announcement"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

        {/* TAB 6: MESSAGES */}
        {activeTab === 'messages' && (
          <div className="space-y-6">
            {/* Header & Compose Action Bar */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Direct Customer Messages & User Broadcasts
                    </h3>
                    <p className="text-xs text-slate-400">
                      Send official notices, instructions, or balance updates directly to any customer's account or broadcast to all registered users in real time.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenMessageModal()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span>Compose New Message</span>
                </button>
              </div>

              {/* Message Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-slate-500 block text-[11px]">Total Sent:</span>
                  <strong className="text-white font-mono text-base">{sentMessagesList.length} Messages</strong>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-slate-500 block text-[11px]">Unread by Users:</span>
                  <strong className="text-amber-400 font-mono text-base">
                    {sentMessagesList.filter(m => !m.read).length} Unread
                  </strong>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-slate-500 block text-[11px]">Direct User Messages:</span>
                  <strong className="text-blue-400 font-mono text-base">
                    {sentMessagesList.filter(m => m.userId !== 'all').length} Targeted
                  </strong>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-slate-500 block text-[11px]">Broadcast to All:</span>
                  <strong className="text-indigo-400 font-mono text-base">
                    {sentMessagesList.filter(m => m.userId === 'all').length} Broadcasts
                  </strong>
                </div>
              </div>

              {/* Search filter */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={msgFilterSearch}
                  onChange={(e) => setMsgFilterSearch(e.target.value)}
                  placeholder="Filter messages by recipient username, title, or keyword..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Sent Messages List */}
            {sentMessagesList.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                  <Mail className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-300">No Messages Sent Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click "Compose New Message" to reach out to any specific customer or broadcast an update to all registered users.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenMessageModal()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send First Message</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {sentMessagesList
                  .filter(m => {
                    if (!msgFilterSearch.trim()) return true;
                    const q = msgFilterSearch.toLowerCase();
                    return (
                      (m.targetUsername && m.targetUsername.toLowerCase().includes(q)) ||
                      (m.title && m.title.toLowerCase().includes(q)) ||
                      (m.message && m.message.toLowerCase().includes(q))
                    );
                  })
                  .map((m) => {
                    const isAll = m.userId === 'all';
                    const isUrgent = m.priority === 'urgent' || m.priority === 'high';
                    return (
                      <div
                        key={m.id}
                        className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-lg transition space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {isAll ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-indigo-400" />
                                <span>Broadcast (All Users)</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                                <Users className="w-3 h-3 text-blue-400" />
                                <span>To @{m.targetUsername || m.userId}</span>
                              </span>
                            )}

                            {m.priority && m.priority !== 'normal' && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                  m.priority === 'urgent'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {m.priority} Priority
                              </span>
                            )}

                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(m.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                m.read
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {m.read ? '✓ Read' : '⌛ Unread'}
                            </span>

                            {!isAll && (
                              <button
                                type="button"
                                onClick={() => {
                                  const matchedUser = usersList.find(u => u.id === m.userId || u.username === m.targetUsername);
                                  handleOpenMessageModal(matchedUser);
                                }}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-lg transition cursor-pointer flex items-center gap-1"
                                title="Send follow up message to this user"
                              >
                                <Send className="w-3 h-3 text-blue-400" />
                                <span>Reply</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteAdminMessage(m.id)}
                              className="p-1.5 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 border border-rose-800/30 rounded-lg text-xs transition cursor-pointer"
                              title="Delete Message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                            {m.title}
                          </h4>
                          <p className="text-xs text-slate-300 mt-1 whitespace-pre-line leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 font-mono sm:font-sans">
                            {m.message}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: PRICING, BOXES, OFFERS & SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg max-w-3xl space-y-6">
              <div>
                <h3 className="text-base font-bold text-white mb-1">
                  Product Boxes, Pricing, Offers & Payment Settings
                </h3>
                <p className="text-xs text-slate-400">
                  Configure separate prices for Simple and Verified accounts, toggle each box on the website, and enable special offer themes!
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-6">
                
                {/* 0. STORE BOXES DISPLAY ORDER / POSITIONING SELECTOR */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl space-y-3 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0">
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <span>Store Boxes Display Order</span>
                          <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full font-normal">
                            Konsa Upar Show Hoga Aur Konsa Niche
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Select which product box is displayed first at the top of the storefront
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSettingsForm(prev => ({ ...prev, boxesDisplayOrder: 'simple_first' }))}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          settingsForm.boxesDisplayOrder === 'simple_first'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                        <span>1. Simple ID Upar (Top)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettingsForm(prev => ({ ...prev, boxesDisplayOrder: 'verified_first' }))}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          settingsForm.boxesDisplayOrder === 'verified_first'
                            ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/25 ring-2 ring-cyan-400'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <Crown className="w-3.5 h-3.5 text-cyan-200" />
                        <span>1. Verified ID Upar (Top)</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                    <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      settingsForm.boxesDisplayOrder === 'simple_first'
                        ? 'bg-blue-500/10 border-blue-500/40 text-blue-300 font-bold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400'
                    }`}>
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-[10px]">
                          {settingsForm.boxesDisplayOrder === 'simple_first' ? '1' : '2'}
                        </span>
                        <span>Facebook Simple Accounts</span>
                      </span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-slate-800">
                        {settingsForm.boxesDisplayOrder === 'simple_first' ? '⬆️ Top Position' : '⬇️ Bottom Position'}
                      </span>
                    </div>

                    <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      settingsForm.boxesDisplayOrder === 'verified_first'
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-bold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400'
                    }`}>
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-cyan-600/30 border border-cyan-500/50 flex items-center justify-center text-[10px]">
                          {settingsForm.boxesDisplayOrder === 'verified_first' ? '1' : '2'}
                        </span>
                        <span>Facebook Verified Accounts</span>
                      </span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-slate-800">
                        {settingsForm.boxesDisplayOrder === 'verified_first' ? '⬆️ Top Position' : '⬇️ Bottom Position'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1. PRODUCT BOX 1: SIMPLE ACCOUNTS CONFIG */}
                <div className="p-5 bg-slate-950/80 border border-blue-500/30 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                        FB
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <span>Facebook Simple Accounts Box</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                            Position: {settingsForm.boxesDisplayOrder === 'simple_first' ? '#1 Top (Upar)' : '#2 Bottom (Niche)'}
                          </span>
                        </h4>
                        <span className="text-[11px] text-slate-400">Standard UID:Password accounts</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Quick Move Up/Down button */}
                      <button
                        type="button"
                        onClick={() => setSettingsForm(prev => ({ 
                          ...prev, 
                          boxesDisplayOrder: prev.boxesDisplayOrder === 'simple_first' ? 'verified_first' : 'simple_first' 
                        }))}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Toggle position up or down"
                      >
                        <ArrowUpDown className="w-3 h-3 text-indigo-400" />
                        <span>{settingsForm.boxesDisplayOrder === 'simple_first' ? 'Move to Bottom ⬇️' : 'Move to Top ⬆️'}</span>
                      </button>

                      {/* Enable/Disable Toggle */}
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                        <input
                          type="checkbox"
                          checked={settingsForm.simpleAccountsEnabled}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, simpleAccountsEnabled: e.target.checked }))}
                          className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700"
                        />
                        <span className={settingsForm.simpleAccountsEnabled ? 'text-emerald-400' : 'text-slate-500'}>
                          {settingsForm.simpleAccountsEnabled ? 'Box Enabled' : 'Box Disabled'}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Price per Simple ID (PKR)
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={settingsForm.pricePerIdSimple}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, pricePerIdSimple: Number(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Offer Toggle */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Special Offer Theme Effect
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={settingsForm.simpleOfferEnabled}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, simpleOfferEnabled: e.target.checked }))}
                          className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700"
                        />
                        <Flame className="w-4 h-4 text-amber-400" />
                        <span className="font-bold text-amber-300">Enable Offer Effect</span>
                      </label>
                    </div>
                  </div>

                  {settingsForm.simpleOfferEnabled && (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-amber-300 mb-1">
                          Optional Offer Message (Displayed on Simple Accounts Box)
                        </label>
                        <input
                          type="text"
                          value={settingsForm.simpleOfferMessage}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, simpleOfferMessage: e.target.value }))}
                          placeholder="e.g. 🔥 Weekend Sale - Buy 5 Get Discount!"
                          className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      {/* Offer Theme Color Customizer for Simple Accounts */}
                      <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Palette className="w-4 h-4 text-amber-400" />
                            <span>Offer Box Color (Koi Bhi Color Choose Karein)</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-bold text-slate-300 uppercase">
                              {settingsForm.simpleOfferColor || '#f59e0b'}
                            </span>
                            <div 
                              className="w-5 h-5 rounded-full border border-white/30 shadow-sm" 
                              style={{ backgroundColor: settingsForm.simpleOfferColor || '#f59e0b' }} 
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {/* Color input & hex field */}
                          <div className="flex items-center gap-2 bg-slate-950 px-2 py-1.5 rounded-xl border border-slate-700">
                            <input
                              type="color"
                              value={settingsForm.simpleOfferColor || '#f59e0b'}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, simpleOfferColor: e.target.value }))}
                              className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                            />
                            <input
                              type="text"
                              value={settingsForm.simpleOfferColor || '#f59e0b'}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, simpleOfferColor: e.target.value }))}
                              placeholder="#f59e0b"
                              className="w-20 bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                            />
                          </div>

                          {/* Preset swatches */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {[
                              { label: 'Amber Gold', color: '#f59e0b' },
                              { label: 'Sunset Orange', color: '#f97316' },
                              { label: 'Crimson Red', color: '#ef4444' },
                              { label: 'Emerald Green', color: '#10b981' },
                              { label: 'Electric Cyan', color: '#06b6d4' },
                              { label: 'Royal Blue', color: '#3b82f6' },
                              { label: 'Neon Purple', color: '#8b5cf6' },
                              { label: 'Hot Pink', color: '#ec4899' },
                              { label: 'Yellow Gold', color: '#eab308' },
                            ].map((c) => (
                              <button
                                key={c.color}
                                type="button"
                                title={c.label}
                                onClick={() => setSettingsForm(prev => ({ ...prev, simpleOfferColor: c.color }))}
                                className={`w-6 h-6 rounded-full border transition-transform hover:scale-110 cursor-pointer ${
                                  (settingsForm.simpleOfferColor || '#f59e0b').toLowerCase() === c.color.toLowerCase()
                                    ? 'ring-2 ring-white scale-110 border-white'
                                    : 'border-white/20'
                                }`}
                                style={{ backgroundColor: c.color }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Live Preview Ribbon */}
                        <div 
                          className="p-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-between shadow-md transition-all"
                          style={{ backgroundColor: settingsForm.simpleOfferColor || '#f59e0b' }}
                        >
                          <div className="flex items-center gap-2">
                            <Flame className="w-4 h-4 fill-white" />
                            <span>Preview: Simple Accounts Offer Ribbon & Glow</span>
                          </div>
                          <span className="text-[10px] bg-black/30 backdrop-blur-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                            Live Color Preview
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. PRODUCT BOX 2: VERIFIED ACCOUNTS CONFIG */}
                <div className="p-5 bg-slate-950/80 border border-cyan-500/30 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center font-bold text-xs">
                        <BadgeCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                          <span>Facebook Verified Accounts Box</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                            Position: {settingsForm.boxesDisplayOrder === 'verified_first' ? '#1 Top (Upar)' : '#2 Bottom (Niche)'}
                          </span>
                        </h4>
                        <span className="text-[11px] text-slate-400">VIP High Trust Verified Accounts</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Quick Move Up/Down button */}
                      <button
                        type="button"
                        onClick={() => setSettingsForm(prev => ({ 
                          ...prev, 
                          boxesDisplayOrder: prev.boxesDisplayOrder === 'verified_first' ? 'simple_first' : 'verified_first' 
                        }))}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Toggle position up or down"
                      >
                        <ArrowUpDown className="w-3 h-3 text-cyan-400" />
                        <span>{settingsForm.boxesDisplayOrder === 'verified_first' ? 'Move to Bottom ⬇️' : 'Move to Top ⬆️'}</span>
                      </button>

                      {/* Enable/Disable Toggle */}
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                        <input
                          type="checkbox"
                          checked={settingsForm.verifiedAccountsEnabled}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, verifiedAccountsEnabled: e.target.checked }))}
                          className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700"
                        />
                        <span className={settingsForm.verifiedAccountsEnabled ? 'text-cyan-400' : 'text-slate-500'}>
                          {settingsForm.verifiedAccountsEnabled ? 'Box Enabled' : 'Box Disabled'}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Price per Verified ID (PKR)
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={settingsForm.pricePerIdVerified}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, pricePerIdVerified: Number(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    {/* Offer Toggle */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Special Offer Theme Effect
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={settingsForm.verifiedOfferEnabled}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, verifiedOfferEnabled: e.target.checked }))}
                          className="w-4 h-4 rounded text-cyan-500 bg-slate-950 border-slate-700"
                        />
                        <Flame className="w-4 h-4 text-cyan-400" />
                        <span className="font-bold text-cyan-300">Enable Verified Offer Effect</span>
                      </label>
                    </div>
                  </div>

                  {settingsForm.verifiedOfferEnabled && (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-cyan-300 mb-1">
                          Optional Offer Message (Displayed on Verified Accounts Box)
                        </label>
                        <input
                          type="text"
                          value={settingsForm.verifiedOfferMessage}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, verifiedOfferMessage: e.target.value }))}
                          placeholder="e.g. ⭐ VIP Blue Verified Profiles on Special Offer!"
                          className="w-full bg-slate-900 border border-cyan-500/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                        />
                      </div>

                      {/* Offer Theme Color Customizer for Verified Accounts */}
                      <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Palette className="w-4 h-4 text-cyan-400" />
                            <span>Offer Box Color (Koi Bhi Color Choose Karein)</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-bold text-slate-300 uppercase">
                              {settingsForm.verifiedOfferColor || '#06b6d4'}
                            </span>
                            <div 
                              className="w-5 h-5 rounded-full border border-white/30 shadow-sm" 
                              style={{ backgroundColor: settingsForm.verifiedOfferColor || '#06b6d4' }} 
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {/* Color input & hex field */}
                          <div className="flex items-center gap-2 bg-slate-950 px-2 py-1.5 rounded-xl border border-slate-700">
                            <input
                              type="color"
                              value={settingsForm.verifiedOfferColor || '#06b6d4'}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, verifiedOfferColor: e.target.value }))}
                              className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                            />
                            <input
                              type="text"
                              value={settingsForm.verifiedOfferColor || '#06b6d4'}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, verifiedOfferColor: e.target.value }))}
                              placeholder="#06b6d4"
                              className="w-20 bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                            />
                          </div>

                          {/* Preset swatches */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {[
                              { label: 'Electric Cyan', color: '#06b6d4' },
                              { label: 'Royal Indigo', color: '#6366f1' },
                              { label: 'Neon Purple', color: '#a855f7' },
                              { label: 'Emerald Green', color: '#10b981' },
                              { label: 'Amber Gold', color: '#f59e0b' },
                              { label: 'Crimson Red', color: '#ef4444' },
                              { label: 'Hot Pink', color: '#ec4899' },
                              { label: 'Sky Blue', color: '#0ea5e9' },
                              { label: 'Teal Emerald', color: '#14b8a6' },
                            ].map((c) => (
                              <button
                                key={c.color}
                                type="button"
                                title={c.label}
                                onClick={() => setSettingsForm(prev => ({ ...prev, verifiedOfferColor: c.color }))}
                                className={`w-6 h-6 rounded-full border transition-transform hover:scale-110 cursor-pointer ${
                                  (settingsForm.verifiedOfferColor || '#06b6d4').toLowerCase() === c.color.toLowerCase()
                                    ? 'ring-2 ring-white scale-110 border-white'
                                    : 'border-white/20'
                                }`}
                                style={{ backgroundColor: c.color }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Live Preview Ribbon */}
                        <div 
                          className="p-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-between shadow-md transition-all"
                          style={{ backgroundColor: settingsForm.verifiedOfferColor || '#06b6d4' }}
                        >
                          <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4 fill-white" />
                            <span>Preview: Verified VIP Offer Ribbon & Glow</span>
                          </div>
                          <span className="text-[10px] bg-black/30 backdrop-blur-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                            Live Color Preview
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. RECEIVING ACCOUNT DETAILS */}
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-4">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                    Deposit Receiving Account (JazzCash / EasyPaisa)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Account Title (e.g. Muhammad Arslan)
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsForm.accountTitle}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, accountTitle: e.target.value, jazzcashTitle: e.target.value, easypaisaTitle: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Payment Number (e.g. 03064887388)
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsForm.accountNumber}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, accountNumber: e.target.value, jazzcashNumber: e.target.value, easypaisaNumber: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      WhatsApp Support Number
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

                {/* 4. ADMIN LOGIN CREDENTIALS */}
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-4">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wide">
                    Admin Portal Login Credentials
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#1877F2] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer"
                >
                  Save All Product Boxes & Settings Live
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 8: DATABASE BACKUP & RESTORE */}
        {activeTab === 'backup' && (
          <div className="space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Database Backup & Disaster Recovery</h3>
                    <p className="text-xs text-slate-400">
                      Download full encrypted database exports or restore customer accounts, wallets, and stock from backup files
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. EXPORT / DOWNLOAD BACKUP */}
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                        <Download className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-white">Download Database Backup</h4>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      Generates and downloads a complete snapshot of all users, wallet balances, stock items (both simple and verified with cookies), purchase orders, deposit requests, feedback submissions, announcements, and pricing settings.
                    </p>

                    {/* Live System Data Counters */}
                    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Customers:</span>
                        <strong className="text-white font-mono">{usersList.length} Accounts</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Available Stock:</span>
                        <strong className="text-emerald-400 font-mono">{availableSimpleCount + availableVerifiedCount} IDs</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Sold Stock:</span>
                        <strong className="text-blue-400 font-mono">{soldSimpleCount + soldVerifiedCount} Sold</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Deposit Logs:</span>
                        <strong className="text-slate-300 font-mono">{deposits.length} Records</strong>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    disabled={isExportingBackup}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {isExportingBackup ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download Full Database Backup (.json)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 2. IMPORT / RESTORE BACKUP */}
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                        <Upload className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-white">Restore Database from Backup</h4>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      Upload a previously exported <code className="text-blue-400 bg-slate-900 px-1 py-0.5 rounded">.json</code> backup file. The system will inspect the contents and allow you to verify the stats before restoring.
                    </p>

                    {/* File upload input */}
                    <div className="p-3 bg-slate-900 border border-dashed border-slate-700 rounded-xl text-center space-y-2">
                      <input
                        type="file"
                        accept=".json"
                        id="backup-upload-input"
                        onChange={handleSelectRestoreFile}
                        className="hidden"
                      />
                      <label
                        htmlFor="backup-upload-input"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer transition"
                      >
                        <Upload className="w-4 h-4 text-blue-400" />
                        <span>Select .json Backup File</span>
                      </label>
                      <span className="block text-[11px] text-slate-500">
                        {backupRestorePreview ? backupRestorePreview.fileName : 'Only JSON backup files are supported'}
                      </span>
                    </div>

                    {/* Preview of selected backup file */}
                    {backupRestorePreview && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-2 animate-fade-in">
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Backup File Verified: {backupRestorePreview.fileName}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-300">
                          <div>• Users to restore: <strong className="text-white font-mono">{backupRestorePreview.usersCount}</strong></div>
                          <div>• Stock items: <strong className="text-white font-mono">{backupRestorePreview.stockCount}</strong></div>
                          <div>• Purchases: <strong className="text-white font-mono">{backupRestorePreview.purchasesCount}</strong></div>
                          <div>• Deposits: <strong className="text-white font-mono">{backupRestorePreview.depositsCount}</strong></div>
                        </div>
                        <p className="text-[10px] text-amber-300/80">
                          ⚠️ Warning: Restoring will overwrite existing database records with data from this file.
                        </p>
                      </div>
                    )}
                  </div>

                  {backupRestorePreview ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmRestoreDatabase}
                        disabled={isRestoringBackup}
                        className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        {isRestoringBackup ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            <span>Confirm & Restore Database Now</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBackupRestorePreview(null);
                          setPendingRestoreData(null);
                        }}
                        className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-slate-900/50 rounded-xl text-center text-slate-500 text-[11px]">
                      Select a backup file above to enable restoration
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

      </main>

      {/* MODAL 1: DIRECT USER BALANCE ADJUSTMENT */}
      {balanceModalUser && (() => {
        const currentBal = balanceModalUser.walletBalance || 0;
        const validAmount = isNaN(adjustAmount) ? 0 : Number(adjustAmount);
        const projectedBal = adjustMode === 'add' 
          ? currentBal + validAmount 
          : adjustMode === 'deduct' 
            ? Math.max(0, currentBal - validAmount) 
            : Math.max(0, validAmount);

        const quickAmounts = [50, 100, 200, 500, 1000, 5000];
        const quickReasons = [
          'WhatsApp payment verified',
          'EasyPaisa deposit confirmed',
          'Manual balance top-up',
          'System refund / adjustment'
        ];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="relative max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${
                    adjustMode === 'add' ? 'bg-emerald-500/10 text-emerald-400' :
                    adjustMode === 'deduct' ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Adjust Balance</h3>
                    <p className="text-[11px] text-slate-400">Target User: <strong className="text-white">@{balanceModalUser.username}</strong></p>
                  </div>
                </div>
                <button onClick={() => setBalanceModalUser(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Advanced Calculation Card */}
              <div className="p-3.5 bg-slate-950/80 border border-slate-800/90 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Current Balance:</span>
                  <span className="font-mono text-slate-200 font-bold">Rs. {currentBal.toLocaleString()} PKR</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Adjustment:</span>
                  <span className={`font-mono font-bold ${
                    adjustMode === 'add' ? 'text-emerald-400' : adjustMode === 'deduct' ? 'text-rose-400' : 'text-blue-400'
                  }`}>
                    {adjustMode === 'add' ? '+' : adjustMode === 'deduct' ? '-' : '='} Rs. {validAmount.toLocaleString()} PKR
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                  <span className="font-semibold text-slate-300">Projected New Balance:</span>
                  <span className="font-mono font-extrabold text-sm text-emerald-400">
                    Rs. {projectedBal.toLocaleString()} PKR
                  </span>
                </div>
              </div>

              <form onSubmit={handleUpdateUserBalance} className="space-y-4">
                {/* Mode Selector */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Adjustment Mode</label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setAdjustMode('add')}
                      className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                        adjustMode === 'add' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Funds</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustMode('deduct')}
                      className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                        adjustMode === 'deduct' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span>Deduct</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustMode('set')}
                      className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                        adjustMode === 'set' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Set Exact</span>
                    </button>
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Amount (PKR)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Enter amount..."
                  />

                  {/* Quick Amount Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {quickAmounts.map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAdjustAmount(amt)}
                        className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border transition cursor-pointer ${
                          adjustAmount === amt 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold' 
                            : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        +{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason Input & Quick Presets */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Adjustment Reason / Notes</label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    placeholder="Enter reason or note..."
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {quickReasons.map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setAdjustReason(r)}
                        className="text-[10px] text-slate-500 hover:text-slate-300 underline cursor-pointer mr-2"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setBalanceModalUser(null)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingBalance}
                    className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg transition cursor-pointer ${
                      adjustMode === 'add' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30' :
                      adjustMode === 'deduct' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30' :
                      'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                    }`}
                  >
                    {isUpdatingBalance ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Confirm {adjustMode === 'add' ? 'Add Funds' : adjustMode === 'deduct' ? 'Deduct' : 'Set Balance'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL 2: SCREENSHOT PREVIEW */}
      {previewScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-4">
            <div className="flex justify-between pb-2 border-b border-slate-800 mb-3">
              <h3 className="text-sm font-bold text-white">Payment Receipt</h3>
              <button onClick={() => setPreviewScreenshot(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={previewScreenshot} alt="Receipt" className="max-w-full max-h-[70vh] object-contain rounded-lg mx-auto" />
          </div>
        </div>
      )}

      {/* MODAL 3: REJECT REASON */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Reject Deposit Request</h3>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setRejectId(null)} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl">
                Cancel
              </button>
              <button onClick={handleConfirmReject} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl">
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE OR EDIT SITE ANNOUNCEMENT */}
      {announcementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  {editingAnnouncement ? 'Edit Site Announcement' : 'Create New Site Announcement'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAnnouncementModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Announcement Title
                </label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="e.g. 🔥 Special Weekend Offer: 20% Off Verified Accounts!"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Announcement Message / Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={annMessage}
                  onChange={(e) => setAnnMessage(e.target.value)}
                  placeholder="Enter details of announcement, discount code, instruction, or notice..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Announcement Type / Style
                  </label>
                  <select
                    value={annType}
                    onChange={(e) => setAnnType(e.target.value as AnnouncementType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="info">Information (Blue)</option>
                    <option value="offer">Special Offer / Deal (Gold Flame)</option>
                    <option value="urgent">Urgent Alert (Red Pulse)</option>
                    <option value="warning">Warning (Orange)</option>
                    <option value="success">Success / News (Green)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Target Audience
                  </label>
                  <select
                    value={annTargetType}
                    onChange={(e) => setAnnTargetType(e.target.value as 'all' | 'user')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Visitors & Users</option>
                    <option value="user">Specific User Only</option>
                  </select>
                </div>
              </div>

              {annTargetType === 'user' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Select Target User
                  </label>
                  {usersList.length > 0 && (
                    <select
                      value={annTargetUserId}
                      onChange={(e) => setAnnTargetUserId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 mb-1.5"
                    >
                      <option value="">-- Choose registered customer --</option>
                      {usersList.map((u) => (
                        <option key={u.id} value={u.username}>
                          @{u.username} ({u.email})
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    required
                    value={annTargetUserId}
                    onChange={(e) => setAnnTargetUserId(e.target.value)}
                    placeholder="Or type username manually (e.g. arslan481)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={annShowAsPopup}
                    onChange={(e) => setAnnShowAsPopup(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700"
                  />
                  <div>
                    <span className="font-bold text-white block">Modal Popup Alert</span>
                    <span className="text-[10px] text-slate-400">Pops up over the page</span>
                  </div>
                </label>

                {annShowAsPopup && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Popup Frequency
                    </label>
                    <select
                      value={annFrequency}
                      onChange={(e) => setAnnFrequency(e.target.value as 'every_refresh' | 'once_only')}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                    >
                      <option value="every_refresh">Every page visit</option>
                      <option value="once_only">Once only per visitor</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={annActive}
                    onChange={(e) => setAnnActive(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700"
                  />
                  <span className={annActive ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                    {annActive ? 'Active (Live on Website)' : 'Save as Inactive Draft'}
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAnnouncementModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingAnnouncement}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer"
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
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: COMPOSE DIRECT ADMIN MESSAGE */}
      {messageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center font-bold">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {messageTargetUser ? `Message to @${messageTargetUser.username}` : 'Compose Direct Message'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Delivered instantly to user inbox and synced in real time
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMessageModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendAdminMessage} className="space-y-4">
              {/* Recipient Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Recipient
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl mb-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMsgTargetType('user');
                      if (!msgSelectedUserId && usersList.length > 0) {
                        setMsgSelectedUserId(usersList[0].id);
                        setManualRecipientInput(usersList[0].username);
                      }
                    }}
                    className={`py-1.5 text-xs font-bold rounded-lg transition ${
                      msgTargetType === 'user' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    👤 Specific User
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMsgTargetType('all');
                      setMessageTargetUser(null);
                      setManualRecipientInput('');
                    }}
                    className={`py-1.5 text-xs font-bold rounded-lg transition ${
                      msgTargetType === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    📢 Broadcast All Users
                  </button>
                </div>

                {msgTargetType === 'user' && (
                  <div className="space-y-2 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Select from Registered Users:
                      </label>
                      <select
                        value={msgSelectedUserId}
                        onChange={(e) => {
                          setMsgSelectedUserId(e.target.value);
                          const found = usersList.find(u => u.id === e.target.value);
                          if (found) {
                            setMessageTargetUser(found);
                            setManualRecipientInput(found.username);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        {usersList.length === 0 ? (
                          <option value="">No registered users found</option>
                        ) : (
                          usersList.map((u) => (
                            <option key={u.id} value={u.id}>
                              @{u.username} ({u.email}) - Wallet: Rs. {u.walletBalance} PKR
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80">
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Or Type Username / Email Directly:
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={manualRecipientInput}
                          onChange={(e) => {
                            setManualRecipientInput(e.target.value);
                            const val = e.target.value.trim().toLowerCase();
                            const found = usersList.find(u => 
                              u.username.toLowerCase() === val || 
                              u.email.toLowerCase() === val || 
                              u.id.toLowerCase() === val
                            );
                            if (found) {
                              setMessageTargetUser(found);
                              setMsgSelectedUserId(found.id);
                            }
                          }}
                          placeholder="Type username (e.g. arslan481) or email address..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 placeholder-slate-500 font-mono"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        You can send to any user by typing their username or email directly, even if they logged in recently.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Priority Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Message Priority
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMsgPriority('normal')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                      msgPriority === 'normal'
                        ? 'bg-blue-600/20 text-blue-300 border-blue-500/50 shadow-xs'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setMsgPriority('high')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                      msgPriority === 'high'
                        ? 'bg-amber-600/20 text-amber-300 border-amber-500/50 shadow-xs'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    High (Amber)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMsgPriority('urgent')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                      msgPriority === 'urgent'
                        ? 'bg-rose-600/20 text-rose-300 border-rose-500/50 shadow-xs'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Urgent (Red Alert)
                  </button>
                </div>
              </div>

              {/* Quick Template Chips */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Quick Message Templates:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMsgTitle('Wallet Balance Credited');
                      setMsgBody('Hello! Your deposit has been verified and your wallet balance has been updated. You can now purchase Facebook accounts instantly from the store.');
                    }}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800 rounded-lg transition"
                  >
                    💰 Balance Credited
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMsgTitle('Payment Receipt Verified');
                      setMsgBody('Your transaction has been confirmed and approved by admin. Thank you for choosing FBStore!');
                    }}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800 rounded-lg transition"
                  >
                    ✅ Payment Approved
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMsgTitle('Payment Proof Verification Needed');
                      setMsgBody('Hello, we could not clearly verify your deposit screenshot. Please submit a new deposit request with a clear receipt showing your Transaction ID (TID) or contact admin on WhatsApp.');
                      setMsgPriority('high');
                    }}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-[11px] text-amber-300 border border-slate-800 rounded-lg transition"
                  >
                    ⚠️ Screenshot Unclear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMsgTitle('Account Replacement Details');
                      setMsgBody('Hello, here are your replacement account credentials. Please log in using the UID:Password provided and check immediately. Thank you!');
                      setMsgPriority('normal');
                    }}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-[11px] text-blue-300 border border-slate-800 rounded-lg transition"
                  >
                    🔑 Account Replacement
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMsgTitle('Important Account Notice');
                      setMsgBody('Please make sure to back up your purchased UID:Password and cookie data immediately upon purchase. For any queries, contact admin.');
                    }}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800 rounded-lg transition"
                  >
                    🚨 Security Notice
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMsgTitle('Special VIP Deal for You!');
                      setMsgBody('Enjoy our special discounted rates on Facebook Verified and Simple accounts today. Stock is limited!');
                    }}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800 rounded-lg transition"
                  >
                    🔥 Special Offer
                  </button>
                </div>
              </div>

              {/* Message Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Message Title / Subject
                </label>
                <input
                  type="text"
                  required
                  value={msgTitle}
                  onChange={(e) => setMsgTitle(e.target.value)}
                  placeholder="e.g. Deposit Approved & Wallet Updated"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Message Content */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Message Content
                </label>
                <textarea
                  rows={4}
                  required
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  placeholder="Type your official message, custom instruction, or notification..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMessageModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingMessage}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  {isSendingMessage ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Direct Message</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: ADMIN USER PASSWORD RESET & VIEW */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Manage Password: @{passwordModalUser.username}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalUser(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl text-xs space-y-1 border border-slate-800">
              <div>
                <span className="text-slate-500">Username: </span>
                <strong className="text-white">@{passwordModalUser.username}</strong>
              </div>
              <div>
                <span className="text-slate-500">Email: </span>
                <span className="text-slate-300">{passwordModalUser.email}</span>
              </div>
              <div>
                <span className="text-slate-500">Wallet Balance: </span>
                <span className="text-emerald-400 font-mono font-bold">Rs. {passwordModalUser.walletBalance} PKR</span>
              </div>
              {passwordModalUser.plainPassword ? (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-slate-400">Saved Password:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-300 bg-slate-900 px-2 py-0.5 rounded">
                      {showModalPassword ? passwordModalUser.plainPassword : '••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowModalPassword(prev => !prev)}
                      className="text-slate-400 hover:text-white p-1"
                      title={showModalPassword ? 'Hide' : 'Reveal'}
                    >
                      {showModalPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (passwordModalUser.plainPassword) {
                          navigator.clipboard.writeText(passwordModalUser.plainPassword);
                          showToast('Copied', 'User password copied to clipboard!', 'success');
                        }
                      }}
                      className="text-slate-400 hover:text-white p-1"
                      title="Copy Password"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Current Password:</span>
                  <span className="italic">Not set yet (enter new password below)</span>
                </div>
              )}
            </div>

            <form onSubmit={handleUpdateUserPasswordByAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Set New Password (min 6 characters)
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={adminNewPasswordInput}
                  onChange={(e) => setAdminNewPasswordInput(e.target.value)}
                  placeholder="Enter new strong password..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingUserPassword}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  {isUpdatingUserPassword ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save New Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: DELETE USER ACCOUNT CONFIRMATION */}
      {deleteUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600/10 border border-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete User Account</h3>
                <p className="text-xs text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              Are you sure you want to permanently delete user <strong className="text-rose-400">@{deleteUserModal.username}</strong> ({deleteUserModal.email})?
              All order history and wallet balance (<strong className="text-emerald-400">Rs. {deleteUserModal.walletBalance} PKR</strong>) will be removed.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteUserModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={handleDeleteUserByAdmin}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                {isDeletingUser ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: TOTAL LIFETIME BALANCE ADJUSTMENT */}
      {totalBalanceModalOpen && (() => {
        const currentTotal = totalLifetimeBalanceAdded || 0;
        const validAmount = isNaN(totalBalanceInput) ? 0 : Number(totalBalanceInput);
        const projectedTotal = totalBalanceMode === 'add'
          ? currentTotal + validAmount
          : totalBalanceMode === 'deduct'
            ? Math.max(0, currentTotal - validAmount)
            : totalBalanceMode === 'set'
              ? Math.max(0, validAmount)
              : 0;

        const quickTotalChips = [100, 500, 1000, 5000, 10000, 50000];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="relative max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${
                    totalBalanceMode === 'add' ? 'bg-emerald-500/10 text-emerald-400' :
                    totalBalanceMode === 'deduct' ? 'bg-rose-500/10 text-rose-400' :
                    totalBalanceMode === 'set' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Total Lifetime Balance Stat</h3>
                    <p className="text-[11px] text-slate-400">Store-wide cumulative balance counter</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTotalBalanceModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Advanced Calculation Card */}
              <div className="p-3.5 bg-slate-950/80 border border-slate-800/90 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Current Stat:</span>
                  <span className="font-mono text-slate-200 font-bold">Rs. {currentTotal.toLocaleString()} PKR</span>
                </div>
                {totalBalanceMode !== 'reset' && (
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Operation:</span>
                    <span className={`font-mono font-bold ${
                      totalBalanceMode === 'add' ? 'text-emerald-400' :
                      totalBalanceMode === 'deduct' ? 'text-rose-400' : 'text-blue-400'
                    }`}>
                      {totalBalanceMode === 'add' ? '+' : totalBalanceMode === 'deduct' ? '-' : '='} Rs. {validAmount.toLocaleString()} PKR
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                  <span className="font-semibold text-slate-300">Projected New Stat:</span>
                  <span className={`font-mono font-extrabold text-sm ${
                    totalBalanceMode === 'reset' ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    Rs. {projectedTotal.toLocaleString()} PKR
                  </span>
                </div>
              </div>

              <form onSubmit={handleAdjustTotalLifetimeBalance} className="space-y-4">
                {/* Mode Selector */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Adjustment Action</label>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setTotalBalanceMode('add')}
                      className={`py-2 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                        totalBalanceMode === 'add' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTotalBalanceMode('deduct')}
                      className={`py-2 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                        totalBalanceMode === 'deduct' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Minus className="w-3 h-3" />
                      <span>Deduct</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTotalBalanceMode('set')}
                      className={`py-2 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                        totalBalanceMode === 'set' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Set</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTotalBalanceMode('reset')}
                      className={`py-2 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                        totalBalanceMode === 'reset' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                {totalBalanceMode !== 'reset' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Amount (PKR)
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={totalBalanceInput}
                      onChange={(e) => setTotalBalanceInput(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                      placeholder="Enter amount..."
                    />

                    {/* Quick Amount Chips */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {quickTotalChips.map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTotalBalanceInput(amt)}
                          className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border transition cursor-pointer ${
                            totalBalanceInput === amt 
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold' 
                              : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          +{amt.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setTotalBalanceModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAdjustingTotal}
                    className={`px-5 py-2.5 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition ${
                      totalBalanceMode === 'reset' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30' :
                      totalBalanceMode === 'add' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30' :
                      totalBalanceMode === 'deduct' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30' :
                      'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                    }`}
                  >
                    {isAdjustingTotal ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>
                          {totalBalanceMode === 'reset' ? 'Reset Stat to 0' : 
                           totalBalanceMode === 'add' ? 'Add to Total Stat' :
                           totalBalanceMode === 'deduct' ? 'Deduct from Total Stat' : 'Set Total Stat'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
