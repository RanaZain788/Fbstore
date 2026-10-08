import React, { useEffect, useState } from 'react';
import {
  X,
  Copy,
  Check,
  Upload,
  MessageCircle,
  CheckCircle2,
  ExternalLink,
  Info,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { firebaseService } from '../services/firebaseService';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAmount?: number;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  initialAmount,
}) => {
  const { user, token } = useAuth();
  const { showToast } = useNotifications();

  // =====================================================
  // STORE DETAILS
  // =====================================================

  const [jazzcashTitle, setJazzcashTitle] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('fbstore_cached_account_title');
      if (cached) return cached;
    }
    return 'Muhammad Arslan';
  });

  const [jazzcashNumber, setJazzcashNumber] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('fbstore_cached_account_number');
      if (cached) return cached;
    }
    return '03064887388';
  });

  const [whatsappNumber, setWhatsappNumber] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('fbstore_cached_whatsapp');
      if (cached) return cached;
    }
    return '923001234567';
  });

  // =====================================================
  // FORM STATE
  // =====================================================

  const [amount, setAmount] = useState<number>(
    initialAmount && initialAmount >= 100 ? initialAmount : 100
  );

  const [senderName, setSenderName] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [screenshotData, setScreenshotData] = useState<string>('');

  // =====================================================
  // UI STATE
  // =====================================================

  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // =====================================================
  // LOAD STORE INFORMATION
  // =====================================================

  const fetchStoreInfo = React.useCallback(async () => {
    try {
      const res = await fetch('/api/store/info');
      if (res.ok) {
        const data = await res.json();
        const title = data.jazzcashTitle || data.accountTitle || data.easypaisaTitle;
        const number = data.jazzcashNumber || data.accountNumber || data.easypaisaNumber;

        if (title) {
          setJazzcashTitle(title);
          localStorage.setItem('fbstore_cached_account_title', title);
        }

        if (number) {
          setJazzcashNumber(number);
          localStorage.setItem('fbstore_cached_account_number', number);
        }

        if (data.whatsappNumber) {
          setWhatsappNumber(data.whatsappNumber);
          localStorage.setItem('fbstore_cached_whatsapp', data.whatsappNumber);
        }
      }
    } catch (err) {
      console.error('Failed to load store info:', err);
    }
  }, []);

  // Fetch immediately on mount so details are already prepared
  useEffect(() => {
    fetchStoreInfo();
  }, [fetchStoreInfo]);

  // Re-fetch when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      fetchStoreInfo();
    }
  }, [isOpen, fetchStoreInfo]);

  // Real-time synchronization via Server-Sent Events (SSE)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('settings_updated', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.settings) {
            const title = d.settings.jazzcashTitle || d.settings.accountTitle || d.settings.easypaisaTitle;
            const number = d.settings.jazzcashNumber || d.settings.accountNumber || d.settings.easypaisaNumber;
            if (title) {
              setJazzcashTitle(title);
              localStorage.setItem('fbstore_cached_account_title', title);
            }
            if (number) {
              setJazzcashNumber(number);
              localStorage.setItem('fbstore_cached_account_number', number);
            }
            if (d.settings.whatsappNumber) {
              setWhatsappNumber(d.settings.whatsappNumber);
              localStorage.setItem('fbstore_cached_whatsapp', d.settings.whatsappNumber);
            }
          }
        } catch (err) {}
      });
    } catch (err) {}

    return () => {
      eventSource?.close();
    };
  }, []);

  // =====================================================
  // INITIAL AMOUNT
  // =====================================================

  useEffect(() => {
    if (initialAmount && initialAmount >= 100) {
      setAmount(initialAmount);
    } else if (initialAmount && initialAmount > 0 && initialAmount < 100) {
      setAmount(100);
    }
  }, [initialAmount]);

  // =====================================================
  // MODAL VISIBILITY
  // =====================================================

  if (!isOpen) return null;

  // =====================================================
  // COPY JAZZCASH NUMBER
  // =====================================================

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(jazzcashNumber);

    setCopiedNumber(true);

    setTimeout(() => {
      setCopiedNumber(false);
    }, 2000);

    showToast(
      'Copied',
      'JazzCash number copied to clipboard.',
      'info'
    );
  };

  // =====================================================
  // COPY ACCOUNT TITLE
  // =====================================================

  const handleCopyTitle = () => {
    navigator.clipboard.writeText(jazzcashTitle);

    setCopiedTitle(true);

    setTimeout(() => {
      setCopiedTitle(false);
    }, 2000);

    showToast(
      'Copied',
      'Account title copied to clipboard.',
      'info'
    );
  };

  // =====================================================
  // IMAGE UPLOAD
  // =====================================================

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      showToast(
        'File Too Large',
        'Please upload a screenshot under 8MB.',
        'warning'
      );

      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setScreenshotData(reader.result as string);

      showToast(
        'Screenshot Attached',
        'Payment receipt attached successfully.',
        'success'
      );
    };

    reader.readAsDataURL(file);
  };

  // =====================================================
  // WHATSAPP URL
  // Only available/useful after successful submission
  // =====================================================

  const getCleanWhatsappUrl = () => {
    const cleanPhone = whatsappNumber.replace(/[^0-9]/g, '');

    const textMsg = encodeURIComponent(
      `Hello Admin,

I have submitted a deposit request on the website.

Website User: @${user?.username || ''}
Deposit Amount: Rs. ${amount} PKR
Sender Account Name: ${senderName.trim()}
Sender Account Number: ${senderAccount.trim()}

Payment sent to JazzCash Number: ${jazzcashNumber}

I am sending my payment screenshot here for verification.

Please verify my payment and add the balance to my wallet.

Thank you.`
    );

    return `https://wa.me/${cleanPhone}?text=${textMsg}`;
  };

  // =====================================================
  // FORM VALIDATION
  // =====================================================

  const isFormValid =
    Number(amount) >= 100 &&
    senderName.trim().length > 0 &&
    senderAccount.trim().length > 0;

  // =====================================================
  // SUBMIT DEPOSIT
  // =====================================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!user || !token) {
      showToast(
        'Login Required',
        'Please log in to submit a deposit.',
        'error'
      );

      return;
    }

    // Amount validation
    if (!amount || amount < 100) {
      showToast(
        'Invalid Amount',
        'The minimum deposit amount is Rs. 100 PKR.',
        'error'
      );

      return;
    }

    // Sender name validation
    if (!senderName.trim()) {
      showToast(
        'Sender Name Required',
        'Please enter the name of the account you used to send the payment.',
        'error'
      );

      return;
    }

    // Sender account validation
    if (!senderAccount.trim()) {
      showToast(
        'Sender Account Required',
        'Please enter the account or mobile number you used to send the payment.',
        'error'
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const depositPayload = {
        amount: Number(amount),

        senderAccountName: senderName.trim(),

        senderAccountNumber: senderAccount.trim(),

        // Screenshot is optional
        screenshotUrl: screenshotData || '',
      };

      // =================================================
      // SUBMIT TO API
      // =================================================

      const res = await fetch('/api/deposits', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify(depositPayload),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(
          'Submission Failed',
          data.error || 'Could not submit deposit.',
          'error'
        );

        setIsSubmitting(false);

        return;
      }

      // =================================================
      // FIRESTORE MIRROR
      // =================================================

      try {
        await firebaseService.recordDeposit({
          ...depositPayload,

          userId: user.id,

          username: user.username,

          status: 'pending',
        });
      } catch (fsErr) {
        console.warn(
          'Firestore mirror notice:',
          fsErr
        );
      }

      // =================================================
      // SUCCESS
      // =================================================

      setIsSuccess(true);

      showToast(
        'Deposit Submitted',
        'Your deposit request has been submitted successfully.',
        'success'
      );
    } catch (err: any) {
      showToast(
        'Error',
        err.message || 'Network error occurred.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      className="
        fixed
        inset-0
        z-50

        flex
        items-center
        justify-center

        p-4

        bg-black/70
        dark:bg-black/80

        backdrop-blur-sm

        overflow-y-auto
      "
    >
      <div
        className="
          relative

          w-full
          max-w-lg

          my-6

          overflow-hidden

          rounded-2xl

          border
          border-slate-200
          dark:border-[#1d2942]

          bg-white
          dark:bg-[#0b1120]

          shadow-2xl
          animate-slide-up

          transition-colors
          duration-200
        "
      >
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div
          className="
            px-6
            py-4

            border-b
            border-slate-200
            dark:border-[#1d2942]

            flex
            items-center
            justify-between

            bg-slate-50
            dark:bg-[#0d1427]
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
                w-9
                h-9

                rounded-xl

                bg-blue-50
                dark:bg-blue-500/10

                border
                border-blue-200
                dark:border-blue-500/20

                text-blue-600
                dark:text-blue-400

                flex
                items-center
                justify-center

                font-bold
                text-sm
              "
            >
              EP
            </div>

            <div>
              <h2
                className="
                  text-base
                  font-bold

                  text-slate-900
                  dark:text-white

                  leading-tight
                "
              >
                JazzCash Deposit
              </h2>

              <p
                className="
                  text-[11px]

                  text-slate-500
                  dark:text-slate-400

                  mt-0.5
                "
              >
                Add PKR funds directly to your wallet
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              p-1.5

              rounded-lg

              text-slate-400

              hover:text-slate-700
              dark:hover:text-white

              hover:bg-slate-100
              dark:hover:bg-slate-800

              transition

              cursor-pointer
            "
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* =====================================================
            CONTENT
        ===================================================== */}

        <div
          className="
            p-6

            space-y-5

            max-h-[80vh]

            overflow-y-auto

            text-slate-800
            dark:text-slate-200
          "
        >
          {/* =====================================================
              SUCCESS SCREEN
          ===================================================== */}

          {isSuccess ? (
            <div className="text-center py-5">
              {/* Success Icon */}

              <div
                className="
                  w-16
                  h-16

                  mx-auto

                  rounded-full

                  bg-emerald-50
                  dark:bg-emerald-500/10

                  border
                  border-emerald-200
                  dark:border-emerald-500/30

                  text-emerald-600
                  dark:text-emerald-400

                  flex
                  items-center
                  justify-center
                "
              >
                <CheckCircle2 className="w-9 h-9" />
              </div>

              {/* Success Heading */}

              <div className="mt-4">
                <h3
                  className="
                    text-lg
                    font-bold

                    text-slate-900
                    dark:text-white
                  "
                >
                  Deposit Request Submitted
                </h3>

                <p
                  className="
                    text-xs

                    text-slate-500
                    dark:text-slate-400

                    mt-2

                    max-w-sm
                    mx-auto

                    leading-relaxed
                  "
                >
                  Your deposit request of{' '}
                  <span
                    className="
                      font-bold

                      text-emerald-600
                      dark:text-emerald-400
                    "
                  >
                    Rs. {amount} PKR
                  </span>{' '}
                  has been submitted successfully.
                </p>
              </div>

              {/* =================================================
                  NEXT STEP BOX
              ================================================= */}

              <div
                className="
                  mt-6

                  rounded-xl

                  bg-amber-50
                  dark:bg-[#211806]

                  border
                  border-amber-200
                  dark:border-amber-900/60

                  p-4

                  text-left
                "
              >
                <div className="flex items-start gap-3">
                  <Info
                    className="
                      w-5
                      h-5

                      text-amber-600
                      dark:text-amber-400

                      shrink-0

                      mt-0.5
                    "
                  />

                  <div>
                    <p
                      className="
                        text-sm
                        font-bold

                        text-amber-800
                        dark:text-amber-300
                      "
                    >
                      Next Step — Send Payment Screenshot
                    </p>

                    <p
                      className="
                        mt-1

                        text-xs

                        leading-relaxed

                        text-amber-700
                        dark:text-amber-400
                      "
                    >
                      Your deposit request has been
                      submitted successfully. Please
                      click the WhatsApp button below
                      to send your payment screenshot
                      to the admin for verification.
                    </p>
                  </div>
                </div>
              </div>

              {/* =================================================
                  WHATSAPP BUTTON
              ================================================= */}

              <a
                href={getCleanWhatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  mt-5

                  w-full
                  h-12

                  rounded-xl

                  bg-emerald-600
                  hover:bg-emerald-700

                  dark:bg-emerald-600
                  dark:hover:bg-emerald-500

                  text-white

                  text-xs
                  font-bold

                  flex
                  items-center
                  justify-center
                  gap-2

                  transition

                  shadow-lg
                  shadow-emerald-600/20

                  cursor-pointer
                "
              >
                <MessageCircle className="w-5 h-5" />

                <span>
                  Send Payment Screenshot on WhatsApp
                </span>

                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {/* =================================================
                  CLOSE BUTTON
              ================================================= */}

              <button
                type="button"
                onClick={onClose}
                className="
                  mt-3

                  w-full
                  h-11

                  rounded-xl

                  bg-slate-100
                  hover:bg-slate-200

                  dark:bg-[#151e31]
                  dark:hover:bg-[#1b263d]

                  border
                  border-slate-200
                  dark:border-[#27344d]

                  text-slate-700
                  dark:text-slate-300

                  text-xs
                  font-bold

                  transition

                  cursor-pointer
                "
              >
                Close Window
              </button>
            </div>
          ) : (
            <>
              {/* =================================================
                  JAZZCASH ACCOUNT DETAILS
              ================================================= */}

              <div
                className="
                  rounded-xl

                  bg-slate-50
                  dark:bg-[#0d1427]

                  border
                  border-slate-200
                  dark:border-[#1d2942]

                  p-4

                  space-y-3
                "
              >
                {/* Account Header */}

                <div
                  className="
                    flex
                    items-center
                    justify-between

                    pb-3

                    border-b
                    border-slate-200
                    dark:border-[#1d2942]
                  "
                >
                  <span
                    className="
                      text-xs
                      font-bold

                      text-emerald-600
                      dark:text-emerald-400

                      flex
                      items-center
                      gap-1.5
                    "
                  >
                    <span
                      className="
                        w-2
                        h-2

                        rounded-full

                        bg-emerald-500

                        animate-pulse
                      "
                    />

                    Official JazzCash Account
                  </span>

                  <span
                    className="
                      text-[10px]

                      text-slate-400
                      dark:text-slate-500
                    "
                  >
                    Manual Verification
                  </span>
                </div>

                {/* Account Details */}

                <div
                  className="
                    grid
                    grid-cols-1
                    sm:grid-cols-2

                    gap-3
                  "
                >
                  {/* Account Title */}

                  <div
                    className="
                      rounded-lg

                      bg-white
                      dark:bg-[#111a2d]

                      border
                      border-slate-200
                      dark:border-[#243149]

                      p-3
                    "
                  >
                    <span
                      className="
                        text-[10px]

                        text-slate-400

                        uppercase

                        font-semibold

                        block
                      "
                    >
                      Account Title
                    </span>

                    <div
                      className="
                        flex
                        items-center
                        justify-between

                        mt-1
                      "
                    >
                      <span
                        className="
                          text-xs
                          font-bold

                          text-slate-800
                          dark:text-white

                          select-all

                          truncate
                        "
                      >
                        {jazzcashTitle}
                      </span>

                      <button
                        type="button"
                        onClick={handleCopyTitle}
                        className="
                          p-1

                          text-slate-400

                          hover:text-slate-700
                          dark:hover:text-white

                          transition

                          cursor-pointer
                        "
                        title="Copy Title"
                      >
                        {copiedTitle ? (
                          <Check
                            className="
                              w-3.5
                              h-3.5

                              text-emerald-500
                              dark:text-emerald-400
                            "
                          />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Account Number */}

                  <div
                    className="
                      rounded-lg

                      bg-white
                      dark:bg-[#111a2d]

                      border
                      border-slate-200
                      dark:border-[#243149]

                      p-3
                    "
                  >
                    <span
                      className="
                        text-[10px]

                        text-slate-400

                        uppercase

                        font-semibold

                        block
                      "
                    >
                      JazzCash Mobile Number
                    </span>

                    <div
                      className="
                        flex
                        items-center
                        justify-between

                        mt-1
                      "
                    >
                      <span
                        className="
                          text-sm
                          font-extrabold

                          text-emerald-600
                          dark:text-emerald-400

                          font-mono

                          select-all
                        "
                      >
                        {jazzcashNumber}
                      </span>

                      <button
                        type="button"
                        onClick={handleCopyNumber}
                        className="
                          p-1

                          text-slate-400

                          hover:text-slate-700
                          dark:hover:text-white

                          transition

                          cursor-pointer
                        "
                        title="Copy Number"
                      >
                        {copiedNumber ? (
                          <Check
                            className="
                              w-3.5
                              h-3.5

                              text-emerald-500
                              dark:text-emerald-400
                            "
                          />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Support Information */}

                <div
                  className="
                    flex
                    items-center
                    justify-between

                    gap-3

                    rounded-lg

                    bg-white
                    dark:bg-[#111a2d]

                    border
                    border-slate-200
                    dark:border-[#243149]

                    px-3
                    py-2.5
                  "
                >
                  <div
                    className="
                      flex
                      items-center
                      gap-2

                      text-slate-600
                      dark:text-slate-300
                    "
                  >
                    <MessageCircle
                      className="
                        w-4
                        h-4

                        text-emerald-500
                        dark:text-emerald-400
                      "
                    />

                    <span className="text-[11px]">
                      WhatsApp Support:{' '}
                      <strong
                        className="
                          text-slate-900
                          dark:text-white

                          select-all
                        "
                      >
                        {whatsappNumber}
                      </strong>
                    </span>
                  </div>

                  <span
                    className="
                      text-[10px]

                      text-slate-400
                      dark:text-slate-500
                    "
                  >
                    Available after submission
                  </span>
                </div>
              </div>

              {/* =================================================
                  IMPORTANT INSTRUCTIONS
              ================================================= */}

              <div
                className="
                  rounded-xl

                  bg-blue-50
                  dark:bg-blue-500/10

                  border
                  border-blue-200
                  dark:border-blue-500/20

                  p-4

                  space-y-3
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-2

                    text-blue-600
                    dark:text-blue-400

                    text-xs
                    font-bold

                    uppercase
                    tracking-wide
                  "
                >
                  <Info className="w-4 h-4 shrink-0" />

                  <span>Important Instructions</span>
                </div>

                <ol
                  className="
                    space-y-2

                    pl-4

                    list-decimal

                    text-slate-600
                    dark:text-slate-300

                    text-[11.5px]

                    leading-relaxed
                  "
                >
                  <li>
                    Send the payment to the JazzCash
                    account shown above.
                  </li>

                  <li>
                    You can send the payment from
                    EasyPaisa, SadaPay, NayaPay,
                    JazzCash, a bank account, or
                    another supported payment method.
                  </li>

                  <li>
                    Enter the name and account/mobile
                    number you used to send the payment.
                  </li>

                  <li>
                    Submit your deposit request on
                    this website.
                  </li>

                  <li>
                    After your request is submitted
                    successfully, you will be able to
                    send your payment screenshot to
                    the admin through WhatsApp.
                  </li>
                </ol>
              </div>

              {/* =================================================
                  DEPOSIT FORM
              ================================================= */}

              <form
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* =================================================
                    AMOUNT
                ================================================= */}

                <div>
                  <label
                    className="
                      block

                      text-xs
                      font-semibold

                      text-slate-700
                      dark:text-slate-300

                      mb-1.5
                    "
                  >
                    Amount to Deposit (PKR)
                    <span className="text-red-500 ml-1">
                      *
                    </span>
                  </label>

                  <div className="relative">
                    <span
                      className="
                        absolute
                        left-3.5
                        top-2.5

                        text-xs
                        font-bold

                        text-slate-400
                        dark:text-slate-500
                      "
                    >
                      Rs.
                    </span>

                    <input
                      type="number"
                      required
                      min={100}
                      step={1}
                      value={amount || ''}
                      onChange={(e) =>
                        setAmount(Number(e.target.value))
                      }
                      placeholder="Minimum 100"
                      className="
                        w-full

                        bg-white
                        dark:bg-[#0d1427]

                        border
                        border-slate-300
                        dark:border-[#293750]

                        rounded-xl

                        pl-11
                        pr-4
                        py-2.5

                        text-sm

                        text-slate-900
                        dark:text-white

                        font-bold

                        placeholder:text-slate-400
                        dark:placeholder:text-slate-600

                        focus:outline-none

                        focus:border-blue-500
                        dark:focus:border-blue-500

                        focus:ring-1
                        focus:ring-blue-500

                        transition
                      "
                    />
                  </div>

                  <p
                    className="
                      text-[10px]

                      text-slate-400
                      dark:text-slate-500

                      mt-1
                    "
                  >
                    Minimum deposit amount: Rs. 100 PKR
                  </p>

                  {/* Quick Amounts */}

                  <div
                    className="
                      flex
                      items-center
                      gap-1.5

                      mt-2

                      flex-wrap
                    "
                  >
                    {[100, 200, 500, 1000, 2000].map(
                      (quickAmt) => (
                        <button
                          key={quickAmt}
                          type="button"
                          onClick={() =>
                            setAmount(quickAmt)
                          }
                          className={`
                            text-[11px]
                            font-semibold

                            px-2.5
                            py-1.5

                            rounded-lg

                            border

                            transition

                            cursor-pointer

                            ${
                              amount === quickAmt
                                ? `
                                  bg-blue-50
                                  dark:bg-blue-500/10

                                  border-blue-400
                                  dark:border-blue-500/50

                                  text-blue-600
                                  dark:text-blue-400
                                `
                                : `
                                  bg-slate-50
                                  dark:bg-[#0d1427]

                                  border-slate-200
                                  dark:border-[#293750]

                                  text-slate-500
                                  dark:text-slate-400

                                  hover:text-slate-700
                                  dark:hover:text-slate-200
                                `
                            }
                          `}
                        >
                          Rs. {quickAmt}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* =================================================
                    SENDER ACCOUNT NAME
                ================================================= */}

                <div>
                  <label
                    className="
                      block

                      text-xs
                      font-semibold

                      text-slate-700
                      dark:text-slate-300

                      mb-1.5
                    "
                  >
                    Sender Account Name
                    <span className="text-red-500 ml-1">
                      *
                    </span>
                  </label>

                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) =>
                      setSenderName(e.target.value)
                    }
                    placeholder="Enter the name on the account you used"
                    className="
                      w-full

                      bg-white
                      dark:bg-[#0d1427]

                      border
                      border-slate-300
                      dark:border-[#293750]

                      rounded-xl

                      px-3.5
                      py-2.5

                      text-xs

                      text-slate-900
                      dark:text-white

                      placeholder:text-slate-400
                      dark:placeholder:text-slate-600

                      focus:outline-none

                      focus:border-blue-500
                      dark:focus:border-blue-500

                      focus:ring-1
                      focus:ring-blue-500

                      transition
                    "
                  />

                  <span
                    className="
                      text-[10px]

                      text-slate-400
                      dark:text-slate-500

                      mt-1

                      block
                    "
                  >
                    Enter the account holder name from
                    which you sent the payment.
                  </span>
                </div>

                {/* =================================================
                    SENDER ACCOUNT NUMBER
                ================================================= */}

                <div>
                  <label
                    className="
                      block

                      text-xs
                      font-semibold

                      text-slate-700
                      dark:text-slate-300

                      mb-1.5
                    "
                  >
                    Sender Account Number
                    <span className="text-red-500 ml-1">
                      *
                    </span>
                  </label>

                  <input
                    type="text"
                    required
                    value={senderAccount}
                    onChange={(e) =>
                      setSenderAccount(e.target.value)
                    }
                    placeholder="Enter your account or mobile number"
                    className="
                      w-full

                      bg-white
                      dark:bg-[#0d1427]

                      border
                      border-slate-300
                      dark:border-[#293750]

                      rounded-xl

                      px-3.5
                      py-2.5

                      text-xs

                      text-slate-900
                      dark:text-white

                      placeholder:text-slate-400
                      dark:placeholder:text-slate-600

                      focus:outline-none

                      focus:border-blue-500
                      dark:focus:border-blue-500

                      focus:ring-1
                      focus:ring-blue-500

                      transition
                    "
                  />

                  <span
                    className="
                      text-[10px]

                      text-slate-400
                      dark:text-slate-500

                      mt-1

                      block
                    "
                  >
                    Enter the account or mobile number
                    you used to send the payment.
                  </span>
                </div>

                {/* =================================================
                    SCREENSHOT - OPTIONAL
                ================================================= */}

                <div>
                  <label
                    className="
                      block

                      text-xs
                      font-semibold

                      text-slate-700
                      dark:text-slate-300

                      mb-1.5
                    "
                  >
                    Payment Screenshot{' '}
                    <span
                      className="
                        text-slate-400
                        dark:text-slate-500

                        font-normal
                      "
                    >
                      (Optional)
                    </span>
                  </label>

                  <div className="flex items-center gap-3">
                    <label
                      className="
                        flex-1

                        flex
                        items-center
                        justify-center
                        gap-2

                        px-3
                        py-3

                        bg-slate-50
                        dark:bg-[#0d1427]

                        border
                        border-dashed

                        border-slate-300
                        dark:border-[#293750]

                        hover:border-slate-400
                        dark:hover:border-slate-500

                        rounded-xl

                        text-slate-500
                        dark:text-slate-400

                        hover:text-slate-700
                        dark:hover:text-white

                        text-xs
                        font-medium

                        cursor-pointer

                        transition
                      "
                    >
                      <Upload className="w-4 h-4" />

                      <span>
                        {screenshotData
                          ? 'Change Screenshot'
                          : 'Upload Payment Screenshot'}
                      </span>

                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>

                    {screenshotData && (
                      <div
                        className="
                          w-11
                          h-11

                          rounded-lg

                          border
                          border-slate-200
                          dark:border-[#293750]

                          overflow-hidden

                          shrink-0

                          bg-slate-100
                          dark:bg-[#0d1427]
                        "
                      >
                        <img
                          src={screenshotData}
                          alt="Payment receipt preview"
                          className="
                            w-full
                            h-full
                            object-cover
                          "
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* =================================================
                    REQUIRED FIELDS NOTICE
                ================================================= */}

                <div
                  className="
                    text-center

                    text-[10px]

                    text-slate-400
                    dark:text-slate-500
                  "
                >
                  <span className="text-red-500">*</span>{' '}
                  Amount, sender account name, and sender
                  account number are required. Payment
                  screenshot is optional.
                </div>

                {/* =================================================
                    SUBMIT BUTTON
                ================================================= */}

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting || !isFormValid}
                    className="
                      w-full
                      h-11

                      rounded-xl

                      bg-blue-600
                      hover:bg-blue-700

                      dark:bg-blue-600
                      dark:hover:bg-blue-500

                      disabled:opacity-50
                      disabled:cursor-not-allowed

                      text-white

                      text-xs
                      font-bold

                      flex
                      items-center
                      justify-center
                      gap-2

                      transition

                      shadow-md
                      shadow-blue-600/20

                      cursor-pointer
                    "
                  >
                    {isSubmitting ? (
                      <>
                        <div
                          className="
                            w-4
                            h-4

                            border-2

                            border-white/30
                            border-t-white

                            rounded-full

                            animate-spin
                          "
                        />

                        <span>
                          Submitting Request...
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />

                        <span>
                          Submit Deposit Request
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* =================================================
                    BOTTOM NOTE
                ================================================= */}

                <p
                  className="
                    text-center

                    text-[10px]

                    text-slate-400
                    dark:text-slate-500

                    leading-relaxed
                  "
                >
                  After submitting your request, you will
                  receive a WhatsApp option to send your
                  payment screenshot to the admin.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
