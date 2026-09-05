import React, { useState } from 'react';
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

  // Layout Toggles
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
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

  // --- Reset Handler ---
  const handleReset = () => {
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

  // --- Step History Controls (Back / Forward) ---
  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      const idx = currentStepIndex - 1;
      setCurrentStepIndex(idx);
      setSnapshot(snapshotHistory[idx]);
      setActiveNodeId(stepHistory[idx]?.targetNodeId);
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < stepHistory.length - 1) {
      const idx = currentStepIndex + 1;
      setCurrentStepIndex(idx);
      setSnapshot(snapshotHistory[idx]);
      setActiveNodeId(stepHistory[idx]?.targetNodeId);
    }
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
    <div className="complexity-container animate-fade-in space-y-6">
      {/* Category Header */}
      <div className="complexity-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button className="module-back-btn mb-2" onClick={() => navigate('/dashboard/os')}>
            <ArrowLeft size={16} /> Back to Operating System
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FolderTree size={26} />
            </div>
            <div>
              <h1 className="complexity-title">File System Simulator</h1>
              <p className="complexity-subtitle">
                Interactive Linux Virtual File System (VFS) with real bash command interpreter, tree visualizer, stateful Vim/Nano editor, and Octa Tutor.
              </p>
            </div>
          </div>
        </div>

        {/* Master Control Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Step History Controller */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
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

          {/* Reset Button */}
          <button
            onClick={handleReset}
            className="px-3 py-2 rounded-xl bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 text-xs font-semibold flex items-center gap-1.5"
            title="Reset VFS tree to default FHS install state"
          >
            <RotateCcw size={14} /> Reset VFS
          </button>

          {/* FHS Key Concepts Drawer Toggle */}
          <button
            onClick={() => setShowKeyConcepts(!showKeyConcepts)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              showKeyConcepts
                ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/40'
                : 'bg-slate-900/90 text-slate-300 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <BookOpen size={14} /> FHS Concepts
          </button>

          {/* Fullscreen Canvas Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-slate-900/90 text-slate-300 border border-slate-800 hover:bg-slate-800"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Visualizer'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
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

      {/* Master Visualizer Canvas (Top Pane) */}
      <VFSTreeVisualizer
        snapshot={snapshot}
        activeNodeId={activeNodeId}
        animatedPathIds={animatedPathIds}
        onSelectNode={(id) => setActiveNodeId(id)}
        isFullscreen={isFullscreen}
      />

      {/* Bottom Pane: Split Terminal & Explanation / Octa Tutor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Linux Terminal */}
        <div className="lg:col-span-7">
          <VFSTerminal
            snapshot={snapshot}
            history={terminalHistory}
            onExecuteCommand={handleExecuteCommand}
            onClearTerminal={() => setTerminalHistory([])}
          />
        </div>

        {/* Right Column: Step Explanation Card & Octa Tutor */}
        <div className="lg:col-span-5 space-y-4">
          {/* Explanation Card */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                <Info size={18} className="text-cyan-400" /> Step Explanation
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                {activeStepRecord.command}
              </span>
            </div>

            <div className="text-xs font-mono text-emerald-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              Diff: {activeStepRecord.diff}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
              {activeStepRecord.explanation}
            </p>
          </div>

          {/* Octa Tutor Helper Card */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-purple-500/30 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                <Sparkles size={18} className="text-purple-400" /> Octa Tutor — Step-Follow Mode
              </div>
              <button
                onClick={() => toggleTutor()}
                className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 text-xs font-semibold flex items-center gap-1"
              >

                <MessageSquare size={13} /> Ask Octa
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Ask Octa &quot;What did Step {currentStepIndex + 1} do?&quot; or ask general questions about Linux file permissions, system daemons, and bash scripting.
            </p>
          </div>
        </div>
      </div>

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
