export type Role = 'user' | 'admin';

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  walletBalance: number;
  createdAt: string;
  plainPassword?: string;
}

export type AccountCategory = 'simple' | 'verified';

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

export interface FbIdStockItem {
  id: string;
  rawLine: string;
  uid: string;
  password: string;
  cookie?: string;
  category?: AccountCategory; // 'simple' | 'verified'
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
  ids: string[];
  accounts?: PurchaseAccountItem[];
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
  pricePerId: number;
  pricePerIdSimple: number;
  pricePerIdVerified: number;
  simpleAccountsEnabled: boolean;
  verifiedAccountsEnabled: boolean;
  simpleOfferEnabled: boolean;
  simpleOfferMessage?: string;
  verifiedOfferEnabled: boolean;
  verifiedOfferMessage?: string;
  whatsappNumber: string;
  adminUsername: string;
  adminPassword: string;
  easypaisaTitle: string;
  easypaisaNumber: string;
  jazzcashTitle?: string;
  jazzcashNumber?: string;
  accountTitle?: string;
  accountNumber?: string;
  totalBalanceAddedLifetime?: number;
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
  videoUrl?: string;
  instructions?: string;
  updatedAt?: string;
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
