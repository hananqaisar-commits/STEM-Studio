import React from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Initializing STEM Studio...' }) => {
  return (
    <div className="loading-container">
      <div className="loading-content animate-fade-in">
        {/* User needs to place the transparent logo in frontend/public/logo.png */}
        <div className="logo-wrapper">
          <img 
            src="/logo.png" 
            alt="STEM Studio Logo" 
            className="loading-logo pulse-animation"
            onError={(e) => {
              // Fallback if logo is not placed yet
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="hidden fallback-logo pulse-animation">
            <span>ST</span>
          </div>
        </div>
        
        <div className="loading-spinner"></div>
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
};
