import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, Minimize2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useTutorContext } from '../../contexts/TutorContext';
import './FullScreenCanvasModal.css';

interface FullScreenCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  toolbarControls?: React.ReactNode;
  playbackControls?: React.ReactNode;
  /** The normal-state explanation card, reused unchanged in fullscreen. */
  explanationPanel?: React.ReactNode;
  /** Optional floating controller rendered inside the fullscreen body. */
  floatingControls?: React.ReactNode;
  children: React.ReactNode;
}

export const FullScreenCanvasModal: React.FC<FullScreenCanvasModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle = 'Interactive DSA Inspector',
  toolbarControls,
  playbackControls,
  explanationPanel,
  floatingControls,
  children,
}) => {
  const { actualTheme } = useTheme();
  const { isTutorOpen } = useTutorContext();
  const [isExplanationVisible, setIsExplanationVisible] = useState(false);

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
    <div className={`fs-modal-overlay theme-${actualTheme} ${isTutorOpen ? 'tutor-open' : ''} animate-fade-in`}>
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

        {explanationPanel && (
          <button
            className="fs-icon-btn fs-explanation-toggle"
            type="button"
            onClick={() => setIsExplanationVisible((visible) => !visible)}
            aria-pressed={isExplanationVisible}
          >
            <Info size={15} />
            <span>{isExplanationVisible ? 'Hide Explanation Card' : 'Show Explanation Card'}</span>
          </button>
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
        {floatingControls}
        <div className="fs-workspace-scrollable">
          {isExplanationVisible && explanationPanel && (
            <section className="fs-explanation-card" aria-label="Explanation card">
              {explanationPanel}
            </section>
          )}
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
