import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import './Auth.css';

export const ForgotPassword: React.FC = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // API Call will go here
    setIsSubmitted(true);
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card animate-fade-in">
        <div className="auth-header">
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">
            {isSubmitted 
              ? "Check your email for reset instructions." 
              : "Enter your email and we'll send you a recovery link."}
          </p>
        </div>

        {!isSubmitted ? (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={18} />
                <input
                  type="email"
                  id="email"
                  className="auth-input"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-button">
              <Send size={18} />
              Send Recovery Link
            </button>
          </form>
        ) : (
          <div className="auth-form">
            <Link to="/login" className="auth-button" style={{ textDecoration: 'none' }}>
              Return to Login
            </Link>
          </div>
        )}

        <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
          <Link to="/login" className="auth-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={16} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
