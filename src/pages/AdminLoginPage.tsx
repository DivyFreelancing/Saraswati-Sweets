import React, { useState } from 'react';
import { Lock, Mail, ShieldAlert, ArrowRight, Store, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AdminLoginPageProps {
  onLoginSuccess: () => void;
  onBackToStore: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onBackToStore,
}) => {
  const { signInWithEmail, isStaff } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }

    setIsSubmitting(true);
    const res = await signInWithEmail(email, password);
    setIsSubmitting(false);

    if (res.success) {
      onLoginSuccess();
    } else {
      setErrorMessage(res.message || 'Authentication failed. Check your staff credentials.');
    }
  };

  const handleFillDemoAdmin = () => {
    setEmail('admin@saraswatisweets.in');
    setPassword('owner1234');
  };

  const handleFillDemoStaff = () => {
    setEmail('staff@saraswatisweets.in');
    setPassword('staff1234');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#E8DFD2] shadow-xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center">
            <img
              src="/images/logo.png"
              alt="Saraswati Sweets"
              className="h-16 w-auto object-contain drop-shadow-xs select-none"
            />
          </div>
          <h1 className="font-display font-bold text-2xl text-[#1F1B16]">
            Staff & Shop Owner Login
          </h1>
          <p className="text-xs text-[#6B6258]">
            Role-protected portal for Saraswati Sweets store operations in Barabanki.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-[#FAF4DE] border border-[#C9A227]/50 text-xs text-[#8A1538] font-medium flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1.5">
              Staff Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#6B6258] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@saraswatisweets.in"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-sm focus:outline-none focus:border-[#8A1538] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1.5">
              Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#6B6258] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-sm focus:outline-none focus:border-[#8A1538] focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[48px] py-3 rounded-xl bg-[#8A1538] hover:bg-[#701029] text-white font-semibold text-sm transition-all duration-150 shadow-sm flex items-center justify-center gap-2"
          >
            <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Operations Portal'}</span>
            <ArrowRight className="w-4 h-4 text-[#F6E08B]" />
          </button>
        </form>

        {/* Quick Demo Credentials for Reviewers */}
        <div className="pt-4 border-t border-[#E8DFD2] space-y-2">
          <div className="text-[11px] font-bold text-[#6B6258] uppercase tracking-wider text-center">
            Quick Demo Credentials:
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleFillDemoAdmin}
              className="py-1.5 px-2.5 rounded-lg border border-[#E8DFD2] bg-[#FBF7F1] hover:bg-[#F3EBE0] text-xs font-medium text-[#1F1B16] transition-colors"
            >
              Fill Owner (ADMIN)
            </button>
            <button
              type="button"
              onClick={handleFillDemoStaff}
              className="py-1.5 px-2.5 rounded-lg border border-[#E8DFD2] bg-[#FBF7F1] hover:bg-[#F3EBE0] text-xs font-medium text-[#1F1B16] transition-colors"
            >
              Fill Counter (STAFF)
            </button>
          </div>
        </div>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={onBackToStore}
            className="text-xs text-[#6B6258] hover:text-[#8A1538] font-medium"
          >
            ← Back to Customer Store
          </button>
        </div>
      </div>
    </div>
  );
};
