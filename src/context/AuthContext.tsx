import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useToast } from './ToastContext';

export interface UserProfile {
  id: string;
  phone?: string;
  email?: string;
  full_name: string;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  created_at?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  isAdmin: boolean;
  isStaff: boolean;
  sendEmailOtp: (email: string) => Promise<{ success: boolean; message?: string }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ success: boolean; message?: string; needsProfileInfo?: boolean }>;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signOut: () => Promise<void>;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
  getAuthHeaders: () => Record<string, string>;
  updateUserProfile: (updates: { full_name?: string; phone?: string }) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_STORAGE_KEY = 'saraswati_session_v2';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const { showToast } = useToast();

  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (!token) return {};
    return {
      Authorization: `Bearer ${token}`,
    };
  }, [token]);

  // Sync profile on login
  const syncProfileOnServer = useCallback(async (profile: UserProfile, jwtToken: string) => {
    try {
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          const merged = { ...data.profile, email: profile.email || data.profile.email };
          setUser(merged);
          return merged;
        }
      }
    } catch (err) {
      console.warn('Server profile sync warning:', err);
    }
    return profile;
  }, []);

  // Restore session on mount
  useEffect(() => {
    async function restoreSession() {
      setIsLoading(true);
      try {
        // 1. Check Supabase Auth session if configured
        if (isSupabaseConfigured() && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const jwt = session.access_token;
            setToken(jwt);

            // Fetch profile
            const res = await fetch('/api/auth/profile', {
              headers: { Authorization: `Bearer ${jwt}` },
            });
            if (res.ok) {
              const { profile } = await res.json();
              if (profile) {
                const effectiveEmail = session.user?.email || profile.email;
                const mergedProfile = { ...profile, email: effectiveEmail };
                setUser(mergedProfile);
                localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: jwt, user: mergedProfile }));
              }
            } else if (session.user) {
              const fallbackProfile: UserProfile = {
                id: session.user.id,
                email: session.user.email,
                full_name: (session.user.user_metadata?.full_name as string) || '',
                role: 'CUSTOMER',
              };
              setUser(fallbackProfile);
            }
            setIsLoading(false);
            return;
          }
        }

        // 2. Fallback to localStorage session
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.token && parsed.user) {
            setToken(parsed.token);
            setUser(parsed.user);

            // Verify with server in background
            fetch('/api/auth/profile', {
              headers: { Authorization: `Bearer ${parsed.token}` },
            })
              .then((r) => (r.ok ? r.json() : null))
              .then((data) => {
                if (data?.profile) {
                  const effectiveEmail = parsed.user?.email || data.profile.email;
                  const merged = { ...data.profile, email: effectiveEmail };
                  setUser(merged);
                  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: parsed.token, user: merged }));
                }
              })
              .catch(() => {});
          }
        }
      } catch (err) {
        console.error('Session restore error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  // Send Email OTP
  const sendEmailOtp = async (email: string): Promise<{ success: boolean; message?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Please enter a valid email address' };
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: {
            shouldCreateUser: true,
          }
        });
        if (error) {
          console.warn('Supabase Email OTP warning:', error.message);
          return { success: false, message: error.message };
        } else {
          return { success: true, message: `Verification code sent to ${cleanEmail}` };
        }
      } catch (err: any) {
        console.warn('Supabase OTP error:', err);
        return { success: false, message: 'Network error sending OTP' };
      }
    }

    return { success: false, message: 'Supabase is not configured' };
  };

  // Verify Email OTP
  const verifyEmailOtp = async (email: string, otp: string): Promise<{ success: boolean; message?: string; needsProfileInfo?: boolean }> => {
    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: otp,
          type: 'email',
        });

        if (error) {
          return { success: false, message: 'Invalid or expired OTP. Please request a new code.' };
        }

        if (data.session && data.user) {
          const jwt = data.session.access_token;
          setToken(jwt);

          const synced = await syncProfileOnServer(
            {
              id: data.user.id,
              email: cleanEmail,
              full_name: (data.user.user_metadata?.full_name as string) || '',
              role: 'CUSTOMER',
            },
            jwt
          );

          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: jwt, user: synced }));
          
          const missingInfo = !synced.phone || !synced.full_name;

          if (!missingInfo) {
            setIsAuthModalOpen(false);
            showToast(`Welcome back, ${synced.full_name}!`, 'success');
          }
          
          return { success: true, needsProfileInfo: missingInfo };
        }
      } catch (err) {
        console.warn('Supabase verifyOtp error:', err);
        return { success: false, message: 'Error verifying OTP' };
      }
    }

    return { success: false, message: 'Supabase is not configured' };
  };

  // Sign In with Email & Password (for Admin/Staff at /admin/login)
  const signInWithEmail = async (email: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });

        if (!error && data.session && data.user) {
          const jwt = data.session.access_token;
          setToken(jwt);

          const role = 'CUSTOMER'; // Role is determined by the server
          const synced = await syncProfileOnServer(
            {
              id: data.user.id,
              email: data.user.email,
              full_name: (data.user.user_metadata?.full_name as string) || '',
              role,
            },
            jwt
          );

          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: jwt, user: synced }));
          showToast(`Welcome, ${synced.full_name} (${role})`, 'success');
          return { success: true };
        }
      } catch (err) {
        console.warn('Supabase signInWithPassword error:', err);
      }
    }
    return { success: false, message: 'Invalid email or password' };
  };

  // Sign out
  const signOut = async (): Promise<void> => {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    showToast('You have been logged out safely.', 'info');
  };

  const updateUserProfile = async (updates: { full_name?: string; phone?: string }): Promise<{ success: boolean; message?: string }> => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          const effectiveEmail = user?.email || data.profile.email;
          const merged = { ...data.profile, email: effectiveEmail };
          setUser(merged);
          if (token) {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user: merged }));
          }
          showToast('Profile updated successfully', 'success');
          return { success: true };
        }
      }
      return { success: false, message: 'Failed to update profile' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error updating profile' };
    }
  };

  const role = user?.role || 'CUSTOMER';
  const isAdmin = role === 'ADMIN';
  const isStaff = role === 'STAFF' || role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        role,
        isAdmin,
        isStaff,
        sendEmailOtp,
        verifyEmailOtp,
        signInWithEmail,
        signOut,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        isAuthModalOpen,
        getAuthHeaders,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
