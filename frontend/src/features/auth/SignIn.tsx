import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Octa, useMascot } from '../../components/mascot';
import '../../components/mascot/Mascot.css';
import './Auth.css';

export const SignIn: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const { state: mascotState, setExpression, setContext } = useMascot();

  useEffect(() => {
    setContext('signin');
  }, [setContext]);

  const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // Replace with real ID

  useEffect(() => {
    // Initialize Google Sign-In
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        context: 'signin',
        ux_mode: 'popup',
      });
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-btn') as HTMLElement,
        { theme: 'outline', size: 'large', type: 'standard', shape: 'pill', text: 'signin_with' }
      );
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
      setError(err?.message || 'Google Sign-In failed.');
      setExpression('confused', { temporary: true, durationMs: 1500 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    setExpression('focused');

    try {
      await login(identifier, password, rememberMe);
      setExpression('happy', { temporary: true, durationMs: 900 });
      setTimeout(() => navigate('/dashboard'), 300);
    } catch (err: any) {
      const message = err?.message || 'Something went wrong. Please try again.';
      setError(message);
      setExpression('confused', { temporary: true, durationMs: 1500, message: 'Oops.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
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
          <p className="auth-subtitle">Sign in to your STEM Studio account</p>
        </div>

        <div className="google-btn-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div id="google-signin-btn"></div>
        </div>

        <div className="auth-divider" style={{ textAlign: 'center', margin: '0 0 1.5rem 0', color: 'var(--color-text-muted)' }}>
          <span>or continue with email</span>
        </div>

        {error && (
          <div className="auth-error animate-fade-in">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="identifier">Email or Username</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                type="text"
                id="identifier"
                className="auth-input"
                placeholder="Email or Username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onFocus={() => setExpression('focused', { temporary: true, durationMs: 1200 })}
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
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setExpression('focused', { temporary: true, durationMs: 1200 })}
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
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={18} className="spinner" /> : <LogIn size={18} />}
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/signup" className="auth-link">Create one now</Link>
        </div>
      </div>
    </div>
  );
};
