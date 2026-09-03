import React from 'react';
import { X, ShieldCheck, FileText, Cookie, Mail } from 'lucide-react';
import './LegalModal.css';

export type LegalDocType = 'privacy' | 'terms' | 'cookies' | null;

interface LegalModalProps {
  docType: LegalDocType;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ docType, onClose }) => {
  if (!docType) return null;

  return (
    <div className="legal-modal-overlay animate-fade-in" onClick={onClose}>
      <div className="legal-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="legal-modal-header">
          <div className="legal-modal-title-row">
            {docType === 'privacy' && <ShieldCheck className="legal-modal-icon" size={22} />}
            {docType === 'terms' && <FileText className="legal-modal-icon" size={22} />}
            {docType === 'cookies' && <Cookie className="legal-modal-icon" size={22} />}
            <div>
              <h2 className="legal-modal-title">
                {docType === 'privacy' && 'Privacy Policy'}
                {docType === 'terms' && 'Terms of Service'}
                {docType === 'cookies' && 'Cookie & Storage Policy'}
              </h2>
              <span className="legal-modal-subtitle">Effective Date: September 2026 • STEM Studio</span>
            </div>
          </div>
          <button className="legal-modal-close-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="legal-modal-body">
          {docType === 'privacy' && (
            <div className="legal-content">
              <section>
                <h3>1. Information We Collect</h3>
                <p>
                  STEM Studio values your privacy. We collect minimal personal data required to deliver an exceptional, interactive learning experience:
                </p>
                <ul>
                  <li><strong>Account Credentials:</strong> Username, email address, and encrypted password hashes.</li>
                  <li><strong>Learning Progress:</strong> Quiz scores, algorithm completion metrics, and streaks stored securely in your account profile.</li>
                  <li><strong>AI Tutor Interactions:</strong> Transient context data (algorithm steps and code snapshots) processed to answer your tutoring queries.</li>
                </ul>
              </section>

              <section>
                <h3>2. How Your Data Is Used</h3>
                <p>
                  We process data solely to visualize computer science concepts, track your educational progress, and provide context-aware AI explanations. We never sell, trade, or monetize your personal information.
                </p>
              </section>

              <section>
                <h3>3. Security & Data Protection</h3>
                <p>
                  Passwords are salted and hashed using industry-standard bcrypt. Authentication tokens use JWTs with automated session expiration.
                </p>
              </section>

              <section>
                <h3>4. Contact Us</h3>
                <p>
                  If you have any questions regarding this Privacy Policy, feel free to reach out to our lead engineer at:
                </p>
                <div className="legal-contact-box">
                  <Mail size={16} />
                  <a href="mailto:hanankaesar316@gmail.com">hanankaesar316@gmail.com</a>
                </div>
              </section>
            </div>
          )}

          {docType === 'terms' && (
            <div className="legal-content">
              <section>
                <h3>1. Acceptance of Terms</h3>
                <p>
                  By accessing or using STEM Studio, you agree to be bound by these Terms of Service. STEM Studio is an educational platform designed for algorithm visualization and data structure mastery.
                </p>
              </section>

              <section>
                <h3>2. Acceptable Use</h3>
                <p>
                  You agree to use STEM Studio strictly for lawful learning purposes. You may not attempt to reverse engineer backend services, execute malicious code payloads, or disrupt platform availability.
                </p>
              </section>

              <section>
                <h3>3. Intellectual Property</h3>
                <p>
                  All custom visualizer engines, step players, mascot assets (Octa), and algorithm interactive canvases are protected trademarks and intellectual property of STEM Studio.
                </p>
              </section>

              <section>
                <h3>4. Contact Support</h3>
                <p>
                  For inquiries or permission requests, please contact:
                </p>
                <div className="legal-contact-box">
                  <Mail size={16} />
                  <a href="mailto:hanankaesar316@gmail.com">hanankaesar316@gmail.com</a>
                </div>
              </section>
            </div>
          )}

          {docType === 'cookies' && (
            <div className="legal-content">
              <section>
                <h3>1. What We Store</h3>
                <p>
                  STEM Studio uses local browser storage (localStorage and sessionStorage) exclusively for functional app operations:
                </p>
                <ul>
                  <li><strong>Auth Tokens:</strong> Secure JWT access and refresh tokens for seamless login persistence.</li>
                  <li><strong>Theme Preferences:</strong> Dark / Light mode UI state selection.</li>
                  <li><strong>Layout State:</strong> Resizable panel widths and drawer states.</li>
                </ul>
              </section>

              <section>
                <h3>2. No Third-Party Tracking</h3>
                <p>
                  We do not use advertising cookies, invasive cross-site tracking pixels, or third-party data brokers.
                </p>
              </section>

              <section>
                <h3>3. Questions</h3>
                <p>
                  For questions regarding client-side storage, contact:
                </p>
                <div className="legal-contact-box">
                  <Mail size={16} />
                  <a href="mailto:hanankaesar316@gmail.com">hanankaesar316@gmail.com</a>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="legal-modal-footer">
          <button className="legal-modal-done-btn" onClick={onClose}>
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
