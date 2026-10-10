import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDocs, 
  collection, 
  serverTimestamp 
} from 'firebase/firestore';
import { DatabaseSchema } from './db';

const firebaseConfig = {
  apiKey: "AIzaSyB2hlLW9ieElLtbyksy52Nlw2ook1Heeno",
  authDomain: "fbstore-bf1e3.firebaseapp.com",
  projectId: "fbstore-bf1e3",
  storageBucket: "fbstore-bf1e3.firebasestorage.app",
  messagingSenderId: "994980888815",
  appId: "1:994980888815:web:e416f85886797a73a9db1a",
  measurementId: "G-1WX19HMLDX"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const firestoreDb = getFirestore(app);

export interface FirebaseSyncStatus {
  lastSyncTime: string | null;
  status: 'idle' | 'syncing' | 'synced' | 'rules_locked' | 'error';
  errorMessage?: string;
  counts: {
    users: number;
    stock: number;
    orders: number;
    deposits: number;
    announcements: number;
  };
}

let syncStatus: FirebaseSyncStatus = {
  lastSyncTime: null,
  status: 'idle',
  counts: { users: 0, stock: 0, orders: 0, deposits: 0, announcements: 0 }
};

export function getFirebaseSyncStatus(): FirebaseSyncStatus {
  return syncStatus;
}

/**
 * Sync entire local data snapshot to Firestore
 */
export async function syncAllToFirestore(data: DatabaseSchema): Promise<{ success: boolean; error?: string; status: FirebaseSyncStatus }> {
  syncStatus.status = 'syncing';
  try {
    let syncedUsers = 0;
    let syncedStock = 0;
    let syncedOrders = 0;
    let syncedDeposits = 0;
    let syncedAnnouncements = 0;

    // 1. Sync Settings
    try {
      await setDoc(doc(firestoreDb, 'settings', 'site'), {
        ...data.settings,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        syncStatus.status = 'rules_locked';
        syncStatus.errorMessage = 'Firestore Security Rules are locked or expired in Firebase Console.';
        return { success: false, error: syncStatus.errorMessage, status: syncStatus };
      }
      throw e;
    }

    // 2. Sync Marquee
    if (data.settings?.marqueeAnnouncement) {
      await setDoc(doc(firestoreDb, 'settings', 'marquee'), {
        ...data.settings.marqueeAnnouncement,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    // 2b. Sync Tutorial Video
    if (data.settings?.tutorialVideo) {
      await setDoc(doc(firestoreDb, 'settings', 'tutorial'), {
        ...data.settings.tutorialVideo,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    // 3. Sync Users
    for (const user of data.users) {
      await setDoc(doc(firestoreDb, 'users', user.id), {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        walletBalance: user.walletBalance,
        createdAt: user.createdAt,
        updatedAt: serverTimestamp()
      }, { merge: true });
      syncedUsers++;
    }

    // 4. Sync Stock Items (including cookie if present)
    for (const item of data.idsStock) {
      await setDoc(doc(firestoreDb, 'stock', item.id), {
        id: item.id,
        rawLine: item.rawLine,
        uid: item.uid,
        password: item.password,
        cookie: item.cookie || '',
        status: item.status,
        soldToUserId: item.soldToUserId || null,
        soldToUsername: item.soldToUsername || null,
        soldAt: item.soldAt || null,
        orderId: item.orderId || null,
        createdAt: item.createdAt,
        updatedAt: serverTimestamp()
      }, { merge: true });
      syncedStock++;
    }

    // 5. Sync Purchases / Orders
    for (const order of data.purchases) {
      await setDoc(doc(firestoreDb, 'orders', order.id), {
        id: order.id,
        userId: order.userId,
        username: order.username,
        quantity: order.quantity,
        pricePerId: order.pricePerId,
        totalPrice: order.totalPrice,
        ids: order.ids,
        accounts: order.accounts || [],
        purchasedAt: order.purchasedAt,
        updatedAt: serverTimestamp()
      }, { merge: true });
      syncedOrders++;
    }

    // 6. Sync Deposits
    for (const dep of data.deposits) {
      await setDoc(doc(firestoreDb, 'deposits', dep.id), {
        ...dep,
        updatedAt: serverTimestamp()
      }, { merge: true });
      syncedDeposits++;
    }

    // 7. Sync Announcements
    for (const ann of data.announcements) {
      await setDoc(doc(firestoreDb, 'announcements', ann.id), {
        ...ann,
        updatedAt: serverTimestamp()
      }, { merge: true });
      syncedAnnouncements++;
    }

    syncStatus = {
      lastSyncTime: new Date().toISOString(),
      status: 'synced',
      counts: {
        users: syncedUsers,
        stock: syncedStock,
        orders: syncedOrders,
        deposits: syncedDeposits,
        announcements: syncedAnnouncements
      }
    };

    return { success: true, status: syncStatus };
  } catch (err: any) {
    console.warn('[FirebaseSync] Error syncing to Firestore:', err?.message || err);
    const isPerm = err?.code === 'permission-denied' || String(err).includes('permission-denied');
    syncStatus = {
      ...syncStatus,
      status: isPerm ? 'rules_locked' : 'error',
      errorMessage: isPerm 
        ? 'Firebase Firestore Rules are locked or expired. Update rules to "allow read, write: if true;" in Firebase Console.'
        : (err?.message || 'Firestore sync failed')
    };
    return { success: false, error: syncStatus.errorMessage, status: syncStatus };
  }
}

/**
 * Attempt to restore data from Firestore into local memory/database
 */
export async function pullDataFromFirestore(): Promise<Partial<DatabaseSchema> | null> {
  try {
    const pulled: Partial<DatabaseSchema> = {};

    // Pull Users
    const usersSnap = await getDocs(collection(firestoreDb, 'users'));
    if (!usersSnap.empty) {
      const users: any[] = [];
      usersSnap.forEach(d => {
        const u = d.data();
        users.push({
          id: d.id,
          username: u.username || 'User',
          email: u.email || '',
          role: u.role || 'user',
          walletBalance: Number(u.walletBalance) || 0,
          createdAt: u.createdAt?.toDate ? u.createdAt.toDate().toISOString() : (u.createdAt || new Date().toISOString())
        });
      });
      pulled.users = users;
    }

    // Pull Stock
    const stockSnap = await getDocs(collection(firestoreDb, 'stock'));
    if (!stockSnap.empty) {
      const stock: any[] = [];
      stockSnap.forEach(d => {
        const s = d.data();
        stock.push({
          id: d.id,
          rawLine: s.rawLine || `${s.uid}:${s.password}`,
          uid: s.uid || '',
          password: s.password || '',
          cookie: s.cookie || undefined,
          status: s.status || 'available',
          soldToUserId: s.soldToUserId || undefined,
          soldToUsername: s.soldToUsername || undefined,
          soldAt: s.soldAt || undefined,
          orderId: s.orderId || undefined,
          createdAt: s.createdAt?.toDate ? s.createdAt.toDate().toISOString() : (s.createdAt || new Date().toISOString())
        });
      });
      pulled.idsStock = stock;
    }

    // Pull Orders
    const ordersSnap = await getDocs(collection(firestoreDb, 'orders'));
    if (!ordersSnap.empty) {
      const orders: any[] = [];
      ordersSnap.forEach(d => {
        const o = d.data();
        orders.push({
          id: d.id,
          userId: o.userId,
          username: o.username,
          quantity: Number(o.quantity) || 1,
          pricePerId: Number(o.pricePerId) || 12,
          totalPrice: Number(o.totalPrice) || 12,
          ids: Array.isArray(o.ids) ? o.ids : [],
          accounts: Array.isArray(o.accounts) ? o.accounts : [],
          purchasedAt: o.purchasedAt?.toDate ? o.purchasedAt.toDate().toISOString() : (o.purchasedAt || new Date().toISOString())
        });
      });
      pulled.purchases = orders;
    }

    // Pull Deposits
    const depositsSnap = await getDocs(collection(firestoreDb, 'deposits'));
    if (!depositsSnap.empty) {
      const deposits: any[] = [];
      depositsSnap.forEach(d => {
        deposits.push({ id: d.id, ...d.data() });
      });
      pulled.deposits = deposits as any[];
    }

    return pulled;
  } catch (err: any) {
    console.warn('[FirebaseSync] Could not pull from Firestore:', err?.message || err);
    return null;
  }
}
