import { useState, useRef, useEffect } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router';
import { Menu, Bell, Search, X, CheckCircle2, AlertTriangle, Info, Phone, Clock, Wifi, Monitor, Fingerprint } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from './Sidebar';
import api from '../../services/api';
import { FaceVerificationModal } from '../attendance/FaceVerificationModal';
import { ChatbotWidget } from '../ui/ChatbotWidget';
import { FloatingChatWidget } from '../chat/FloatingChatWidget';

interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  navigateTo?: string;
  read: boolean;
  createdAt: string;
}

const NOTIF_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  call: { icon: Phone, color: 'text-green-600', bg: 'bg-green-100' },
  alert: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
  interview: { icon: CheckCircle2, color: 'text-violet-600', bg: 'bg-violet-100' },
  info: { icon: Info, color: 'text-slate-500', bg: 'bg-slate-100' },
};

interface GlobalSearchResult {
  id: string;
  type: string;
  module: string;
  title: string;
  subtitle?: string;
  path: string;
}

// ─── localStorage key helpers ────────────────────────────────
const todayKey = (userId: string) => {
  const d = new Date().toISOString().split('T')[0];
  return `att_marked_${userId}_${d}`;
};
const reminderKey = (userId: string) => {
  const d = new Date().toISOString().split('T')[0];
  return `att_reminder_${userId}_${d}`;
};

export function DashboardLayout() {
  const { isAuthenticated, user, pendingOTP, logout, login } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchingGlobal, setSearchingGlobal] = useState(false);
  const [globalResults, setGlobalResults] = useState<GlobalSearchResult[]>([]);
  const [showGlobalResults, setShowGlobalResults] = useState(false);

  // ── Attendance state ─────────────────────────────────────────
  const [attMarked, setAttMarked] = useState(false);
  const [attMarkedAt, setAttMarkedAt] = useState<string | null>(null);
  const [attMarking, setAttMarking] = useState(false);
  const [attIsWFH, setAttIsWFH] = useState(false);
  const [showWFHPicker, setShowWFHPicker] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const wfhRef = useRef<HTMLDivElement>(null);

  // Roles that need to mark attendance (exclude walkin/spoc)
  const needsAttendance = ['recruiter', 'tl', 'manager', 'admin'].includes(user?.role || '');

  // Check today's attendance on mount
  useEffect(() => {
    if (!user || !needsAttendance) return;

    // Check localStorage first for instant UI
    const cached = localStorage.getItem(todayKey(user.id));
    if (cached) {
      setAttMarked(true);
      setAttMarkedAt(cached);
      return;
    }

    // Verify with backend
    api.getTodayAttendance().then(data => {
      if (data.marked) {
        const time = data.markedAt || data.loginTime;
        const label = time
          ? new Date(time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          : 'Marked';
        setAttMarked(true);
        setAttMarkedAt(label);
        localStorage.setItem(todayKey(user.id), label);
      } else {
        const isFaceExempt = user.role === 'admin' || user.role === 'superadmin' || user.role === 'walkin' || user.role === 'demo_walkin' || Boolean(user.disableBiometric);
        if (!isFaceExempt) {
          setShowCheckInFaceModal(true);
        } else {
          completeMarkAttendance(user.isWFH || false);
        }
      }
    }).catch(() => {
      const isFaceExempt = user.role === 'admin' || user.role === 'superadmin' || user.role === 'walkin' || user.role === 'demo_walkin' || Boolean(user.disableBiometric);
      if (!isFaceExempt) {
        setShowCheckInFaceModal(true);
      } else {
        completeMarkAttendance(user.isWFH || false);
      }
    });
  }, [user]);



  // Reminder popup — show once per day after 90 seconds if not marked
  useEffect(() => {
    if (!user || !needsAttendance || attMarked) return;
    const alreadyShown = localStorage.getItem(reminderKey(user.id));
    if (alreadyShown) return;

    const timer = setTimeout(() => {
      // Re-check state via closure won't work, use a ref-style approach
      setAttMarked(prev => {
        if (!prev) setShowReminder(true);
        return prev;
      });
    }, 90_000); // 90 seconds after layout mounts
    return () => clearTimeout(timer);
  }, [user, attMarked]);

  // ── Notifications Polling ────────────────────────────────────
  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const data = await api.getNotificationUnreadCount();
      setUnreadCount(data.count || 0);
    } catch { /* ignore */ }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const data = await api.getNotifications({ limit: '20' });
      setNotifications(data.notifications || []);
      // Also update unread count based on fetched list if we want, or rely on the other endpoint
    } catch { /* ignore */ }
  };

  // Poll unread count every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  // ── Call Back Reminders Polling ──────────────────────────────
  const [activeCallBack, setActiveCallBack] = useState<any | null>(null);
  const [dismissedCallBacks, setDismissedCallBacks] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const checkCallBacks = async () => {
      try {
        const res = await api.getCallBackReminders();
        const list = res?.callbacks || [];
        const now = Date.now();

        for (const cand of list) {
          if (!cand.callBack) continue;
          const cbTime = new Date(cand.callBack).getTime();
          if (isNaN(cbTime)) continue;

          // Due now (within 2 hours window) and not snoozed
          const isDueNow = cbTime <= now && (now - cbTime) <= 1000 * 60 * 60 * 2;
          const snoozedUntil = dismissedCallBacks[cand._id] || 0;

          if (isDueNow && now > snoozedUntil) {
            setActiveCallBack(cand);

            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`⏰ Call Back Reminder: ${cand.name}`, {
                  body: `Scheduled call back for ${cand.positionApplied || 'Candidate'} (${cand.phone})`,
                  icon: '/favicon.ico',
                });
              } catch { /* ignore */ }
            }
            break;
          }
        }
      } catch { /* ignore */ }
    };

    checkCallBacks();
    const interval = setInterval(checkCallBacks, 15_000);
    return () => clearInterval(interval);
  }, [user, dismissedCallBacks]);

  // Fetch full list when bell is opened
  useEffect(() => {
    if (notifOpen) {
      fetchNotifications();
    }
  }, [notifOpen, user]);

  // Close WFH picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wfhRef.current && !wfhRef.current.contains(e.target as Node)) {
        setShowWFHPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [showCheckInFaceModal, setShowCheckInFaceModal] = useState(false);
  const [pendingWFH, setPendingWFH] = useState<boolean | null>(null);

  const handleMarkAttendance = (isWFH: boolean) => {
    setPendingWFH(isWFH);
    setShowCheckInFaceModal(true);
  };

  const completeMarkAttendance = async (isWFH: boolean) => {
    if (attMarked || attMarking) return;
    setAttMarking(true);
    setShowWFHPicker(false);
    setShowReminder(false);
    try {
      const data = await api.markAttendance(isWFH);
      const time = data.markedAt || data.loginTime;
      const label = time
        ? new Date(time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : 'Marked';
      setAttMarked(true);
      setAttMarkedAt(label);
      setAttIsWFH(isWFH);
      localStorage.setItem(todayKey(user!.id), label);
      // Mark reminder as shown so it doesn't pop up again today
      localStorage.setItem(reminderKey(user!.id), '1');
    } catch { /* ignore — still disable to avoid double clicks */ }
    finally { setAttMarking(false); }
  };

  const dismissReminder = () => {
    setShowReminder(false);
    if (user) localStorage.setItem(reminderKey(user.id), '1');
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowGlobalResults(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const query = globalSearch.trim();
    if (query.length < 2) {
      setGlobalResults([]);
      setSearchingGlobal(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingGlobal(true);
        const data = await api.searchGlobal({ q: query, limit: '12' });
        setGlobalResults(data.results || []);
        setShowGlobalResults(true);
      } catch {
        setGlobalResults([]);
      } finally {
        setSearchingGlobal(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [globalSearch]);

  const handleGlobalSelect = (result: GlobalSearchResult) => {
    setShowGlobalResults(false);
    setGlobalSearch('');
    navigate(result.path);
  };

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const markReadAndNavigate = async (notif: NotificationItem) => {
    if (!notif.read) {
      try {
        await api.markNotificationRead(notif._id);
        setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch { /* ignore */ }
    }
    
    setNotifOpen(false);
    if (notif.navigateTo) {
      navigate(notif.navigateTo);
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Walk-in users must stay on the walk-in registration page only
  if (user?.role === 'walkin') {
    return <Navigate to="/walk-in" replace />;
  }

  // WFH users must complete OTP before accessing dashboard (disabled on localhost for easier testing)
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (pendingOTP && !isLocalhost) {
    return <Navigate to="/otp" replace />;
  }

  const isRecruiterOrTL = user && ['recruiter', 'tl'].includes(user.role);

  useEffect(() => {
    if (isRecruiterOrTL) {
      const blockCopy = (e: ClipboardEvent) => {
        e.preventDefault();
      };
      const blockContextMenu = (e: MouseEvent) => {
        e.preventDefault();
      };
      const blockKeydown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
          e.preventDefault();
        }
      };
      document.addEventListener('copy', blockCopy);
      document.addEventListener('contextmenu', blockContextMenu);
      document.addEventListener('keydown', blockKeydown);
      return () => {
        document.removeEventListener('copy', blockCopy);
        document.removeEventListener('contextmenu', blockContextMenu);
        document.removeEventListener('keydown', blockKeydown);
      };
    }
  }, [isRecruiterOrTL]);

  return (
    <div 
      className="flex h-screen bg-slate-50 overflow-hidden"
      style={isRecruiterOrTL ? { userSelect: 'none', WebkitUserSelect: 'none' } : undefined}
    >
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-60 lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 w-64 bg-white shadow-xl">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-100 px-4 sm:px-6 h-14 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 text-slate-500 hover:text-slate-700 rounded-md"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div ref={searchRef} className="hidden sm:block relative">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Global search..."
                  value={globalSearch}
                  onChange={e => setGlobalSearch(e.target.value)}
                  onFocus={() => {
                    if (globalResults.length > 0) setShowGlobalResults(true);
                  }}
                  className="bg-transparent text-sm text-slate-600 outline-none w-56 placeholder:text-slate-400"
                />
                {searchingGlobal && (
                  <span className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin inline-block" />
                )}
              </div>

              {showGlobalResults && (globalSearch.trim().length >= 2) && (
                <div className="absolute top-full mt-2 left-0 w-[32rem] max-w-[80vw] bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {globalResults.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500">No matching results</div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                      {globalResults.map((result) => (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleGlobalSelect(result)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                        >
                          <p className="text-sm text-slate-800" style={{ fontWeight: 600 }}>{result.title}</p>
                          {result.subtitle && <p className="text-xs text-slate-500 mt-0.5">{result.subtitle}</p>}
                          <p className="text-[11px] text-green-700 mt-1">{result.module}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* ── Mark Attendance Button ─────────────────────── */}
            {needsAttendance && (
              <div className="relative" ref={wfhRef}>
                {attMarked ? (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs cursor-default select-none" style={{ fontWeight: 500 }}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Attendance Marked</span>
                    {attMarkedAt && <span className="text-emerald-500">· {attMarkedAt}</span>}
                    {attIsWFH && <Wifi className="w-3 h-3 text-blue-500 ml-0.5" />}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowWFHPicker(o => !o)}
                    disabled={attMarking}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors disabled:opacity-60"
                    style={{ fontWeight: 600 }}>
                    {attMarking
                      ? <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> Marking…</>
                      : <><Clock className="w-3.5 h-3.5" /> Mark Attendance</>}
                  </button>
                )}

                {/* WFH picker dropdown */}
                {showWFHPicker && !attMarked && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                    <p className="px-4 py-3 text-xs text-slate-500 border-b border-slate-100" style={{ fontWeight: 600 }}>
                      Where are you working from?
                    </p>
                    <button
                      onClick={() => handleMarkAttendance(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors">
                      <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
                        <Monitor className="w-3.5 h-3.5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-slate-700 text-sm" style={{ fontWeight: 500 }}>Office</p>
                        <p className="text-slate-400 text-xs">Working from office</p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleMarkAttendance(true)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors border-t border-slate-50">
                      <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Wifi className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-slate-700 text-sm" style={{ fontWeight: 500 }}>Work From Home</p>
                        <p className="text-slate-400 text-xs">WFH today</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-50"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white" style={{ fontSize: '9px', fontWeight: 700 }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>Notifications</h3>
                      {unreadCount > 0 && <p className="text-slate-400 text-xs">{unreadCount} unread</p>}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-green-600 hover:text-green-700"
                        style={{ fontWeight: 500 }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-slate-500 text-sm">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map(n => {
                        const { icon: Icon, color, bg } = NOTIF_ICONS[n.type] || NOTIF_ICONS['info'];
                        
                        // Simple time ago calculation
                        const diffMs = Date.now() - new Date(n.createdAt).getTime();
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHrs = Math.floor(diffMins / 60);
                        const diffDays = Math.floor(diffHrs / 24);
                        
                        let timeAgo = 'Just now';
                        if (diffDays > 0) timeAgo = `${diffDays}d ago`;
                        else if (diffHrs > 0) timeAgo = `${diffHrs}h ago`;
                        else if (diffMins > 0) timeAgo = `${diffMins}m ago`;

                        return (
                          <div
                            key={n._id}
                            onClick={() => markReadAndNavigate(n)}
                            className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? 'bg-green-50/30' : ''}`}
                          >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${bg}`}>
                            <Icon className={`w-4 h-4 ${color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-700 text-xs" style={{ fontWeight: n.read ? 400 : 600 }}>{n.title}</p>
                            <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{n.message}</p>
                            <p className="text-slate-400 text-xs mt-1">{timeAgo}</p>
                          </div>
                          {!n.read && <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1.5" />}
                        </div>
                      );
                    }))}
                  </div>
                  <div className="px-4 py-3 border-t border-slate-100 text-center">
                    <button onClick={() => { setNotifOpen(false); navigate('/notifications'); }} className="text-xs text-green-600 hover:text-green-700" style={{ fontWeight: 500 }}>
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center">
                <span className="text-white text-xs" style={{ fontWeight: 600 }}>
                  {user?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:block text-sm text-slate-700" style={{ fontWeight: 500 }}>
                {user?.name.split(' ')[0]}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* ── Attendance Reminder Popup ───────────────────────── */}
      {showReminder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={dismissReminder} />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Close */}
            <button onClick={dismissReminder}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7 text-amber-600" />
            </div>

            <h2 className="text-slate-800 text-base text-center mb-1.5" style={{ fontWeight: 700 }}>
              Don't forget to mark attendance!
            </h2>
            <p className="text-slate-500 text-sm text-center mb-5">
              You haven't marked your attendance yet today.
              It only takes a second — mark it now so your record stays accurate.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleMarkAttendance(false)}
                className="flex flex-col items-center gap-2 p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-colors"
                style={{ fontWeight: 600 }}>
                <div className="w-9 h-9 bg-green-200 rounded-full flex items-center justify-center">
                  <Monitor className="w-4 h-4 text-green-700" />
                </div>
                <span className="text-green-800 text-sm">Office</span>
              </button>
              <button
                onClick={() => handleMarkAttendance(true)}
                className="flex flex-col items-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
                style={{ fontWeight: 600 }}>
                <div className="w-9 h-9 bg-blue-200 rounded-full flex items-center justify-center">
                  <Wifi className="w-4 h-4 text-blue-700" />
                </div>
                <span className="text-blue-800 text-sm">Work From Home</span>
              </button>
            </div>

            <button onClick={dismissReminder}
              className="w-full mt-3 text-slate-400 text-xs hover:text-slate-600 transition-colors py-1"
              style={{ fontWeight: 500 }}>
              Remind me later
            </button>
          </div>
        </div>
      )}

      {/* ── Face Verification Modal for Check-In ───────────────── */}
      {!user?.disableBiometric && user?.role !== 'admin' && user?.role !== 'walkin' && user?.role !== 'demo_walkin' && (
        <FaceVerificationModal
          isOpen={showCheckInFaceModal}
          disableBiometric={user?.disableBiometric}
          onClose={() => {
            setShowCheckInFaceModal(false);
            setPendingWFH(null);
            logout();
            navigate('/login');
          }}
          onSuccess={async (descriptor, photo) => {
            setShowCheckInFaceModal(false);
            if (user && descriptor && descriptor.length > 0 && (!user.faceDescriptor || user.faceDescriptor.length === 0)) {
              try {
                await api.registerFace(descriptor);
                login({ ...user, faceDescriptor: descriptor });
              } catch (err) {
                console.error('Failed to register face:', err);
              }
            }
            completeMarkAttendance(pendingWFH !== null ? pendingWFH : (user?.isWFH || false));
          }}
          actionType="checkin"
          preventCancel={true}
          registeredDescriptor={user?.faceDescriptor}
        />
      )}
      {/* ⏰ CALL BACK REMINDER POPUP MODAL */}
      {activeCallBack && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 text-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-amber-600">
                <Clock className="w-5 h-5 animate-bounce" />
                <h3 className="text-base font-bold">Call Back Reminder!</h3>
              </div>
              <button
                onClick={() => {
                  setDismissedCallBacks(prev => ({ ...prev, [activeCallBack._id]: Date.now() + 1000 * 60 * 5 }));
                  setActiveCallBack(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-900 text-base">{activeCallBack.name}</h4>
                  <p className="text-slate-500 text-xs">{activeCallBack.positionApplied || 'Position N/A'} · JR {activeCallBack.jrNumber || 'N/A'}</p>
                </div>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
                  Scheduled Call Back
                </span>
              </div>

              <div className="pt-2 border-t border-amber-200/50 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Phone</span>
                  <a href={`tel:${activeCallBack.phone}`} className="font-bold text-blue-600 hover:underline flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {activeCallBack.phone}
                  </a>
                </div>
                <div>
                  <span className="text-slate-500 block">Company</span>
                  <span className="font-semibold text-slate-700">{activeCallBack.clientName || 'N/A'}</span>
                </div>
              </div>

              {activeCallBack.comments && (
                <div className="pt-2 border-t border-amber-200/50 text-xs text-slate-600 italic">
                  "{activeCallBack.comments}"
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  const id = activeCallBack._id;
                  setDismissedCallBacks(prev => ({ ...prev, [id]: Date.now() + 1000 * 60 * 60 * 24 }));
                  setActiveCallBack(null);
                  navigate(`/recruiter/candidate/${id}`);
                }}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Phone className="w-4 h-4" /> View Profile / Call Now
              </button>
              <button
                onClick={() => {
                  const id = activeCallBack._id;
                  setDismissedCallBacks(prev => ({ ...prev, [id]: Date.now() + 1000 * 60 * 5 }));
                  setActiveCallBack(null);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-colors"
              >
                Snooze 5m
              </button>
            </div>
          </div>
        </div>
      )}
      <ChatbotWidget mode="internal" />
      <FloatingChatWidget />
    </div>
  );
}
