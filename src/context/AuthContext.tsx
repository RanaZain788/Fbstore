import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { firebaseService } from '../services/firebaseService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (loginInput: string, passwordInput: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateBalanceLocally: (newBalance: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('fbstore_cached_user');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {}
      }
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('fbstore_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const saveUserLocally = (u: User | null) => {
    setUser(u);
    if (u) {
      localStorage.setItem('fbstore_cached_user', JSON.stringify(u));
    } else {
      localStorage.removeItem('fbstore_cached_user');
    }
  };

  const fetchMe = useCallback(async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        saveUserLocally(data.user);
      } else if (res.status === 401) {
        // Attempt auto-restore session from cache before kicking out
        const cachedStr = localStorage.getItem('fbstore_cached_user');
        if (cachedStr) {
          try {
            const cachedUser = JSON.parse(cachedStr);
            const restoreRes = await fetch('/api/auth/restore-session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`
              },
              body: JSON.stringify(cachedUser)
            });
            if (restoreRes.ok) {
              const rData = await restoreRes.json();
              saveUserLocally(rData.user);
              if (rData.token) {
                setToken(rData.token);
                localStorage.setItem('fbstore_auth_token', rData.token);
              }
              return;
            }
          } catch (rErr) {}
        }

        // Only clear if restore truly failed and not during reload
        localStorage.removeItem('fbstore_auth_token');
        localStorage.removeItem('fbstore_cached_user');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.warn('Network or server reload notice, keeping cached session active:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchMe(token);
    } else {
      setIsLoading(false);
    }
  }, [token, fetchMe]);

  // Real-time wallet balance sync via SSE
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      const targetParam = user?.id ? `?userId=${user.id}` : '';
      eventSource = new EventSource(`/api/events${targetParam}`);

      eventSource.addEventListener('wallet_updated', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (typeof d.newBalance === 'number') {
            setUser(prev => {
              if (!prev) return prev;
              const updated = { ...prev, walletBalance: d.newBalance };
              localStorage.setItem('fbstore_cached_user', JSON.stringify(updated));
              return updated;
            });
          }
        } catch (err) {}
      });
    } catch (e) {}

    return () => {
      eventSource?.close();
    };
  }, [user?.id]);

  const login = async (loginInput: string, passwordInput: string) => {
    try {
      // 1. Authenticate with backend API
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginInput, password: passwordInput }),
      });
      const data = await res.json();
      if (res.ok) {
        // Authenticated with backend API
        saveUserLocally(data.user);
        setToken(data.token);
        localStorage.setItem('fbstore_auth_token', data.token);

        // Sync with Firebase in background
        const targetEmail = data.user?.email || (loginInput.includes('@') ? loginInput : '');
        if (targetEmail) {
          firebaseService.loginUser(targetEmail, passwordInput).catch(() => {});
          firebaseService.syncUserToFirestore(data.user).catch(() => {});
        }

        return { success: true };
      }

      // 2. If backend login failed (e.g., fresh publish reset local json), check Firebase Auth fallback!
      const emailAttempt = loginInput.includes('@') ? loginInput : '';
      if (emailAttempt) {
        try {
          const fbRes = await firebaseService.loginUser(emailAttempt, passwordInput);
          if (fbRes.success && fbRes.user) {
            const syncRes = await fetch('/api/auth/sync-firebase-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: fbRes.user.id,
                username: fbRes.user.username,
                email: fbRes.user.email,
                walletBalance: fbRes.user.walletBalance,
                password: passwordInput,
              }),
            });
            if (syncRes.ok) {
              const syncData = await syncRes.json();
              saveUserLocally(syncData.user);
              setToken(syncData.token);
              localStorage.setItem('fbstore_auth_token', syncData.token);
              return { success: true };
            }
          }
        } catch (fbErr) {
          console.warn('Firebase restore notice:', fbErr);
        }
      }

      return { success: false, error: data.error || 'Login failed. Please check credentials.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error occurred during login.' };
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      // 1. Create real account in Firebase Authentication & Firestore
      const fbResult = await firebaseService.registerUser(username, email, password);
      if (!fbResult.success) {
        console.warn('Firebase registration notice:', fbResult.error);
      }

      // 2. Register / synchronize with server backend
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          email, 
          password, 
          firebaseUid: fbResult.user?.id 
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      // 3. Guarantee user is synced to Firestore
      if (data.user) {
        await firebaseService.syncUserToFirestore(data.user);
      }

      saveUserLocally(data.user);
      setToken(data.token);
      localStorage.setItem('fbstore_auth_token', data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error occurred during registration.' };
    }
  };

  const logout = () => {
    firebaseService.logoutUser().catch(() => {});
    localStorage.removeItem('fbstore_auth_token');
    localStorage.removeItem('fbstore_cached_user');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      await fetchMe(token);
    }
  };

  const updateBalanceLocally = (newBalance: number) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, walletBalance: Math.max(0, newBalance) };
      localStorage.setItem('fbstore_cached_user', JSON.stringify(updated));
      return updated;
    });
  };

  // Realtime balance listener: combines Firestore snapshot listener + SSE
  useEffect(() => {
    if (!user) return;

    // 1. Listen to Firestore
    const unsubFirestore = firebaseService.subscribeToUserBalance(user.id, (newBalance) => {
      updateBalanceLocally(newBalance);
    });

    // 2. Listen to Server SSE events
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/events?userId=${user.id}`);

      eventSource.addEventListener('wallet_updated', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.userId === user.id && typeof data.newBalance === 'number') {
            updateBalanceLocally(data.newBalance);
          }
        } catch (err) {}
      });

      eventSource.addEventListener('deposit_approved', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.deposit?.userId === user.id && typeof data.newBalance === 'number') {
            updateBalanceLocally(data.newBalance);
          }
        } catch (err) {}
      });
    } catch (err) {}

    return () => {
      unsubFirestore();
      if (eventSource) eventSource.close();
    };
  }, [user?.id]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        updateBalanceLocally,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
