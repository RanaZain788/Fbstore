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
import { User, StoreSettings, FbIdStockItem, PurchaseOrder } from '../types';

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
      const unsub = onSnapshot(doc(db, 'users', uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (typeof data.walletBalance === 'number') {
            onBalanceChange(data.walletBalance);
          }
        }
      }, (err) => {
        console.warn('Firestore balance listener error (will use SSE/API sync):', err);
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
  }
};
