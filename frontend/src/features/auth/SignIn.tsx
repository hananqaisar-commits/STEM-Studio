import { useEffect, useState } from 'react';
import { SEOHead } from '../../components/common/SEOHead';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, Loader2, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getRememberedEmail } from '../../api/authPreferences';
import { Octa, useMascot } from '../../components/mascot';
import '../../components/mascot/Mascot.css';
import './Auth.css';

declare global {
  interface Window {
    google?: any;
  }
}

export const SignIn: React.FC = () => {
  const [email, setEmail] = useState(getRememberedEmail);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [ownerMode, setOwnerMode] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState('');
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, loginAsOwner, loginWithGoogle, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const { state: mascotState, setExpression, setContext } = useMascot();

  useEffect(() => {
    setContext('signin');
  }, [setContext]);

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    // Initialize Google Sign-In only if a valid client ID is configured
    if (GOOGLE_CLIENT_ID && window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        context: 'signin',
        ux_mode: 'popup',
      });
      const btnEl = document.getElementById('google-signin-btn');
      if (btnEl) {
        window.google.accounts.id.renderButton(btnEl, {
          theme: 'outline', size: 'large', type: 'standard', shape: 'pill', text: 'signin_with',
        });
      }
    }
  }, []);

  const handleGoogleResponse = async (response: any) => {
    setError('');
    setIsSubmitting(true);
    setExpression('focused');
    try {
      await loginWithGoogle(response.credential, GOOGLE_CLIENT_ID, rememberMe);
      setExpression('happy', { temporary: true, durationMs: 900 });
      setTimeout(() => navigate('/dashboard'), 300);
    } catch (err: any) {
      const msg = typeof err?.message === 'string' ? err.message : 'Google Sign-In failed.';
      setError(msg);
      setExpression('confused', { temporary: true, durationMs: 1500 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResendStatus('');
    setShowResendVerification(false);
    setIsSubmitting(true);
    setExpression('focused');

    try {
      if (ownerMode) await loginAsOwner(email, password, mfaCode);
      else await login(email, password, rememberMe);
      setExpression('happy', { temporary: true, durationMs: 900 });
      setTimeout(() => navigate(ownerMode ? '/dashboard/owner' : '/dashboard'), 300);
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : 'Something went wrong. Please try again.';
      setError(message);
      setShowResendVerification(!ownerMode && message.toLowerCase().includes('verify your email'));
      setExpression('confused', { temporary: true, durationMs: 1500, message: 'Oops.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim() || isResendingVerification) return;
    setIsResendingVerification(true);
    setError('');
    setResendStatus('');
    try {
      setResendStatus(await resendVerificationEmail(email));
    } catch (err: any) {
      setError(typeof err?.message === 'string' ? err.message : 'Could not resend the verification email.');
    } finally {
      setIsResendingVerification(false);
    }
  };

  return (
    <div className="auth-page-container">
      <SEOHead title="Sign In | STEM Studio" description="Sign in to your STEM Studio account." noIndex={true} />
      <div className="auth-card animate-fade-in auth-card-with-mascot">
        <div className="mascot-auth-jump">
          <Octa expression={mascotState.expression} size="medium" />
          {mascotState.message && (
            <span className="mascot-speech-bubble">{mascotState.message}</span>
          )}
        </div>
        <div className="auth-header">
          <img src="/logo.png" alt="STEM Studio" className="auth-logo" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">{ownerMode ? 'Owner access requires your password and authenticator code.' : 'Sign in to your STEM Studio account'}</p>
        </div>

        {GOOGLE_CLIENT_ID && !ownerMode && (
          <div className="google-btn-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div id="google-signin-btn"></div>
          </div>
        )}

        {GOOGLE_CLIENT_ID && !ownerMode && (
          <div className="auth-divider" style={{ textAlign: 'center', margin: '0 0 1.5rem 0', color: 'var(--color-text-muted)' }}>
            <span>or sign in with email</span>
          </div>
        )}

        {error && (
          <div className="auth-error animate-fade-in">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        {showResendVerification && !ownerMode && (
          <button
            className="auth-resend-verification"
            type="button"
            onClick={() => void handleResendVerification()}
            disabled={isResendingVerification || !email.trim()}
          >
            {isResendingVerification ? 'Sending verification email…' : 'Resend verification email'}
          </button>
        )}
        {resendStatus && <p className="auth-success" role="status">{resendStatus}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <fieldset className="auth-signin-mode">
            <legend>Account type</legend>
            <button
              type="button"
              className={!ownerMode ? 'selected' : ''}
              onClick={() => { setOwnerMode(false); setMfaCode(''); setError(''); setShowResendVerification(false); setResendStatus(''); }}
              aria-pressed={!ownerMode}
              disabled={isSubmitting}
            >
              <User size={16} aria-hidden="true" /> Sign in as User
            </button>
            <button
              type="button"
              className={ownerMode ? 'selected' : ''}
              onClick={() => { setOwnerMode(true); setError(''); setShowResendVerification(false); setResendStatus(''); }}
              aria-pressed={ownerMode}
              disabled={isSubmitting}
            >
              <ShieldCheck size={16} aria-hidden="true" /> Sign in as Owner
            </button>
          </fieldset>
          <div className="input-group">
            <label htmlFor="email">Email address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                type="email"
                id="email"
                name="email"
                className="auth-input"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setShowResendVerification(false); setResendStatus(''); }}
                onFocus={() => setExpression('focused', { temporary: true, durationMs: 1200 })}
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                inputMode="email"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setExpression('focused', { temporary: true, durationMs: 1200 })}
                autoComplete="current-password"
                required
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="auth-options">
              {!ownerMode && <label className="remember-me">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                <span>Keep me signed in (up to 30 days)</span>
              </label>}
              <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
            </div>
          </div>

          {ownerMode && (
            <div className="input-group">
              <label htmlFor="owner-mfa-code">Authenticator code</label>
              <div className="input-wrapper">
                <ShieldCheck className="input-icon" size={18} />
                <input
                  type="text"
                  id="owner-mfa-code"
                  name="one-time-code"
                  className="auth-input"
                  placeholder="6-digit code"
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <p className="auth-owner-note">Use the current code from the authenticator app enrolled when the owner account was provisioned.</p>
            </div>
          )}

          <button type="submit" className="auth-button" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={18} className="spinner" /> : <LogIn size={18} />}
            {isSubmitting ? 'Signing in...' : ownerMode ? 'Verify and enter Owner Center' : 'Sign In'}
          </button>
        </form>

        {!ownerMode && <div className="auth-footer">
          Don't have an account? <Link to="/signup" className="auth-link">Create one now</Link>
        </div>}
      </div>
    </div>
  );
};
