import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { DockviewReact } from 'dockview-react';
import type {
  DockviewReadyEvent,
  IDockviewPanelProps,
  DockviewApi,
} from 'dockview-react';
import 'dockview/dist/styles/dockview.css';
import './DockviewLayout.css';

const LOCAL_STORAGE_KEY = 'stem-studio-dockview-layout';

// ─── Content Store ──────────────────────────────────────────────────────────
// Dockview panel components can't easily receive updated React nodes via params
// (the panel mount lifecycle isn't react-driven). We use a context store so 
// each panel wrapper subscribes to the latest content reactively.

interface ContentStore {
  visualizer: React.ReactNode;
  debugger: React.ReactNode | null;
  explanation: React.ReactNode | null;
}

const ContentContext = createContext<ContentStore>({
  visualizer: null,
  debugger: null,
  explanation: null,
});

// ─── Panel Wrappers ──────────────────────────────────────────────────────────

const VisualizerPanel: React.FC<IDockviewPanelProps> = () => {
  const { visualizer } = useContext(ContentContext);
  return <div className="dockview-panel-wrapper">{visualizer}</div>;
};

const DebuggerPanel: React.FC<IDockviewPanelProps> = () => {
  const { debugger: dbg } = useContext(ContentContext);
  return <div className="dockview-panel-wrapper">{dbg}</div>;
};

const ExplanationPanel: React.FC<IDockviewPanelProps> = () => {
  const { explanation } = useContext(ContentContext);
  return <div className="dockview-panel-wrapper">{explanation}</div>;
};

// Stable components object (defined outside component to avoid re-renders)
const COMPONENTS = {
  visualizerPanel: VisualizerPanel,
  debuggerPanel: DebuggerPanel,
  explanationPanel: ExplanationPanel,
};

// ─── Main Component ──────────────────────────────────────────────────────────

interface DockviewLayoutProps {
  visualizerContent: React.ReactNode;
  debuggerContent?: React.ReactNode | null;
  explanationContent?: React.ReactNode | null;
  customizeModeEnabled: boolean;
  /** Called when reset button is clicked — parent handles clearing localStorage */
  onResetLayout?: () => void;
}

export const DockviewLayout: React.FC<DockviewLayoutProps> = ({
  visualizerContent,
  debuggerContent,
  explanationContent,
  customizeModeEnabled,
}) => {
  const apiRef = useRef<DockviewApi | undefined>(undefined);
  const hasSetupListeners = useRef(false);

  const saveLayout = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    try {
      const layout = api.toJSON();
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(layout));
    } catch (e) {
      console.warn('[DockviewLayout] Could not save layout:', e);
    }
  }, []);

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      apiRef.current = event.api;

      // Try to restore saved layout
      const savedLayout = localStorage.getItem(LOCAL_STORAGE_KEY);
      let restoredFromJSON = false;
      if (savedLayout) {
        try {
          event.api.fromJSON(JSON.parse(savedLayout));
          restoredFromJSON = true;
        } catch (e) {
          console.warn('[DockviewLayout] Saved layout invalid, using default:', e);
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
      }

      // Set up default layout if nothing was restored
      if (!restoredFromJSON) {
        const visualizerPanel = event.api.addPanel({
          id: 'visualizer',
          component: 'visualizerPanel',
          title: '🎬 Visualizer',
          minimumWidth: 300,
          minimumHeight: 200,
        });

        event.api.addPanel({
          id: 'explanation',
          component: 'explanationPanel',
          title: '📖 Explanation',
          position: { direction: 'right', referencePanel: visualizerPanel },
          minimumWidth: 250,
          minimumHeight: 200,
        });

        if (debuggerContent !== null && debuggerContent !== undefined) {
          event.api.addPanel({
            id: 'debugger',
            component: 'debuggerPanel',
            title: '🛠 Debugger',
            position: { direction: 'below', referencePanel: visualizerPanel },
            minimumWidth: 300,
            minimumHeight: 150,
          });
        }
      }

      // Set up save-on-change listeners (only once)
      if (!hasSetupListeners.current) {
        hasSetupListeners.current = true;
        event.api.onDidMovePanel(saveLayout);
        event.api.onDidAddPanel(saveLayout);
        event.api.onDidRemovePanel(saveLayout);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saveLayout, debuggerContent !== null && debuggerContent !== undefined]
  );

  const contentValue: ContentStore = {
    visualizer: visualizerContent,
    debugger: debuggerContent ?? null,
    explanation: explanationContent ?? null,
  };

  return (
    <ContentContext.Provider value={contentValue}>
      <div
        className={`dockview-layout-container ${customizeModeEnabled ? 'customizing' : ''}`}
      >
        <DockviewReact
          components={COMPONENTS}
          onReady={onReady}
          className="dockview-theme-abyss"
          disableFloatingGroups={true}
        />
      </div>
    </ContentContext.Provider>
  );
};

export const resetDockviewLayout = () => {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
};

export default DockviewLayout;
