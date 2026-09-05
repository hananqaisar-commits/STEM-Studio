import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

import '../../../features/complexity/Complexity.css';

export const FileSystemPage: React.FC = () => {
  const navigate = useNavigate();
  const { toggleTutor } = useTutorContext();

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

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Quiz Mode State matching DSA module (Image 1)
  const [quizEnabled, setQuizEnabled] = useState<boolean>(false);
  const [cadence, setCadence] = useState<QuizCadence>('everyStep');

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
    module: 'array',
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
  const handleReset = () => {
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
  };

  // --- Command Execution Handler ---
  const handleExecuteCommand = (commandLine: string) => {
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
    if (result.stepRecord.animatedPathIds) setAnimatedPathIds(result.stepRecord.animatedPathIds);
  };

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
    <div className="bst-page-container animate-fade-in space-y-6">
      {/* Visualizer Header matching DSA Module (Image 1) */}
      <VisualizerHeader
        icon={<FolderTree size={22} />}
        title="File System Simulator"
        subtitle="Interactive Linux Virtual File System (VFS) Hierarchy, Bash Shell & Terminal Engine"
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
      <div className="bst-toolbar animate-fade-in flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-900/80 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Step History Controller */}
          <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={handlePrevStep}
              disabled={currentStepIndex === 0}
              className="p-1.5 rounded-lg text-slate-300 hover:text-slate-100 disabled:opacity-40 disabled:hover:text-slate-300 hover:bg-slate-800"
              title="Previous command step"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-mono px-2 text-cyan-400 font-semibold">
              Step {currentStepIndex + 1} / {stepHistory.length}
            </span>
            <button
              onClick={handleNextStep}
              disabled={currentStepIndex === stepHistory.length - 1}
              className="p-1.5 rounded-lg text-slate-300 hover:text-slate-100 disabled:opacity-40 disabled:hover:text-slate-300 hover:bg-slate-800"
              title="Next command step"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Reset VFS Button */}
          <button
            onClick={handleReset}
            className="px-3 py-2 rounded-xl bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 text-xs font-semibold flex items-center gap-1.5"
            title="Reset VFS tree to default FHS state"
          >
            <RotateCcw size={14} /> Reset VFS
          </button>

          {/* FHS Key Concepts Drawer Toggle */}
          <button
            onClick={() => setShowKeyConcepts(!showKeyConcepts)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              showKeyConcepts
                ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/40'
                : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <BookOpen size={14} /> FHS Concepts
          </button>
        </div>

        {/* Quick Shell Indicator */}
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <TerminalIcon size={14} className="text-cyan-400" />
          <span>Prompt: octa@stem-studio:~</span>
        </div>
      </div>

      {/* FHS Key Concepts Drawer (Collapsible) */}
      {showKeyConcepts && (
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-cyan-500/30 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
            <BookOpen size={18} /> Linux Filesystem Hierarchy Standard (FHS) Directory Roles
          </div>
          <p className="text-xs text-slate-300">
            The Linux FHS defines the exact directory structure and purpose of every folder in root /.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            {fhsDirectories.map((dir, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="font-mono text-xs font-bold text-cyan-400">{dir.name}</div>
                <p className="text-[11px] text-slate-400 leading-tight">{dir.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Learning Workspace matching DSA Layout (Image 1) */}
      <div className="sorting-workspace scene-workspace">
        {/* Card 1: Tree Hierarchy Visualizer Canvas */}
        <div className="renderer-section">
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

        {/* Card 2: Quiz Dock matching DSA layout (Image 1) */}
        <div className="quiz-rail">
          <QuizDock
            session={quizSession}
            cadence={cadence}
            onCadenceChange={setCadence}
            onEnableQuiz={() => setQuizEnabled(true)}
          />
        </div>

        {/* Middle Row: Resizable Panel Row for Card 3 (Terminal) & Card 4 (Explanation Card) */}
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
