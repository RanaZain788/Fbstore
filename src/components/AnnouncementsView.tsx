import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Clock, 
  Sparkles,
  Tag
} from 'lucide-react';
import { Announcement } from '../types';
import { useAuth } from '../context/AuthContext';
import { firebaseService } from '../services/firebaseService';

export const AnnouncementsView: React.FC<{ limit?: number; showPopupOnly?: boolean }> = ({ 
  limit, 
  showPopupOnly = false 
}) => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activePopup, setActivePopup] = useState<Announcement | null>(null);
  
  // Temporary dismissals (resets on page refresh so 'every_refresh' announcements re-appear)
  const [sessionDismissedIds, setSessionDismissedIds] = useState<string[]>([]);

  // Permanent dismissals (persisted in localStorage for 'once_only' announcements)
  const [permanentlyDismissedIds, setPermanentlyDismissedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fbstore_permanently_dismissed_announcements');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const isDismissed = (ann: Announcement) => {
    if (sessionDismissedIds.includes(ann.id)) return true;
    if (ann.frequency === 'once_only' && permanentlyDismissedIds.includes(ann.id)) return true;
    return false;
  };

  const fetchAnnouncements = async () => {
    try {
      const url = user?.id ? `/api/announcements?userId=${encodeURIComponent(user.id)}` : '/api/announcements';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const list: Announcement[] = data.announcements || [];
        setAnnouncements(list);

        // Check if there is an un-dismissed popup announcement
        const popup = list.find(a => a.showAsPopup && a.active && !isDismissed(a));
        if (popup) {
          setActivePopup(popup);
        }
      }
    } catch (e) {
      console.warn('Announcements fetch error:', e);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [user?.id]);

  // Real-time synchronization (SSE + Firestore)
  useEffect(() => {
    // Firestore realtime listener
    const unsub = firebaseService.subscribeToAnnouncements((list) => {
      if (Array.isArray(list)) {
        const filtered = list.filter(a => {
          if (!a.active) return false;
          if (a.targetType === 'all') return true;
          if (user?.id && a.targetType === 'user' && a.targetUserId === user.id) return true;
          return false;
        });
        setAnnouncements(filtered);
        const popup = filtered.find(a => a.showAsPopup && !isDismissed(a));
        if (popup) setActivePopup(popup);
      }
    });

    // SSE listener
    let es: EventSource | null = null;
    try {
      const targetParam = user?.id ? `?userId=${user.id}` : '';
      es = new EventSource(`/api/events${targetParam}`);
      es.addEventListener('announcements_updated', () => {
        fetchAnnouncements();
      });
    } catch (err) {}

    return () => {
      unsub();
      es?.close();
    };
  }, [user?.id, sessionDismissedIds, permanentlyDismissedIds]);

  const handleDismiss = (id: string) => {
    const ann = announcements.find(a => a.id === id);
    
    // Always dismiss for current view session
    setSessionDismissedIds(prev => [...prev, id]);

    // If marked as once_only, persist in localStorage so it never shows again
    if (ann && ann.frequency === 'once_only') {
      try {
        const nextPermanent = [...permanentlyDismissedIds, id];
        setPermanentlyDismissedIds(nextPermanent);
        localStorage.setItem('fbstore_permanently_dismissed_announcements', JSON.stringify(nextPermanent));
      } catch {}
    }

    if (activePopup?.id === id) {
      setActivePopup(null);
    }
  };

  const getStyleByType = (type: Announcement['type']) => {
    switch (type) {
      case 'offer':
        return {
          cardBg: 'bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 dark:from-amber-950/60 dark:via-orange-950/40 dark:to-slate-900 border-amber-400 dark:border-amber-500/50 text-slate-900 dark:text-amber-100 shadow-md ring-1 ring-amber-400/30',
          badgeBg: 'bg-amber-200/90 dark:bg-amber-500/25 text-amber-950 dark:text-amber-200 border-amber-400 dark:border-amber-500/40 font-bold',
          icon: <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 animate-pulse" />,
          titleColor: 'text-amber-950 dark:text-amber-100 font-extrabold',
          textColor: 'text-slate-800 dark:text-slate-200',
          badgeText: 'Special Offer / Deal',
          indicator: 'bg-amber-500'
        };
      case 'urgent':
      case 'alert':
        return {
          cardBg: 'bg-rose-50/90 dark:bg-gradient-to-r dark:from-rose-950/40 dark:to-slate-900 border-rose-300 dark:border-rose-500/40 text-slate-900 dark:text-rose-200 shadow-xs dark:shadow-md',
          badgeBg: 'bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-300 border-rose-300 dark:border-rose-500/30 font-bold',
          icon: <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 animate-pulse" />,
          titleColor: 'text-rose-950 dark:text-rose-100 font-bold',
          textColor: 'text-slate-700 dark:text-slate-300',
          badgeText: 'Urgent Alert',
          indicator: 'bg-rose-500'
        };
      case 'warning':
        return {
          cardBg: 'bg-amber-50/90 dark:bg-gradient-to-r dark:from-amber-950/40 dark:to-slate-900 border-amber-300 dark:border-amber-500/40 text-slate-900 dark:text-amber-200 shadow-xs dark:shadow-md',
          badgeBg: 'bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-500/30 font-bold',
          icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />,
          titleColor: 'text-amber-950 dark:text-amber-100 font-bold',
          textColor: 'text-slate-700 dark:text-slate-300',
          badgeText: 'Warning',
          indicator: 'bg-amber-500'
        };
      case 'success':
        return {
          cardBg: 'bg-emerald-50/90 dark:bg-gradient-to-r dark:from-emerald-950/40 dark:to-slate-900 border-emerald-300 dark:border-emerald-500/40 text-slate-900 dark:text-emerald-200 shadow-xs dark:shadow-md',
          badgeBg: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30 font-bold',
          icon: <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />,
          titleColor: 'text-emerald-950 dark:text-emerald-100 font-bold',
          textColor: 'text-slate-700 dark:text-slate-300',
          badgeText: 'Success',
          indicator: 'bg-emerald-500'
        };
      case 'info':
      default:
        return {
          cardBg: 'bg-blue-50/90 dark:bg-gradient-to-r dark:from-blue-950/40 dark:to-slate-900 border-blue-200 dark:border-blue-500/40 text-slate-900 dark:text-blue-200 shadow-xs dark:shadow-md',
          badgeBg: 'bg-blue-100 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-500/30 font-bold',
          icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />,
          titleColor: 'text-blue-950 dark:text-blue-100 font-bold',
          textColor: 'text-slate-700 dark:text-slate-300',
          badgeText: 'Notice',
          indicator: 'bg-blue-500'
        };
    }
  };

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return iso;
    }
  };

  // If showing popup dialog
  if (showPopupOnly) {
    if (!activePopup) return null;
    const style = getStyleByType(activePopup.type);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-fade-in">
        <div className="relative max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-slide-up">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {style.icon}
              </div>
              <div>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${style.badgeBg}`}>
                  {activePopup.targetType === 'user' ? 'Direct User Notice' : style.badgeText}
                </span>
                <h3 className={`text-base font-bold mt-0.5 ${style.titleColor}`}>
                  {activePopup.title}
                </h3>
              </div>
            </div>
            <button
              onClick={() => handleDismiss(activePopup.id)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className={`py-2 text-sm leading-relaxed whitespace-pre-line font-medium dark:font-normal ${style.textColor}`}>
            {activePopup.message}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDateTime(activePopup.createdAt)}
            </span>
            <button
              onClick={() => handleDismiss(activePopup.id)}
              className="px-5 py-2 bg-[#1877F2] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition cursor-pointer"
            >
              Close Announcement
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Regular In-Feed Banners
  const visible = announcements
    .filter(a => !isDismissed(a))
    .slice(0, limit || 5);

  if (visible.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {visible.map((ann) => {
        const style = getStyleByType(ann.type);
        return (
          <div
            key={ann.id}
            className={`relative rounded-2xl border p-4 sm:p-5 shadow-xs transition-all hover:scale-[1.002] ${style.cardBg}`}
          >
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5">{style.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${style.badgeBg}`}>
                    {ann.type === 'offer' ? 'Special Offer' : ann.type}
                  </span>
                  {ann.targetType === 'user' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-500/20 text-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30">
                      Personal Message
                    </span>
                  )}
                  {ann.frequency === 'every_refresh' && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      Re-shows on refresh
                    </span>
                  )}
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 ml-auto">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(ann.createdAt)}
                  </span>
                </div>

                <h4 className={`text-sm sm:text-base font-bold ${style.titleColor}`}>
                  {ann.title}
                </h4>

                <p className={`mt-1 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${style.textColor}`}>
                  {ann.message}
                </p>
              </div>

              <button
                onClick={() => handleDismiss(ann.id)}
                title="Dismiss Notice"
                className="text-slate-400 hover:text-slate-800 dark:hover:text-white p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}

      {/* Render Popup modal if active */}
      {activePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  {getStyleByType(activePopup.type).icon}
                </div>
                <div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${getStyleByType(activePopup.type).badgeBg}`}>
                    {activePopup.targetType === 'user' ? 'Direct User Notice' : getStyleByType(activePopup.type).badgeText}
                  </span>
                  <h3 className={`text-base font-bold mt-0.5 ${getStyleByType(activePopup.type).titleColor}`}>
                    {activePopup.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => handleDismiss(activePopup.id)}
                className="text-slate-400 hover:text-slate-800 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`py-2 text-sm leading-relaxed whitespace-pre-line font-medium dark:font-normal ${getStyleByType(activePopup.type).textColor}`}>
              {activePopup.message}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDateTime(activePopup.createdAt)}
              </span>
              <button
                onClick={() => handleDismiss(activePopup.id)}
                className="px-5 py-2 bg-[#1877F2] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition cursor-pointer"
              >
                Close Announcement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
