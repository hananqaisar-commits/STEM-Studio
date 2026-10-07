import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sendTutorMessage, type OctaTutorMessage, type OctaTutorResponse, type OctaTutorFunctionCall, type UserLLMConfig } from '../api/octaTutorApi';
import { useTutorContext, type TutorAlgorithmContext } from '../contexts/TutorContext';
import { useTheme } from '../contexts/ThemeContext';
import type { MascotExpression } from '../components/mascot/MascotState';
import { DSA_CATEGORIES, MODULES } from '../data/categories';
import { CATEGORY_TOPICS } from '../data/categoryTopics';
import { THEORY_CONTENT } from '../data/theoryContent';
import { LINUX_COMMAND_GROUPS } from '../data/linuxCommandsData';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  expression?: MascotExpression;
  timestamp: Date;
  isRevealing?: boolean;
  proposedActions?: OctaTutorFunctionCall[];
  actionDecision?: 'pending' | 'allowed' | 'cancelled';
  actionContextKey?: string;
  answerSource?: 'model' | 'offline';
}

export type SupportedSpeechLang = 'en-US' | 'ur-PK' | 'zh-CN';

export interface TutorSuggestion {
  label: string;
  text: string;
}

export interface UseOctaTutorReturn {
  messages: ChatMessage[];
  inputText: string;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  isListening: boolean;
  speechLang: SupportedSpeechLang;
  setSpeechLang: React.Dispatch<React.SetStateAction<SupportedSpeechLang>>;
  isSpeechSupported: boolean;
  mascotExpression: MascotExpression;
  setMascotExpression: React.Dispatch<React.SetStateAction<MascotExpression>>;
  sendMessage: (customText?: string) => Promise<void>;
  startListening: () => void;
  stopListening: () => void;
  clearHistory: () => void;
  guidedStepIndex: number | null;
  isGuidedMode: boolean;
  setIsGuidedMode: React.Dispatch<React.SetStateAction<boolean>>;
  // BYOK LLM config state & controls
  llmConfig: UserLLMConfig;
  saveLLMConfig: (config: UserLLMConfig) => void;
  resetLLMConfig: () => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  // Mode switcher: interactive vs natural
  tutorMode: 'interactive' | 'natural';
  setTutorMode: React.Dispatch<React.SetStateAction<'interactive' | 'natural'>>;
  // Context-aware suggestions
  suggestions: TutorSuggestion[];
  currentPageLabel: string;
  hasVisualizerContext: boolean;
  currentStepIndex: number;
  totalSteps: number;
  approveActions: (messageId: string) => void;
  dismissActions: (messageId: string) => void;
}

function normalizeTutorAction(call: OctaTutorFunctionCall): OctaTutorFunctionCall | null {
  const args = call.args || {};
  if (call.name === 'navigate_to_algorithm') {
    const categoryId = args.category_id;
    const topicId = args.topic_id || '';
    const category = CATEGORY_TOPICS.find((item) => item.categoryId === categoryId);
    if (!category || typeof topicId !== 'string' || (topicId && !category.topics.some((topic) => topic.id === topicId))) return null;
    return { name: call.name, args: { category_id: categoryId, topic_id: topicId } };
  }
  if (call.name === 'control_playback' && ['play', 'pause', 'step_forward', 'reset'].includes(args.action)) {
    return { name: call.name, args: { action: args.action } };
  }
  if (call.name === 'set_speed' && typeof args.speed === 'number' && Number.isFinite(args.speed) && args.speed >= 0.25 && args.speed <= 4) {
    return { name: call.name, args: { speed: args.speed } };
  }
  if (call.name === 'set_input' && Array.isArray(args.values) && args.values.length > 0 && args.values.length <= 20 && args.values.every((value: unknown) => typeof value === 'number' && Number.isFinite(value))) {
    return { name: call.name, args: { values: args.values } };
  }
  if (call.name === 'switch_theme' && (args.mode === 'light' || args.mode === 'dark')) {
    return { name: call.name, args: { mode: args.mode } };
  }
  if (call.name === 'toggle_debugger' && typeof args.visible === 'boolean') {
    return { name: call.name, args: { visible: args.visible } };
  }
  if (call.name === 'toggle_fullscreen' && typeof args.enter === 'boolean') {
    return { name: call.name, args: { enter: args.enter } };
  }
  if (call.name === 'generate_quiz') {
    return { name: call.name, args: {} };
  }
  if (call.name === 'execute_vfs_command' && typeof args.command === 'string') {
    const command = args.command.trim();
    const supported = SUPPORTED_VFS_COMMANDS;
    const [executable] = command.split(/\s+/);
    if (command.length > 200 || !/^[a-zA-Z0-9_./:=+*?-]+(?:\s+[a-zA-Z0-9_./:=+*?-]+)*$/.test(command) || !supported.has(executable)) return null;
    return { name: call.name, args: { command } };
  }
  return null;
}

const SUPPORTED_VFS_COMMANDS = new Set(['pwd', 'cd', 'ls', 'mkdir', 'touch', 'cat', 'nano', 'vim', 'useradd', 'chmod', 'chown', 'chgrp', 'rm', 'cp', 'mv', 'echo', 'export', 'userdel', 'groupadd', 'usermod', 'whoami', 'id', 'who', 'find', 'grep', 'sed', 'awk', 'wc', 'head', 'tail', 'apt', 'apt-get', 'ssh', 'tree', 'curl', 'ping', 'diff', 'uname']);

function isActionAvailable(call: OctaTutorFunctionCall, context: TutorAlgorithmContext): boolean {
  switch (call.name) {
    case 'navigate_to_algorithm':
    case 'switch_theme': return true;
    case 'control_playback':
      return call.args.action === 'play' ? Boolean(context.play)
        : call.args.action === 'pause' ? Boolean(context.pause)
        : call.args.action === 'step_forward' ? Boolean(context.stepForward)
        : Boolean(context.reset);
    case 'set_speed': return Boolean(context.setSpeed);
    case 'set_input': return Boolean(context.onSetInput);
    case 'toggle_debugger': return Boolean(context.setShowDebugger);
    case 'toggle_fullscreen': return Boolean(context.toggleFullscreen);
    case 'generate_quiz': return Boolean(context.onLaunchQuiz);
    case 'execute_vfs_command': return context.category === 'filesystem' && Boolean(context.onExecuteCommand);
    default: return false;
  }
}

const DEFAULT_LLM_CONFIG: UserLLMConfig = {
  provider: 'dashscope',
  apiKey: '',
  baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
  modelName: 'qwen-plus',
};

export function useOctaTutor(): UseOctaTutorReturn {
  const { contextState } = useTutorContext();
  const { setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const activeDsaCategory = DSA_CATEGORIES.find((category) =>
    location.pathname === `/dashboard/${category.id}` || location.pathname.startsWith(`/dashboard/${category.id}/`),
  );
  const isCommandsPage = location.pathname === '/dashboard/os/commands' || location.pathname === '/dashboard/commands';
  const isFilesystemPage = location.pathname === '/dashboard/os/filesystem' || location.pathname === '/dashboard/filesystem';
  const routeCategoryId = activeDsaCategory?.id || (isCommandsPage ? 'commands' : isFilesystemPage ? 'filesystem' : '');
  const hasRouteTutorContext = Boolean(routeCategoryId && contextState.category === routeCategoryId);
  const hasVisualizerContext = Boolean(activeDsaCategory || isFilesystemPage);
  const currentPageLabel = hasRouteTutorContext && contextState.algorithmName
    ? contextState.algorithmName
    : activeDsaCategory?.name || (isFilesystemPage ? 'Linux File System Simulator'
      : isCommandsPage ? 'Linux Command Lessons'
        : location.pathname.startsWith('/dashboard/os') ? 'Operating Systems'
          : location.pathname === '/dashboard' ? 'Learning Dashboard' : 'STEM Studio');
  const pageTutorContext: TutorAlgorithmContext = hasRouteTutorContext ? contextState : {
    algorithmName: currentPageLabel,
    algorithmId: '',
    category: routeCategoryId,
    currentStepDescription: '',
    currentStepIndex: 0,
    totalSteps: 0,
    currentStep: null,
    steps: [],
  };
  const hasLiveStepContext = hasVisualizerContext && hasRouteTutorContext && pageTutorContext.totalSteps > 0;
  const actionContextKey = `${location.pathname}|${pageTutorContext.category}|${pageTutorContext.algorithmId}`;

  const siteCatalog = useMemo(() => [
    'Modules: ' + MODULES.filter((module) => module.available).map((module) => module.name).join(', '),
    'Dashboard routes: /dashboard, /dashboard/dsa, /dashboard/os, /dashboard/os/commands, /dashboard/os/filesystem. The short aliases /dashboard/commands and /dashboard/filesystem also resolve.',
    ...CATEGORY_TOPICS.map((category) =>
      `${category.categoryName} (route /dashboard/${category.categoryId}): ${category.topics.map((topic) => topic.name).join(', ')}`,
    ),
    ...LINUX_COMMAND_GROUPS.map((group) => `Linux command group ${group.title}: ${group.commands.map((command) => command.name).join(', ')}`),
    'Octa AI Tutor offers AI Concept Mode for grounded concept explanations and Interactive Step Mode for the active DSA or file-system simulator state. Supported in-app actions are proposals and only run after the student approves them.',
    'Linux command lessons and the virtual file system are in-app learning simulations. Commands proposed by Octa can only run in the virtual file-system simulator after approval; Octa cannot execute commands on the host computer.',
  ].join('\n'), []);

  const topicKnowledgeFor = useCallback((prompt: string) => {
    const compact = prompt.toLowerCase().replace(/[^a-z0-9]/g, '');
    const explicitTopics = CATEGORY_TOPICS.flatMap((category) => category.topics.map((topic) => ({ category, topic })))
      .filter(({ topic }) => {
        const name = topic.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const id = topic.id.toLowerCase().replace(/[^a-z0-9]/g, '');
        return (name.length >= 6 && compact.includes(name)) || (id.length >= 6 && compact.includes(id));
      })
      .sort((a, b) => b.topic.name.length - a.topic.name.length)
      .slice(0, 3);

    if (isCommandsPage) {
      const allCommands = LINUX_COMMAND_GROUPS.flatMap((group) => group.commands.map((command) => ({ group, command })));
      const mentioned = allCommands.filter(({ command }) => {
        const commandName = command.name.toLowerCase();
        if (/^[a-z][a-z0-9-]*$/i.test(commandName)) return new RegExp(`\\b${commandName}\\b`, 'i').test(prompt);
        const normalizedName = commandName.replace(/[^a-z0-9]/g, '');
        return normalizedName.length >= 6 && compact.includes(normalizedName);
      }).sort((a, b) => b.command.name.length - a.command.name.length).slice(0, 3);
      const activeGroup = hasRouteTutorContext
        ? LINUX_COMMAND_GROUPS.find((group) => group.id === contextState.currentStep?.groupId || group.id === contextState.algorithmId)
        : undefined;
      const activeCommand = hasRouteTutorContext
        ? allCommands.find(({ command }) => command.id === contextState.currentStep?.selectedCommandId)
        : undefined;
      const selectedCommands = mentioned.length ? mentioned
        : activeCommand ? [activeCommand]
          : activeGroup ? activeGroup.commands.slice(0, 3).map((command) => ({ group: activeGroup, command }))
            : [];
      if (selectedCommands.length) {
        return JSON.stringify({
          source: 'STEM Studio Linux command lesson catalog',
          note: 'These cards teach standard Linux behavior. The separate terminal page is a limited in-app simulator.',
          commands: selectedCommands.map(({ group, command }) => ({
            group: group.title,
            name: command.name,
            purpose: command.shortDesc,
            theory: command.theory,
            syntax: command.syntax,
            examples: command.examples.slice(0, 3),
            vimModes: command.vimModes,
          })),
        });
      }
    }

    if (isFilesystemPage) {
      const topics = THEORY_CONTENT.filesystem?.topics || [];
      const selectedFilesystemTopics = topics.filter((topic) => {
        const topicName = topic.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const topicId = topic.id.toLowerCase().replace(/[^a-z0-9]/g, '');
        return compact.includes(topicName) || (topicId.length >= 6 && compact.includes(topicId));
      }).slice(0, 2);
      const fallbackTopic = topics.find((topic) => topic.id === 'virtual-file-system');
      return JSON.stringify({
        source: 'STEM Studio file-system simulator lesson',
        note: 'This is an in-memory virtual file system. Commands affect only its simulated state, never the host computer.',
        activeContext: pageTutorContext.currentStep ? {
          algorithm: pageTutorContext.algorithmName,
          currentStep: pageTutorContext.currentStep,
          currentStepDescription: pageTutorContext.currentStepDescription,
        } : undefined,
        topics: (selectedFilesystemTopics.length ? selectedFilesystemTopics : fallbackTopic ? [fallbackTopic] : []).map((topic) => ({
          id: topic.id,
          name: topic.name,
          description: topic.description,
          keyPoints: topic.keyPoints,
          steps: topic.steps,
          example: topic.example,
          applications: topic.applications,
        })),
      });
    }

    const selected = explicitTopics.length ? explicitTopics : !activeDsaCategory || !hasRouteTutorContext ? [] : (() => {
      const category = CATEGORY_TOPICS.find((item) => item.categoryId === activeDsaCategory.id);
      const topic = category?.topics.find((item) => item.id === contextState.algorithmId);
      return category && topic ? [{ category, topic }] : [];
    })();

    return JSON.stringify(selected.map(({ category, topic }) => {
      const theory = THEORY_CONTENT[category.categoryId]?.topics.find((item) => item.id === topic.id);
      return {
        category: category.categoryName,
        id: topic.id,
        name: theory?.name || topic.name,
        description: theory?.description || topic.description || '',
        complexity: theory?.complexity || '',
        keyPoints: theory?.keyPoints || [],
        steps: theory?.steps || [],
        example: theory?.example || '',
        applications: theory?.applications || [],
        ...( /\b(code|implementation|implement)\b/i.test(prompt) && theory?.codeSnippet ? { codeSnippet: theory.codeSnippet } : {}),
      };
    }));
  }, [activeDsaCategory, contextState.algorithmId, contextState.category, hasRouteTutorContext, isCommandsPage, isFilesystemPage, pageTutorContext]);

  // Load custom LLM config from localStorage
  const [llmConfig, setLlmConfig] = useState<UserLLMConfig>(() => {
    try {
      const saved = localStorage.getItem('octa_llm_config');
      return saved ? JSON.parse(saved) : DEFAULT_LLM_CONFIG;
    } catch {
      return DEFAULT_LLM_CONFIG;
    }
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const saveLLMConfig = useCallback((newConfig: UserLLMConfig) => {
    setLlmConfig(newConfig);
    try {
      localStorage.setItem('octa_llm_config', JSON.stringify(newConfig));
    } catch {}
  }, []);

  const resetLLMConfig = useCallback(() => {
    setLlmConfig(DEFAULT_LLM_CONFIG);
    try {
      localStorage.removeItem('octa_llm_config');
    } catch {}
  }, []);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Hi, I'm Octa, your STEM Studio learning guide. 🐙\n\n• **AI Concept Mode** uses this app's lesson material to explain concepts and answer questions about the current page.\n• **Interactive Step Mode** can explain the live visualizer state and propose supported page controls. You choose whether to allow each action.\n\nWhat would you like to understand or try?`,
      expression: 'happy',
      timestamp: new Date(),
    },
  ]);

  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechLang, setSpeechLang] = useState<SupportedSpeechLang>('en-US');
  const [mascotExpression, setMascotExpression] = useState<MascotExpression>('neutral');
  const [tutorMode, setTutorMode] = useState<'interactive' | 'natural'>('natural');
  const [isGuidedMode, setIsGuidedMode] = useState<boolean>(false);
  const [guidedStepIndex, setGuidedStepIndex] = useState<number | null>(null);

  const recognitionRef = useRef<any>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect Web Speech API support
  const isSpeechSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Initialize SpeechRecognition
  useEffect(() => {
    if (!isSpeechSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setMascotExpression('focused');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      setMascotExpression('happy');
      // Animate transcribed text into the input field letter-by-letter
      animateInputText(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setMascotExpression('confused');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [isSpeechSupported]);

  // Letter-by-letter typing reveal animation into input field
  const animateInputText = useCallback((fullText: string) => {
    let currentLen = 0;
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);

    const interval = setInterval(() => {
      currentLen += 1;
      setInputText(fullText.slice(0, currentLen));
      if (currentLen >= fullText.length) {
        clearInterval(interval);
        typingTimerRef.current = null;
      }
    }, 25);

    typingTimerRef.current = interval as any;
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setMascotExpression('confused');
      setMessages((prev) => [
        ...prev,
        {
          id: `speech-unsupported-${Date.now()}`,
          role: 'assistant',
          content: 'Voice speech recognition is active in Chrome, Edge, Brave, and Safari! Please use a supported browser or type your question.',
          expression: 'confused',
          timestamp: new Date(),
        },
      ]);
      return;
    }
    try {
      recognitionRef.current.lang = speechLang;
      recognitionRef.current.start();
    } catch {
      // If already running
      recognitionRef.current.stop();
    }
  }, [speechLang]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: `Conversation reset. What would you like to learn about ${currentPageLabel}? 🐙`,
        expression: 'excited',
        timestamp: new Date(),
      },
    ]);
  }, [currentPageLabel]);

  // ── Context-aware smart suggestions ──
  const suggestions = useMemo<TutorSuggestion[]>(() => {
    if (location.pathname.includes('/os/filesystem') || location.pathname === '/dashboard/filesystem') {
      return [
        { label: '🗂️ File system', text: 'How does the virtual file system work in this simulator?' },
        { label: tutorMode === 'interactive' ? '⌨️ Run a task' : '⌨️ Learn a task', text: tutorMode === 'interactive'
          ? 'Run `mkdir octa-demo` in the virtual file system.'
          : 'How do I create a folder and move a file in the virtual file system?' },
      ];
    }
    if (location.pathname.includes('/os/commands') || location.pathname === '/dashboard/commands') {
      return [
        { label: '📁 Navigation', text: 'Explain pwd, ls, and cd with a simple example.' },
        { label: '🔐 Permissions', text: 'How do Linux file permissions work?' },
      ];
    }
    if (!hasVisualizerContext) {
      return [
        { label: '🧭 Learning paths', text: 'What can I learn in STEM Studio?' },
        { label: '🐧 Linux module', text: 'How do I open the Linux command lessons?' },
      ];
    }

    const algName = pageTutorContext.algorithmName || activeDsaCategory?.name || 'this algorithm';
    const stepNum = pageTutorContext.currentStepIndex + 1;
    const totalSteps = pageTutorContext.totalSteps || 1;
    const category = pageTutorContext.category || '';
    const base: TutorSuggestion[] = [
      { label: '💡 Explain intuition', text: `Explain how ${algName} works intuitively` },
      { label: '⏱️ Time & space', text: `What is the time and space complexity of ${algName}?` },
    ];
    if (tutorMode === 'interactive' && pageTutorContext.totalSteps > 0 && pageTutorContext.algorithmName) {
      base.unshift({ label: `🔍 Explain step ${stepNum}`, text: `Explain step ${stepNum} of ${totalSteps} in detail` });
    }
    if (category === 'sorting') base.push({ label: '⚖️ Compare', text: `Compare ${algName} with Quick Sort and Merge Sort` });
    else if (category === 'graph') base.push({ label: '🌐 Real-world use', text: `Where is ${algName} used in real systems?` });
    else if (category === 'dp') base.push({ label: '🧩 DP logic', text: `Explain the subproblems and state transition for ${algName}` });
    else base.push({ label: '💻 Code', text: `Show me the Python implementation for ${algName}` });
    return base;
  }, [location.pathname, hasVisualizerContext, pageTutorContext, tutorMode, activeDsaCategory?.name]);

  // ── Execute only user-approved, validated in-app action proposals ──
  const dispatchFunctionCalls = useCallback((functionCalls: OctaTutorFunctionCall[]) => {
    for (const call of functionCalls) {
      switch (call.name) {
        case 'navigate_to_algorithm': {
          const catId = call.args?.category_id;
          const topicId = call.args?.topic_id;
          if (catId) {
            const query = topicId ? `?topic=${encodeURIComponent(topicId)}` : '';
            navigate(`/dashboard/${catId}${query}`);
          }
          break;
        }

        case 'control_playback': {
          const action = call.args?.action;
          if (action === 'play' && pageTutorContext.play) pageTutorContext.play();
          else if (action === 'pause' && pageTutorContext.pause) pageTutorContext.pause();
          else if (action === 'step_forward' && pageTutorContext.stepForward) pageTutorContext.stepForward();
          else if (action === 'reset' && pageTutorContext.reset) pageTutorContext.reset();
          break;
        }

        case 'set_speed': {
          const speed = call.args?.speed;
          if (typeof speed === 'number' && pageTutorContext.setSpeed) {
            pageTutorContext.setSpeed(speed);
          }
          break;
        }

        case 'set_input': {
          const vals = call.args?.values;
          if (Array.isArray(vals) && vals.length > 0 && pageTutorContext.onSetInput) {
            pageTutorContext.onSetInput(vals);
          }
          break;
        }

        case 'switch_theme': {
          if (call.args?.mode) {
            setTheme(call.args.mode);
          }
          break;
        }

        case 'toggle_debugger': {
          if (pageTutorContext.setShowDebugger) {
            const vis = call.args?.visible !== undefined ? call.args.visible : true;
            pageTutorContext.setShowDebugger(vis);
          }
          break;
        }

        case 'toggle_fullscreen': {
          if (pageTutorContext.toggleFullscreen) {
            const enter = call.args?.enter !== undefined ? call.args.enter : true;
            pageTutorContext.toggleFullscreen(enter);
          }
          break;
        }

        case 'generate_quiz': {
          if (pageTutorContext.onLaunchQuiz) {
            const questions = Array.isArray(call.args?.questions) ? call.args.questions : undefined;
            pageTutorContext.onLaunchQuiz(questions);
          }
          break;
        }

        case 'execute_vfs_command': {
          const command = call.args?.command;
          if (typeof command === 'string' && pageTutorContext.onExecuteCommand) {
            pageTutorContext.onExecuteCommand(command);
          }
          break;
        }

        default:
          console.warn(`[OctaTutor] Unknown function call: ${call.name}`);
      }
    }
  }, [pageTutorContext, navigate, setTheme]);

  const approveActions = useCallback((messageId: string) => {
    const message = messages.find((item) => item.id === messageId);
    if (!message || message.actionDecision !== 'pending' || !message.proposedActions?.length) return;
    if (message.actionContextKey !== actionContextKey) {
      setMessages((previous) => previous.map((item) => item.id === messageId ? {
        ...item,
        actionDecision: 'cancelled',
        content: `${item.content}\n\nThis page changed after Octa proposed the action. Ask again on the current page to avoid applying it to the wrong lesson.`,
      } : item));
      return;
    }
    const stillAvailable = message.proposedActions
      .map(normalizeTutorAction)
      .filter((action): action is OctaTutorFunctionCall => action !== null && isActionAvailable(action, pageTutorContext));
    if (!stillAvailable.length) {
      setMessages((previous) => previous.map((item) => item.id === messageId ? {
        ...item,
        actionDecision: 'cancelled',
        content: `${item.content}\n\nThat control is no longer available on this page. Ask Octa again for the current view.`,
      } : item));
      return;
    }
    dispatchFunctionCalls(stillAvailable);
    setMessages((previous) => previous.map((item) => item.id === messageId ? { ...item, actionDecision: 'allowed' } : item));
  }, [actionContextKey, dispatchFunctionCalls, messages, pageTutorContext]);

  const dismissActions = useCallback((messageId: string) => {
    setMessages((previous) => previous.map((item) => item.id === messageId && item.actionDecision === 'pending'
      ? { ...item, actionDecision: 'cancelled' }
      : item));
  }, []);

  // Handle send message
  const sendMessage = useCallback(
    async (customText?: string) => {
      const promptToUse = (customText || inputText).trim();
      if (!promptToUse || isLoading) return;

      if (!customText) {
        setInputText('');
      }

      const userMsgId = `user-${Date.now()}`;
      const newHistoryItem: ChatMessage = {
        id: userMsgId,
        role: 'user',
        content: promptToUse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newHistoryItem]);
      setIsLoading(true);
      setMascotExpression('thinking');

      // Check if user specifically references a step number (e.g. "explain step 7")
      let targetStepData = '';
      let targetStepIndex = hasLiveStepContext ? pageTutorContext.currentStepIndex : 0;
      let targetStepDescription = hasLiveStepContext ? pageTutorContext.currentStepDescription : '';
      const stepMatch = promptToUse.match(/step\s*(\d+)/i);
      if (hasLiveStepContext && stepMatch) {
        const stepNum = parseInt(stepMatch[1], 10);
        const stepIdx = stepNum - 1;
        if (pageTutorContext.steps && stepIdx >= 0 && stepIdx < pageTutorContext.steps.length) {
          const targetStep = pageTutorContext.steps[stepIdx];
          targetStepIndex = stepIdx;
          targetStepDescription = targetStep?.description || targetStep?.explanation || targetStep?.operation || targetStep?.action || '';
          targetStepData = JSON.stringify({
            referenced_step_number: stepNum,
            step_details: targetStep,
          });
        } else {
          targetStepDescription = '';
          targetStepData = JSON.stringify({
            step_not_available: true,
            requested_step_number: stepNum,
            available_step_count: pageTutorContext.steps?.length || 0,
          });
        }
      }

      if (!targetStepData && hasLiveStepContext && pageTutorContext.currentStep) {
        targetStepData = JSON.stringify(pageTutorContext.currentStep);
      }

      // Prepare payload
      const historyPayload: OctaTutorMessage[] = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const response: OctaTutorResponse = await sendTutorMessage({
          message: promptToUse,
          algorithm_name: pageTutorContext.algorithmName,
          algorithm_id: pageTutorContext.algorithmId,
          category: pageTutorContext.category,
          current_step_description: targetStepDescription,
          current_step_index: targetStepIndex,
          total_steps: hasLiveStepContext ? pageTutorContext.totalSteps : 0,
          step_data: targetStepData,
          current_page: location.pathname,
          site_catalog: siteCatalog,
          topic_knowledge: topicKnowledgeFor(promptToUse),
          conversation_history: historyPayload,
          mode: tutorMode,
          // BYOK Custom LLM configuration
          provider: llmConfig.provider,
          api_key: llmConfig.apiKey,
          base_url: llmConfig.baseUrl,
          model_name: llmConfig.modelName,
        });

        // Update mascot mood
        const expr = (response.mascot_expression as MascotExpression) || 'helping';
        setMascotExpression(expr);

        const proposedActions = (response.function_calls || [])
          .map(normalizeTutorAction)
          .filter((action): action is OctaTutorFunctionCall => action !== null && isActionAvailable(action, pageTutorContext));
        const unavailableActionCount = (response.function_calls || []).length - proposedActions.length;

        const botMsgId = `bot-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: botMsgId,
            role: 'assistant',
            content: response.reply,
            expression: expr,
            timestamp: new Date(),
            isRevealing: true,
            answerSource: response.answer_source || 'model',
            ...(proposedActions.length ? { proposedActions, actionDecision: 'pending' as const, actionContextKey } : {}),
            ...(unavailableActionCount > 0 && proposedActions.length === 0
              ? { content: `${response.reply}\n\nI could not safely offer that control for this request or the current page.` }
              : {}),
          },
        ]);
      } catch (err: any) {
        const errorDetail = err?.message || 'Unable to connect to Octa Tutor server.';
        setMascotExpression('confused');
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `Oops! ${errorDetail} Please check your AI Settings ⚙️ or server key configuration.`,
            expression: 'confused',
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [inputText, isLoading, messages, contextState, hasRouteTutorContext, pageTutorContext, actionContextKey, location.pathname, siteCatalog, topicKnowledgeFor, llmConfig]
  );

  return {
    messages,
    inputText,
    setInputText,
    isLoading,
    isListening,
    speechLang,
    setSpeechLang,
    isSpeechSupported,
    mascotExpression,
    setMascotExpression,
    sendMessage,
    startListening,
    stopListening,
    clearHistory,
    guidedStepIndex,
    isGuidedMode,
    setIsGuidedMode,
    llmConfig,
    saveLLMConfig,
    resetLLMConfig,
    isSettingsOpen,
    setIsSettingsOpen,
    tutorMode,
    setTutorMode,
    suggestions,
    currentPageLabel,
    hasVisualizerContext,
    currentStepIndex: pageTutorContext.currentStepIndex,
    totalSteps: hasRouteTutorContext ? pageTutorContext.totalSteps : 0,
    approveActions,
    dismissActions,
  };
}
