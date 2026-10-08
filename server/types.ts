export type Role = 'user' | 'admin';

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: Role;
  walletBalance: number; // Always starts at 0 for every user!
  createdAt: string;
}

export interface FbIdStockItem {
  id: string;
  rawLine: string; // "UID:Password"
  uid: string;
  password: string;
  status: 'available' | 'sold';
  soldToUserId?: string;
  soldToUsername?: string;
  soldAt?: string;
  orderId?: string;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  userId: string;
  username: string;
  quantity: number;
  pricePerId: number;
  totalPrice: number;
  ids: string[]; // List of "UID:Password"
  purchasedAt: string;
}

export type DepositStatus = 'pending' | 'approved' | 'rejected';

export interface DepositRequest {
  id: string;
  userId: string;
  username: string;
  userEmail: string;
  amount: number;
  senderAccountName: string;
  senderAccountNumber: string;
  transactionId: string;
  screenshotUrl: string;
  status: DepositStatus;
  rejectionReason?: string;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
}

export interface SmtpConfig {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
  secure?: boolean;
}

export interface StoreSettings {
  siteName: string;
  pricePerId: number; // Default: 12 PKR
  whatsappNumber: string;
  adminUsername: string; // Default: arslan481
  adminPassword: string; // Default: Zain786081@&#
  easypaisaTitle: string;
  easypaisaNumber: string;
  jazzcashTitle?: string;
  jazzcashNumber?: string;
  accountTitle?: string;
  accountNumber?: string;
  totalBalanceAddedLifetime?: number; // Total amount of balance added to users
  smtp?: SmtpConfig;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
