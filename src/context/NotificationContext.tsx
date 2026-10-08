import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { NotificationItem } from '../types';
import { useAuth } from './AuthContext';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export interface ToastAlert {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  toasts: ToastAlert[];
  pushEnabled: boolean;
  requestPushPermission: () => Promise<boolean>;
  showToast: (title: string, message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toasts, setToasts] = useState<ToastAlert[]>([]);
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });

  const requestPushPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('Notifications Not Supported', 'Your browser does not support Web Push Notifications.', 'warning');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setPushEnabled(granted);
      if (granted) {
        showToast('Push Notifications Enabled', 'You will now receive instant alerts for deposit approvals and purchases.', 'success');
        try {
          new Notification('FBStore Alerts Active', {
            body: 'You are now ready to receive instant order and deposit updates!',
            icon: '/favicon.ico',
          });
        } catch (e) {}
      } else {
        showToast('Permission Denied', 'Browser notification permission was not granted.', 'warning');
      }
      return granted;
    } catch (err) {
      console.error('Failed to request notification permission:', err);
      return false;
    }
  };

  const showToast = useCallback((title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastAlert = { id, title, message, type };

    setToasts(prev => [newToast, ...prev.slice(0, 3)]);

    // Push notification if permitted
    if (pushEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico',
        });
      } catch (e) {}
    }

    // Auto dismiss after 4.5s
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [pushEnabled]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {}
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
    } catch (e) {}
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (token) {
      try {
        await fetch('/api/notifications/read-all', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {}
    }
  };

  // SSE event listener for instant push notifications
  useEffect(() => {
    if (!user) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/events?userId=${user.id}`);

      eventSource.addEventListener('deposit_approved', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.deposit?.userId === user.id) {
            showToast('Deposit Approved', `Rs. ${Number(data.deposit.amount).toLocaleString()} PKR credited to your wallet.`, 'success');
            fetchNotifications();
          }
        } catch (err) {}
      });

      eventSource.addEventListener('deposit_rejected', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.deposit?.userId === user.id) {
            showToast('Deposit Rejected', data.deposit.rejectionReason || 'Please check your transaction details.', 'error');
            fetchNotifications();
          }
        } catch (err) {}
      });
    } catch (err) {}

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [user?.id, showToast, fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        pushEnabled,
        requestPushPermission,
        showToast,
        removeToast,
        markAsRead,
        markAllAsRead,
        fetchNotifications,
      }}
    >
      {children}

      {/* Modern floating toast notification container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-200 animate-slide-up ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                : toast.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/40 text-amber-200'
                : 'bg-slate-900/90 border-slate-700 text-slate-200'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
              {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400" />}
            </div>

            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold leading-tight">{toast.title}</h5>
              <p className="text-[11px] opacity-90 mt-0.5 leading-snug">{toast.message}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 opacity-70 hover:opacity-100 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
