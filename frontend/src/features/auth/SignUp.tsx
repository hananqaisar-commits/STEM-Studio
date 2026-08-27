import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, UserPlus, User, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Octa, useMascot } from '../../components/mascot';
import '../../components/mascot/Mascot.css';
import './Auth.css';

export const SignUp: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();
  const { state: mascotState, setExpression, setContext } = useMascot();

  useEffect(() => {
    setContext('signup');
  }, [setContext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side check: the two passwords must match before we hit the API
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter them.');
      return;
    }

    setIsSubmitting(true);
    setExpression('focused');

    try {
      await signup(username, email, password, firstName, lastName);
      setSuccess('Account created successfully! Redirecting to login...');
      setExpression('happy', { temporary: true, durationMs: 2000 });
      setTimeout(() => navigate('/login'), 2000);
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
          <h1 className="auth-title">Create an account</h1>
          <p className="auth-subtitle">Join STEM Studio to start your journey</p>
        </div>

        {error && (
          <div className="auth-error animate-fade-in">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="auth-success animate-fade-in">
            <CheckCircle size={16} />
            <span>{success}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-row">
            <div className="input-group">
              <label htmlFor="firstName">First Name</label>
              <div className="input-wrapper">
                <User className="input-icon" size={18} />
                <input
                  type="text"
                  id="firstName"
                  className="auth-input"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onFocus={() => setExpression('focused', { temporary: true, durationMs: 1000 })}
                  required
                  maxLength={50}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="lastName">Last Name</label>
              <div className="input-wrapper">
                <User className="input-icon" size={18} />
                <input
                  type="text"
                  id="lastName"
                  className="auth-input"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onFocus={() => setExpression('focused', { temporary: true, durationMs: 1000 })}
                  required
                  maxLength={50}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="username">Username</label>
            <div className="input-wrapper">
              <User className="input-icon" size={18} />
              <input
                type="text"
                id="username"
                className="auth-input"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setExpression('focused', { temporary: true, durationMs: 1000 })}
                required
                minLength={3}
                maxLength={50}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                type="email"
                id="email"
                className="auth-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setExpression('focused', { temporary: true, durationMs: 1000 })}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Create Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className="auth-input"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setExpression('focused', { temporary: true, durationMs: 1000 })}
                required
                minLength={8}
                maxLength={128}
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
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">Retype Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                className="auth-input"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={() => setExpression('focused', { temporary: true, durationMs: 1000 })}
                required
                minLength={8}
                maxLength={128}
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={18} className="spinner" /> : <UserPlus size={18} />}
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login" className="auth-link">Sign in here</Link>
        </div>
      </div>
    </div>
  );
};
