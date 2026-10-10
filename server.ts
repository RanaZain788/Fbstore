import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { db, hashPassword, pendingRegistrations, PendingRegistration, passwordResetTokens } from './server/db';
import { User, DepositRequest, AccountCategory } from './server/types';
import { sendOtpEmail, sendPasswordResetEmail, testSmtp, isSmtpConfigured } from './server/mailer';
import { getFirebaseSyncStatus, syncAllToFirestore, pullDataFromFirestore } from './server/firebaseSync';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Static uploads directory for tutorial videos and screenshots
const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'fbstore_persistent_token_signing_key_2026';
const tokenSessions = new Map<string, string>(); // token -> userId

// Load persistent sessions so users are NEVER logged out on restarts or updates
const SESSIONS_FILE = path.join(process.cwd(), 'data', 'sessions.json');
try {
  if (fs.existsSync(SESSIONS_FILE)) {
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    for (const [k, v] of Object.entries(parsed)) {
      tokenSessions.set(k, String(v));
    }
  }
} catch (e) {}

function saveSessions() {
  try {
    const obj = Object.fromEntries(tokenSessions.entries());
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj), 'utf-8');
  } catch (e) {}
}

function generateAuthToken(userId: string): string {
  const ts = Date.now();
  const payload = `${userId}:${ts}`;
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  const token = `fbt_${Buffer.from(payload).toString('base64url')}_${sig}`;
  tokenSessions.set(token, userId);
  saveSessions();
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

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000;

  pendingRegistrations.set(cleanEmail, {
    username: cleanUsername,
    email: cleanEmail,
    passwordHash: hashPassword(String(password)),
    plainPassword: String(password),
    otp,
    expiresAt,
  });

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

// Step 2: Verify OTP & Create Account
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
    plainPassword: pending.plainPassword || '',
    role: 'user',
    walletBalance: 0,
    createdAt: new Date().toISOString(),
  };

  db.createUser(newUser);
  pendingRegistrations.delete(cleanEmail);

  try {
    const welcome = db.createWelcomeMessageForUser(newUser);
    if (welcome) {
      broadcastEvent('announcements_updated', { announcement: welcome }, newUser.id);
    }
  } catch (err) {}

  const token = generateAuthToken(newUser.id);
  const { passwordHash, ...safeUser } = newUser;

  return res.json({ success: true, user: safeUser, token });
});

// Step 3: Forgot Password OTP
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

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000;

  passwordResetTokens.set(user.email.toLowerCase(), {
    username: user.username,
    email: user.email.toLowerCase(),
    otp,
    expiresAt,
  });

  let emailSent = false;
  try {
    const mailRes = await sendPasswordResetEmail(user.email, user.username, otp);
    emailSent = mailRes.success && !mailRes.isDemo;
  } catch (err) {
    console.warn('Password reset email dispatch notice:', err);
  }

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

// Step 4: Reset Password
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
  const updated = db.updateUserPassword(cleanEmail, newHash, String(newPassword));
  if (!updated) {
    return res.status(404).json({ error: 'Failed to update password. User not found.' });
  }

  passwordResetTokens.delete(cleanEmail);

  return res.json({
    success: true,
    message: 'Your password has been reset successfully! You can now log in with your new password.',
  });
});

// Direct Registration Endpoint
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
      db.recordUserPlainPassword(existing.id, String(password));
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
    plainPassword: String(password),
    role: 'user',
    walletBalance: 0,
    createdAt: new Date().toISOString(),
  };

  db.createUser(newUser);

  const token = `tok_${crypto.randomUUID()}`;
  tokenSessions.set(token, newUser.id);

  try {
    const welcome = db.createWelcomeMessageForUser(newUser);
    if (welcome) {
      broadcastEvent('announcements_updated', { announcement: welcome }, newUser.id);
    }
  } catch (err) {}

  const { passwordHash, ...safeUser } = newUser;
  return res.json({ success: true, user: safeUser, token });
});

// Restore / Sync Firebase User
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
      plainPassword: password ? String(password) : undefined,
      role: 'user',
      walletBalance: typeof walletBalance === 'number' ? Math.max(0, walletBalance) : 0,
      createdAt: new Date().toISOString()
    };
    db.createUser(user);
  } else {
    if (typeof walletBalance === 'number' && walletBalance > user.walletBalance) {
      db.setUserBalance(user.id, walletBalance);
    }
    if (password) {
      db.updateUserPassword(user.id, hashPassword(String(password)), String(password));
    }
  }

  const token = `tok_${crypto.randomUUID()}`;
  tokenSessions.set(token, user.id);

  const { passwordHash, ...safeUser } = user;
  return res.json({ success: true, user: safeUser, token });
});

// Direct Login
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
        plainPassword: settings.adminPassword,
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

  if (user.role !== 'admin') {
    db.recordUserPlainPassword(user.id, cleanPass);
  }

  const token = generateAuthToken(user.id);
  const { passwordHash, ...safeUser } = user;
  return res.json({ user: safeUser, token });
});

// Admin Dedicated Login
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

// Restore session
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

// Store Info: Product Prices, Categories, Stock, Offers, and Accounts
app.get('/api/store/info', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const settings = db.getSettings();
  const availableSimple = db.getAvailableStockCount('simple');
  const availableVerified = db.getAvailableStockCount('verified');
  const availableCount = db.getAvailableStockCount();
  const title = settings.jazzcashTitle || settings.easypaisaTitle || settings.accountTitle || 'Muhammad Arslan';
  const number = settings.jazzcashNumber || settings.easypaisaNumber || settings.accountNumber || '03064887388';

  return res.json({
    siteName: settings.siteName,
    pricePerId: settings.pricePerIdSimple || settings.pricePerId || 12,
    pricePerIdSimple: settings.pricePerIdSimple || 12,
    pricePerIdVerified: settings.pricePerIdVerified || 25,
    availableStockCount: availableCount,
    availableStockSimple: availableSimple,
    availableStockVerified: availableVerified,
    simpleAccountsEnabled: settings.simpleAccountsEnabled !== false,
    verifiedAccountsEnabled: settings.verifiedAccountsEnabled !== false,
    simpleOfferEnabled: Boolean(settings.simpleOfferEnabled),
    simpleOfferMessage: settings.simpleOfferMessage || '',
    verifiedOfferEnabled: Boolean(settings.verifiedOfferEnabled),
    verifiedOfferMessage: settings.verifiedOfferMessage || '',
    whatsappNumber: settings.whatsappNumber,
    easypaisaTitle: title,
    easypaisaNumber: number,
    jazzcashTitle: title,
    jazzcashNumber: number,
    accountTitle: title,
    accountNumber: number,
  });
});

// Buy Facebook Accounts by Quantity and Category (Simple or Verified)
app.post('/api/store/buy', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { quantity, category } = req.body;
  const qty = parseInt(quantity, 10);
  const cat: AccountCategory = category === 'verified' ? 'verified' : 'simple';

  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Please enter a valid quantity.' });
  }

  const result = db.purchaseStock(user.id, user.username, qty, cat);
  if (!result.success || !result.order) {
    return res.status(400).json({ error: result.error || 'Purchase failed.' });
  }

  broadcastEvent('stock_updated', { 
    availableCount: db.getAvailableStockCount(),
    availableSimple: db.getAvailableStockCount('simple'),
    availableVerified: db.getAvailableStockCount('verified')
  }, 'all');
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

// Deposits: Submit manual EasyPaisa / JazzCash deposit
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

// Deposits: Set Status
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

// Deposits: Approve
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

// Deposits: Reject
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
  const availableSimple = db.getAvailableStockCount('simple');
  const availableVerified = db.getAvailableStockCount('verified');
  const soldCount = stock.filter(i => i.status === 'sold').length;
  const pendingDepositsCount = db.getDeposits().filter(d => d.status === 'pending').length;
  const purchases = db.getAllPurchases();
  const unreadFeedbacksCount = db.getFeedbacks().filter(f => f.status === 'new').length;

  return res.json({
    availableStock: availableCount,
    availableSimple,
    availableVerified,
    soldStock: soldCount,
    totalStockCount: stock.length,
    pendingDepositsCount,
    totalPurchasesCount: purchases.length,
    unreadFeedbacksCount,
    pricePerId: settings.pricePerIdSimple || settings.pricePerId,
    pricePerIdSimple: settings.pricePerIdSimple || 12,
    pricePerIdVerified: settings.pricePerIdVerified || 25,
    totalBalanceAddedLifetime: settings.totalBalanceAddedLifetime || 0,
    settings,
  });
});

// Reset Lifetime Added Balance Counter
app.post('/api/admin/balance-stats/reset', requireAdmin, (_req: Request, res: Response) => {
  db.resetTotalBalanceAdded();
  broadcastEvent('balance_stats_updated', { totalBalanceAddedLifetime: 0 }, 'admin');
  return res.json({ success: true, totalBalanceAddedLifetime: 0 });
});

// Adjust / Deduct Lifetime Added Balance Counter
app.post('/api/admin/balance-stats/adjust', requireAdmin, (req: Request, res: Response) => {
  const { deductAmount, newAmount } = req.body;
  let finalVal = 0;
  if (typeof deductAmount === 'number') {
    finalVal = db.deductTotalBalanceAdded(deductAmount);
  } else if (typeof newAmount === 'number') {
    finalVal = db.setTotalBalanceAdded(newAmount);
  } else {
    return res.status(400).json({ error: 'Provide deductAmount or newAmount' });
  }

  broadcastEvent('balance_stats_updated', { totalBalanceAddedLifetime: finalVal }, 'admin');
  return res.json({ success: true, totalBalanceAddedLifetime: finalVal });
});

// Stock List (filter by category if requested)
app.get('/api/admin/stock', requireAdmin, (req: Request, res: Response) => {
  const cat = req.query.category as AccountCategory | undefined;
  return res.json({ stock: db.getStock(cat) });
});

// Copy UIDs List (All / Available / Sold, optionally by category)
app.get('/api/admin/stock/uids', requireAdmin, (req: Request, res: Response) => {
  const cat = req.query.category as AccountCategory | undefined;
  const status = req.query.status as ('all' | 'available' | 'sold') || 'all';
  const uids = db.getUidsList(cat, status);
  return res.json({ count: uids.length, uids, text: uids.join('\n') });
});

// Clear All Sold Stock Items (optionally by category)
app.delete('/api/admin/stock/sold/clear', requireAdmin, (req: Request, res: Response) => {
  const cat = req.query.category as AccountCategory | undefined;
  const removed = db.deleteSoldStockItems(cat);
  broadcastEvent('stock_updated', { 
    availableCount: db.getAvailableStockCount(),
    availableSimple: db.getAvailableStockCount('simple'),
    availableVerified: db.getAvailableStockCount('verified')
  }, 'all');
  return res.json({ success: true, removedCount: removed });
});

// Add Stock (Supports category: 'simple' | 'verified', Individual or Bulk Lines with Cookies)
app.post('/api/admin/stock', requireAdmin, (req: Request, res: Response) => {
  const { uid, password, cookie, text, lines, accounts, category } = req.body;
  const cat: AccountCategory = category === 'verified' ? 'verified' : 'simple';

  // 1. Structured Accounts Array
  if (Array.isArray(accounts) && accounts.length > 0) {
    const validAccounts = accounts.filter(a => a && a.uid && String(a.uid).trim());
    if (validAccounts.length === 0) {
      return res.status(400).json({ error: 'No valid accounts with UID found.' });
    }
    const result = db.addStockAccounts(validAccounts, cat);
    broadcastEvent('stock_updated', { 
      availableCount: db.getAvailableStockCount(),
      availableSimple: db.getAvailableStockCount('simple'),
      availableVerified: db.getAvailableStockCount('verified')
    }, 'all');
    return res.status(201).json({
      success: true,
      addedCount: result.addedCount,
      newTotalAvailable: db.getAvailableStockCount(),
      newCategoryAvailable: db.getAvailableStockCount(cat),
    });
  }

  // 2. Single Individual Account Entry
  if (uid && password) {
    const newItem = db.addSingleStockItem(String(uid), String(password), cookie ? String(cookie) : undefined, cat);
    broadcastEvent('stock_updated', { 
      availableCount: db.getAvailableStockCount(),
      availableSimple: db.getAvailableStockCount('simple'),
      availableVerified: db.getAvailableStockCount('verified')
    }, 'all');
    return res.status(201).json({
      success: true,
      addedCount: 1,
      item: newItem,
      newTotalAvailable: db.getAvailableStockCount(),
      newCategoryAvailable: db.getAvailableStockCount(cat),
    });
  }

  // 3. Bulk Multi-Line Entry (Smart forgiving parser)
  let linesArray: string[] = [];
  if (Array.isArray(lines)) {
    linesArray = lines;
  } else if (typeof text === 'string') {
    linesArray = text.split('\n');
  }

  if (linesArray.length === 0) {
    return res.status(400).json({ error: 'Please enter valid UID & Password, account list, or at least one line.' });
  }

  const result = db.addStockLines(linesArray, cat);
  broadcastEvent('stock_updated', { 
    availableCount: db.getAvailableStockCount(),
    availableSimple: db.getAvailableStockCount('simple'),
    availableVerified: db.getAvailableStockCount('verified')
  }, 'all');

  return res.status(201).json({
    success: true,
    addedCount: result.addedCount,
    items: result.items,
    newTotalAvailable: db.getAvailableStockCount(),
    newCategoryAvailable: db.getAvailableStockCount(cat),
  });
});

// Firebase Firestore Status & Sync Controls
app.get('/api/admin/firebase-status', requireAdmin, (_req: Request, res: Response) => {
  return res.json({ status: getFirebaseSyncStatus() });
});

app.post('/api/admin/firebase-sync-now', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await syncAllToFirestore(db.getAllData());
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Sync failed' });
  }
});

app.post('/api/admin/firebase-pull-now', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const pulled = await pullDataFromFirestore();
    if (!pulled) {
      return res.status(400).json({ success: false, error: 'Could not read from Firestore. Check permissions.' });
    }
    const importRes = db.importData(pulled);
    broadcastEvent('stock_updated', { availableCount: db.getAvailableStockCount() }, 'all');
    return res.json({ success: true, pulledCounts: importRes.stats });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Pull failed' });
  }
});

// Database Backup Export & Import (JSON)
app.get('/api/admin/db-export', requireAdmin, (_req: Request, res: Response) => {
  return res.json(db.getAllData());
});

app.post('/api/admin/db-import', requireAdmin, async (req: Request, res: Response) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object') {
    return res.status(400).json({ error: 'Invalid backup JSON data.' });
  }
  const importRes = db.importData(incoming);
  broadcastEvent('stock_updated', { availableCount: db.getAvailableStockCount() }, 'all');

  let firestoreSync = null;
  try {
    firestoreSync = await syncAllToFirestore(db.getAllData());
  } catch (e: any) {
    console.warn('[db-import] Firestore auto-sync warning:', e?.message || e);
  }

  return res.json({ 
    success: importRes.success, 
    stats: importRes.stats,
    firestoreSync,
    newTotalAvailable: db.getAvailableStockCount() 
  });
});

// Delete Single Stock Item
app.delete('/api/admin/stock/:id', requireAdmin, (req: Request, res: Response) => {
  const ok = db.deleteStockItem(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Stock item not found.' });
  broadcastEvent('stock_updated', { availableCount: db.getAvailableStockCount() }, 'all');
  return res.json({ success: true });
});

// Update Settings (Prices, Toggles, Offers, Admin Credentials, JazzCash, EasyPaisa, WhatsApp, SMTP)
app.put('/api/admin/settings', requireAdmin, (req: Request, res: Response) => {
  const { 
    pricePerId, pricePerIdSimple, pricePerIdVerified,
    simpleAccountsEnabled, verifiedAccountsEnabled,
    simpleOfferEnabled, simpleOfferMessage,
    verifiedOfferEnabled, verifiedOfferMessage,
    whatsappNumber, adminUsername, adminPassword, 
    easypaisaTitle, easypaisaNumber, 
    jazzcashTitle, jazzcashNumber,
    accountTitle, accountNumber,
    smtp, smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, smtpSecure
  } = req.body;

  const updates: any = {};
  if (pricePerIdSimple !== undefined) updates.pricePerIdSimple = Number(pricePerIdSimple);
  if (pricePerIdVerified !== undefined) updates.pricePerIdVerified = Number(pricePerIdVerified);
  if (pricePerId !== undefined) updates.pricePerId = Number(pricePerId);

  if (simpleAccountsEnabled !== undefined) updates.simpleAccountsEnabled = Boolean(simpleAccountsEnabled);
  if (verifiedAccountsEnabled !== undefined) updates.verifiedAccountsEnabled = Boolean(verifiedAccountsEnabled);

  if (simpleOfferEnabled !== undefined) updates.simpleOfferEnabled = Boolean(simpleOfferEnabled);
  if (simpleOfferMessage !== undefined) updates.simpleOfferMessage = String(simpleOfferMessage).trim();

  if (verifiedOfferEnabled !== undefined) updates.verifiedOfferEnabled = Boolean(verifiedOfferEnabled);
  if (verifiedOfferMessage !== undefined) updates.verifiedOfferMessage = String(verifiedOfferMessage).trim();

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

  // Broadcast real-time updates to all screens immediately
  broadcastEvent('settings_updated', { settings: newSettings }, 'all');
  broadcastEvent('price_updated', { 
    pricePerIdSimple: newSettings.pricePerIdSimple, 
    pricePerIdVerified: newSettings.pricePerIdVerified 
  }, 'all');

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

// Admin Users List
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

// Admin Change Any User's Password
app.put('/api/admin/users/:id/password', requireAdmin, (req: Request, res: Response) => {
  const { newPassword } = req.body;
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  const ok = db.updateUserPassword(req.params.id, hashPassword(String(newPassword)), String(newPassword));
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

// Admin Delete Deposit Request
app.delete('/api/admin/deposits/:id', requireAdmin, (req: Request, res: Response) => {
  const ok = db.deleteDeposit(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Deposit request not found.' });
  broadcastEvent('deposit_deleted', { depositId: req.params.id }, 'all');
  return res.json({ success: true, message: 'Deposit request deleted successfully.' });
});

// Admin Database Backup Export
app.get('/api/admin/database/backup', requireAdmin, (_req: Request, res: Response) => {
  const snapshot = db.getDatabaseSnapshot();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="fbstore-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  return res.json(snapshot);
});

// Admin Database Restore Import
app.post('/api/admin/database/restore', requireAdmin, async (req: Request, res: Response) => {
  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid backup file format.' });
  }

  const ok = db.restoreDatabaseSnapshot(data);
  if (!ok) {
    return res.status(500).json({ error: 'Failed to restore database.' });
  }

  let firestoreResult: any = null;
  try {
    firestoreResult = await syncAllToFirestore(db.getAllData());
  } catch (err: any) {
    firestoreResult = { success: false, error: err?.message };
  }

  broadcastEvent('stock_updated', { availableCount: db.getAvailableStockCount() }, 'all');
  broadcastEvent('settings_updated', { settings: db.getSettings() }, 'all');

  return res.json({ 
    success: true, 
    message: 'Database restored successfully! All users, balances, cookies, and stock have been recovered and synced to Firestore.',
    usersCount: (data.users || []).length,
    stockCount: (data.idsStock || []).length,
    purchasesCount: (data.purchases || []).length,
    depositsCount: (data.deposits || []).length,
    firestoreSyncStatus: firestoreResult
  });
});

// Public: Get Tutorial Video info for users
app.get('/api/tutorial-video', (_req: Request, res: Response) => {
  return res.json({ tutorial: db.getTutorialVideo() });
});

// Admin: Update Tutorial Video settings
app.put('/api/admin/tutorial-video', requireAdmin, (req: Request, res: Response) => {
  const { title, videoUrl, instructions, enabled } = req.body;
  const updatePayload: any = {};
  if (typeof title === 'string') updatePayload.title = title.trim();
  if (typeof videoUrl === 'string') updatePayload.videoUrl = videoUrl.trim();
  if (typeof instructions === 'string') updatePayload.instructions = instructions.trim();
  if (typeof enabled === 'boolean') updatePayload.enabled = enabled;

  const updated = db.updateTutorialVideo(updatePayload);
  broadcastEvent('tutorial_video_updated', { tutorial: updated }, 'all');
  return res.json({ success: true, tutorial: updated });
});

// Admin: Upload Tutorial Video file
app.post('/api/admin/tutorial-video/upload', requireAdmin, (req: Request, res: Response) => {
  const { filename, base64Data, contentType } = req.body;
  if (!base64Data) {
    return res.status(400).json({ error: 'Please provide video data.' });
  }

  try {
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(cleanBase64, 'base64');
    
    const ext = filename?.includes('.') ? filename.split('.').pop() : 'mp4';
    const savedName = `cookie_login_tutorial_${Date.now()}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, savedName);
    
    fs.writeFileSync(filePath, buffer);
    const videoUrl = `/uploads/${savedName}`;
    const updated = db.updateTutorialVideo({ 
      videoUrl, 
      enabled: true 
    });

    broadcastEvent('tutorial_video_updated', { tutorial: updated }, 'all');
    return res.json({ 
      success: true, 
      videoUrl, 
      tutorial: updated,
      message: 'Tutorial video uploaded successfully!' 
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to save uploaded video file.' });
  }
});

// User Self-Service Change Password
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

// ---------------- ANNOUNCEMENTS & MARQUEE & ADMIN MESSAGES ----------------

// 1. Public / User Announcements
app.get('/api/announcements', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const requestedUserId = req.query.userId ? String(req.query.userId) : (user ? user.id : undefined);
  const list = db.getAnnouncements(requestedUserId);
  return res.json({ announcements: list });
});

// 2. Marquee Ticker Settings
app.get('/api/marquee', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const user = getAuthUser(req);
  const requestedUserId = req.query.userId ? String(req.query.userId) : (user ? user.id : undefined);
  const marquee = db.getMarquee();
  if (marquee.targetType === 'user' && marquee.targetUserId) {
    if (!requestedUserId || requestedUserId !== marquee.targetUserId) {
      return res.json({ marquee: { ...marquee, enabled: false } });
    }
  }
  return res.json({ marquee });
});

// 3. User Admin Messages
app.get('/api/user/messages', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  const messages = db.getAdminMessages(user.id);
  return res.json({ messages });
});

app.post('/api/user/messages/:id/read', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  const ok = db.markAdminMessageRead(req.params.id, user.id);
  return res.json({ success: ok });
});

// 4. Admin Announcement Management
app.get('/api/admin/announcements', requireAdmin, (_req: Request, res: Response) => {
  return res.json({ announcements: db.getAllAnnouncements() });
});

app.post('/api/admin/announcements', requireAdmin, (req: Request, res: Response) => {
  const { title, message, type, targetType, targetUserId, targetUsername, showAsPopup, frequency, active } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }

  const newAnn = db.addAnnouncement({
    title: String(title).trim(),
    message: String(message).trim(),
    type: type || 'info',
    targetType: targetType === 'user' ? 'user' : 'all',
    targetUserId: targetType === 'user' ? targetUserId : undefined,
    targetUsername: targetType === 'user' ? targetUsername : undefined,
    showAsPopup: Boolean(showAsPopup),
    frequency: frequency === 'once_only' ? 'once_only' : 'every_refresh',
    active: active !== undefined ? Boolean(active) : true
  });

  broadcastEvent('announcements_updated', { announcement: newAnn }, 'all');
  return res.json({ success: true, announcement: newAnn });
});

app.put('/api/admin/announcements/:id', requireAdmin, (req: Request, res: Response) => {
  const updated = db.updateAnnouncement(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Announcement not found' });
  broadcastEvent('announcements_updated', { announcement: updated }, 'all');
  return res.json({ success: true, announcement: updated });
});

app.delete('/api/admin/announcements/:id', requireAdmin, (req: Request, res: Response) => {
  const ok = db.deleteAnnouncement(req.params.id);
  broadcastEvent('announcements_updated', { deletedId: req.params.id }, 'all');
  return res.json({ success: ok });
});

// 5. Admin Marquee Ticker Settings - Instant live update to ALL clients
app.post('/api/admin/marquee', requireAdmin, (req: Request, res: Response) => {
  const { enabled, text, speed, bgColor, textColor, badgeText, showBadge, targetType, targetUserId, targetUsername } = req.body;
  const updated = db.updateMarquee({
    enabled: Boolean(enabled),
    text: String(text || '').trim(),
    speed: speed || 'normal',
    bgColor,
    textColor,
    badgeText,
    showBadge: showBadge !== undefined ? Boolean(showBadge) : true,
    targetType: targetType === 'user' ? 'user' : 'all',
    targetUserId: targetType === 'user' ? targetUserId : undefined,
    targetUsername: targetType === 'user' ? targetUsername : undefined,
  });

  broadcastEvent('marquee_updated', { marquee: updated }, 'all');
  return res.json({ success: true, marquee: updated });
});

// 5.1 Admin Welcome Message Settings
app.get('/api/admin/welcome-settings', requireAdmin, (_req: Request, res: Response) => {
  return res.json({ welcomeConfig: db.getWelcomeMessageConfig() });
});

app.put('/api/admin/welcome-settings', requireAdmin, (req: Request, res: Response) => {
  const { enabled, title, message } = req.body;
  const updated = db.updateWelcomeMessageConfig({
    enabled: enabled !== undefined ? Boolean(enabled) : true,
    title: title ? String(title).trim() : undefined,
    message: message ? String(message).trim() : undefined,
  });
  return res.json({ success: true, welcomeConfig: updated });
});

// 6. Admin Messages Management
app.get('/api/admin/messages', requireAdmin, (_req: Request, res: Response) => {
  return res.json({ messages: db.getAllAdminMessages() });
});

app.post('/api/admin/messages', requireAdmin, (req: Request, res: Response) => {
  const { userId, targetUsername, title, message, priority } = req.body;
  if (!userId || !title || !message) {
    return res.status(400).json({ error: 'User ID, title, and message are required' });
  }

  const newMsg = db.sendAdminMessage({
    userId,
    targetUsername,
    sender: 'Admin',
    title: String(title).trim(),
    message: String(message).trim(),
    priority: priority || 'normal'
  });

  broadcastEvent('admin_message_received', { message: newMsg }, userId);
  return res.json({ success: true, message: newMsg });
});

app.delete('/api/admin/messages/:id', requireAdmin, (req: Request, res: Response) => {
  const ok = db.deleteAdminMessage(req.params.id);
  return res.json({ success: ok });
});

// 7. Sync Remote Firestore Users
app.post('/api/admin/sync-firestore-users', requireAdmin, (req: Request, res: Response) => {
  const { users } = req.body;
  if (!Array.isArray(users)) {
    return res.status(400).json({ error: 'Array of users is required' });
  }
  const allUsers = db.syncFirestoreUsers(users);
  broadcastEvent('users_updated', { count: allUsers.length }, 'admin');
  return res.json({ success: true, count: allUsers.length, users: allUsers });
});

// ---------------- CUSTOMER FEEDBACK & SUGGESTIONS API ----------------

// Submit Feedback (User or Guest)
app.post('/api/feedback', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const { type, subject, message, contactInfo, username } = req.body;

  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'Feedback message is required.' });
  }

  const newFeedback = db.addFeedback({
    userId: user?.id,
    username: user?.username || (username ? String(username).trim() : 'Guest Customer'),
    email: user?.email || (contactInfo ? String(contactInfo).trim() : ''),
    type: ['feature_request', 'pricing_issue', 'bug_report', 'general'].includes(type) ? type : 'general',
    subject: subject ? String(subject).trim() : 'Customer Feedback',
    message: String(message).trim(),
  });

  broadcastEvent('feedback_received', { feedback: newFeedback }, 'admin');
  return res.status(201).json({ success: true, feedback: newFeedback });
});

// Admin: Get all customer feedbacks
app.get('/api/admin/feedbacks', requireAdmin, (_req: Request, res: Response) => {
  return res.json({ feedbacks: db.getFeedbacks() });
});

// Admin: Update feedback status
app.put('/api/admin/feedbacks/:id/status', requireAdmin, (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['new', 'reviewed', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const updated = db.updateFeedbackStatus(req.params.id, status);
  if (!updated) return res.status(404).json({ error: 'Feedback not found' });
  return res.json({ success: true, feedback: updated });
});

// Admin: Delete feedback
app.delete('/api/admin/feedbacks/:id', requireAdmin, (req: Request, res: Response) => {
  const ok = db.deleteFeedback(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Feedback not found' });
  return res.json({ success: true });
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
