import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc, 
  deleteDoc,
  collection, 
  addDoc, 
  onSnapshot,
  query,
  where,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, StoreSettings, FbIdStockItem, PurchaseOrder, Announcement, MarqueeAnnouncement, AdminMessage } from '../types';

export const firebaseService = {
  auth,
  db,

  // Register user in Firebase Authentication and Firestore
  async registerUser(username: string, email: string, pass: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // 1. Create in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
      const fbUser: FirebaseUser = userCredential.user;

      // 2. Set Firebase Profile Display Name
      await updateProfile(fbUser, { displayName: username.trim() }).catch(() => {});

      const newUser: User = {
        id: fbUser.uid,
        username: username.trim(),
        email: email.trim().toLowerCase(),
        role: 'user',
        walletBalance: 0, // Strictly 0 PKR for new users
        createdAt: new Date().toISOString()
      };

      // 3. Write user document to Firestore
      try {
        await setDoc(doc(db, 'users', fbUser.uid), {
          ...newUser,
          createdAt: serverTimestamp()
        });
      } catch (fsErr) {
        console.warn('Firestore user write notice:', fsErr);
      }

      return { success: true, user: newUser };
    } catch (err: any) {
      console.warn('Firebase Auth error during register:', err);
      // Attempt fallback Firestore document creation
      const fallbackId = `user_${username.trim()}_${Date.now().toString(36)}`;
      try {
        await setDoc(doc(db, 'users', fallbackId), {
          id: fallbackId,
          username: username.trim(),
          email: email.trim().toLowerCase(),
          role: 'user',
          walletBalance: 0,
          createdAt: serverTimestamp()
        });
      } catch (fErr) {
        console.warn('Firestore fallback user write notice:', fErr);
      }

      let errorMsg = err.message || 'Registration failed';
      if (err.code === 'auth/email-already-in-use') {
        errorMsg = 'This email is already registered in Firebase.';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'Invalid email address.';
      }
      return { success: false, error: errorMsg, user: { id: fallbackId, username: username.trim(), email: email.trim().toLowerCase(), role: 'user', walletBalance: 0, createdAt: new Date().toISOString() } };
    }
  },

  // Sync or Update user directly in Firestore
  async syncUserToFirestore(user: User) {
    try {
      await setDoc(doc(db, 'users', user.id), {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
        walletBalance: user.walletBalance || 0,
        createdAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore sync user notice:', err);
    }
  },

  // Delete User from Firestore
  async deleteUserFirestore(userId: string) {
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      console.warn('Firestore delete user notice:', err);
    }
  },

  // Delete Deposit from Firestore
  async deleteDepositFirestore(depositId: string) {
    try {
      await deleteDoc(doc(db, 'deposits', depositId));
    } catch (err) {
      console.warn('Firestore delete deposit notice:', err);
    }
  },

  // Login user with Firebase Authentication
  async loginUser(emailOrUsername: string, pass: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      let email = emailOrUsername.trim().toLowerCase();

      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const fbUser = userCredential.user;

      // Attempt to load Firestore data for balance
      let walletBalance = 0;
      let username = fbUser.displayName || email.split('@')[0];
      let role: 'user' | 'admin' = 'user';

      try {
        const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          walletBalance = Number(data.walletBalance) || 0;
          username = data.username || username;
          role = data.role || 'user';
        }
      } catch (fsErr) {
        console.warn('Could not read user doc from Firestore:', fsErr);
      }

      const userObj: User = {
        id: fbUser.uid,
        username,
        email: fbUser.email || email,
        role,
        walletBalance,
        createdAt: new Date().toISOString()
      };

      return { success: true, user: userObj };
    } catch (err: any) {
      console.warn('Firebase Auth notice during login:', err?.code || err?.message);
      let errorMsg = err.message || 'Login failed';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMsg = 'Invalid email/username or password.';
      }
      return { success: false, error: errorMsg };
    }
  },

  // Real-time Firestore listener for user balance
  subscribeToUserBalance(uid: string, onBalanceChange: (balance: number) => void): () => void {
    try {
      if (!uid || !auth.currentUser) {
        return () => {};
      }
      const unsub = onSnapshot(doc(db, 'users', uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (typeof data.walletBalance === 'number') {
            onBalanceChange(data.walletBalance);
          }
        }
      }, (err) => {
        // Silently catch permission-denied or network errors and rely on SSE/API sync
        console.warn('Firestore balance listener notice (using SSE/API sync):', err?.message || err);
      });
      return unsub;
    } catch (err) {
      return () => {};
    }
  },

  // Save deposit request to Firestore
  async recordDeposit(depositData: any) {
    try {
      await addDoc(collection(db, 'deposits'), {
        ...depositData,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('Firestore recordDeposit notice:', err);
    }
  },

  // Admin approves deposit in Firestore
  async approveDeposit(depositId: string, userId: string, amount: number) {
    try {
      await updateDoc(doc(db, 'deposits', depositId), {
        status: 'approved',
        processedAt: serverTimestamp()
      });
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentBal = Number(userSnap.data().walletBalance) || 0;
        await updateDoc(userRef, {
          walletBalance: currentBal + amount
        });
      }
    } catch (err) {
      console.warn('Firestore approveDeposit notice:', err);
    }
  },

  // Admin adjusts user balance directly in Firestore
  async setUserBalanceDirect(userId: string, newBalance: number) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        walletBalance: newBalance,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('Firestore setUserBalanceDirect notice:', err);
    }
  },

  // Save Store Settings to Firestore
  async saveSettings(settings: StoreSettings) {
    try {
      await setDoc(doc(db, 'settings', 'site'), {
        ...settings,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('Firestore saveSettings notice:', err);
    }
  },

  // Save Order to Firestore
  async recordOrder(order: PurchaseOrder) {
    try {
      await addDoc(collection(db, 'orders'), {
        ...order,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('Firestore recordOrder notice:', err);
    }
  },

  // Add Stock items to Firestore
  async addStockBatch(items: FbIdStockItem[]) {
    try {
      const batch = writeBatch(db);
      for (const item of items) {
        const ref = doc(db, 'stock', item.id);
        batch.set(ref, {
          ...item,
          createdAt: serverTimestamp()
        });
      }
      await batch.commit();
    } catch (err) {
      console.warn('Firestore addStockBatch notice:', err);
    }
  },

  // Sign out
  async logoutUser() {
    try {
      await signOut(auth);
    } catch (err) {}
  },

  // Firebase Real Email Password Reset
  async sendFirebasePasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      return { success: true };
    } catch (err: any) {
      console.warn('Firebase sendPasswordResetEmail error:', err);
      let msg = err.message || 'Firebase reset error';
      if (err.code === 'auth/user-not-found') {
        msg = 'No user registered with this email in Firebase.';
      }
      return { success: false, error: msg };
    }
  },

  // Firebase Real Email Verification
  async sendFirebaseEmailVerification(fbUser: FirebaseUser): Promise<{ success: boolean; error?: string }> {
    try {
      await sendEmailVerification(fbUser);
      return { success: true };
    } catch (err: any) {
      console.warn('Firebase sendEmailVerification error:', err);
      return { success: false, error: err.message };
    }
  },

  // Get all users from Firestore (Direct recovery for 8 registered users)
  async getUsersFirestore(): Promise<User[]> {
    try {
      if (!auth.currentUser) return [];
      const snap = await getDocs(collection(db, 'users'));
      const list: User[] = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          username: data.username || data.email?.split('@')[0] || 'User',
          email: data.email || '',
          role: data.role || 'user',
          walletBalance: Number(data.walletBalance) || 0,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString())
        });
      });
      return list;
    } catch (err) {
      console.warn('Firestore getUsersFirestore notice (using server API sync):', err);
      return [];
    }
  },

  // Subscribe to all users in Firestore
  subscribeToUsers(cb: (users: User[]) => void): () => void {
    try {
      if (!auth.currentUser) {
        return () => {};
      }
      return onSnapshot(collection(db, 'users'), (snap) => {
        const list: User[] = [];
        snap.forEach(d => {
          const data = d.data();
          list.push({
            id: d.id,
            username: data.username || data.email?.split('@')[0] || 'User',
            email: data.email || '',
            role: data.role || 'user',
            walletBalance: Number(data.walletBalance) || 0,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString())
          });
        });
        cb(list);
      }, (err) => {
        console.warn('Firestore subscribeToUsers notice (using server API sync):', err?.message || err);
      });
    } catch (err) {
      return () => {};
    }
  },

  // Announcements in Firestore
  async saveAnnouncement(ann: Announcement) {
    try {
      await setDoc(doc(db, 'announcements', ann.id), {
        ...ann,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore saveAnnouncement notice:', err);
    }
  },

  async deleteAnnouncement(annId: string) {
    try {
      await deleteDoc(doc(db, 'announcements', annId));
    } catch (err) {
      console.warn('Firestore deleteAnnouncement notice:', err);
    }
  },

  subscribeToAnnouncements(cb: (announcements: Announcement[]) => void): () => void {
    try {
      return onSnapshot(collection(db, 'announcements'), (snap) => {
        const list: Announcement[] = [];
        snap.forEach(d => {
          list.push({ ...d.data(), id: d.id } as Announcement);
        });
        cb(list);
      }, (err) => {
        // Safe error callback prevents uncaught exception
        console.warn('Firestore subscribeToAnnouncements notice (using server API/SSE sync):', err?.message || err);
      });
    } catch (err) {
      return () => {};
    }
  },

  // Marquee Banner in Firestore
  async saveMarquee(marquee: MarqueeAnnouncement) {
    try {
      await setDoc(doc(db, 'settings', 'marquee'), {
        ...marquee,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore saveMarquee notice:', err);
    }
  },

  subscribeToMarquee(cb: (marquee: MarqueeAnnouncement) => void): () => void {
    try {
      return onSnapshot(doc(db, 'settings', 'marquee'), (snap) => {
        if (snap.exists()) {
          cb(snap.data() as MarqueeAnnouncement);
        }
      }, (err) => {
        // Safe error callback prevents uncaught exception
        console.warn('Firestore subscribeToMarquee notice (using server API/SSE sync):', err?.message || err);
      });
    } catch (err) {
      return () => {};
    }
  },

  // Admin Direct Message to User
  async sendAdminMessage(msg: AdminMessage) {
    try {
      await setDoc(doc(db, 'adminMessages', msg.id), {
        ...msg,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('Firestore sendAdminMessage notice:', err);
    }
  },

  subscribeToUserMessages(userId: string, cb: (messages: AdminMessage[]) => void): () => void {
    try {
      if (!userId || !auth.currentUser) {
        return () => {};
      }
      const q = query(collection(db, 'adminMessages'), where('userId', 'in', [userId, 'all']));
      return onSnapshot(q, (snap) => {
        const list: AdminMessage[] = [];
        snap.forEach(d => {
          const data = d.data();
          list.push({
            id: d.id,
            userId: data.userId,
            targetUsername: data.targetUsername,
            sender: data.sender || 'Admin',
            title: data.title || '',
            message: data.message || '',
            read: Boolean(data.read),
            priority: data.priority || 'normal',
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString())
          });
        });
        cb(list);
      }, (err) => {
        // Safe error callback prevents uncaught exception
        console.warn('Firestore subscribeToUserMessages notice (using server API/SSE sync):', err?.message || err);
      });
    } catch (err) {
      return () => {};
    }
  },

  // Save entire Backup to all Firestore collections directly
  async syncFullBackupToFirestore(backupData: any): Promise<{ success: boolean; synced: { users: number; stock: number; orders: number; deposits: number; announcements: number }; error?: string }> {
    const stats = { users: 0, stock: 0, orders: 0, deposits: 0, announcements: 0 };
    try {
      if (!backupData || typeof backupData !== 'object') {
        return { success: false, synced: stats, error: 'Invalid backup object' };
      }

      // 1. Settings, Marquee & Tutorial
      if (backupData.settings) {
        try {
          await setDoc(doc(db, 'settings', 'site'), {
            ...backupData.settings,
            updatedAt: serverTimestamp()
          }, { merge: true });

          if (backupData.settings.marqueeAnnouncement) {
            await setDoc(doc(db, 'settings', 'marquee'), {
              ...backupData.settings.marqueeAnnouncement,
              updatedAt: serverTimestamp()
            }, { merge: true });
          }

          if (backupData.settings.tutorialVideo) {
            await setDoc(doc(db, 'settings', 'tutorial'), {
              ...backupData.settings.tutorialVideo,
              updatedAt: serverTimestamp()
            }, { merge: true });
          }
        } catch (e) {
          console.warn('Firestore settings sync notice:', e);
        }
      }

      // 2. Users Collection
      if (Array.isArray(backupData.users)) {
        for (const u of backupData.users) {
          try {
            await setDoc(doc(db, 'users', u.id), {
              id: u.id,
              username: u.username,
              email: u.email || '',
              role: u.role || 'user',
              walletBalance: typeof u.walletBalance === 'number' ? u.walletBalance : 0,
              createdAt: u.createdAt || new Date().toISOString(),
              updatedAt: serverTimestamp()
            }, { merge: true });
            stats.users++;
          } catch (e) {
            console.warn('User write error:', e);
          }
        }
      }

      // 3. Stock / Accounts Collection
      const stockList = Array.isArray(backupData.idsStock) ? backupData.idsStock : (Array.isArray(backupData.stock) ? backupData.stock : []);
      for (const item of stockList) {
        try {
          await setDoc(doc(db, 'stock', item.id), {
            id: item.id,
            rawLine: item.rawLine || `${item.uid}:${item.password}`,
            uid: item.uid || '',
            password: item.password || '',
            cookie: item.cookie || '',
            status: item.status || 'available',
            soldToUserId: item.soldToUserId || null,
            soldToUsername: item.soldToUsername || null,
            soldAt: item.soldAt || null,
            orderId: item.orderId || null,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: serverTimestamp()
          }, { merge: true });
          stats.stock++;
        } catch (e) {
          console.warn('Stock write error:', e);
        }
      }

      // 4. Orders / Purchases Collection
      const ordersList = Array.isArray(backupData.purchases) ? backupData.purchases : (Array.isArray(backupData.orders) ? backupData.orders : []);
      for (const ord of ordersList) {
        try {
          await setDoc(doc(db, 'orders', ord.id), {
            id: ord.id,
            userId: ord.userId || '',
            username: ord.username || '',
            quantity: ord.quantity || 1,
            pricePerId: ord.pricePerId || 12,
            totalPrice: ord.totalPrice || 12,
            ids: ord.ids || [],
            accounts: ord.accounts || [],
            purchasedAt: ord.purchasedAt || new Date().toISOString(),
            updatedAt: serverTimestamp()
          }, { merge: true });
          stats.orders++;
        } catch (e) {
          console.warn('Order write error:', e);
        }
      }

      // 5. Deposits Collection
      if (Array.isArray(backupData.deposits)) {
        for (const dep of backupData.deposits) {
          try {
            await setDoc(doc(db, 'deposits', dep.id), {
              ...dep,
              updatedAt: serverTimestamp()
            }, { merge: true });
            stats.deposits++;
          } catch (e) {
            console.warn('Deposit write error:', e);
          }
        }
      }

      // 6. Announcements Collection
      if (Array.isArray(backupData.announcements)) {
        for (const ann of backupData.announcements) {
          try {
            await setDoc(doc(db, 'announcements', ann.id), {
              ...ann,
              updatedAt: serverTimestamp()
            }, { merge: true });
            stats.announcements++;
          } catch (e) {
            console.warn('Announcement write error:', e);
          }
        }
      }

      return { success: true, synced: stats };
    } catch (err: any) {
      console.warn('syncFullBackupToFirestore error:', err);
      return { success: false, synced: stats, error: err?.message || 'Sync failed' };
    }
  }
};
