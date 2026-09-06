import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Lock, LogIn, X } from 'lucide-react';
import { useAuth } from './AuthContext';
import './AuthPrompt.css';

type ProtectedAction = () => void;

interface AuthPromptContextValue {
  requireAuth: (action: ProtectedAction, message?: string) => boolean;
}

const AuthPromptContext = createContext<AuthPromptContextValue | undefined>(undefined);

export const AuthPromptProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const pendingActionRef = useRef<ProtectedAction | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('Sign in to continue and save your learning progress.');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const close = useCallback(() => {
    setIsOpen(false);
    setError('');
    pendingActionRef.current = null;
  }, []);

  const requireAuth = useCallback((action: ProtectedAction, promptMessage?: string) => {
    if (isAuthenticated) {
      action();
      return true;
    }

    pendingActionRef.current = action;
    setMessage(promptMessage ?? 'Sign in to continue and save your learning progress.');
    setError('');
    setIsOpen(true);
    return false;
  }, [isAuthenticated]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(identifier, password, rememberMe);
      const action = pendingActionRef.current;
      setIsOpen(false);
      pendingActionRef.current = null;
      window.setTimeout(() => action?.(), 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPromptContext.Provider value={{ requireAuth }}>
      {children}
      {isOpen && (
        <div className="auth-prompt-backdrop" role="presentation" onMouseDown={close}>
          <section className="auth-prompt-card" role="dialog" aria-modal="true" aria-labelledby="auth-prompt-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="auth-prompt-close" onClick={close} aria-label="Close sign-in prompt"><X size={18} /></button>
            <div className="auth-prompt-icon"><Lock size={20} /></div>
            <h2 id="auth-prompt-title">Continue your learning</h2>
            <p>{message}</p>
            {error && <div className="auth-prompt-error"><AlertCircle size={16} />{error}</div>}
            <form onSubmit={handleSubmit} className="auth-prompt-form">
              <label>Username or email<input value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" required disabled={isSubmitting} /></label>
              <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required disabled={isSubmitting} /></label>
              <label className="auth-prompt-remember"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /> Remember me</label>
              <button type="submit" disabled={isSubmitting}><LogIn size={17} />{isSubmitting ? 'Signing in…' : 'Sign in and continue'}</button>
              <button
                type="button"
                className="auth-prompt-signup"
                onClick={() => {
                  close();
                  navigate('/signup');
                }}
                disabled={isSubmitting}
              >
                Don't have an account? <span>Create an account</span>
              </button>
            </form>
          </section>
        </div>
      )}
    </AuthPromptContext.Provider>
  );
};

export const useAuthPrompt = () => {
  const context = useContext(AuthPromptContext);
  if (!context) throw new Error('useAuthPrompt must be used within an AuthPromptProvider');
  return context;
};
