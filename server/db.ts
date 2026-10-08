import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  User, 
  FbIdStockItem, 
  PurchaseOrder, 
  DepositRequest, 
  StoreSettings, 
  NotificationItem 
} from './types';

interface DatabaseSchema {
  users: User[];
  idsStock: FbIdStockItem[];
  purchases: PurchaseOrder[];
  deposits: DepositRequest[];
  settings: StoreSettings;
  notifications: NotificationItem[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

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
};

const initialData: DatabaseSchema = {
  users: [
    {
      id: 'usr_admin',
      username: 'arslan481',
      email: 'admin@fbstore.com',
      passwordHash: hashPassword('Zain786081@&#'),
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
  ]
};

export interface PendingRegistration {
  username: string;
  email: string;
  passwordHash: string;
  otp: string;
  expiresAt: number;
}
export const pendingRegistrations = new Map<string, PendingRegistration>();

export interface PasswordResetToken {
  username: string;
  email: string;
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
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        
        // Ensure all users have 0 balance if they had demo balance, and ensure admin credentials
        const cleanedUsers: User[] = (parsed.users || initialData.users).map((u: User) => ({
          ...u,
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
          },
          notifications: parsed.notifications || [],
        };
      }
    } catch (e) {
      console.error('Error reading db.json:', e);
    }
    this.saveData(initialData);
    return initialData;
  }

  private saveData(dataToSave: DatabaseSchema) {
    try {
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (e) {
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
      } catch (err) {}
    }
  }

  private sync() {
    this.saveData(this.data);
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

  updateUserPassword(identifier: string, newPasswordHash: string): boolean {
    const user = this.data.users.find(u => 
      u.id === identifier || 
      u.email.toLowerCase() === identifier.toLowerCase() || 
      u.username.toLowerCase() === identifier.toLowerCase()
    );
    if (!user) return false;
    user.passwordHash = newPasswordHash;
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

  restoreDatabaseSnapshot(incoming: Partial<DatabaseSchema>): boolean {
    if (!incoming || typeof incoming !== 'object') return false;

    if (Array.isArray(incoming.users)) {
      this.data.users = incoming.users;
    }
    if (Array.isArray(incoming.idsStock)) {
      this.data.idsStock = incoming.idsStock;
    }
    if (Array.isArray(incoming.purchases)) {
      this.data.purchases = incoming.purchases;
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

    this.sync();
    return true;
  }

  // IDs Stock (UID:Password)
  getStock(): FbIdStockItem[] {
    return this.data.idsStock;
  }

  getAvailableStockCount(): number {
    return this.data.idsStock.filter(i => i.status === 'available').length;
  }

  addStockLines(lines: string[]): { addedCount: number; items: FbIdStockItem[] } {
    const newItems: FbIdStockItem[] = [];

    for (const raw of lines) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      let uid = '';
      let password = '';
      if (trimmed.includes(':')) {
        const parts = trimmed.split(':');
        uid = parts[0]?.trim() || '';
        password = parts.slice(1).join(':').trim();
      } else if (trimmed.includes('|')) {
        const parts = trimmed.split('|');
        uid = parts[0]?.trim() || '';
        password = parts.slice(1).join('|').trim();
      } else {
        uid = trimmed;
        password = '';
      }

      if (uid) {
        const item: FbIdStockItem = {
          id: `id_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          rawLine: trimmed,
          uid,
          password,
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

    const order: PurchaseOrder = {
      id: orderId,
      userId,
      username,
      quantity,
      pricePerId,
      totalPrice,
      ids: selectedIds.map(i => i.rawLine),
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
}

export const db = new Database();
