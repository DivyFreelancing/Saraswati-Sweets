import React, { useState, useEffect } from 'react';
import { X, Phone, User, ArrowRight, CheckCircle2, RotateCcw, ShieldCheck, Edit2, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, sendEmailOtp, verifyEmailOtp, updateUserProfile } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<'EMAIL' | 'OTP' | 'PROFILE'>('EMAIL');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthModalOpen && isAuthenticated) {
      if (!user?.phone || !user?.full_name) {
        setStep('PROFILE');
      }
    } else if (isAuthModalOpen) {
      setStep('EMAIL');
    }
  }, [isAuthModalOpen, isAuthenticated, user]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  if (!isAuthModalOpen) return null;

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
      if (res.needsProfileInfo) {
        setStep('PROFILE');
        showToast('Authentication successful. Please complete your profile.', 'success');
      } else {
        // Modal closed internally in AuthContext if not missing info
        setStep('EMAIL');
        setEmail('');
        setOtp('');
      }
    } else {
      setErrorMessage(res.message || 'Invalid OTP code');
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
      setStep('EMAIL');
      setEmail('');
      setOtp('');
      setFullName('');
      setPhoneNumber('');
      closeAuthModal();
      showToast('Profile saved successfully! Welcome to Saraswati Sweets.', 'success');
    } else {
      setErrorMessage(res.message || 'Failed to save profile');
    }
  };

  const handleClose = () => {
    setErrorMessage('');
    closeAuthModal();
  };

  const getStepTitle = () => {
    if (step === 'EMAIL') return 'Welcome to Saraswati';
    if (step === 'OTP') return 'Verify Email OTP';
    return 'Complete Profile';
  };

  const getStepSubtitle = () => {
    if (step === 'EMAIL') return 'Enter your email to sign in or create an account.';
    if (step === 'OTP') return `We sent a verification code to ${email}`;
    return 'Please provide your name and mobile number to complete your account setup.';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
        <div className="relative w-full max-w-md bg-[#FFFEFC] rounded-3xl border border-[#C79A3D]/40 shadow-[0_20px_60px_-15px_rgba(74,8,14,0.35)] overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Subtle Decorative Wine & Gold Top Accent Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#7A1129] via-[#C79A3D] to-[#7A1129]" />

          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 text-[#6E6259] hover:text-[#221A14] p-2 rounded-full hover:bg-[#F5EAD9] transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 sm:p-8">
            {/* Modal Branding Header */}
            <div className="text-center space-y-2.5 mb-6">
              {/* Official Saraswati Sweets Brand Logo */}
              <div className="flex items-center justify-center">
                <img
                  src="/images/logo.webp"
                  alt="Saraswati Sweets"
                  width="240"
                  height="80"
                  className="h-16 sm:h-20 w-auto object-contain drop-shadow-sm select-none"
                />
              </div>

              <div>
                <h2 className="font-display font-bold text-2xl sm:text-[26px] text-[#221A14] tracking-tight">
                  {getStepTitle()}
                </h2>
                <p className="text-xs sm:text-sm text-[#6E6259] mt-1 max-w-xs mx-auto leading-relaxed">
                  {getStepSubtitle()}
                </p>
              </div>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="mb-5 p-3 rounded-xl bg-[#FAF4DE] border border-[#C79A3D]/50 text-xs text-[#7A1129] font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7A1129] shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* STEP 1: Email Input */}
            {step === 'EMAIL' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#221A14] mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#7A1129]" />
                    <span>Email Address</span>
                  </label>
                  <div className="flex rounded-xl border border-[#E8DCC8] bg-[#FDFBF7] focus-within:border-[#7A1129] focus-within:ring-2 focus-within:ring-[#C79A3D]/25 focus-within:bg-white overflow-hidden shadow-2xs transition-all">
                    <input
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. customer@example.com"
                      className="w-full px-4 py-3 text-sm text-[#221A14] bg-transparent focus:outline-none font-medium placeholder:text-[#6E6259]/60"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[48px] py-3 px-5 rounded-xl bg-[#7A1129] hover:bg-[#5E0D20] text-white font-semibold text-sm transition-all duration-150 shadow-[0_4px_16px_rgba(122,17,41,0.25)] flex items-center justify-center gap-2 active:scale-[0.99] border border-[#C79A3D]/30 mt-2"
                >
                  <span>{isSubmitting ? 'Sending OTP...' : 'Send Verification OTP'}</span>
                  <ArrowRight className="w-4 h-4 text-[#FAF4DE]" />
                </button>

                {/* Trust & Guest Cart Merge Assurance */}
                <div className="pt-2 text-center space-y-2 border-t border-[#E8DCC8]/60 mt-4">
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#6E6259]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D4F]" />
                    <span>Your cart & addresses will automatically sync securely.</span>
                  </div>
                </div>
              </form>
            )}

            {/* STEP 2: OTP Verification */}
            {step === 'OTP' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                {/* Customer summary pill with Change button */}
                <div className="p-3 rounded-xl bg-[#F5EAD9]/60 border border-[#E8DCC8] flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#221A14] block">{email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('EMAIL');
                      setOtp('');
                    }}
                    className="text-[#7A1129] hover:underline font-semibold flex items-center gap-1 p-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Change</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#221A14] mb-1.5">
                    Enter Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    required
                    autoFocus
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full text-center tracking-[0.45em] font-mono font-bold text-2xl py-3.5 rounded-xl border border-[#E8DCC8] bg-[#FDFBF7] focus:bg-white focus:border-[#7A1129] focus:ring-2 focus:ring-[#C79A3D]/25 focus:outline-none transition-all shadow-2xs text-[#7A1129]"
                  />
                </div>

                {/* Verify Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || otp.length < 6}
                  className="w-full min-h-[48px] py-3 px-5 rounded-xl bg-[#7A1129] hover:bg-[#5E0D20] disabled:bg-stone-300 text-white font-semibold text-sm transition-all duration-150 shadow-[0_4px_16px_rgba(122,17,41,0.25)] flex items-center justify-center gap-2 active:scale-[0.99] border border-[#C79A3D]/30"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#FAF4DE]" />
                  <span>{isSubmitting ? 'Verifying...' : 'Verify OTP & Sign In'}</span>
                </button>

                {/* Resend */}
                <div className="pt-2 flex items-center justify-end text-xs">
                  <button
                    type="button"
                    disabled={resendCooldown > 0}
                    onClick={() => {
                      setOtp('');
                      sendEmailOtp(email).then((res) => {
                        if (res.success) {
                          setResendCooldown(60);
                          showToast(`New OTP sent to ${email}`, 'info');
                        }
                      });
                    }}
                    className="text-[#6E6259] hover:text-[#221A14] disabled:opacity-50 flex items-center gap-1 font-medium transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Complete Profile */}
            {step === 'PROFILE' && (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {/* 1. Full Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#221A14] mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#7A1129]" />
                    <span>Your Full Name</span>
                  </label>
                  <div className="flex rounded-xl border border-[#E8DCC8] bg-[#FDFBF7] focus-within:border-[#7A1129] focus-within:ring-2 focus-within:ring-[#C79A3D]/25 focus-within:bg-white overflow-hidden shadow-2xs transition-all">
                    <input
                      type="text"
                      required
                      autoFocus
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar Verma"
                      className="w-full px-4 py-3 text-sm text-[#221A14] bg-transparent focus:outline-none font-medium placeholder:text-[#6E6259]/60"
                    />
                  </div>
                </div>

                {/* 2. Mobile Number (MANDATORY) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#221A14] mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#7A1129]" />
                    <span>Mobile Number</span>
                  </label>
                  <div className="flex rounded-xl border border-[#E8DCC8] bg-[#FDFBF7] focus-within:border-[#7A1129] focus-within:ring-2 focus-within:ring-[#C79A3D]/25 focus-within:bg-white overflow-hidden shadow-2xs transition-all">
                    <span className="px-3.5 py-3 text-sm font-bold text-[#7A1129] bg-[#F5EAD9] border-r border-[#E8DCC8] flex items-center select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="91611 10030"
                      className="w-full px-4 py-3 text-sm text-[#221A14] bg-transparent focus:outline-none font-medium placeholder:text-[#6E6259]/60 tracking-wider"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[48px] py-3 px-5 rounded-xl bg-[#7A1129] hover:bg-[#5E0D20] text-white font-semibold text-sm transition-all duration-150 shadow-[0_4px_16px_rgba(122,17,41,0.25)] flex items-center justify-center gap-2 active:scale-[0.99] border border-[#C79A3D]/30 mt-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#FAF4DE]" />
                  <span>{isSubmitting ? 'Saving Profile...' : 'Complete Profile'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
