import React, { useState, useEffect } from 'react';
import { DockviewLayout } from './DockviewLayout';
import { ResizablePanelRow } from './ResizablePanelRow';

interface StudioWorkspaceProps {
  visualizerContent: React.ReactNode;
  debuggerContent?: React.ReactNode;
  explanationContent: React.ReactNode;
  quizRailContent?: React.ReactNode;
  customizeModeEnabled: boolean;
  storageKey: string;
}

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({
  visualizerContent,
  debuggerContent,
  explanationContent,
  quizRailContent,
  customizeModeEnabled,
  storageKey,
}) => {
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsLargeScreen(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (customizeModeEnabled && isLargeScreen) {
    return (
      <div className="scene-workspace" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        {quizRailContent}
        <div style={{ flex: 1, minHeight: 0 }}>
          <DockviewLayout
            visualizerContent={visualizerContent}
            debuggerContent={debuggerContent}
            explanationContent={explanationContent}
            customizeModeEnabled={customizeModeEnabled}
          />
        </div>
      </div>
    );
  }

  // Normal static layout
  return (
    <div className="scene-workspace">
      <div className="renderer-section">
        {visualizerContent}
      </div>
      
      {quizRailContent && (
        <div className="quiz-rail">
          {quizRailContent}
        </div>
      )}
      
      <ResizablePanelRow
        storageKey={storageKey}
        debuggerPanel={debuggerContent}
        explanationPanel={explanationContent}
      />
    </div>
  );
};
