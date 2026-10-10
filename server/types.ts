export type Role = 'user' | 'admin';

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  plainPassword?: string;
  role: Role;
  walletBalance: number; // Always starts at 0 for every user!
  createdAt: string;
}

export type AccountCategory = 'simple' | 'verified';

export interface FbIdStockItem {
  id: string;
  rawLine: string; // "UID:Password" or "UID:Password:Cookie"
  uid: string;
  password: string;
  cookie?: string; // Optional session cookies / access tokens for the account
  category?: AccountCategory; // 'simple' (default) or 'verified'
  status: 'available' | 'sold';
  soldToUserId?: string;
  soldToUsername?: string;
  soldAt?: string;
  orderId?: string;
  createdAt: string;
}

export interface PurchaseAccountItem {
  uid: string;
  password: string;
  cookie?: string;
  category?: AccountCategory;
  rawLine?: string;
}

export interface PurchaseOrder {
  id: string;
  userId: string;
  username: string;
  quantity: number;
  category?: AccountCategory;
  pricePerId: number;
  totalPrice: number;
  ids: string[]; // List of "UID:Password"
  accounts?: PurchaseAccountItem[]; // Individual accounts with optional cookies
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
  pricePerId: number; // Backward compatibility (mirrors simple)
  pricePerIdSimple: number; // Default: 12 PKR
  pricePerIdVerified: number; // Default: 25 PKR
  simpleAccountsEnabled: boolean; // Toggle Simple accounts box in store
  verifiedAccountsEnabled: boolean; // Toggle Verified accounts box in store
  simpleOfferEnabled: boolean; // Toggle Offer effect on Simple accounts box
  simpleOfferMessage?: string; // Optional offer text e.g. "Weekend Special - 20% OFF"
  verifiedOfferEnabled: boolean; // Toggle Offer effect on Verified accounts box
  verifiedOfferMessage?: string; // Optional offer text e.g. "High Quality Blue Badge IDs on Sale"
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
  marqueeAnnouncement?: MarqueeAnnouncement;
  welcomeMessageConfig?: {
    enabled: boolean;
    title: string;
    message: string;
  };
  tutorialVideo?: TutorialVideoConfig;
}

export interface TutorialVideoConfig {
  enabled: boolean;
  title: string;
  videoUrl?: string; // Uploaded video or YouTube/stream link
  instructions?: string;
  updatedAt?: string;
}

export type AnnouncementType = 'info' | 'alert' | 'warning' | 'success' | 'urgent' | 'offer';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  targetType: 'all' | 'user';
  targetUserId?: string;
  targetUsername?: string;
  showAsPopup?: boolean;
  frequency?: 'every_refresh' | 'once_only';
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface MarqueeAnnouncement {
  enabled: boolean;
  text: string;
  speed: 'slow' | 'normal' | 'fast';
  bgColor?: string;
  textColor?: string;
  badgeText?: string;
  showBadge?: boolean;
  targetType?: 'all' | 'user';
  targetUserId?: string;
  targetUsername?: string;
}

export interface AdminMessage {
  id: string;
  userId: string; // target user ID or 'all'
  targetUsername?: string;
  sender: string;
  title: string;
  message: string;
  read: boolean;
  priority?: 'normal' | 'high' | 'urgent';
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export type FeedbackType = 'feature_request' | 'pricing_issue' | 'bug_report' | 'general';

export interface CustomerFeedback {
  id: string;
  userId?: string;
  username?: string;
  email?: string;
  type: FeedbackType;
  subject: string;
  message: string;
  status: 'new' | 'reviewed' | 'resolved';
  createdAt: string;
}
