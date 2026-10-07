import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderTree, RotateCcw, ChevronLeft, ChevronRight, Maximize2, Minimize2,
  BookOpen, Terminal as TerminalIcon, Sparkles, ArrowLeft, Info, HelpCircle,
  MessageSquare
} from 'lucide-react';
import { VFSTreeVisualizer } from './VFSTreeVisualizer';
import { VFSTerminal } from './VFSTerminal';
import { VimNanoModal } from './VimNanoModal';
import { createInitialVFS, type VFSSnapshot, getAbsolutePath } from './vfs';
import { executeVFSCommand, type CommandExecutionResult } from './vfsInterpreter';
import { useTutorContext } from '../../../contexts/TutorContext';

import { VisualizerHeader } from '../../../components/layout/VisualizerHeader';
import { SEOHead } from '../../../components/common/SEOHead';
import { getSEOForRoute } from '../../../data/seoMetadata';
import { VisualizerActions } from '../../../components/layout/VisualizerActions';
import { FloatingController } from '../../../components/controls/FloatingController';
import { ExplanationPanel } from '../../../components/layout/ExplanationPanel';
import { ResizablePanelRow } from '../../../components/layout/ResizablePanelRow';
import { TheoryPanel } from '../../../components/layout/TheoryPanel';
import { FullScreenCanvasModal } from '../../../components/layout/FullScreenCanvasModal';
import { QuizDock } from '../../../components/quiz/QuizDock';
import { useQuizSession } from '../../../hooks/useQuizSession';
import { buildOSQuizCheckpoints, buildOSRevisionData } from './osQuizAdapter';
import type { QuizCadence } from '../../../engine/types/Quiz';
import { CATEGORY_TOPICS } from '../../../data/categoryTopics';

import '../../../features/complexity/Complexity.css';
import '../linuxModule.css';

export const FileSystemPage: React.FC = () => {
  const navigate = useNavigate();
  const { toggleTutor, setTutorContext } = useTutorContext();

  // VFS Single Source of Truth Snapshot State
  const [snapshot, setSnapshot] = useState<VFSSnapshot>(() => createInitialVFS());

  // Step History Array for Back/Forward Step Controls
  const [stepHistory, setStepHistory] = useState<CommandExecutionResult['stepRecord'][]>([
    {
      command: 'system init',
      diff: 'Initialized default FHS hierarchy',
      explanation: 'Linux Virtual File System initialized with standard FHS directory tree (/etc, /home, /var, /tmp with sticky bit).',
      targetNodeId: 'root',
    },
  ]);
  const [snapshotHistory, setSnapshotHistory] = useState<VFSSnapshot[]>([createInitialVFS()]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Terminal Output History
  const [terminalHistory, setTerminalHistory] = useState<
    { prompt: string; command: string; output: string; isError?: boolean }[]
  >([]);

  // Active Highlighted Node & Animated Path
  const [activeNodeId, setActiveNodeId] = useState<string | undefined>('student-home');
  const [animatedPathIds, setAnimatedPathIds] = useState<string[]>([]);
  const pathHighlightTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (pathHighlightTimerRef.current !== null) window.clearTimeout(pathHighlightTimerRef.current);
  }, []);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Quiz Mode State matching DSA module (Image 1)
  const [quizEnabled, setQuizEnabled] = useState<boolean>(false);
  const [cadence, setCadence] = useState<QuizCadence>('normal');

  // Layout Toggles matching DSA module
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showDebugger, setShowDebugger] = useState<boolean>(true);
  const [customizeModeEnabled, setCustomizeModeEnabled] = useState<boolean>(false);
  const [showKeyConcepts, setShowKeyConcepts] = useState<boolean>(false);

  // Editor Modal Trigger State
  const [editorState, setEditorState] = useState<{
    isOpen: boolean;
    type: 'nano' | 'vim';
    fileNodeId: string;
    filePath: string;
    initialContent: string;
  }>({
    isOpen: false,
    type: 'vim',
    fileNodeId: '',
    filePath: '',
    initialContent: '',
  });

  // --- Step History Controls (Back / Forward) ---
  const handlePrevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const idx = currentStepIndex - 1;
      setCurrentStepIndex(idx);
      setSnapshot(snapshotHistory[idx]);
      setActiveNodeId(stepHistory[idx]?.targetNodeId);
    }
  }, [currentStepIndex, snapshotHistory, stepHistory]);

  const handleNextStep = useCallback(() => {
    if (currentStepIndex < stepHistory.length - 1) {
      const idx = currentStepIndex + 1;
      setCurrentStepIndex(idx);
      setSnapshot(snapshotHistory[idx]);
      setActiveNodeId(stepHistory[idx]?.targetNodeId);
    }
  }, [currentStepIndex, snapshotHistory, stepHistory]);

  // Quiz Checkpoints and Session Hook
  const checkpoints = useMemo(() => buildOSQuizCheckpoints(stepHistory), [stepHistory]);
  const revisionData = useMemo(() => buildOSRevisionData(), []);

  const quizSession = useQuizSession({
    enabled: quizEnabled,
    checkpoints,
    cadence,
    currentStepIndex,
    isPlaying,
    pause: () => setIsPlaying(false),
    stepForward: handleNextStep,
    module: 'arrays',
    algorithmId: 'filesystem',
    revisionData,
  });

  // Playback timer effect
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (currentStepIndex < stepHistory.length - 1) {
        handleNextStep();
      } else {
        setIsPlaying(false);
      }
    }, 1200);
    return () => clearInterval(interval);
  }, [isPlaying, currentStepIndex, stepHistory.length, handleNextStep]);

  // --- Reset Handler ---
  const handleReset = useCallback(() => {
    if (pathHighlightTimerRef.current !== null) window.clearTimeout(pathHighlightTimerRef.current);
    pathHighlightTimerRef.current = null;
    setIsPlaying(false);
    quizSession.resetSession();
    const fresh = createInitialVFS();
    setSnapshot(fresh);
    setSnapshotHistory([fresh]);
    setStepHistory([
      {
        command: 'system reset',
        diff: 'Reset to default FHS hierarchy',
        explanation: 'Reset VFS tree back to default clean installation hierarchy.',
        targetNodeId: 'root',
      },
    ]);
    setCurrentStepIndex(0);
    setTerminalHistory([]);
    setActiveNodeId('student-home');
    setAnimatedPathIds([]);
  }, [quizSession.resetSession]);

  // --- Command Execution Handler ---
  const handleExecuteCommand = useCallback((commandLine: string) => {
    const currentSnap = snapshotHistory[currentStepIndex] || snapshot;
    const result = executeVFSCommand(currentSnap, commandLine);

    const promptStr = `${currentSnap.currentUser}@stem-studio:${getAbsolutePath(currentSnap.nodes, currentSnap.currentDirId)}$`;

    // Append terminal history
    setTerminalHistory(prev => [
      ...prev,
      {
        prompt: promptStr,
        command: commandLine,
        output: result.output,
        isError: result.output.includes('bash:') || result.output.includes('error'),
      },
    ]);

    // Check if command launched editor
    if (result.editorTrigger) {
      setEditorState({
        isOpen: true,
        type: result.editorTrigger.type,
        fileNodeId: result.editorTrigger.fileNodeId,
        filePath: result.editorTrigger.filePath,
        initialContent: result.editorTrigger.initialContent,
      });
    }

    // Append to step history & snapshot history
    const newStepHistory = [...stepHistory.slice(0, currentStepIndex + 1), result.stepRecord];
    const newSnapHistory = [...snapshotHistory.slice(0, currentStepIndex + 1), result.newSnapshot];

    setStepHistory(newStepHistory);
    setSnapshotHistory(newSnapHistory);
    setCurrentStepIndex(newStepHistory.length - 1);
    setSnapshot(result.newSnapshot);

    if (result.stepRecord.targetNodeId) setActiveNodeId(result.stepRecord.targetNodeId);
    const nextAnimatedPath = result.stepRecord.animatedPathIds || [];
    setAnimatedPathIds(nextAnimatedPath);
    if (pathHighlightTimerRef.current !== null) window.clearTimeout(pathHighlightTimerRef.current);
    pathHighlightTimerRef.current = nextAnimatedPath.length
      ? window.setTimeout(() => {
          setAnimatedPathIds([]);
          pathHighlightTimerRef.current = null;
        }, 1000)
      : null;
  }, [currentStepIndex, snapshot, snapshotHistory, stepHistory]);

  // --- Editor Save Handler ---
  const handleSaveEditorContent = (savedContent: string) => {
    const { fileNodeId, filePath } = editorState;
    if (fileNodeId && snapshot.nodes[fileNodeId]) {
      const nextSnap: VFSSnapshot = JSON.parse(JSON.stringify(snapshot));
      nextSnap.nodes[fileNodeId].content = savedContent;
      nextSnap.nodes[fileNodeId].modifiedAt = new Date().toISOString().split('T')[0];

      setSnapshot(nextSnap);
      const newSnapHistory = [...snapshotHistory.slice(0, currentStepIndex + 1), nextSnap];
      const newStepRecord = {
        command: `saved file ${filePath}`,
        diff: `Updated content in ${filePath} (${savedContent.length} bytes)`,
        explanation: `Saved edited text buffer into VFS node "${filePath}". Cat command will now read exact saved string.`,
        targetNodeId: fileNodeId,
      };
      const newStepHistory = [...stepHistory.slice(0, currentStepIndex + 1), newStepRecord];

      setSnapshotHistory(newSnapHistory);
      setStepHistory(newStepHistory);
      setCurrentStepIndex(newStepHistory.length - 1);
    }
    setEditorState(prev => ({ ...prev, isOpen: false }));
  };

  const activeStepRecord = stepHistory[currentStepIndex] || stepHistory[0];

  useEffect(() => {
    const currentPath = getAbsolutePath(snapshot.nodes, snapshot.currentDirId);
    const selectedNode = activeNodeId ? snapshot.nodes[activeNodeId] : undefined;
    setTutorContext({
      algorithmName: 'Linux Virtual File System',
      algorithmId: 'virtual-file-system',
      category: 'filesystem',
      currentStepDescription: activeStepRecord?.explanation || '',
      currentStepIndex,
      totalSteps: stepHistory.length,
      currentStep: {
        command: activeStepRecord?.command || '',
        diff: activeStepRecord?.diff || '',
        explanation: activeStepRecord?.explanation || '',
        currentPath,
        currentUser: snapshot.currentUser,
        currentGroup: snapshot.currentGroup,
        selectedNode: selectedNode ? {
          name: selectedNode.name,
          type: selectedNode.type,
          path: getAbsolutePath(snapshot.nodes, selectedNode.id),
          owner: selectedNode.owner,
          group: selectedNode.group,
          permissions: selectedNode.permissions,
        } : undefined,
      },
      steps: stepHistory,
      onSetInput: undefined,
      play: () => setIsPlaying(true),
      pause: () => setIsPlaying(false),
      stepForward: handleNextStep,
      reset: handleReset,
      setShowDebugger,
      onLaunchQuiz: () => setQuizEnabled(true),
      setSpeed: undefined,
      toggleFullscreen: (enter: boolean) => setIsFullscreen(enter),
      onExecuteCommand: handleExecuteCommand,
    });
  }, [activeNodeId, activeStepRecord, currentStepIndex, handleExecuteCommand, handleNextStep, handleReset, setTutorContext, snapshot, stepHistory]);

  // Key FHS Directory Explanations
  const fhsDirectories = [
    { name: '/', desc: 'Root directory — the top of the entire Linux filesystem tree hierarchy.' },
    { name: '/bin', desc: 'Essential user command binaries (e.g. ls, cat, cp, bash).' },
    { name: '/boot', desc: 'Static files of the boot loader and Linux kernel images (vmlinuz).' },
    { name: '/dev', desc: 'Device nodes (e.g. /dev/null, disk block devices /dev/sda1).' },
    { name: '/etc', desc: 'System-wide configuration files and databases (/etc/passwd, /etc/group).' },
    { name: '/home', desc: 'User home directories storing personal files and user configs (~).' },
    { name: '/lib', desc: 'Shared system libraries needed by binaries in /bin and /sbin.' },
    { name: '/proc', desc: 'Virtual pseudo-filesystem providing kernel & process status metrics.' },
    { name: '/tmp', desc: 'Temporary files (Sticky Bit 1777 set allowing users to edit only their own files).' },
    { name: '/var', desc: 'Variable data files including system logs (/var/log) and databases.' },
  ];

  return (
    <div className="bst-page-container linux-module-shell linux-filesystem-page animate-fade-in space-y-6">
      <SEOHead {...getSEOForRoute('/dashboard/os/filesystem')} />
      {/* Visualizer Header matching DSA Module (Image 1) */}
      <VisualizerHeader
        icon={<FolderTree size={22} />}
        title="File System Simulator"
        subtitle="Interactive Linux Virtual File System (VFS) Hierarchy, Bash Shell & Terminal Engine"
        items={[
          {
            id: 'virtual-file-system',
            name: 'Virtual File System (VFS)',
            description: 'Linux Directory Hierarchy Standard (FHS)',
          },
        ]}
        activeId="virtual-file-system"
        categories={CATEGORY_TOPICS}
        activeCategoryId="filesystem"
        onSelectCategory={(catId) => catId !== 'filesystem' && navigate(`/dashboard/${catId}`)}
        placeholder="Search Operating System modules..."
        actions={
          <div className="flex items-center gap-3">
            <button className="module-back-btn" onClick={() => navigate('/dashboard/os')}>
              <ArrowLeft size={14} /> Back to OS
            </button>
            <VisualizerActions
              quizEnabled={quizEnabled}
              onToggleQuiz={() => setQuizEnabled(v => !v)}
              debuggerVisible={showDebugger}
              onToggleDebugger={() => setShowDebugger(v => !v)}
              customizeModeEnabled={customizeModeEnabled}
              onToggleCustomizeMode={() => setCustomizeModeEnabled(v => !v)}
              onResetLayout={() => setCustomizeModeEnabled(false)}
            >
              <button
                type="button"
                className="viz-action-btn"
                onClick={() => setIsFullscreen(true)}
                title="Full Screen Canvas View"
              >
                <Maximize2 size={14} />
                <span>Fullscreen</span>
              </button>
            </VisualizerActions>
          </div>
        }
      />

      {/* Operations Toolbar Matching DSA Studio (Image 1) */}
      <div className="bst-toolbar animate-fade-in flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="bst-toolbar-left flex items-center gap-2 flex-wrap">
          {/* Step History Controller */}
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStepIndex === 0}
            className="bst-btn"
            title="Previous command step"
          >
            <ChevronLeft size={14} />
            <span>Step Back</span>
          </button>
          <span className="linux-step-count text-xs font-mono px-3 py-1.5 rounded-lg font-semibold">
            Step {currentStepIndex + 1} / {stepHistory.length}
          </span>
          <button
            type="button"
            onClick={handleNextStep}
            disabled={currentStepIndex === stepHistory.length - 1}
            className="bst-btn"
            title="Next command step"
          >
            <span>Step Forward</span>
            <ChevronRight size={14} />
          </button>

          {/* Reset VFS Button */}
          <button
            type="button"
            onClick={handleReset}
            className="bst-btn bst-btn-danger"
            title="Reset VFS tree to default FHS state"
          >
            <RotateCcw size={14} />
            <span>Reset VFS</span>
          </button>

          {/* FHS Key Concepts Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowKeyConcepts(!showKeyConcepts)}
            className={`bst-btn ${showKeyConcepts ? 'bst-btn-primary' : ''}`}
            aria-expanded={showKeyConcepts}
            aria-controls="linux-fhs-concepts"
          >
            <BookOpen size={14} />
            <span>FHS Concepts</span>
          </button>
        </div>

        {/* Quick Shell Indicator */}
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] font-mono">
          <TerminalIcon size={14} className="text-[var(--color-primary)]" />
          <span>Prompt: octa@stem-studio:~</span>
        </div>
      </div>

      {/* FHS Key Concepts Drawer (Collapsible) */}
        {showKeyConcepts && (
        <div id="linux-fhs-concepts" className="linux-fhs-drawer space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-sm">
            <BookOpen size={18} /> Linux Filesystem Hierarchy Standard (FHS) Directory Roles
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            The Linux FHS defines the exact directory structure and purpose of every folder in root /.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            {fhsDirectories.map((dir) => (
              <div key={dir.name} className="linux-fhs-directory space-y-1">
                <div className="font-mono text-xs font-bold text-[var(--color-primary)]">{dir.name}</div>
                <p className="text-[11px] text-[var(--color-text-secondary)] leading-tight">{dir.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Learning Workspace */}
      <div className="sorting-workspace scene-workspace">
        {/* Quiz Dock */}
        <div className="quiz-rail">
          <QuizDock
            session={quizSession}
            cadence={cadence}
            onCadenceChange={setCadence}
            onEnableQuiz={() => setQuizEnabled(true)}
          />
        </div>

        {/* Resizable Panel Row for Visualizer, Terminal & Explanation */}
        <ResizablePanelRow
          storageKey="filesystem"
          customizeModeEnabled={customizeModeEnabled}
          onResetLayout={() => setCustomizeModeEnabled(false)}
          visualizerPanel={
            <div className="relative h-full flex flex-col justify-between">
              <VFSTreeVisualizer
                snapshot={snapshot}
                activeNodeId={activeNodeId}
                animatedPathIds={animatedPathIds}
                onSelectNode={(id) => setActiveNodeId(id)}
                isFullscreen={isFullscreen}
              />
              <FloatingController
                isPlaying={isPlaying}
                canStepBack={currentStepIndex > 0}
                canStepForward={currentStepIndex < stepHistory.length - 1}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onReset={handleReset}
                onStepBack={handlePrevStep}
                onStepForward={handleNextStep}
                onStop={() => { setIsPlaying(false); handleReset(); }}
                onResume={() => setIsPlaying(true)}
                quizMode={quizEnabled}
              />
            </div>
          }
          debuggerPanel={
            showDebugger ? (
              <VFSTerminal
                snapshot={snapshot}
                history={terminalHistory}
                onExecuteCommand={handleExecuteCommand}
                onClearTerminal={() => setTerminalHistory([])}
              />
            ) : null
          }
          explanationPanel={
            <ExplanationPanel
              description={activeStepRecord.explanation}
              steps={stepHistory}
              currentStepIndex={currentStepIndex}
              timeComplexity={{ best: 'O(1)', average: 'O(log n)', worst: 'O(n)' }}
              spaceComplexity="O(V + E)"
            />
          }
        />
      </div>

      {/* Card 5: Theory & Core Concepts Panel with Expand All / Collapse All (Image 1) */}
      <TheoryPanel categoryId="filesystem" activeTopic="virtual-file-system" />

      {/* Fullscreen Canvas View Modal */}
      <FullScreenCanvasModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="File System Visualizer | Linux VFS Tree"
        subtitle="Interactive Linux File System Hierarchy Standard (FHS)"
        explanationPanel={
          <ExplanationPanel
            description={activeStepRecord.explanation}
            steps={stepHistory}
            currentStepIndex={currentStepIndex}
            timeComplexity={{ best: 'O(1)', average: 'O(log n)', worst: 'O(n)' }}
            spaceComplexity="O(V + E)"
          />
        }
        floatingControls={
          <FloatingController
            isPlaying={isPlaying}
            canStepBack={currentStepIndex > 0}
            canStepForward={currentStepIndex < stepHistory.length - 1}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onReset={handleReset}
            onStepBack={handlePrevStep}
            onStepForward={handleNextStep}
          />
        }
      >
        <VFSTreeVisualizer
          snapshot={snapshot}
          activeNodeId={activeNodeId}
          animatedPathIds={animatedPathIds}
          onSelectNode={(id) => setActiveNodeId(id)}
          isFullscreen={true}
        />
      </FullScreenCanvasModal>

      {/* Stateful Vim/Nano Editor Modal */}
      <VimNanoModal
        isOpen={editorState.isOpen}
        type={editorState.type}
        filePath={editorState.filePath}
        initialContent={editorState.initialContent}
        onSaveAndExit={handleSaveEditorContent}
        onCancel={() => setEditorState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
