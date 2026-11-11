import React from 'react';
import { ShieldCheck, Lock, Mail, User, KeyRound } from 'lucide-react';
import { Button, Card } from '../components/ui';

export function AuthPage({
  authMode = 'login',
  setAuthMode,
  authForm = { name: '', email: '', password: '' },
  setAuthForm,
  authRememberMe = true,
  setAuthRememberMe,
  authError = '',
  setAuthError,
  authLoading = false,
  handleAuthSubmit,
  forgotStep = 1,
  setForgotStep,
  forgotEmail = '',
  setForgotEmail,
  forgotNewPassword = '',
  setForgotNewPassword,
  forgotSuccess = '',
  setForgotSuccess,
  handleForgotPasswordSubmit,
  KlarityLogo
}) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col justify-center items-center p-4">
      <Card className="w-full max-w-md p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-[12px] bg-[#1B4B91]/10 text-[#1B4B91] flex items-center justify-center mb-3">
            {KlarityLogo ? <KlarityLogo className="w-7 h-7 text-[#1B4B91]" /> : <ShieldCheck className="w-7 h-7" />}
          </div>
          <h1 className="font-serif text-[26px] font-semibold text-[var(--ink)]">
            {authMode === 'login'
              ? 'Sign in to Klarity'
              : authMode === 'register'
              ? 'Create your Klarity account'
              : 'Reset your password'}
          </h1>
          <p className="text-[15px] font-medium text-[var(--muted)] mt-1">
            {authMode === 'login'
              ? 'Clear, calm household finance and retirement planning.'
              : authMode === 'register'
              ? 'Set up your private household finance workspace.'
              : 'Enter your account email to set a new password.'}
          </p>
        </div>

        {authError && (
          <div className="mb-4 p-3.5 rounded-[8px] bg-[#B91C1C]/10 border border-[#B91C1C]/25 text-[#B91C1C] text-[13px] font-medium">
            {authError}
          </div>
        )}

        {forgotSuccess && (
          <div className="mb-4 p-3.5 rounded-[8px] bg-[#15803D]/10 border border-[#15803D]/25 text-[#15803D] text-[13px] font-medium">
            {forgotSuccess}
          </div>
        )}

        {authMode === 'forgot' ? (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="forgot-email-input" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
                Account email
              </label>
              <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2.5">
                <Mail className="w-4 h-4 text-[var(--muted)] shrink-0" />
                <input
                  id="forgot-email-input"
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-transparent outline-none w-full text-[15px] font-medium text-[var(--ink)]"
                />
              </div>
            </div>

            {forgotStep === 2 && (
              <div>
                <label htmlFor="forgot-new-password" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
                  New password
                </label>
                <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2.5">
                  <KeyRound className="w-4 h-4 text-[var(--muted)] shrink-0" />
                  <input
                    id="forgot-new-password"
                    type="password"
                    required
                    minLength={6}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="bg-transparent outline-none w-full text-[15px] font-medium text-[var(--ink)]"
                  />
                </div>
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" disabled={authLoading}>
              {authLoading
                ? 'Please wait...'
                : forgotStep === 1
                ? 'Verify email'
                : 'Reset password'}
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setForgotStep(1);
                  setAuthError('');
                  setForgotSuccess('');
                }}
                className="text-[13px] font-semibold text-[#1B4B91] hover:underline cursor-pointer"
              >
                Back to sign in
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label htmlFor="auth-name-input" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
                  Full name
                </label>
                <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2.5">
                  <User className="w-4 h-4 text-[var(--muted)] shrink-0" />
                  <input
                    id="auth-name-input"
                    type="text"
                    required
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    placeholder="Your name"
                    className="bg-transparent outline-none w-full text-[15px] font-medium text-[var(--ink)]"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-email-input" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
                Email address
              </label>
              <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2.5">
                <Mail className="w-4 h-4 text-[var(--muted)] shrink-0" />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  placeholder="you@example.com"
                  className="bg-transparent outline-none w-full text-[15px] font-medium text-[var(--ink)]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="auth-password-input" className="text-[13px] font-medium text-[var(--ink)]">
                  Password
                </label>
                {authMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot');
                      setAuthError('');
                    }}
                    className="text-[13px] font-medium text-[#1B4B91] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2.5">
                <Lock className="w-4 h-4 text-[var(--muted)] shrink-0" />
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  placeholder="Enter your password"
                  className="bg-transparent outline-none w-full text-[15px] font-medium text-[var(--ink)]"
                />
              </div>
            </div>

            {authMode === 'login' && (
              <div className="flex items-center justify-between">
                <label htmlFor="auth-remember-me" className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--ink)] cursor-pointer">
                  <input
                    id="auth-remember-me"
                    type="checkbox"
                    checked={authRememberMe}
                    onChange={(e) => setAuthRememberMe(e.target.checked)}
                    className="rounded border-[var(--line)] accent-[#1B4B91]"
                  />
                  <span>Keep me signed in</span>
                </label>
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" disabled={authLoading}>
              {authLoading
                ? 'Please wait...'
                : authMode === 'login'
                ? 'Sign in'
                : 'Create account'}
            </Button>

            <div className="pt-3 border-t border-[var(--line)] text-center">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                  setAuthError('');
                }}
                className="text-[13px] font-semibold text-[#1B4B91] hover:underline cursor-pointer"
              >
                {authMode === 'login'
                  ? "Don't have an account? Create one"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

export default AuthPage;
