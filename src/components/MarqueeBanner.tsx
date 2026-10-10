import React, { useState, useEffect } from 'react';
import { Megaphone, X, Sparkles } from 'lucide-react';
import { MarqueeAnnouncement } from '../types';
import { firebaseService } from '../services/firebaseService';
import { useAuth } from '../context/AuthContext';

export const MarqueeBanner: React.FC = () => {
  const { user } = useAuth();
  const [marquee, setMarquee] = useState<MarqueeAnnouncement>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('fbstore_cached_marquee');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {}
      }
    }
    return {
      enabled: true,
      text: '🚀 Welcome to FBStore! Instant Facebook Accounts Delivery | 24/7 JazzCash & EasyPaisa Deposit | Guaranteed Fresh UIDs',
      speed: 'normal',
      showBadge: true,
      targetType: 'all',
    };
  });
  const [isDismissed, setIsDismissed] = useState(false);

  // 1. Initial & Polling Fetch (Guarantees fresh marquee even if SSE has slight delay)
  const fetchMarquee = async () => {
    try {
      const base = user?.id ? `/api/marquee?userId=${encodeURIComponent(user.id)}` : '/api/marquee';
      const sep = base.includes('?') ? '&' : '?';
      const url = `${base}${sep}_t=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.marquee) {
          setMarquee(data.marquee);
          localStorage.setItem('fbstore_cached_marquee', JSON.stringify(data.marquee));
        }
      }
    } catch (e) {
      // Fallback
    }
  };

  useEffect(() => {
    fetchMarquee();
    // 2.5-second background polling with cache-busting ensures instant sync without page reload
    const timer = setInterval(fetchMarquee, 2500);
    return () => clearInterval(timer);
  }, [user?.id]);

  // 2. Real-time Listeners (BroadcastChannel + SSE + Firestore + Window Events + Storage)
  useEffect(() => {
    // a. Custom local window event (when updated in the same window/admin)
    const handleLocalUpdate = (e: any) => {
      if (e.detail) {
        setMarquee(e.detail);
        setIsDismissed(false);
      }
    };
    window.addEventListener('fbstore_marquee_updated', handleLocalUpdate);

    // b. BroadcastChannel (for instant cross-tab / cross-window sync with 0 delay)
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('fbstore_realtime_channel');
      channel.onmessage = (event) => {
        if (event.data?.type === 'marquee_updated' && event.data.marquee) {
          setMarquee(event.data.marquee);
          localStorage.setItem('fbstore_cached_marquee', JSON.stringify(event.data.marquee));
          setIsDismissed(false);
        }
      };
    } catch (e) {}

    // c. Storage event (for multi-tab real-time sync)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'fbstore_cached_marquee' && e.newValue) {
        try {
          setMarquee(JSON.parse(e.newValue));
          setIsDismissed(false);
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // c. Firestore Realtime
    const unsub = firebaseService.subscribeToMarquee((updated) => {
      if (updated && typeof updated.enabled === 'boolean') {
        setMarquee(updated);
        localStorage.setItem('fbstore_cached_marquee', JSON.stringify(updated));
        setIsDismissed(false);
      }
    });

    // d. SSE Stream (Instant push from server)
    let es: EventSource | null = null;
    try {
      const targetParam = user?.id ? `?userId=${user.id}` : '';
      es = new EventSource(`/api/events${targetParam}`);
      es.addEventListener('marquee_updated', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.marquee) {
            setMarquee(d.marquee);
            localStorage.setItem('fbstore_cached_marquee', JSON.stringify(d.marquee));
            setIsDismissed(false);
          }
        } catch (err) {}
      });
    } catch (err) {}

    return () => {
      window.removeEventListener('fbstore_marquee_updated', handleLocalUpdate);
      window.removeEventListener('storage', handleStorage);
      unsub();
      es?.close();
    };
  }, [user?.id]);

  if (!marquee.enabled || !marquee.text?.trim() || isDismissed) {
    return null;
  }

  // Check if marquee is targeted to a specific user
  if (marquee.targetType === 'user' && marquee.targetUserId) {
    if (!user || user.id !== marquee.targetUserId) {
      return null;
    }
  }

  const speedClass = 
    marquee.speed === 'slow' 
      ? 'animate-marquee-slow' 
      : marquee.speed === 'fast' 
        ? 'animate-marquee-fast' 
        : 'animate-marquee-normal';

  const shouldShowBadge = marquee.showBadge !== false;

  return (
    <div className="relative z-40 w-full bg-amber-500/[0.08] dark:bg-[#080c14] border-b border-amber-300/70 dark:border-amber-500/25 text-slate-900 dark:text-slate-100 shadow-xs dark:shadow-md marquee-container overflow-hidden select-none transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center h-9 sm:h-10 px-2 sm:px-4">
        {/* Left Badge (Optional - can be enabled/disabled by Admin) */}
        {shouldShowBadge && (
          <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400 dark:border-amber-500/40 rounded-lg text-amber-900 dark:text-amber-300 text-[11px] sm:text-xs font-bold mr-3 shadow-xs z-10">
            <Megaphone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
            <span className="tracking-wide uppercase text-[10px] sm:text-[11px]">
              {marquee.badgeText || 'Announcement'}
            </span>
          </div>
        )}

        {/* Scrolling Ticker Track */}
        <div className="flex-1 overflow-hidden relative h-full flex items-center">
          <div className={`${speedClass} inline-flex items-center gap-4 cursor-default text-xs sm:text-[13px] font-semibold dark:font-medium text-slate-900 dark:text-slate-100`}>
            <span>{marquee.text}</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 inline-block flex-shrink-0" />
          </div>
        </div>

        {/* Right Dismiss Button */}
        <button
          onClick={() => setIsDismissed(true)}
          title="Dismiss Announcement"
          className="flex-shrink-0 ml-2 p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-amber-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer z-10"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
