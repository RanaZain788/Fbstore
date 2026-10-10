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
  AdminMessage
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

// Default settings: 12 PKR per ID, JazzCash / EasyPaisa, arslan481 / Zain786081@&#
const defaultSettings: StoreSettings = {
  siteName: 'FBStore',
  pricePerId: 12, // Default 12 PKR as requested
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
    text: '⚡ Welcome to FBStore! Instant Facebook Accounts Delivery • 24/7 JazzCash & EasyPaisa Deposit • Guaranteed Fresh UIDs',
    speed: 'normal',
    showBadge: true,
    targetType: 'all',
  },
  welcomeMessageConfig: {
    enabled: true,
    title: 'Welcome to FBStore, {username}! 🎉',
    message: 'Assalam-o-Alaikum {username}! Welcome to FBStore.\n\nYour account is now ready with Rs. 0 wallet balance. You can add balance via JazzCash / EasyPaisa and purchase verified Facebook accounts with instant delivery.\n\nThank you for choosing us!',
  },
  tutorialVideo: {
    enabled: true,
    title: 'How to Login Facebook ID with Cookie (Video Tutorial) 🍪',
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
      walletBalance: 0, // Zero balance!
      createdAt: new Date().toISOString(),
    }
  ],
  idsStock: [], // No fake data. Admin will paste their own real Facebook IDs!
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
  adminMessages: []
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
        
        // Preserve user balances exactly as they are (do not reset!)
        const cleanedUsers: User[] = (parsed.users || initialData.users).map((u: User) => ({
          ...u,
          plainPassword: u.plainPassword || (u.username === 'arslan481' ? 'Zain786081@&#' : undefined),
          walletBalance: typeof u.walletBalance === 'number' ? u.walletBalance : 0
        }));

        const approvedSum = (parsed.deposits || []).filter((d: any) => d.status === 'approved').reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
        const storedLifetime = typeof parsed.settings?.totalBalanceAddedLifetime === 'number' 
          ? parsed.settings.totalBalanceAddedLifetime 
          : approvedSum;

        return {
          users: cleanedUsers,
          idsStock: parsed.idsStock || [],
          purchases: parsed.purchases || [],
          deposits: parsed.deposits || [],
          settings: {
            ...defaultSettings,
            ...(parsed.settings || {}),
            pricePerId: parsed.settings?.pricePerId ? Number(parsed.settings.pricePerId) : 12,
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
    // Mirror asynchronously to Firebase Firestore
    try {
      import('./firebaseSync').then(({ syncAllToFirestore }) => {
        syncAllToFirestore(this.data).catch(() => {});
      }).catch(() => {});
    } catch (e) {}
  }

  getAllData(): DatabaseSchema {
    return this.data;
  }

  importData(incoming: any): { success: boolean; stats: { users: number; stock: number; purchases: number; deposits: number; announcements: number } } {
    if (!incoming || typeof incoming !== 'object') {
      return { success: false, stats: { users: 0, stock: 0, purchases: 0, deposits: 0, announcements: 0 } };
    }

    const currentAdmin = this.data.users.find(u => u.role === 'admin');

    // Handle users (support incoming.users)
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

      // Ensure at least one admin exists
      const hasAdmin = mergedUsers.some(u => u.role === 'admin');
      if (!hasAdmin && currentAdmin) {
        mergedUsers.unshift(currentAdmin);
      }
      this.data.users = mergedUsers;
    }

    // Handle stock (support incoming.idsStock or incoming.stock)
    const incomingStock = Array.isArray(incoming.idsStock) ? incoming.idsStock : (Array.isArray(incoming.stock) ? incoming.stock : null);
    if (incomingStock) {
      this.data.idsStock = incomingStock.map((s: any) => ({
        id: s.id || `id_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        rawLine: s.rawLine || `${s.uid}:${s.password}`,
        uid: String(s.uid || '').trim(),
        password: String(s.password || '').trim(),
        cookie: s.cookie ? String(s.cookie).trim() : undefined,
        status: s.status === 'sold' ? 'sold' : 'available',
        soldToUserId: s.soldToUserId || undefined,
        soldToUsername: s.soldToUsername || undefined,
        soldAt: s.soldAt || undefined,
        orderId: s.orderId || undefined,
        createdAt: s.createdAt || new Date().toISOString()
      }));
    }

    // Handle purchases / orders (support incoming.purchases or incoming.orders)
    const incomingPurchases = Array.isArray(incoming.purchases) ? incoming.purchases : (Array.isArray(incoming.orders) ? incoming.orders : null);
    if (incomingPurchases) {
      this.data.purchases = incomingPurchases.map((p: any) => ({
        id: p.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: p.userId || '',
        username: p.username || 'Customer',
        quantity: Number(p.quantity) || 1,
        pricePerId: Number(p.pricePerId) || 12,
        totalPrice: Number(p.totalPrice) || 12,
        ids: Array.isArray(p.ids) ? p.ids : [],
        accounts: Array.isArray(p.accounts) ? p.accounts : [],
        purchasedAt: p.purchasedAt || new Date().toISOString()
      }));
    }

    // Handle deposits (support incoming.deposits)
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

    // Handle settings
    if (incoming.settings && typeof incoming.settings === 'object') {
      this.data.settings = {
        ...this.data.settings,
        ...incoming.settings,
        tutorialVideo: incoming.settings.tutorialVideo || this.data.settings.tutorialVideo || defaultSettings.tutorialVideo
      };
    }

    // Handle announcements
    if (Array.isArray(incoming.announcements)) {
      this.data.announcements = incoming.announcements;
    }

    this.sync();

    return {
      success: true,
      stats: {
        users: this.data.users.length,
        stock: this.data.idsStock.length,
        purchases: this.data.purchases.length,
        deposits: this.data.deposits.length,
        announcements: this.data.announcements.length
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
    // Force new user balance to 0
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

    this.data.settings = { ...this.data.settings, ...updates };
    
    // Sync admin record if admin username/password changed
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
      this.data.idsStock = incomingStock;
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

    this.sync();
    return true;
  }

  // Tutorial Video ("How to login with cookies")
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

  // IDs Stock (UID:Password)
  getStock(): FbIdStockItem[] {
    return this.data.idsStock;
  }

  getAvailableStockCount(): number {
    return this.data.idsStock.filter(i => i.status === 'available').length;
  }

  addSingleStockItem(uid: string, password: string, cookie?: string): FbIdStockItem {
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
      status: 'available',
      createdAt: new Date().toISOString()
    };

    this.data.idsStock.push(item);
    this.sync();
    return item;
  }

  addStockAccounts(accounts: Array<{ uid: string; password: string; cookie?: string }>): { addedCount: number; items: FbIdStockItem[] } {
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
        status: 'available',
        createdAt: new Date().toISOString()
      };

      newItems.push(item);
      this.data.idsStock.push(item);
    }

    this.sync();
    return { addedCount: newItems.length, items: newItems };
  }

  addStockLines(lines: string[]): { addedCount: number; items: FbIdStockItem[] } {
    const newItems: FbIdStockItem[] = [];

    for (const raw of lines) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      let uid = '';
      let password = '';
      let cookie: string | undefined = undefined;

      // 1. Dash-delimited format (e.g. UID----Password----Cookie or UID---Password---Cookie)
      if (trimmed.includes('----') || trimmed.includes('---')) {
        const sep = trimmed.includes('----') ? '----' : '---';
        const parts = trimmed.split(sep);
        uid = parts[0]?.trim() || '';
        password = parts[1]?.trim() || '';
        if (parts.length >= 3) {
          cookie = parts.slice(2).join(sep).trim() || undefined;
        }
      }
      // 2. Tab-delimited (Copied from Excel or Google Sheets)
      else if (trimmed.includes('\t')) {
        const parts = trimmed.split('\t');
        uid = parts[0]?.trim() || '';
        password = parts[1]?.trim() || '';
        if (parts.length >= 3) {
          cookie = parts.slice(2).join('\t').trim() || undefined;
        }
      }
      // 3. Pipe-delimited (UID|Password|Cookie)
      else if (trimmed.includes('|')) {
        const parts = trimmed.split('|');
        uid = parts[0]?.trim() || '';
        password = parts[1]?.trim() || '';
        if (parts.length >= 3) {
          cookie = parts.slice(2).join('|').trim() || undefined;
        }
      }
      // 4. Colon-delimited (UID:Password:Cookie)
      else if (trimmed.includes(':')) {
        const parts = trimmed.split(':');
        uid = parts[0]?.trim() || '';
        password = parts[1]?.trim() || '';
        if (parts.length >= 3) {
          cookie = parts.slice(2).join(':').trim() || undefined;
        }
      }
      // 5. Comma-delimited (CSV format: UID,Password,Cookie)
      else if (trimmed.includes(',')) {
        const parts = trimmed.split(',');
        uid = parts[0]?.trim() || '';
        password = parts[1]?.trim() || '';
        if (parts.length >= 3) {
          cookie = parts.slice(2).join(',').trim() || undefined;
        }
      } else {
        uid = trimmed;
        password = '';
      }

      if (uid) {
        const rawLine = cookie ? `${uid}:${password} [Cookie Included]` : trimmed;
        const item: FbIdStockItem = {
          id: `id_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          rawLine,
          uid,
          password,
          cookie,
          status: 'available',
          createdAt: new Date().toISOString()
        };
        newItems.push(item);
        this.data.idsStock.push(item);
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

  deleteSoldStockItems(): number {
    const initialCount = this.data.idsStock.length;
    this.data.idsStock = this.data.idsStock.filter(item => item.status !== 'sold');
    const removed = initialCount - this.data.idsStock.length;
    this.sync();
    return removed;
  }

  // Purchases
  purchaseStock(userId: string, username: string, quantity: number): { success: boolean; error?: string; order?: PurchaseOrder } {
    const available = this.data.idsStock.filter(i => i.status === 'available');
    if (available.length < quantity) {
      return { 
        success: false, 
        error: `Insufficient stock! Currently only ${available.length} accounts are available in stock.` 
      };
    }

    const user = this.getUserById(userId);
    if (!user) return { success: false, error: 'User not found' };

    const pricePerId = this.data.settings.pricePerId || 12;
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
      rawLine: `${i.uid}:${i.password}`
    }));

    const order: PurchaseOrder = {
      id: orderId,
      userId,
      username,
      quantity,
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

  // Transition deposit status (pending <-> approved <-> rejected) with wallet balance sync
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
      // Crediting balance when transitioning into approved
      updatedUser = this.updateUserBalance(deposit.userId, deposit.amount);
    } else if (previousStatus === 'approved' && (newStatus === 'rejected' || newStatus === 'pending')) {
      // Reverting previously credited balance
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

  // Announcements (Site Notices & Screen Alerts)
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

  // Marquee Top Banner / Black Patti Announcement
  getMarquee(): MarqueeAnnouncement {
    return this.data.settings.marqueeAnnouncement || {
      enabled: true,
      text: '⚡ Welcome to FBStore! Instant Facebook Accounts Delivery • 24/7 JazzCash & EasyPaisa Deposit • Guaranteed Fresh UIDs',
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

  // Welcome Message Configuration (New Registration Auto-Greeting)
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

  // Auto-generate welcome popup announcement for a newly registered user
  createWelcomeMessageForUser(user: User): Announcement | null {
    const config = this.getWelcomeMessageConfig();
    if (!config || !config.enabled) return null;

    const formattedTitle = (config.title || 'Welcome to FBStore, {username}! 🎉')
      .replace(/{username}/gi, user.username);
    const formattedMessage = (config.message || 'Assalam-o-Alaikum {username}! Welcome to FBStore. Your account is ready.')
      .replace(/{username}/gi, user.username);

    // Create a personalized welcome announcement with success visual style, showAsPopup = true, and frequency = 'once_only'
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

    // Also send an inbox notification record
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

  // Direct Admin Messages to Users
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

  // Merge/Sync Users from Firestore (Protects against data loss when server re-provisions)
  syncFirestoreUsers(remoteUsers: Array<Partial<User>>): User[] {
    let changed = false;
    for (const remote of remoteUsers) {
      if (!remote.email && !remote.id) continue;
      const existing = this.data.users.find(u => 
        (remote.id && u.id === remote.id) || 
        (remote.email && u.email.toLowerCase() === remote.email.toLowerCase())
      );
      if (existing) {
        // Update balance if remote is greater or has newer state
        if (typeof remote.walletBalance === 'number' && remote.walletBalance > existing.walletBalance) {
          existing.walletBalance = remote.walletBalance;
          changed = true;
        }
        if (remote.plainPassword && !existing.plainPassword) {
          existing.plainPassword = remote.plainPassword;
          changed = true;
        }
      } else {
        // Add user from Firestore!
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
