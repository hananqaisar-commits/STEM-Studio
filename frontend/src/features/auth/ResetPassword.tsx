import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth, ApiError } from '../../contexts/AuthContext';
import './Auth.css';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Invalid or missing password reset token.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword(token, newPassword);
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to reset password. The link may have expired.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card animate-fade-in">
        <div className="auth-header">
          <h1 className="auth-title">Set New Password</h1>
          <p className="auth-subtitle">Please enter your new password below</p>
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
          <div className="input-group">
            <label htmlFor="newPassword">New Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                className="auth-input"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
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
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                id="confirmPassword"
                className="auth-input"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={18} className="spinner" /> : <Lock size={18} />}
            {isSubmitting ? 'Resetting...' : 'Update Password'}
          </button>
        </form>

        <div className="auth-footer">
          Remembered your password? <Link to="/login" className="auth-link">Sign in here</Link>
        </div>
      </div>
    </div>
  );
};
