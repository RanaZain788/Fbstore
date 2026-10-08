import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { db, hashPassword, pendingRegistrations, PendingRegistration, passwordResetTokens } from './server/db';
import { User, DepositRequest } from './server/types';
import { sendOtpEmail, sendPasswordResetEmail, testSmtp, isSmtpConfigured } from './server/mailer';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'fbstore_persistent_token_signing_key_2026';
const tokenSessions = new Map<string, string>(); // token -> userId

function generateAuthToken(userId: string): string {
  const ts = Date.now();
  const payload = `${userId}:${ts}`;
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  const token = `fbt_${Buffer.from(payload).toString('base64url')}_${sig}`;
  tokenSessions.set(token, userId);
  return token;
}

function verifyAuthToken(token: string): string | undefined {
  if (!token) return undefined;
  if (tokenSessions.has(token)) {
    return tokenSessions.get(token);
  }
  if (token.startsWith('fbt_')) {
    const parts = token.slice(4).split('_');
    if (parts.length === 2) {
      const [payloadB64, sig] = parts;
      try {
        const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf-8');
        const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(payloadStr).digest('hex');
        if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
          const [userId] = payloadStr.split(':');
          if (userId) {
            tokenSessions.set(token, userId);
            return userId;
          }
        }
      } catch (err) {}
    }
  }
  return undefined;
}

// SSE Realtime stream
interface SSEClient {
  id: string;
  userId?: string;
  res: Response;
}
const sseClients: SSEClient[] = [];

function broadcastEvent(eventName: string, data: any, targetUserId?: string) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    if (!targetUserId || targetUserId === 'all' || client.userId === targetUserId || client.userId === 'admin') {
      try {
        client.res.write(payload);
      } catch (err) {
        sseClients.splice(i, 1);
      }
    }
  }
}

function getAuthUser(req: Request): User | undefined {
  const authHeader = req.headers.authorization;
  if (!authHeader) return undefined;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const userId = verifyAuthToken(token);
  if (!userId) return undefined;
  return db.getUserById(userId);
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  (req as any).user = user;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin privileges required.' });
  }
  (req as any).user = user;
  next();
}

// ---------------- API ROUTES ----------------

// SSE stream
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = crypto.randomUUID();
  const userId = (req.query.userId as string) || undefined;

  const client: SSEClient = { id: clientId, userId, res };
  sseClients.push(client);

  res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);

  req.on('close', () => {
    const idx = sseClients.findIndex(c => c.id === clientId);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// Step 1: Send Registration OTP to Email
app.post('/api/auth/send-otp', async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email and password are required.' });
  }

  const cleanUsername = String(username).trim();
  const cleanEmail = String(email).trim().toLowerCase();

  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  }
  if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const existing = db.getUsers().find(u => 
    u.username.toLowerCase() === cleanUsername.toLowerCase() || 
    u.email.toLowerCase() === cleanEmail
  );
  if (existing) {
    return res.status(400).json({ error: 'Username or email is already registered.' });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

  pendingRegistrations.set(cleanEmail, {
    username: cleanUsername,
    email: cleanEmail,
    passwordHash: hashPassword(String(password)),
    otp,
    expiresAt,
  });

  // Send real email with 6-digit OTP code
  let emailSent = false;
  try {
    const mailRes = await sendOtpEmail(cleanEmail, cleanUsername, otp);
    emailSent = mailRes.success && !mailRes.isDemo;
  } catch (err) {
    console.warn('Email dispatch notice:', err);
  }

  return res.json({
    success: true,
    message: emailSent
      ? `Verification code sent to ${cleanEmail}. Please check your inbox and spam folder.`
      : `Verification code generated. (SMTP not configured in Admin Settings yet).`,
    email: cleanEmail,
    emailSent,
    fallbackOtp: emailSent ? undefined : otp,
  });
});

// Step 2: Verify OTP & Create Account (Balance is strictly 0!)
app.post('/api/auth/verify-otp', (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP code are required.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const pending = pendingRegistrations.get(cleanEmail);

  if (!pending) {
    return res.status(400).json({ error: 'Registration session not found or expired. Please register again.' });
  }

  if (Date.now() > pending.expiresAt) {
    pendingRegistrations.delete(cleanEmail);
    return res.status(400).json({ error: 'Verification code expired. Please request a new code.' });
  }

  if (pending.otp !== String(otp).trim()) {
    return res.status(400).json({ error: 'Invalid verification code. Please check your email and re-enter.' });
  }

  const newUser: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    username: pending.username,
    email: pending.email,
    passwordHash: pending.passwordHash,
    role: 'user',
    walletBalance: 0, // Zero balance!
    createdAt: new Date().toISOString(),
  };

  db.createUser(newUser);
  pendingRegistrations.delete(cleanEmail);

  const token = generateAuthToken(newUser.id);

  const { passwordHash, ...safeUser } = newUser;
  return res.json({ success: true, user: safeUser, token });
});

// Step 3: Request Forgot Password OTP
app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  const { identifier } = req.body;
  if (!identifier) {
    return res.status(400).json({ error: 'Please enter your registered email or username.' });
  }

  const cleanIdentifier = String(identifier).trim().toLowerCase();
  const user = db.getUserByLogin(cleanIdentifier);

  if (!user) {
    return res.status(404).json({ error: 'No account found with this email or username.' });
  }

  // Generate 6-digit Reset OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

  passwordResetTokens.set(user.email.toLowerCase(), {
    username: user.username,
    email: user.email.toLowerCase(),
    otp,
    expiresAt,
  });

  // Dispatch real password reset email
  let emailSent = false;
  try {
    const mailRes = await sendPasswordResetEmail(user.email, user.username, otp);
    emailSent = mailRes.success && !mailRes.isDemo;
  } catch (err) {
    console.warn('Password reset email dispatch notice:', err);
  }

  // Mask email for privacy (e.g., h*****@gmail.com)
  const [localPart, domain] = user.email.split('@');
  const maskedLocal = localPart.length > 2 
    ? localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1]
    : localPart[0] + '*';
  const maskedEmail = `${maskedLocal}@${domain}`;

  return res.json({
    success: true,
    message: emailSent
      ? `Password reset code sent to ${maskedEmail}.`
      : `Password reset code generated. (SMTP not configured in Admin Settings yet).`,
    email: user.email,
    maskedEmail,
    emailSent,
    fallbackOtp: emailSent ? undefined : otp,
  });
});

// Step 4: Verify OTP & Reset Password
app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const resetToken = passwordResetTokens.get(cleanEmail);

  if (!resetToken) {
    return res.status(400).json({ error: 'Reset session not found or expired. Please request a new code.' });
  }

  if (Date.now() > resetToken.expiresAt) {
    passwordResetTokens.delete(cleanEmail);
    return res.status(400).json({ error: 'Reset code expired. Please request a new code.' });
  }

  if (resetToken.otp !== String(otp).trim()) {
    return res.status(400).json({ error: 'Invalid reset code. Please check your email and re-enter.' });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  const newHash = hashPassword(String(newPassword));
  const updated = db.updateUserPassword(cleanEmail, newHash);

  if (!updated) {
    return res.status(404).json({ error: 'Failed to update password. User not found.' });
  }

  passwordResetTokens.delete(cleanEmail);

  return res.json({
    success: true,
    message: 'Your password has been reset successfully! You can now log in with your new password.',
  });
});

// Direct Registration Endpoint (Syncs with Firebase Auth)
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { username, email, password, firebaseUid } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email and password are required.' });
  }

  const cleanUsername = String(username).trim();
  const cleanEmail = String(email).trim().toLowerCase();

  const existing = db.getUsers().find(u => 
    u.username.toLowerCase() === cleanUsername.toLowerCase() || 
    u.email.toLowerCase() === cleanEmail
  );
  if (existing) {
    if (existing.passwordHash === hashPassword(String(password))) {
      const token = `tok_${crypto.randomUUID()}`;
      tokenSessions.set(token, existing.id);
      const { passwordHash, ...safeUser } = existing;
      return res.json({ success: true, user: safeUser, token });
    }
    return res.status(400).json({ error: 'Username or email already in use.' });
  }

  const newUser: User = {
    id: firebaseUid || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    username: cleanUsername,
    email: cleanEmail,
    passwordHash: hashPassword(String(password)),
    role: 'user',
    walletBalance: 0, // Strict 0 balance for all new users
    createdAt: new Date().toISOString(),
  };

  db.createUser(newUser);
  const token = `tok_${crypto.randomUUID()}`;
  tokenSessions.set(token, newUser.id);

  const { passwordHash, ...safeUser } = newUser;
  return res.json({ success: true, user: safeUser, token });
});

// Restore or Sync User Authenticated via Firebase
app.post('/api/auth/sync-firebase-user', (req: Request, res: Response) => {
  const { id, username, email, walletBalance, password } = req.body;
  if (!id || !username || !email) {
    return res.status(400).json({ error: 'Missing required user sync fields.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanUsername = String(username).trim();

  let user = db.getUserById(id) || db.getUserByLogin(cleanEmail) || db.getUserByLogin(cleanUsername);
  if (!user) {
    user = {
      id,
      username: cleanUsername,
      email: cleanEmail,
      passwordHash: password ? hashPassword(String(password)) : hashPassword('fbstore_synced_user'),
      role: 'user',
      walletBalance: typeof walletBalance === 'number' ? Math.max(0, walletBalance) : 0,
      createdAt: new Date().toISOString()
    };
    db.createUser(user);
  } else {
    // Sync balance if Firestore holds updated balance
    if (typeof walletBalance === 'number' && walletBalance > user.walletBalance) {
      db.setUserBalance(user.id, walletBalance);
    }
    if (password) {
      db.updateUserPassword(user.id, hashPassword(String(password)));
    }
  }

  const token = `tok_${crypto.randomUUID()}`;
  tokenSessions.set(token, user.id);
  const { passwordHash, ...safeUser } = user;
  return res.json({ success: true, user: safeUser, token });
});

// Direct Login (Username OR Email + Password)
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ error: 'Username/Email and password are required.' });
  }

  const cleanLogin = String(login).trim();
  const cleanPass = String(password);

  const settings = db.getSettings();
  if (
    (cleanLogin.toLowerCase() === settings.adminUsername.toLowerCase() || cleanLogin === 'admin@fbstore.com') && 
    cleanPass === settings.adminPassword
  ) {
    let adminUser = db.getUsers().find(u => u.role === 'admin');
    if (!adminUser) {
      adminUser = {
        id: 'usr_admin',
        username: settings.adminUsername,
        email: 'admin@fbstore.com',
        passwordHash: hashPassword(settings.adminPassword),
        role: 'admin',
        walletBalance: 0,
        createdAt: new Date().toISOString()
      };
      db.createUser(adminUser);
    }
    const token = `tok_admin_${crypto.randomUUID()}`;
    tokenSessions.set(token, adminUser.id);
    const { passwordHash, ...safeUser } = adminUser;
    return res.json({ user: safeUser, token });
  }

  const user = db.getUserByLogin(cleanLogin);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username/email or password.' });
  }

  const expectedHash = hashPassword(cleanPass);
  if (user.passwordHash !== expectedHash) {
    return res.status(401).json({ error: 'Invalid username/email or password.' });
  }

  const token = generateAuthToken(user.id);

  const { passwordHash, ...safeUser } = user;
  return res.json({ user: safeUser, token });
});

// Admin Dedicated Login at /admin
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const settings = db.getSettings();

  if (
    String(username).trim() === settings.adminUsername &&
    String(password) === settings.adminPassword
  ) {
    let adminUser = db.getUsers().find(u => u.role === 'admin');
    if (!adminUser) {
      adminUser = {
        id: 'usr_admin',
        username: settings.adminUsername,
        email: 'admin@fbstore.com',
        passwordHash: hashPassword(settings.adminPassword),
        role: 'admin',
        walletBalance: 0,
        createdAt: new Date().toISOString()
      };
      db.createUser(adminUser);
    }
    const token = generateAuthToken(adminUser.id);
    const { passwordHash, ...safeUser } = adminUser;
    return res.json({ success: true, user: safeUser, token });
  }

  return res.status(401).json({ error: 'Invalid admin username or password.' });
});

// Restore session without logout on rebuild / publish
app.post('/api/auth/restore-session', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
  const verifiedId = token ? verifyAuthToken(token) : undefined;
  const { id, username, email, walletBalance, role } = req.body;

  const targetId = verifiedId || id;
  if (!targetId || !username) {
    return res.status(400).json({ error: 'User identifier and username required.' });
  }

  let user = db.getUserById(targetId);
  if (!user) {
    user = {
      id: targetId,
      username: String(username).trim(),
      email: String(email || `${username}@fbstore.com`).trim(),
      passwordHash: hashPassword(`restored_${targetId}`),
      role: role === 'admin' ? 'admin' : 'user',
      walletBalance: typeof walletBalance === 'number' ? Math.max(0, walletBalance) : 0,
      createdAt: new Date().toISOString()
    };
    db.createUser(user);
  }

  const validToken = generateAuthToken(user.id);
  const { passwordHash, ...safeUser } = user;
  return res.json({ success: true, user: safeUser, token: validToken });
});

// Current User Profile
app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { passwordHash, ...safeUser } = user;
  return res.json({ user: safeUser });
});

// Store Info: Product Price (PKR), Stock, JazzCash/EasyPaisa Details & WhatsApp
app.get('/api/store/info', (_req: Request, res: Response) => {
  const settings = db.getSettings();
  const availableCount = db.getAvailableStockCount();
  const title = settings.jazzcashTitle || settings.easypaisaTitle || settings.accountTitle || 'Muhammad Arslan';
  const number = settings.jazzcashNumber || settings.easypaisaNumber || settings.accountNumber || '03064887388';

  return res.json({
    siteName: settings.siteName,
    pricePerId: settings.pricePerId || 12,
    availableStockCount: availableCount,
    whatsappNumber: settings.whatsappNumber,
    easypaisaTitle: title,
    easypaisaNumber: number,
    jazzcashTitle: title,
    jazzcashNumber: number,
    accountTitle: title,
    accountNumber: number,
  });
});

// Buy Facebook Accounts by Quantity
app.post('/api/store/buy', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { quantity } = req.body;

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Please enter a valid quantity.' });
  }

  const result = db.purchaseStock(user.id, user.username, qty);
  if (!result.success || !result.order) {
    return res.status(400).json({ error: result.error || 'Purchase failed.' });
  }

  broadcastEvent('stock_updated', { availableCount: db.getAvailableStockCount() });
  broadcastEvent('wallet_updated', { userId: user.id, newBalance: user.walletBalance }, user.id);

  return res.json({
    success: true,
    order: result.order,
    remainingBalance: user.walletBalance,
  });
});

// User's Purchased Orders
app.get('/api/store/my-orders', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const orders = db.getUserPurchases(user.id);
  return res.json({ orders });
});

// Deposits: List
app.get('/api/deposits', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  let deposits = db.getDeposits();
  if (user.role !== 'admin') {
    deposits = deposits.filter(d => d.userId === user.id);
  }
  return res.json({ deposits });
});

// Deposits: Submit manual EasyPaisa deposit
app.post('/api/deposits', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const {
    amount,
    senderAccountName,
    senderAccountNumber,
    transactionId,
    screenshotUrl
  } = req.body;

  const parsedAmount = Number(amount);
  if (!amount || isNaN(parsedAmount) || parsedAmount < 100) {
    return res.status(400).json({ error: 'Minimum deposit amount is Rs. 100 PKR.' });
  }

  const tid = String(transactionId || `JC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`).trim();
  const duplicate = db.getDeposits().find(d => 
    d.transactionId && d.transactionId.toLowerCase() === tid.toLowerCase()
  );
  if (duplicate && transactionId) {
    return res.status(400).json({ error: 'This Transaction ID has already been submitted.' });
  }

  const deposit: DepositRequest = {
    id: `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    username: user.username,
    userEmail: user.email,
    amount: parsedAmount,
    senderAccountName: String(senderAccountName || user.username).trim(),
    senderAccountNumber: String(senderAccountNumber || '').trim(),
    transactionId: tid,
    screenshotUrl: String(screenshotUrl || 'Sent via WhatsApp'),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  db.createDeposit(deposit);
  broadcastEvent('deposit_created', { deposit }, 'all');

  return res.status(201).json({ success: true, deposit });
});

// Deposits: Set Status to any state: approved, rejected, or pending (Admin only)
app.put('/api/admin/deposits/:id/status', requireAdmin, (req: Request, res: Response) => {
  const adminUser = (req as any).user as User;
  const { status, reason } = req.body;
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be pending, approved, or rejected.' });
  }

  const { deposit, user } = db.setDepositStatus(req.params.id, status, reason, adminUser.username);
  if (!deposit) {
    return res.status(404).json({ error: 'Deposit request not found.' });
  }

  broadcastEvent('deposit_status_updated', { deposit, newBalance: user?.walletBalance, status }, 'all');
  if (status === 'approved' && user) {
    broadcastEvent('deposit_approved', { deposit, newBalance: user.walletBalance }, 'all');
    broadcastEvent('wallet_updated', { userId: user.id, newBalance: user.walletBalance }, 'all');
  } else if (status === 'rejected' && user) {
    broadcastEvent('deposit_rejected', { deposit, newBalance: user.walletBalance }, 'all');
    broadcastEvent('wallet_updated', { userId: user.id, newBalance: user.walletBalance }, 'all');
  } else if (status === 'pending' && user) {
    broadcastEvent('wallet_updated', { userId: user.id, newBalance: user.walletBalance }, 'all');
  }

  return res.json({ success: true, deposit, userBalance: user?.walletBalance });
});

// Deposits: Approve (Admin only)
app.put('/api/deposits/:id/approve', requireAdmin, (req: Request, res: Response) => {
  const adminUser = (req as any).user as User;
  const { deposit, user } = db.setDepositStatus(req.params.id, 'approved', undefined, adminUser.username);

  if (!deposit || !user) {
    return res.status(404).json({ error: 'Deposit request not found.' });
  }

  broadcastEvent('deposit_status_updated', { deposit, newBalance: user.walletBalance, status: 'approved' }, 'all');
  broadcastEvent('deposit_approved', { deposit, newBalance: user.walletBalance }, 'all');
  broadcastEvent('wallet_updated', { userId: user.id, newBalance: user.walletBalance }, 'all');

  return res.json({ success: true, deposit, userBalance: user.walletBalance });
});

// Deposits: Reject (Admin only)
app.put('/api/deposits/:id/reject', requireAdmin, (req: Request, res: Response) => {
  const adminUser = (req as any).user as User;
  const { reason } = req.body;
  const { deposit, user } = db.setDepositStatus(req.params.id, 'rejected', reason || 'Transaction could not be verified.', adminUser.username);

  if (!deposit) return res.status(404).json({ error: 'Deposit request not found.' });

  broadcastEvent('deposit_status_updated', { deposit, newBalance: user?.walletBalance, status: 'rejected' }, 'all');
  broadcastEvent('deposit_rejected', { deposit }, 'all');
  if (user) {
    broadcastEvent('wallet_updated', { userId: user.id, newBalance: user.walletBalance }, 'all');
  }
  return res.json({ success: true, deposit });
});

// ---------------- ADMIN ENDPOINTS ----------------

// Overview Stats
app.get('/api/admin/overview', requireAdmin, (_req: Request, res: Response) => {
  const settings = db.getSettings();
  const stock = db.getStock();
  const availableCount = stock.filter(i => i.status === 'available').length;
  const soldCount = stock.filter(i => i.status === 'sold').length;
  const pendingDepositsCount = db.getDeposits().filter(d => d.status === 'pending').length;
  const purchases = db.getAllPurchases();

  return res.json({
    availableStock: availableCount,
    soldStock: soldCount,
    totalStockCount: stock.length,
    pendingDepositsCount,
    totalPurchasesCount: purchases.length,
    pricePerId: settings.pricePerId,
    totalBalanceAddedLifetime: settings.totalBalanceAddedLifetime || 0,
    settings,
  });
});

// Reset Lifetime Added Balance Counter (Admin only)
app.post('/api/admin/balance-stats/reset', requireAdmin, (_req: Request, res: Response) => {
  db.resetTotalBalanceAdded();
  broadcastEvent('balance_stats_updated', { totalBalanceAddedLifetime: 0 }, 'admin');
  return res.json({ success: true, totalBalanceAddedLifetime: 0 });
});

// Stock List
app.get('/api/admin/stock', requireAdmin, (_req: Request, res: Response) => {
  return res.json({ stock: db.getStock() });
});

// Clear All Sold Stock Items (Admin only)
app.delete('/api/admin/stock/sold/clear', requireAdmin, (_req: Request, res: Response) => {
  const removed = db.deleteSoldStockItems();
  broadcastEvent('stock_updated', { availableCount: db.getAvailableStockCount() });
  return res.json({ success: true, removedCount: removed });
});

// Add Stock Lines (UID:Password)
app.post('/api/admin/stock', requireAdmin, (req: Request, res: Response) => {
  const { text, lines } = req.body;
  let linesArray: string[] = [];

  if (Array.isArray(lines)) {
    linesArray = lines;
  } else if (typeof text === 'string') {
    linesArray = text.split('\n');
  }

  if (linesArray.length === 0) {
    return res.status(400).json({ error: 'Please enter at least one UID:Password line.' });
  }

  const result = db.addStockLines(linesArray);
  broadcastEvent('stock_updated', { availableCount: db.getAvailableStockCount() });

  return res.status(201).json({
    success: true,
    addedCount: result.addedCount,
    newTotalAvailable: db.getAvailableStockCount(),
  });
});

// Delete Single Stock Item (Works for available or sold)
app.delete('/api/admin/stock/:id', requireAdmin, (req: Request, res: Response) => {
  const ok = db.deleteStockItem(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Stock item not found.' });
  broadcastEvent('stock_updated', { availableCount: db.getAvailableStockCount() });
  return res.json({ success: true });
});

// Update Settings (Price, Admin Credentials, JazzCash, EasyPaisa, WhatsApp, SMTP)
app.put('/api/admin/settings', requireAdmin, (req: Request, res: Response) => {
  const { 
    pricePerId, whatsappNumber, adminUsername, adminPassword, 
    easypaisaTitle, easypaisaNumber, 
    jazzcashTitle, jazzcashNumber,
    accountTitle, accountNumber,
    smtp, smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, smtpSecure 
  } = req.body;

  const updates: any = {};
  if (pricePerId !== undefined) updates.pricePerId = Number(pricePerId);
  if (whatsappNumber !== undefined) updates.whatsappNumber = String(whatsappNumber).trim();
  if (adminUsername) updates.adminUsername = String(adminUsername).trim();
  if (adminPassword) updates.adminPassword = String(adminPassword);

  const newTitle = jazzcashTitle ?? easypaisaTitle ?? accountTitle;
  if (newTitle !== undefined) {
    const trimmedTitle = String(newTitle).trim();
    updates.easypaisaTitle = trimmedTitle;
    updates.jazzcashTitle = trimmedTitle;
    updates.accountTitle = trimmedTitle;
  }

  const newNumber = jazzcashNumber ?? easypaisaNumber ?? accountNumber;
  if (newNumber !== undefined) {
    const trimmedNumber = String(newNumber).trim();
    updates.easypaisaNumber = trimmedNumber;
    updates.jazzcashNumber = trimmedNumber;
    updates.accountNumber = trimmedNumber;
  }

  // Handle both nested smtp object and flattened fields
  if (smtp && typeof smtp === 'object') {
    updates.smtp = {
      host: smtp.host || 'smtp.gmail.com',
      port: smtp.port ? Number(smtp.port) : 587,
      user: smtp.user ? String(smtp.user).trim() : '',
      pass: smtp.pass ? String(smtp.pass).trim() : '',
      from: smtp.from || smtp.user || '',
      secure: smtp.secure !== undefined ? Boolean(smtp.secure) : (Number(smtp.port) === 465),
    };
  } else if (smtpUser !== undefined || smtpPass !== undefined || smtpHost !== undefined) {
    const existingSmtp = db.getSettings().smtp || {};
    updates.smtp = {
      host: smtpHost || existingSmtp.host || 'smtp.gmail.com',
      port: smtpPort ? Number(smtpPort) : (existingSmtp.port || 587),
      user: smtpUser !== undefined ? String(smtpUser).trim() : (existingSmtp.user || ''),
      pass: smtpPass !== undefined ? String(smtpPass).trim() : (existingSmtp.pass || ''),
      from: smtpFrom || smtpUser || existingSmtp.from || '',
      secure: smtpSecure !== undefined ? Boolean(smtpSecure) : ((Number(smtpPort) || existingSmtp.port) === 465),
    };
  }

  const newSettings = db.updateSettings(updates);

  // Broadcast real-time updates so users and admin portals immediately sync without old defaults showing!
  broadcastEvent('settings_updated', { settings: newSettings }, 'all');
  if (updates.pricePerId !== undefined) {
    broadcastEvent('price_updated', { pricePerId: newSettings.pricePerId }, 'all');
  }

  return res.json({ success: true, settings: newSettings });
});

// Admin Test SMTP Email Route
app.post('/api/admin/test-email', requireAdmin, async (req: Request, res: Response) => {
  const { targetEmail, smtpConfig } = req.body;
  const result = await testSmtp(targetEmail, smtpConfig);
  if (result.success) {
    return res.json({ success: true, message: result.message });
  } else {
    return res.status(400).json({ error: result.error });
  }
});

// Admin Users List (for searching WhatsApp customers and direct balance management)
app.get('/api/admin/users', requireAdmin, (_req: Request, res: Response) => {
  const users = db.getUsersWithStats();
  return res.json({ users });
});

// Admin Direct Balance Adjustment
app.put('/api/admin/users/:id/balance', requireAdmin, (req: Request, res: Response) => {
  const userId = req.params.id;
  const { newBalance, addAmount, reason } = req.body;

  let targetUser = db.getUserById(userId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  let updatedUser: User | undefined;
  if (typeof newBalance === 'number') {
    updatedUser = db.setUserBalance(userId, newBalance);
  } else if (typeof addAmount === 'number') {
    updatedUser = db.updateUserBalance(userId, addAmount);
  } else {
    return res.status(400).json({ error: 'Please provide either newBalance or addAmount.' });
  }

  if (!updatedUser) {
    return res.status(500).json({ error: 'Failed to update balance.' });
  }

  // Real-time broadcast to user's screen
  broadcastEvent('wallet_updated', { userId: targetUser.id, newBalance: updatedUser.walletBalance }, targetUser.id);
  broadcastEvent('deposit_approved', { 
    deposit: { 
      userId: targetUser.id, 
      amount: typeof addAmount === 'number' ? addAmount : updatedUser.walletBalance 
    }, 
    newBalance: updatedUser.walletBalance 
  }, targetUser.id);

  const { passwordHash, ...safeUser } = updatedUser;
  return res.json({ success: true, user: safeUser, reason });
});

// Admin Change Any User's Password directly from Admin Panel
app.put('/api/admin/users/:id/password', requireAdmin, (req: Request, res: Response) => {
  const { newPassword } = req.body;
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const ok = db.updateUserPassword(req.params.id, hashPassword(String(newPassword)));
  if (!ok) return res.status(404).json({ error: 'User not found.' });

  return res.json({ success: true, message: 'User password updated successfully.' });
});

// Admin Delete User Account
app.delete('/api/admin/users/:id', requireAdmin, (req: Request, res: Response) => {
  const userId = req.params.id;
  const user = db.getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (user.role === 'admin') return res.status(400).json({ error: 'Cannot delete admin account.' });

  db.deleteUser(userId);

  for (const [t, uid] of tokenSessions.entries()) {
    if (uid === userId) tokenSessions.delete(t);
  }

  broadcastEvent('user_deleted', { userId }, 'all');
  return res.json({ success: true, message: 'User account deleted successfully.' });
});

// Admin Delete Deposit Request (Pending, Approved or Rejected)
app.delete('/api/admin/deposits/:id', requireAdmin, (req: Request, res: Response) => {
  const ok = db.deleteDeposit(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Deposit request not found.' });

  broadcastEvent('deposit_deleted', { depositId: req.params.id }, 'all');
  return res.json({ success: true, message: 'Deposit request deleted successfully.' });
});

// Admin Database Backup Export (Downloads current users, balances, stock, settings)
app.get('/api/admin/database/backup', requireAdmin, (_req: Request, res: Response) => {
  const snapshot = db.getDatabaseSnapshot();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="fbstore-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  return res.json(snapshot);
});

// Admin Database Restore Import (Restores all users, balances, stock, settings)
app.post('/api/admin/database/restore', requireAdmin, (req: Request, res: Response) => {
  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid backup file format.' });
  }

  const ok = db.restoreDatabaseSnapshot(data);
  if (!ok) {
    return res.status(500).json({ error: 'Failed to restore database.' });
  }

  broadcastEvent('stock_updated', { availableCount: db.getAvailableStockCount() });
  broadcastEvent('settings_updated', { settings: db.getSettings() }, 'all');

  return res.json({ 
    success: true, 
    message: 'Database restored successfully! All users, balances and stock have been recovered.',
    usersCount: (data.users || []).length,
    stockCount: (data.idsStock || []).length
  });
});

// User Self-Service Change Password (from Dashboard Profile)
app.put('/api/user/change-password', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required. Please sign in.' });

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Please enter both current password and new password.' });
  }

  if (user.passwordHash !== hashPassword(String(currentPassword))) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  db.updateUserPassword(user.id, hashPassword(String(newPassword)));
  return res.json({ success: true, message: 'Your password has been changed successfully!' });
});

// Notifications
app.get('/api/notifications', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const notifs = db.getNotifications(user ? user.id : 'all');
  return res.json({ notifications: notifs });
});

// ---------------- VITE / FRONTEND SERVING ----------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true, 
        hmr: process.env.DISABLE_HMR !== 'true' 
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FBStore Server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Server start error:', err);
});
