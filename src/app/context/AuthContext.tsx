import { createContext, useContext, useState, ReactNode } from 'react';
import api from '../services/api';

export type Role = 'recruiter' | 'tl' | 'manager' | 'admin' | 'spoc' | 'walkin' | 'demo_walkin' | 'bd' | 'business_developer';

export interface AuthUser {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: Role;
  roles?: Role[];
  isWFH: boolean;
  avatar: string;
  faceDescriptor?: number[];
  disableBiometric?: boolean;
  employeeId?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
  pendingOTP: boolean;
  setPendingOTP: (pending: boolean) => void;
  otpUserId: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
  pendingOTP: false,
  setPendingOTP: () => {},
  otpUserId: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('ats_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [pendingOTP, setPendingOTPState] = useState<boolean>(() => {
    const storedUser = localStorage.getItem('ats_user');
    if (storedUser) {
      const u = JSON.parse(storedUser);
      if (u.isWFH) {
        const verified = sessionStorage.getItem('ats_otp_verified') === 'true';
        return !verified;
      }
    }
    return false;
  });

  const setPendingOTP = (pending: boolean) => {
    setPendingOTPState(pending);
    if (!pending) {
      sessionStorage.setItem('ats_otp_verified', 'true');
    } else {
      sessionStorage.removeItem('ats_otp_verified');
    }
  };

  const login = (u: AuthUser) => {
    setUser(u);
    localStorage.setItem('ats_user', JSON.stringify(u));
    if (u.isWFH) {
      setPendingOTPState(true);
      sessionStorage.removeItem('ats_otp_verified');
    } else {
      setPendingOTPState(false);
    }
  };

  const logout = async () => {
    if (user) {
      const d = new Date().toISOString().split('T')[0];
      localStorage.removeItem(`att_marked_${user.id}_${d}`);
      localStorage.removeItem(`att_reminder_${user.id}_${d}`);
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('att_marked_') || key.startsWith('att_reminder_'))) {
          localStorage.removeItem(key);
        }
      }
    }
    try { await api.logout(); } catch { /* ignore */ }
    setUser(null);
    setPendingOTPState(false);
    sessionStorage.removeItem('ats_otp_verified');
    localStorage.removeItem('ats_user');
    localStorage.removeItem('ats_token');
  };

  const otpUserId = user ? (user.id || user._id || null) : null;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, pendingOTP, setPendingOTP, otpUserId }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export const ROLE_DASHBOARD: Record<Role, string> = {
  recruiter: '/recruiter',
  tl: '/tl',
  manager: '/manager',
  admin: '/admin',
  spoc: '/recruiter',
  walkin: '/walkin/dashboard',
  demo_walkin: '/walkin/demo-registration',
  bd: '/admin',
  business_developer: '/admin',
};
