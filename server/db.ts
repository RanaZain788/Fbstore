import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  User, 
  FbIdStockItem, 
  PurchaseOrder, 
  DepositRequest, 
  StoreSettings, 
  NotificationItem,
  Announcement,
  MarqueeAnnouncement,
  AdminMessage,
  CustomerFeedback,
  AccountCategory
} from './types';

export interface DatabaseSchema {
  users: User[];
  idsStock: FbIdStockItem[];
  purchases: PurchaseOrder[];
  deposits: DepositRequest[];
  settings: StoreSettings;
  notifications: NotificationItem[];
  announcements: Announcement[];
  adminMessages: AdminMessage[];
  feedbacks: CustomerFeedback[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BACKUP_FILE = path.join(DATA_DIR, 'db_backup.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_fbstore_salt_v2').digest('hex');
}

export { hashPassword };

// Default settings with Simple & Verified accounts support
const defaultSettings: StoreSettings = {
  siteName: 'FBStore',
  pricePerId: 12, // Default 12 PKR
  pricePerIdSimple: 12, // Default 12 PKR
  pricePerIdVerified: 25, // Default 25 PKR for Verified Accounts
  simpleAccountsEnabled: true,
  verifiedAccountsEnabled: true,
  simpleOfferEnabled: false,
  simpleOfferMessage: 'Special Limited Discount Available!',
  verifiedOfferEnabled: false,
  verifiedOfferMessage: 'Premium High-Quality Facebook Accounts!',
  whatsappNumber: '923001234567',
  adminUsername: 'arslan481',
  adminPassword: 'Zain786081@&#',
  easypaisaTitle: 'Muhammad Arslan',
  easypaisaNumber: '03064887388',
  jazzcashTitle: 'Muhammad Arslan',
  jazzcashNumber: '03064887388',
  accountTitle: 'Muhammad Arslan',
  accountNumber: '03064887388',
  totalBalanceAddedLifetime: 0,
  marqueeAnnouncement: {
    enabled: true,
    text: '🚀 Welcome to FBStore! Instant Facebook Accounts Delivery | 24/7 JazzCash & EasyPaisa Deposit | Guaranteed Fresh UIDs',
    speed: 'normal',
    showBadge: true,
    targetType: 'all',
  },
  welcomeMessageConfig: {
    enabled: true,
    title: 'Welcome to FBStore, {username}! 🎉',
    message: 'Welcome {username}! Welcome to FBStore.\n\nYour account is now ready with Rs. 0 wallet balance. You can add balance via JazzCash / EasyPaisa and purchase verified Facebook accounts with instant delivery.\n\nThank you for choosing us!',
  },
  tutorialVideo: {
    enabled: true,
    title: 'How to Login Facebook ID with Cookie (Video Tutorial)',
    videoUrl: '',
    instructions: '1. Install "Cookie-Editor" extension in your Chrome, Brave or Edge browser.\n2. Open https://www.facebook.com in a new tab.\n3. Click the "Copy Cookie" button for your purchased account in FBStore.\n4. Click the Cookie-Editor extension icon on Facebook, click "Import", paste the cookie, and click Import.\n5. Refresh the Facebook page — you will be instantly logged in without needing a password!',
  }
};

const initialData: DatabaseSchema = {
  users: [
    {
      id: 'usr_admin',
      username: 'arslan481',
      email: 'admin@fbstore.com',
      passwordHash: hashPassword('Zain786081@&#'),
      plainPassword: 'Zain786081@&#',
      role: 'admin',
      walletBalance: 0,
      createdAt: new Date().toISOString(),
    }
  ],
  idsStock: [],
  purchases: [],
  deposits: [],
  settings: defaultSettings,
  notifications: [
    {
      id: 'notif_init',
      userId: 'all',
      title: 'Welcome to FBStore',
      message: 'Facebook Accounts marketplace with instant UID:Password delivery.',
      read: false,
      createdAt: new Date().toISOString()
    }
  ],
  announcements: [
    {
      id: 'ann_welcome',
      title: 'Welcome to FBStore Official System',
      message: 'All Facebook IDs are freshly checked with instant UID:Password delivery. For balance deposits, send JazzCash/EasyPaisa payment & submit screenshot.',
      type: 'info',
      targetType: 'all',
      showAsPopup: false,
      active: true,
      createdAt: new Date().toISOString()
    }
  ],
  adminMessages: [],
  feedbacks: []
};

export interface PendingRegistration {
  username: string;
  email: string;
  passwordHash: string;
  plainPassword?: string;
  otp: string;
  expiresAt: number;
}
export const pendingRegistrations = new Map<string, PendingRegistration>();

export interface PasswordResetToken {
  username: string;
  email: string;
  newPassword?: string;
  otp: string;
  expiresAt: number;
}
export const passwordResetTokens = new Map<string, PasswordResetToken>();

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    let raw: string | null = null;
    try {
      if (fs.existsSync(DB_FILE)) {
        raw = fs.readFileSync(DB_FILE, 'utf-8');
      } else if (fs.existsSync(BACKUP_FILE)) {
        raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
      }
      if (raw) {
        const parsed = JSON.parse(raw);
        
        const cleanedUsers: User[] = (parsed.users || initialData.users).map((u: User) => ({
          ...u,
          plainPassword: u.plainPassword || (u.username === 'arslan481' ? 'Zain786081@&#' : undefined),
          walletBalance: typeof u.walletBalance === 'number' ? u.walletBalance : 0
        }));

        const approvedSum = (parsed.deposits || []).filter((d: any) => d.status === 'approved').reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
        const storedLifetime = typeof parsed.settings?.totalBalanceAddedLifetime === 'number' 
          ? parsed.settings.totalBalanceAddedLifetime 
          : approvedSum;

        const simplePrice = parsed.settings?.pricePerIdSimple ? Number(parsed.settings.pricePerIdSimple) : (parsed.settings?.pricePerId ? Number(parsed.settings.pricePerId) : 12);
        const verifiedPrice = parsed.settings?.pricePerIdVerified ? Number(parsed.settings.pricePerIdVerified) : 25;

        // Ensure all stock items have a category
        const cleanedStock: FbIdStockItem[] = (parsed.idsStock || []).map((s: FbIdStockItem) => ({
          ...s,
          category: s.category === 'verified' ? 'verified' : 'simple'
        }));

        return {
          users: cleanedUsers,
          idsStock: cleanedStock,
          purchases: parsed.purchases || [],
          deposits: parsed.deposits || [],
          settings: {
            ...defaultSettings,
            ...(parsed.settings || {}),
            pricePerId: simplePrice,
            pricePerIdSimple: simplePrice,
            pricePerIdVerified: verifiedPrice,
            simpleAccountsEnabled: parsed.settings?.simpleAccountsEnabled !== undefined ? Boolean(parsed.settings.simpleAccountsEnabled) : true,
            verifiedAccountsEnabled: parsed.settings?.verifiedAccountsEnabled !== undefined ? Boolean(parsed.settings.verifiedAccountsEnabled) : true,
            simpleOfferEnabled: Boolean(parsed.settings?.simpleOfferEnabled),
            simpleOfferMessage: parsed.settings?.simpleOfferMessage || defaultSettings.simpleOfferMessage,
            verifiedOfferEnabled: Boolean(parsed.settings?.verifiedOfferEnabled),
            verifiedOfferMessage: parsed.settings?.verifiedOfferMessage || defaultSettings.verifiedOfferMessage,
            adminUsername: parsed.settings?.adminUsername || 'arslan481',
            adminPassword: parsed.settings?.adminPassword || 'Zain786081@&#',
            easypaisaTitle: parsed.settings?.easypaisaTitle || parsed.settings?.jazzcashTitle || parsed.settings?.accountTitle || defaultSettings.easypaisaTitle,
            easypaisaNumber: parsed.settings?.easypaisaNumber || parsed.settings?.jazzcashNumber || parsed.settings?.accountNumber || defaultSettings.easypaisaNumber,
            jazzcashTitle: parsed.settings?.jazzcashTitle || parsed.settings?.easypaisaTitle || parsed.settings?.accountTitle || defaultSettings.jazzcashTitle,
            jazzcashNumber: parsed.settings?.jazzcashNumber || parsed.settings?.easypaisaNumber || parsed.settings?.accountNumber || defaultSettings.jazzcashNumber,
            accountTitle: parsed.settings?.accountTitle || parsed.settings?.jazzcashTitle || parsed.settings?.easypaisaTitle || defaultSettings.accountTitle,
            accountNumber: parsed.settings?.accountNumber || parsed.settings?.jazzcashNumber || parsed.settings?.easypaisaNumber || defaultSettings.accountNumber,
            totalBalanceAddedLifetime: storedLifetime,
            smtp: parsed.settings?.smtp || defaultSettings.smtp,
            marqueeAnnouncement: parsed.settings?.marqueeAnnouncement || defaultSettings.marqueeAnnouncement,
            welcomeMessageConfig: parsed.settings?.welcomeMessageConfig || defaultSettings.welcomeMessageConfig,
            tutorialVideo: parsed.settings?.tutorialVideo || defaultSettings.tutorialVideo,
          },
          notifications: parsed.notifications || [],
          announcements: parsed.announcements || initialData.announcements,
          adminMessages: parsed.adminMessages || [],
          feedbacks: parsed.feedbacks || []
        };
      }
    } catch (e) {
      console.error('Error reading db.json / db_backup.json:', e);
    }
    this.saveData(initialData);
    return initialData;
  }

  private saveData(dataToSave: DatabaseSchema) {
    try {
      const json = JSON.stringify(dataToSave, null, 2);
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, json, 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
      // Secondary persistent backup
      fs.writeFileSync(BACKUP_FILE, json, 'utf-8');
    } catch (e) {
      try {
        const json = JSON.stringify(dataToSave, null, 2);
        fs.writeFileSync(DB_FILE, json, 'utf-8');
        fs.writeFileSync(BACKUP_FILE, json, 'utf-8');
      } catch (err) {}
    }
  }

  private sync() {
    this.saveData(this.data);
    try {
      import('./firebaseSync').then(({ syncAllToFirestore }) => {
        syncAllToFirestore(this.data).catch(() => {});
      }).catch(() => {});
    } catch (e) {}
  }

  getAllData(): DatabaseSchema {
    return this.data;
  }

  importData(incoming: any): { success: boolean; stats: { users: number; stock: number; purchases: number; deposits: number; announcements: number; feedbacks: number } } {
    if (!incoming || typeof incoming !== 'object') {
      return { success: false, stats: { users: 0, stock: 0, purchases: 0, deposits: 0, announcements: 0, feedbacks: 0 } };
    }
    const currentAdmin = this.data.users.find(u => u.role === 'admin');

    if (Array.isArray(incoming.users)) {
      const mergedUsers: User[] = incoming.users.map((u: any) => ({
        id: u.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        username: String(u.username || 'User').trim(),
        email: String(u.email || '').trim().toLowerCase(),
        passwordHash: u.passwordHash || (u.password ? hashPassword(String(u.password)) : (u.plainPassword ? hashPassword(String(u.plainPassword)) : hashPassword('fbstore123'))),
        plainPassword: u.plainPassword || u.password || undefined,
        role: u.role === 'admin' ? 'admin' : 'user',
        walletBalance: typeof u.walletBalance === 'number' ? Math.max(0, u.walletBalance) : 0,
        createdAt: u.createdAt || new Date().toISOString()
      }));
      const hasAdmin = mergedUsers.some(u => u.role === 'admin');
      if (!hasAdmin && currentAdmin) {
        mergedUsers.unshift(currentAdmin);
      }
      this.data.users = mergedUsers;
    }

    const incomingStock = Array.isArray(incoming.idsStock) ? incoming.idsStock : (Array.isArray(incoming.stock) ? incoming.stock : null);
    if (incomingStock) {
      this.data.idsStock = incomingStock.map((s: any) => ({
        id: s.id || `id_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        rawLine: s.rawLine || `${s.uid}:${s.password}`,
        uid: String(s.uid || '').trim(),
        password: String(s.password || '').trim(),
        cookie: s.cookie ? String(s.cookie).trim() : undefined,
        category: s.category === 'verified' ? 'verified' : 'simple',
        status: s.status === 'sold' ? 'sold' : 'available',
        soldToUserId: s.soldToUserId || undefined,
        soldToUsername: s.soldToUsername || undefined,
        soldAt: s.soldAt || undefined,
        orderId: s.orderId || undefined,
        createdAt: s.createdAt || new Date().toISOString()
      }));
    }

    const incomingPurchases = Array.isArray(incoming.purchases) ? incoming.purchases : (Array.isArray(incoming.orders) ? incoming.orders : null);
    if (incomingPurchases) {
      this.data.purchases = incomingPurchases.map((p: any) => ({
        id: p.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: p.userId || '',
        username: p.username || 'Customer',
        quantity: Number(p.quantity) || 1,
        category: p.category === 'verified' ? 'verified' : 'simple',
        pricePerId: Number(p.pricePerId) || 12,
        totalPrice: Number(p.totalPrice) || 12,
        ids: Array.isArray(p.ids) ? p.ids : [],
        accounts: Array.isArray(p.accounts) ? p.accounts : [],
        purchasedAt: p.purchasedAt || new Date().toISOString()
      }));
    }

    if (Array.isArray(incoming.deposits)) {
      this.data.deposits = incoming.deposits.map((d: any) => ({
        id: d.id || `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: d.userId || '',
        username: d.username || '',
        userEmail: d.userEmail || '',
        amount: Number(d.amount) || 0,
        senderAccountName: d.senderAccountName || '',
        senderAccountNumber: d.senderAccountNumber || '',
        transactionId: d.transactionId || '',
        screenshotUrl: d.screenshotUrl || '',
        status: d.status || 'pending',
        rejectionReason: d.rejectionReason,
        createdAt: d.createdAt || new Date().toISOString(),
        processedAt: d.processedAt,
        processedBy: d.processedBy
      }));
    }

    if (incoming.settings && typeof incoming.settings === 'object') {
      this.data.settings = {
        ...this.data.settings,
        ...incoming.settings,
        tutorialVideo: incoming.settings.tutorialVideo || this.data.settings.tutorialVideo || defaultSettings.tutorialVideo
      };
    }

    if (Array.isArray(incoming.announcements)) {
      this.data.announcements = incoming.announcements;
    }

    if (Array.isArray(incoming.feedbacks)) {
      this.data.feedbacks = incoming.feedbacks;
    }

    this.sync();
    return {
      success: true,
      stats: {
        users: this.data.users.length,
        stock: this.data.idsStock.length,
        purchases: this.data.purchases.length,
        deposits: this.data.deposits.length,
        announcements: this.data.announcements.length,
        feedbacks: (this.data.feedbacks || []).length
      }
    };
  }

  // Users
  getUsers(): User[] {
    return this.data.users;
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  getUserByLogin(login: string): User | undefined {
    const q = login.trim().toLowerCase();
    return this.data.users.find(u => 
      u.username.toLowerCase() === q || u.email.toLowerCase() === q
    );
  }

  createUser(user: User): User {
    user.walletBalance = 0;
    this.data.users.push(user);
    this.sync();
    return user;
  }

  updateUserBalance(userId: string, delta: number): User | undefined {
    const user = this.getUserById(userId);
    if (!user) return undefined;
    user.walletBalance = Math.max(0, user.walletBalance + delta);
    if (delta > 0) {
      this.data.settings.totalBalanceAddedLifetime = (this.data.settings.totalBalanceAddedLifetime || 0) + delta;
    }
    this.sync();
    return user;
  }

  setUserBalance(userId: string, newBalance: number): User | undefined {
    const user = this.getUserById(userId);
    if (!user) return undefined;
    const diff = newBalance - user.walletBalance;
    if (diff > 0) {
      this.data.settings.totalBalanceAddedLifetime = (this.data.settings.totalBalanceAddedLifetime || 0) + diff;
    }
    user.walletBalance = Math.max(0, newBalance);
    this.sync();
    return user;
  }

  updateUserPassword(identifier: string, newPasswordHash: string, newPlainPassword?: string): boolean {
    const user = this.data.users.find(u => 
      u.id === identifier || 
      u.email.toLowerCase() === identifier.toLowerCase() || 
      u.username.toLowerCase() === identifier.toLowerCase()
    );
    if (!user) return false;
    user.passwordHash = newPasswordHash;
    if (newPlainPassword) {
      user.plainPassword = newPlainPassword;
    }
    this.sync();
    return true;
  }

  recordUserPlainPassword(userId: string, plainPass: string): boolean {
    const user = this.getUserById(userId);
    if (!user) return false;
    user.plainPassword = plainPass;
    this.sync();
    return true;
  }

  deleteUser(userId: string): boolean {
    const idx = this.data.users.findIndex(u => u.id === userId);
    if (idx === -1) return false;
    this.data.users.splice(idx, 1);
    this.sync();
    return true;
  }

  resetTotalBalanceAdded(): number {
    this.data.settings.totalBalanceAddedLifetime = 0;
    this.sync();
    return 0;
  }

  deductTotalBalanceAdded(amount: number): number {
    const current = this.data.settings.totalBalanceAddedLifetime || 0;
    this.data.settings.totalBalanceAddedLifetime = Math.max(0, current - Math.abs(amount));
    this.sync();
    return this.data.settings.totalBalanceAddedLifetime;
  }

  setTotalBalanceAdded(amount: number): number {
    this.data.settings.totalBalanceAddedLifetime = Math.max(0, amount);
    this.sync();
    return this.data.settings.totalBalanceAddedLifetime;
  }

  getUsersWithStats(): any[] {
    return this.data.users
      .filter(u => u.role !== 'admin')
      .map(u => {
        const userOrders = this.data.purchases.filter(p => p.userId === u.id);
        const totalSpent = userOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
        const totalAccountsBought = userOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
        return {
          id: u.id,
          username: u.username,
          email: u.email,
          plainPassword: u.plainPassword || '',
          walletBalance: u.walletBalance,
          createdAt: u.createdAt,
          ordersCount: userOrders.length,
          totalAccountsBought,
          totalSpent
        };
      });
  }

  // Settings
  getSettings(): StoreSettings {
    return this.data.settings;
  }

  updateSettings(updates: Partial<StoreSettings>): StoreSettings {
    const title = updates.jazzcashTitle || updates.easypaisaTitle || updates.accountTitle;
    const number = updates.jazzcashNumber || updates.easypaisaNumber || updates.accountNumber;
    if (title !== undefined) {
      const cleanTitle = String(title).trim();
      updates.easypaisaTitle = cleanTitle;
      updates.jazzcashTitle = cleanTitle;
      updates.accountTitle = cleanTitle;
    }
    if (number !== undefined) {
      const cleanNumber = String(number).trim();
      updates.easypaisaNumber = cleanNumber;
      updates.jazzcashNumber = cleanNumber;
      updates.accountNumber = cleanNumber;
    }

    // Keep pricePerId synchronized with pricePerIdSimple
    if (updates.pricePerIdSimple !== undefined) {
      updates.pricePerId = Number(updates.pricePerIdSimple);
    } else if (updates.pricePerId !== undefined) {
      updates.pricePerIdSimple = Number(updates.pricePerId);
    }

    this.data.settings = { ...this.data.settings, ...updates };
    
    if (updates.adminUsername || updates.adminPassword) {
      const adminUser = this.data.users.find(u => u.role === 'admin');
      if (adminUser) {
        if (updates.adminUsername) adminUser.username = updates.adminUsername;
        if (updates.adminPassword) adminUser.passwordHash = hashPassword(updates.adminPassword);
      }
    }

    this.sync();
    return this.data.settings;
  }

  // Database Backup and Restore
  getDatabaseSnapshot(): DatabaseSchema {
    return JSON.parse(JSON.stringify(this.data));
  }

  restoreDatabaseSnapshot(incoming: any): boolean {
    if (!incoming || typeof incoming !== 'object') return false;
    const currentAdmin = this.data.users.find(u => u.role === 'admin');
    if (Array.isArray(incoming.users)) {
      const restoredUsers = incoming.users.map((u: any) => ({
        ...u,
        walletBalance: typeof u.walletBalance === 'number' ? u.walletBalance : 0
      }));
      const hasAdmin = restoredUsers.some((u: any) => u.role === 'admin');
      if (!hasAdmin && currentAdmin) {
        restoredUsers.unshift(currentAdmin);
      }
      this.data.users = restoredUsers;
    }

    const incomingStock = Array.isArray(incoming.idsStock) ? incoming.idsStock : (Array.isArray(incoming.stock) ? incoming.stock : null);
    if (incomingStock) {
      this.data.idsStock = incomingStock.map((s: any) => ({
        ...s,
        category: s.category === 'verified' ? 'verified' : 'simple'
      }));
    }

    const incomingPurchases = Array.isArray(incoming.purchases) ? incoming.purchases : (Array.isArray(incoming.orders) ? incoming.orders : null);
    if (incomingPurchases) {
      this.data.purchases = incomingPurchases;
    }

    if (Array.isArray(incoming.deposits)) {
      this.data.deposits = incoming.deposits;
    }

    if (incoming.settings && typeof incoming.settings === 'object') {
      this.data.settings = { ...this.data.settings, ...incoming.settings };
    }

    if (Array.isArray(incoming.notifications)) {
      this.data.notifications = incoming.notifications;
    }

    if (Array.isArray(incoming.announcements)) {
      this.data.announcements = incoming.announcements;
    }

    if (Array.isArray(incoming.adminMessages)) {
      this.data.adminMessages = incoming.adminMessages;
    }

    if (Array.isArray(incoming.feedbacks)) {
      this.data.feedbacks = incoming.feedbacks;
    }

    this.sync();
    return true;
  }

  // Tutorial Video
  getTutorialVideo(): any {
    return this.data.settings.tutorialVideo || defaultSettings.tutorialVideo;
  }

  updateTutorialVideo(videoUpdate: any): any {
    this.data.settings.tutorialVideo = {
      ...(this.data.settings.tutorialVideo || defaultSettings.tutorialVideo),
      ...videoUpdate,
      updatedAt: new Date().toISOString()
    };
    this.sync();
    return this.data.settings.tutorialVideo;
  }

  // IDs Stock (UID:Password:Cookie, Category: simple | verified)
  getStock(category?: AccountCategory): FbIdStockItem[] {
    if (!category) return this.data.idsStock;
    return this.data.idsStock.filter(i => (i.category || 'simple') === category);
  }

  getAvailableStockCount(category?: AccountCategory): number {
    if (!category) {
      return this.data.idsStock.filter(i => i.status === 'available').length;
    }
    return this.data.idsStock.filter(i => i.status === 'available' && (i.category || 'simple') === category).length;
  }

  // Helper: Copy all UIDs as clean text
  getUidsList(category?: AccountCategory, status?: 'all' | 'available' | 'sold'): string[] {
    let list = this.data.idsStock;
    if (category) {
      list = list.filter(i => (i.category || 'simple') === category);
    }
    if (status === 'available') {
      list = list.filter(i => i.status === 'available');
    } else if (status === 'sold') {
      list = list.filter(i => i.status === 'sold');
    }
    return list.map(i => i.uid).filter(Boolean);
  }

  addSingleStockItem(uid: string, password: string, cookie?: string, category: AccountCategory = 'simple'): FbIdStockItem {
    const cleanUid = uid.trim();
    const cleanPassword = password.trim();
    const cleanCookie = cookie ? cookie.trim() : undefined;
    const rawLine = cleanCookie ? `${cleanUid}:${cleanPassword} [Cookie Included]` : `${cleanUid}:${cleanPassword}`;
    const item: FbIdStockItem = {
      id: `id_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      rawLine,
      uid: cleanUid,
      password: cleanPassword,
      cookie: cleanCookie,
      category,
      status: 'available',
      createdAt: new Date().toISOString()
    };
    this.data.idsStock.push(item);
    this.sync();
    return item;
  }

  addStockAccounts(accounts: Array<{ uid: string; password: string; cookie?: string }>, category: AccountCategory = 'simple'): { addedCount: number; items: FbIdStockItem[] } {
    const newItems: FbIdStockItem[] = [];
    for (const acc of accounts) {
      const cleanUid = String(acc.uid || '').trim();
      const cleanPassword = String(acc.password || '').trim();
      const cleanCookie = acc.cookie ? String(acc.cookie).trim() : undefined;
      if (!cleanUid) continue;
      const rawLine = cleanCookie ? `${cleanUid}:${cleanPassword} [Cookie Included]` : `${cleanUid}:${cleanPassword}`;
      const item: FbIdStockItem = {
        id: `id_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        rawLine,
        uid: cleanUid,
        password: cleanPassword,
        cookie: cleanCookie || undefined,
        category,
        status: 'available',
        createdAt: new Date().toISOString()
      };
      newItems.push(item);
      this.data.idsStock.push(item);
    }
    this.sync();
    return { addedCount: newItems.length, items: newItems };
  }

  /**
   * UNIVERSAL SMART BULK PARSER:
   * Supports:
   * 1. Delimiters: |, :, ----, ---, \t (Excel), comma, space
   * 2. Formats:
   *    - UID|PASS|COOKIE
   *    - UID:PASS:COOKIE
   *    - UID|PASS|2FA|COOKIE (4-part format with 2FA key)
   *    - UID:PASS:2FA:COOKIE
   *    - Block formats:
   *      UID: 10008923
   *      PASS: Pass123
   *      COOKIE: c_user=...
   *    - JSON array of objects: [{"uid": "...", "password": "...", "cookie": "..."}]
   *    - Single lines with labels: UID: 10008923 | PASS: Pass123 | COOKIE: c_user=...
   */
  addStockLines(lines: string[], category: AccountCategory = 'simple'): { addedCount: number; items: FbIdStockItem[] } {
    const rawJoined = lines.join('\n').trim();
    const newItems: FbIdStockItem[] = [];

    // Helper to add an item
    const recordItem = (uid: string, password: string, cookie?: string) => {
      const cleanUid = uid.replace(/^["']|["']$/g, '').trim();
      const cleanPass = password.replace(/^["']|["']$/g, '').trim();
      const cleanCookie = cookie ? cookie.replace(/^["']|["']$/g, '').trim() : undefined;
      if (!cleanUid) return;

      const rawLine = cleanCookie ? `${cleanUid}:${cleanPass} [Cookie Included]` : `${cleanUid}:${cleanPass}`;
      const item: FbIdStockItem = {
        id: `id_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${newItems.length}`,
        rawLine,
        uid: cleanUid,
        password: cleanPass,
        cookie: cleanCookie || undefined,
        category,
        status: 'available',
        createdAt: new Date().toISOString()
      };
      newItems.push(item);
      this.data.idsStock.push(item);
    };

    // 1. Try parsing whole text as JSON array
    if (rawJoined.startsWith('[') && rawJoined.endsWith(']')) {
      try {
        const parsedJson = JSON.parse(rawJoined);
        if (Array.isArray(parsedJson)) {
          for (const obj of parsedJson) {
            if (obj && typeof obj === 'object') {
              const u = String(obj.uid || obj.id || obj.username || '').trim();
              const p = String(obj.password || obj.pass || obj.pwd || '').trim();
              const c = obj.cookie || obj.cookies || obj.token ? String(obj.cookie || obj.cookies || obj.token).trim() : undefined;
              if (u) recordItem(u, p, c);
            }
          }
          if (newItems.length > 0) {
            this.sync();
            return { addedCount: newItems.length, items: newItems };
          }
        }
      } catch (err) {}
    }

    // 2. Check for multi-line block format (UID:\nPASS:\nCOOKIE: or separated by blank lines / dashes)
    const hasBlockLabels = /(?:^|\n)\s*(?:uid|id|user)\s*:/i.test(rawJoined) && 
                           /(?:^|\n)\s*(?:pass|password|pwd)\s*:/i.test(rawJoined);

    if (hasBlockLabels) {
      // Split by double newlines or lines with only dashes/equals
      const blocks = rawJoined.split(/\n\s*(?:\n|---|===|___|\*\*\*)\s*\n?/);
      let parsedBlockCount = 0;

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

          // If line contains cookie signatures directly
          if (/c_user=|xs=|datr=|sb=/.test(trimmedBl)) {
            bCookie = bCookie ? `${bCookie}; ${trimmedBl}` : trimmedBl;
          }
        }

        if (bUid) {
          recordItem(bUid, bPass, bCookie || undefined);
          parsedBlockCount++;
        }
      }

      if (parsedBlockCount > 0) {
        this.sync();
        return { addedCount: newItems.length, items: newItems };
      }
    }

    // 3. Line-by-Line Parsing with ultra-resilient delimiter handling
    for (const raw of lines) {
      let trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Skip pure header rows like "UID|Password|Cookie" or "UID:Password:Cookie"
      const lower = trimmed.toLowerCase();
      if ((lower.startsWith('uid|password') || lower.startsWith('uid:password') || lower === 'uid:pass:cookie' || lower === 'uid|pass|cookie')) {
        continue;
      }

      let uid = '';
      let password = '';
      let cookie: string | undefined = undefined;

      // Check if line has labels: "UID: 1000 | PASS: abc | Cookie: c_user=..."
      if (/uid\s*[:=]/i.test(trimmed) && /pass/i.test(trimmed)) {
        const uM = trimmed.match(/uid\s*[:=]\s*([^|:;\n\s]+)/i);
        const pM = trimmed.match(/pass(?:word)?\s*[:=]\s*([^|;\n]+)/i);
        const cM = trimmed.match(/cookie[s]?\s*[:=]\s*(.+)$/i);
        if (uM && uM[1]) uid = uM[1].trim();
        if (pM && pM[1]) password = pM[1].trim();
        if (cM && cM[1]) cookie = cM[1].trim();

        if (uid) {
          recordItem(uid, password, cookie);
          continue;
        }
      }

      // Strip leading "UID:" or "ID:" prefix if present (e.g. "UID: 10008923:Pass123:c_user=...")
      trimmed = trimmed.replace(/^(?:uid|id|user)\s*[:=]\s*/i, '');

      // Determine separator
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
          // Check if part 2 is 2FA and part 3 is cookie:
          // e.g. UID | PASS | 2FA_SECRET | COOKIE
          const part3IsCookie = /c_user=|xs=|datr=|sb=|\[|\{/.test(parts[2]);
          const part4IsCookie = /c_user=|xs=|datr=|sb=|\[|\{/.test(parts[3]);

          if (part4IsCookie) {
            password = `${parts[1]} [2FA: ${parts[2]}]`;
            cookie = parts.slice(3).join(sep).trim() || undefined;
          } else if (part3IsCookie) {
            cookie = parts.slice(2).join(sep).trim() || undefined;
          } else {
            // General multi-token: first is UID, second is pass, remainder is cookie
            cookie = parts.slice(2).join(sep).trim() || undefined;
          }
        }
      } else if (trimmed.includes(':')) {
        // Colon-delimited: UID:Pass:Cookie or UID:Pass:2FA:Cookie
        const firstColon = trimmed.indexOf(':');
        uid = trimmed.slice(0, firstColon).trim();
        const remainder = trimmed.slice(firstColon + 1).trim();

        // Check if remainder has cookie signatures
        const cookieIndex = remainder.search(/c_user=|xs=|datr=|sb=|\[\s*\{/i);

        if (cookieIndex > 0) {
          // Everything before cookie signature
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
          // Standard split on second colon
          const secondColon = remainder.indexOf(':');
          if (secondColon !== -1) {
            password = remainder.slice(0, secondColon).trim();
            cookie = remainder.slice(secondColon + 1).trim() || undefined;
          } else {
            password = remainder;
          }
        }
      } else if (trimmed.includes(',')) {
        // CSV format: UID,Password,Cookie
        const parts = trimmed.split(',').map(p => p.trim());
        uid = parts[0] || '';
        password = parts[1] || '';
        if (parts.length >= 3) {
          cookie = parts.slice(2).join(',').trim() || undefined;
        }
      } else {
        // Space-delimited fallback
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

      // Final cleanup
      if (uid) {
        recordItem(uid, password, cookie);
      }
    }

    this.sync();
    return { addedCount: newItems.length, items: newItems };
  }

  deleteStockItem(id: string): boolean {
    const idx = this.data.idsStock.findIndex(item => item.id === id);
    if (idx === -1) return false;
    this.data.idsStock.splice(idx, 1);
    this.sync();
    return true;
  }

  deleteSoldStockItems(category?: AccountCategory): number {
    const initialCount = this.data.idsStock.length;
    this.data.idsStock = this.data.idsStock.filter(item => {
      if (item.status !== 'sold') return true;
      if (category && (item.category || 'simple') !== category) return true;
      return false; // Remove
    });
    const removed = initialCount - this.data.idsStock.length;
    this.sync();
    return removed;
  }

  // Purchases with Category Support
  purchaseStock(userId: string, username: string, quantity: number, category: AccountCategory = 'simple'): { success: boolean; error?: string; order?: PurchaseOrder } {
    const available = this.data.idsStock.filter(i => i.status === 'available' && (i.category || 'simple') === category);
    const categoryLabel = category === 'verified' ? 'Facebook Verified' : 'Facebook Simple';

    if (available.length < quantity) {
      return { 
        success: false, 
        error: `Insufficient stock! Currently only ${available.length} ${categoryLabel} accounts are available in stock.` 
      };
    }

    const user = this.getUserById(userId);
    if (!user) return { success: false, error: 'User not found' };

    const pricePerId = category === 'verified' 
      ? (this.data.settings.pricePerIdVerified || 25)
      : (this.data.settings.pricePerIdSimple || this.data.settings.pricePerId || 12);

    const totalPrice = quantity * pricePerId;

    if (user.walletBalance < totalPrice) {
      return { 
        success: false, 
        error: `Insufficient balance! Total is Rs. ${totalPrice.toLocaleString()} PKR, but your current balance is Rs. ${user.walletBalance.toLocaleString()} PKR.` 
      };
    }

    // Deduct balance
    user.walletBalance -= totalPrice;

    // Pick quantity
    const selectedIds = available.slice(0, quantity);
    const now = new Date().toISOString();
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    for (const item of selectedIds) {
      item.status = 'sold';
      item.soldToUserId = userId;
      item.soldToUsername = username;
      item.soldAt = now;
      item.orderId = orderId;
    }

    const accounts = selectedIds.map(i => ({
      uid: i.uid,
      password: i.password,
      cookie: i.cookie || '',
      category,
      rawLine: `${i.uid}:${i.password}`
    }));

    const order: PurchaseOrder = {
      id: orderId,
      userId,
      username,
      quantity,
      category,
      pricePerId,
      totalPrice,
      ids: selectedIds.map(i => `${i.uid}:${i.password}`),
      accounts,
      purchasedAt: now
    };

    this.data.purchases.unshift(order);
    this.sync();

    return { success: true, order };
  }

  getUserPurchases(userId: string): PurchaseOrder[] {
    return this.data.purchases.filter(p => p.userId === userId);
  }

  getAllPurchases(): PurchaseOrder[] {
    return this.data.purchases;
  }

  // Deposits
  getDeposits(): DepositRequest[] {
    return this.data.deposits;
  }

  createDeposit(deposit: DepositRequest): DepositRequest {
    this.data.deposits.unshift(deposit);
    this.sync();
    return deposit;
  }

  deleteDeposit(id: string): boolean {
    const idx = this.data.deposits.findIndex(d => d.id === id);
    if (idx === -1) return false;
    this.data.deposits.splice(idx, 1);
    this.sync();
    return true;
  }

  setDepositStatus(
    id: string, 
    newStatus: 'pending' | 'approved' | 'rejected', 
    rejectionReason?: string, 
    adminUsername = 'admin'
  ): { deposit?: DepositRequest; user?: User } {
    const deposit = this.data.deposits.find(d => d.id === id);
    if (!deposit) return {};

    const previousStatus = deposit.status;
    deposit.status = newStatus;
    deposit.processedAt = new Date().toISOString();
    deposit.processedBy = adminUsername;
    if (rejectionReason !== undefined) {
      deposit.rejectionReason = rejectionReason;
    }

    let updatedUser: User | undefined;
    if (previousStatus !== 'approved' && newStatus === 'approved') {
      updatedUser = this.updateUserBalance(deposit.userId, deposit.amount);
    } else if (previousStatus === 'approved' && (newStatus === 'rejected' || newStatus === 'pending')) {
      updatedUser = this.updateUserBalance(deposit.userId, -deposit.amount);
    } else {
      updatedUser = this.getUserById(deposit.userId);
    }

    this.sync();
    return { deposit, user: updatedUser };
  }

  updateDepositStatus(
    id: string, 
    status: 'approved' | 'rejected', 
    rejectionReason?: string, 
    adminUsername = 'admin'
  ): { deposit?: DepositRequest; user?: User } {
    return this.setDepositStatus(id, status, rejectionReason, adminUsername);
  }

  // Notifications
  getNotifications(userId?: string): NotificationItem[] {
    if (!userId) return this.data.notifications;
    return this.data.notifications.filter(n => n.userId === userId || n.userId === 'all');
  }

  // Announcements
  getAnnouncements(userId?: string): Announcement[] {
    const list = this.data.announcements || [];
    return list.filter(a => {
      if (!a.active) return false;
      if (a.targetType === 'all') return true;
      if (userId && a.targetType === 'user' && a.targetUserId === userId) return true;
      return false;
    });
  }

  getAllAnnouncements(): Announcement[] {
    return this.data.announcements || [];
  }

  addAnnouncement(ann: Omit<Announcement, 'id' | 'createdAt'>): Announcement {
    const newAnn: Announcement = {
      ...ann,
      id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    if (!this.data.announcements) this.data.announcements = [];
    this.data.announcements.unshift(newAnn);
    this.sync();
    return newAnn;
  }

  updateAnnouncement(id: string, updates: Partial<Announcement>): Announcement | null {
    if (!this.data.announcements) return null;
    const index = this.data.announcements.findIndex(a => a.id === id);
    if (index === -1) return null;
    this.data.announcements[index] = {
      ...this.data.announcements[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.sync();
    return this.data.announcements[index];
  }

  deleteAnnouncement(id: string): boolean {
    if (!this.data.announcements) return false;
    const initialLen = this.data.announcements.length;
    this.data.announcements = this.data.announcements.filter(a => a.id !== id);
    if (this.data.announcements.length !== initialLen) {
      this.sync();
      return true;
    }
    return false;
  }

  // Marquee
  getMarquee(): MarqueeAnnouncement {
    return this.data.settings.marqueeAnnouncement || {
      enabled: true,
      text: '🚀 Welcome to FBStore! Instant Facebook Accounts Delivery | 24/7 JazzCash & EasyPaisa Deposit | Guaranteed Fresh UIDs',
      speed: 'normal',
      showBadge: true,
      targetType: 'all',
    };
  }

  updateMarquee(marquee: Partial<MarqueeAnnouncement>): MarqueeAnnouncement {
    const current = this.getMarquee();
    const updated: MarqueeAnnouncement = {
      ...current,
      ...marquee
    };
    this.data.settings.marqueeAnnouncement = updated;
    this.sync();
    return updated;
  }

  // Welcome Message Configuration
  getWelcomeMessageConfig() {
    return this.data.settings.welcomeMessageConfig || defaultSettings.welcomeMessageConfig!;
  }

  updateWelcomeMessageConfig(config: Partial<{ enabled: boolean; title: string; message: string }>) {
    const current = this.getWelcomeMessageConfig();
    const updated = {
      ...current,
      ...config
    };
    this.data.settings.welcomeMessageConfig = updated;
    this.sync();
    return updated;
  }

  createWelcomeMessageForUser(user: User): Announcement | null {
    const config = this.getWelcomeMessageConfig();
    if (!config || !config.enabled) return null;
    const formattedTitle = (config.title || 'Welcome to FBStore, {username}! 🎉')
      .replace(/{username}/gi, user.username);
    const formattedMessage = (config.message || 'Welcome {username}! Welcome to FBStore. Your account is ready.')
      .replace(/{username}/gi, user.username);

    const welcomeAnn = this.addAnnouncement({
      title: formattedTitle,
      message: formattedMessage,
      type: 'success',
      targetType: 'user',
      targetUserId: user.id,
      targetUsername: user.username,
      showAsPopup: true,
      frequency: 'once_only',
      active: true,
    });

    this.sendAdminMessage({
      userId: user.id,
      targetUsername: user.username,
      sender: 'FBStore System',
      title: formattedTitle,
      message: formattedMessage,
      priority: 'high'
    });

    return welcomeAnn;
  }

  // Direct Admin Messages
  getAdminMessages(userId: string): AdminMessage[] {
    if (!this.data.adminMessages) this.data.adminMessages = [];
    return this.data.adminMessages.filter(m => m.userId === userId || m.userId === 'all');
  }

  getAllAdminMessages(): AdminMessage[] {
    return this.data.adminMessages || [];
  }

  sendAdminMessage(msg: Omit<AdminMessage, 'id' | 'createdAt' | 'read'>): AdminMessage {
    const newMsg: AdminMessage = {
      ...msg,
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      read: false,
      createdAt: new Date().toISOString()
    };
    if (!this.data.adminMessages) this.data.adminMessages = [];
    this.data.adminMessages.unshift(newMsg);
    this.sync();
    return newMsg;
  }

  markAdminMessageRead(msgId: string, userId: string): boolean {
    if (!this.data.adminMessages) return false;
    const msg = this.data.adminMessages.find(m => m.id === msgId && (m.userId === userId || m.userId === 'all'));
    if (!msg) return false;
    msg.read = true;
    this.sync();
    return true;
  }

  deleteAdminMessage(msgId: string): boolean {
    if (!this.data.adminMessages) return false;
    const initialLen = this.data.adminMessages.length;
    this.data.adminMessages = this.data.adminMessages.filter(m => m.id !== msgId);
    if (this.data.adminMessages.length !== initialLen) {
      this.sync();
      return true;
    }
    return false;
  }

  // Customer Feedback & Feature Requests
  getFeedbacks(): CustomerFeedback[] {
    if (!this.data.feedbacks) this.data.feedbacks = [];
    return this.data.feedbacks;
  }

  addFeedback(feedback: Omit<CustomerFeedback, 'id' | 'createdAt' | 'status'>): CustomerFeedback {
    const newFb: CustomerFeedback = {
      ...feedback,
      id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      status: 'new',
      createdAt: new Date().toISOString()
    };
    if (!this.data.feedbacks) this.data.feedbacks = [];
    this.data.feedbacks.unshift(newFb);
    this.sync();
    return newFb;
  }

  deleteFeedback(id: string): boolean {
    if (!this.data.feedbacks) return false;
    const idx = this.data.feedbacks.findIndex(f => f.id === id);
    if (idx === -1) return false;
    this.data.feedbacks.splice(idx, 1);
    this.sync();
    return true;
  }

  updateFeedbackStatus(id: string, status: 'new' | 'reviewed' | 'resolved'): CustomerFeedback | null {
    if (!this.data.feedbacks) return null;
    const fb = this.data.feedbacks.find(f => f.id === id);
    if (!fb) return null;
    fb.status = status;
    this.sync();
    return fb;
  }

  // Sync Users from Firestore
  syncFirestoreUsers(remoteUsers: Array<Partial<User>>): User[] {
    let changed = false;
    for (const remote of remoteUsers) {
      if (!remote.email && !remote.id) continue;
      const existing = this.data.users.find(u => 
        (remote.id && u.id === remote.id) || 
        (remote.email && u.email.toLowerCase() === remote.email.toLowerCase())
      );
      if (existing) {
        if (typeof remote.walletBalance === 'number' && remote.walletBalance > existing.walletBalance) {
          existing.walletBalance = remote.walletBalance;
          changed = true;
        }
        if (remote.plainPassword && !existing.plainPassword) {
          existing.plainPassword = remote.plainPassword;
          changed = true;
        }
      } else {
        const username = remote.username || (remote.email ? remote.email.split('@')[0] : `user_${Date.now()}`);
        const newUser: User = {
          id: remote.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          username,
          email: (remote.email || `${username}@fbstore.com`).toLowerCase(),
          passwordHash: hashPassword(remote.plainPassword || 'UserPass123'),
          plainPassword: remote.plainPassword || undefined,
          role: (remote.role as any) || 'user',
          walletBalance: typeof remote.walletBalance === 'number' ? remote.walletBalance : 0,
          createdAt: remote.createdAt || new Date().toISOString()
        };
        this.data.users.push(newUser);
        changed = true;
      }
    }
    if (changed) {
      this.sync();
    }
    return this.data.users;
  }
}

export const db = new Database();
