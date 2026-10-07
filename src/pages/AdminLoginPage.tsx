import React, { useState } from 'react';
import { Mail, ShieldAlert, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface AdminLoginPageProps {
  onLoginSuccess: () => void;
  onBackToStore: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onBackToStore,
}) => {
  const { sendEmailOtp, verifyEmailOtp, updateUserProfile, user } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<'EMAIL' | 'OTP' | 'PROFILE'>('EMAIL');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Manage cooldown
  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    const res = await sendEmailOtp(cleanEmail);
    setIsSubmitting(false);

    if (res.success) {
      setStep('OTP');
      setResendCooldown(60);
      showToast(res.message || 'OTP sent successfully', 'info');
    } else {
      setErrorMessage(res.message || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (otp.length < 6) {
      setErrorMessage('Please enter the verification code');
      return;
    }

    setIsSubmitting(true);
    const res = await verifyEmailOtp(email, otp);
    setIsSubmitting(false);

    if (res.success) {
      if (res.needsProfileInfo || !user?.full_name || !user?.phone) {
        setStep('PROFILE');
        showToast('Authentication successful. Please complete your staff profile.', 'success');
      } else {
        onLoginSuccess();
      }
    } else {
      setErrorMessage(res.message || 'Invalid or expired OTP');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanName = fullName.trim();
    if (!cleanName) {
      setErrorMessage('Please enter your full name');
      return;
    }

    const clean = phoneNumber.replace(/\D/g, '').slice(-10);
    if (clean.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsSubmitting(true);
    const res = await updateUserProfile({
      full_name: cleanName,
      phone: `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`
    });
    setIsSubmitting(false);

    if (res.success) {
      onLoginSuccess();
    } else {
      setErrorMessage(res.message || 'Failed to save profile');
    }
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
            Operations Portal
          </h1>
          <p className="text-xs text-[#6B6258]">
            {step === 'EMAIL' && 'Enter your staff email address to receive a secure login code.'}
            {step === 'OTP' && `We sent a verification code to ${email}`}
            {step === 'PROFILE' && 'Please complete your staff profile to continue.'}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-[#FAF4DE] border border-[#C9A227]/50 text-xs text-[#8A1538] font-medium flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: EMAIL */}
        {step === 'EMAIL' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[48px] py-3 rounded-xl bg-[#8A1538] hover:bg-[#701029] text-white font-semibold text-sm transition-all duration-150 shadow-sm flex items-center justify-center gap-2"
            >
              <span>{isSubmitting ? 'Sending Code...' : 'Send Login Code'}</span>
              <ArrowRight className="w-4 h-4 text-[#F6E08B]" />
            </button>
          </form>
        )}

        {/* STEP 2: OTP */}
        {step === 'OTP' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1.5">
                Verification Code
              </label>
              <input
                type="text"
                maxLength={8}
                required
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full text-center tracking-[0.45em] font-mono font-bold text-2xl py-3.5 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-[#8A1538] focus:bg-white focus:border-[#8A1538] focus:outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || otp.length < 6}
              className="w-full min-h-[48px] py-3 rounded-xl bg-[#8A1538] hover:bg-[#701029] disabled:bg-stone-300 text-white font-semibold text-sm transition-all duration-150 shadow-sm flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-[#F6E08B]" />
              <span>{isSubmitting ? 'Verifying...' : 'Verify & Sign In'}</span>
            </button>
            
            <div className="pt-2 flex justify-center text-xs">
              <button
                type="button"
                disabled={resendCooldown > 0}
                onClick={() => {
                  setOtp('');
                  sendEmailOtp(email).then((res) => {
                    if (res.success) {
                      setResendCooldown(60);
                      showToast(`New code sent to ${email}`, 'info');
                    }
                  });
                }}
                className="text-[#6E6259] hover:text-[#1F1B16] disabled:opacity-50 transition-colors"
              >
                {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: PROFILE */}
        {step === 'PROFILE' && (
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-sm focus:outline-none focus:border-[#8A1538] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1.5">
                Mobile Number
              </label>
              <div className="flex rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] overflow-hidden">
                <span className="px-3.5 py-2.5 text-sm font-bold text-[#8A1538] bg-[#F5EAD9] border-r border-[#E8DFD2] flex items-center">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="91611 10030"
                  className="w-full px-4 py-2.5 text-sm bg-transparent focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[48px] py-3 rounded-xl bg-[#8A1538] hover:bg-[#701029] text-white font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-[#F6E08B]" />
              <span>Complete Profile & Access Portal</span>
            </button>
          </form>
        )}

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
