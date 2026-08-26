import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Minimize2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import './FullScreenCanvasModal.css';

interface FullScreenCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  toolbarControls?: React.ReactNode;
  playbackControls?: React.ReactNode;
  children: React.ReactNode;
}

export const FullScreenCanvasModal: React.FC<FullScreenCanvasModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle = 'Interactive DSA Inspector',
  toolbarControls,
  playbackControls,
  children,
}) => {
  const { actualTheme } = useTheme();

  // Trigger native browser fullscreen
  useEffect(() => {
    if (isOpen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isOpen) {
        onClose();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className={`fs-modal-overlay theme-${actualTheme} animate-fade-in`}>
      {/* Top Floating Glassmorphic Header Toolbar */}
      <header className="fs-modal-header">
        <div className="fs-header-branding">
          <span className="fs-modal-title">{title}</span>
          <span className="fs-modal-subtitle">{subtitle}</span>
        </div>

        {/* Custom Category Operations Toolbar */}
        {toolbarControls && (
          <div className="fs-modal-toolbar">
            {toolbarControls}
          </div>
        )}

        <div className="fs-header-actions">
          {/* Exit Fullscreen Button */}
          <button className="fs-icon-btn exit-fs-btn" onClick={onClose} title="Exit Fullscreen Mode">
            <Minimize2 size={15} />
            <span>Exit Fullscreen</span>
          </button>
        </div>
      </header>

      {/* Main Canvas Scrollable Workspace */}
      <main className="fs-modal-body">
        <div className="fs-workspace-scrollable">
          {children}
        </div>
      </main>

      {/* Bottom Floating Playback Player Bar */}
      {playbackControls && (
        <footer className="fs-modal-footer">
          {playbackControls}
        </footer>
      )}
    </div>,
    document.body
  );
};
