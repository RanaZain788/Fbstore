import React, { useState, useEffect } from 'react';
import { Mail, Check, AlertCircle, Clock, ShieldAlert, Sparkles, MessageSquare } from 'lucide-react';
import { AdminMessage } from '../types';
import { useAuth } from '../context/AuthContext';
import { firebaseService } from '../services/firebaseService';

export const UserAdminMessages: React.FC = () => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    try {
      const res = await fetch('/api/user/messages', {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.warn('Error fetching user messages:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [user?.id, token]);

  // Real-time synchronization (SSE + Firestore)
  useEffect(() => {
    if (!user?.id) return;

    // 1. Firestore listener
    const unsub = firebaseService.subscribeToUserMessages(user.id, (list) => {
      if (Array.isArray(list) && list.length > 0) {
        setMessages(list);
      }
    });

    // 2. SSE listener
    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/events?userId=${user.id}`);
      es.addEventListener('admin_message_received', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.message) {
            setMessages(prev => [d.message, ...prev.filter(m => m.id !== d.message.id)]);
          }
        } catch (err) {}
      });
    } catch (err) {}

    return () => {
      unsub();
      es?.close();
    };
  }, [user?.id]);

  const handleMarkAsRead = async (id: string) => {
    const currentToken = token || localStorage.getItem('fbstore_auth_token');
    if (!currentToken) return;

    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));

    try {
      await fetch(`/api/user/messages/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}` }
      });
    } catch (e) {}
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

  const unreadCount = messages.filter(m => !m.read).length;

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs">Loading Admin Messages...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs dark:shadow-lg transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[#1877F2] flex items-center justify-center font-bold">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Messages from Admin
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white animate-pulse">
                  {unreadCount} New
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Direct official notifications, custom instructions, and account alerts from FBStore Admin
            </p>
          </div>
        </div>
      </div>

      {/* Messages List */}
      {messages.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
            <Mail className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-300">No Messages Yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You don't have any messages from the admin. Any personal updates or notifications will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => {
            const isUrgent = msg.priority === 'urgent' || msg.priority === 'high';
            return (
              <div
                key={msg.id}
                className={`relative rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${
                  !msg.read
                    ? isUrgent
                      ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-500/50'
                      : 'bg-blue-50/80 dark:bg-blue-950/20 border-blue-300 dark:border-blue-500/40'
                    : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      {isUrgent ? (
                        <ShieldAlert className="w-5 h-5 text-rose-500 dark:text-rose-400 animate-pulse" />
                      ) : (
                        <Mail className={`w-5 h-5 ${!msg.read ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30 uppercase tracking-wide">
                          {msg.sender || 'Admin'}
                        </span>
                        {isUrgent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 uppercase tracking-wide">
                            {msg.priority} Priority
                          </span>
                        )}
                        {!msg.read && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                        )}
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 ml-auto">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(msg.createdAt)}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                        {msg.title}
                      </h4>

                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-medium dark:font-normal">
                        {msg.message}
                      </p>
                    </div>
                  </div>

                  {!msg.read && (
                    <button
                      onClick={() => handleMarkAsRead(msg.id)}
                      title="Mark as Read"
                      className="flex-shrink-0 text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                      <span>Mark Read</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
