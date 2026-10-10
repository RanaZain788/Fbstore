import React, { useState } from 'react';
import { 
  X, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  DollarSign, 
  Sparkles, 
  Bug, 
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { FeedbackType } from '../types';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminWhatsapp?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ 
  isOpen, 
  onClose,
  adminWhatsapp = '923001234567' 
}) => {
  const { user, token } = useAuth();
  const { showToast } = useNotifications();

  const [type, setType] = useState<FeedbackType>('feature_request');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!message.trim()) {
      setErrorMsg('Please describe your suggestion, request, or issue.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          type,
          subject: subject.trim() || 'Customer Feedback',
          message: message.trim(),
          contactInfo: contactInfo.trim() || user?.email || '',
          username: user?.username || ''
        })
      });

      const data = await res.json();
      setIsSubmitting(false);

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to submit feedback.');
        return;
      }

      setIsSuccess(true);
      try {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
      } catch (err) {}
      showToast('Feedback Received', 'Thank you! Your feedback has been sent directly to the Admin Panel.', 'success');
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Network error occurred.');
    }
  };

  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent(`Hello Admin, I have feedback / a question regarding FBStore:\nType: ${type}\nMessage: ${message || subject || 'Need assistance'}`);
    const cleanNum = adminWhatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanNum}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Feedback & Feature Suggestions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Share any new feature idea, report a problem, or pricing inquiry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                Feedback Submitted Successfully!
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Your message has been sent directly to the Admin Portal. We review all customer feedback carefully to improve FBStore!
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat Admin on WhatsApp</span>
                <ExternalLink className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-600 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Feedback Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                What is this about?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setType('feature_request')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                    type === 'feature_request'
                      ? 'bg-purple-600/15 border-purple-500 text-purple-700 dark:text-purple-300 font-bold shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="text-[11px] leading-tight">New Feature</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('pricing_issue')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                    type === 'pricing_issue'
                      ? 'bg-amber-600/15 border-amber-500 text-amber-700 dark:text-amber-300 font-bold shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-amber-500" />
                  <span className="text-[11px] leading-tight">Price Inquiry</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('bug_report')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                    type === 'bug_report'
                      ? 'bg-rose-600/15 border-rose-500 text-rose-700 dark:text-rose-300 font-bold shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Bug className="w-4 h-4 text-rose-500" />
                  <span className="text-[11px] leading-tight">Problem / Bug</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('general')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                    type === 'general'
                      ? 'bg-blue-600/15 border-blue-500 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-blue-500" />
                  <span className="text-[11px] leading-tight">General</span>
                </button>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subject / Title
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Please add 2FA account generator or discount on 10+ IDs"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Your Message / Suggestion Details *
              </label>
              <textarea
                rows={3}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe what feature you would love to see, or any issue you encountered..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Contact / WhatsApp (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Contact WhatsApp / Mobile (Optional)
              </label>
              <input
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="e.g. 03001234567 (if you want admin to reach back)"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Quick WhatsApp Chat Instead</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !message.trim()}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 flex items-center gap-1.5 transition cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send to Admin</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
