import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendTutorMessage, type OctaTutorMessage, type OctaTutorResponse, type UserLLMConfig } from '../api/octaTutorApi';
import { useTutorContext } from '../contexts/TutorContext';
import { useTheme } from '../contexts/ThemeContext';
import type { MascotExpression } from '../components/mascot/MascotState';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  expression?: MascotExpression;
  timestamp: Date;
  isRevealing?: boolean;
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
  const navigate = useNavigate();

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
      content: `Hello! I'm Octa AI Tutor, your expert DSA Professor! 🐙\n\nChoose your preferred learning mode:\n• **AI Concept Mode**: Ask any DSA algorithm, recursion problem, logic, time/space complexity, or code implementations like ChatGPT!\n• **Interactive Step Mode**: Ask real-time questions about the current visualizer step, active elements, and state trace.\n\nWhat algorithm concept would you like to master today?`,
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
        content: `Conversation reset! What shall we learn about ${contextState.algorithmName || 'DSA'} next? 🐙`,
        expression: 'excited',
        timestamp: new Date(),
      },
    ]);
  }, [contextState.algorithmName]);

  // ── Context-aware smart suggestions ──
  const suggestions = useMemo<TutorSuggestion[]>(() => {
    const algName = contextState.algorithmName || 'this algorithm';
    const stepNum = contextState.currentStepIndex + 1;
    const totalSteps = contextState.totalSteps || 1;
    const category = contextState.category || '';

    const base: TutorSuggestion[] = [
      { label: '💡 Explain Intuition', text: `Explain how ${algName} works intuitively` },
      { label: '⏱️ Time & Space', text: `What is the time and space complexity of ${algName}?` },
    ];

    if (contextState.algorithmName) {
      base.push({ label: `🔍 Step ${stepNum}`, text: `Explain step ${stepNum} of ${totalSteps} in detail` });
    }

    if (category === 'sorting') {
      base.push({ label: '⚖️ Compare', text: `Compare ${algName} with Quick Sort and Merge Sort` });
    } else if (category === 'graph') {
      base.push({ label: '🌐 Real-world', text: `Where is ${algName} used in real life system design?` });
    } else if (category === 'dp') {
      base.push({ label: '🧩 DP Logic', text: `Explain the subproblems and state transition matrix for ${algName}` });
    } else {
      base.push({ label: '💻 Code Implementation', text: `Show me the clean Python and C++ implementation for ${algName}` });
    }

    return base;
  }, [contextState.algorithmName, contextState.currentStepIndex, contextState.totalSteps, contextState.category]);

  // ── Handle tool/function call dispatching ──
  const dispatchFunctionCalls = useCallback((functionCalls: Array<{ name: string; args: Record<string, any> }>) => {
    for (const call of functionCalls) {
      switch (call.name) {
        case 'navigate_to_algorithm': {
          const catId = call.args?.category_id;
          const topicId = call.args?.topic_id;
          if (catId) {
            navigate(`/dashboard/${catId}`, {
              state: topicId ? { selectedTopic: topicId } : undefined,
            });
          }
          break;
        }

        case 'control_playback': {
          const action = call.args?.action;
          if (action === 'play' && contextState.play) contextState.play();
          else if (action === 'pause' && contextState.pause) contextState.pause();
          else if (action === 'step_forward' && contextState.stepForward) contextState.stepForward();
          else if (action === 'reset' && contextState.reset) contextState.reset();
          break;
        }

        case 'set_speed': {
          const speed = call.args?.speed;
          if (typeof speed === 'number' && contextState.setSpeed) {
            contextState.setSpeed(speed);
          }
          break;
        }

        case 'set_input': {
          const vals = call.args?.values;
          if (Array.isArray(vals) && vals.length > 0 && contextState.onSetInput) {
            contextState.onSetInput(vals);
            if (contextState.reset) contextState.reset();
            if (contextState.play) contextState.play();
            setIsGuidedMode(true);
            setGuidedStepIndex(0);
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
          if (contextState.setShowDebugger) {
            const vis = call.args?.visible !== undefined ? call.args.visible : true;
            contextState.setShowDebugger(vis);
          }
          break;
        }

        case 'toggle_fullscreen': {
          if (contextState.toggleFullscreen) {
            const enter = call.args?.enter !== undefined ? call.args.enter : true;
            contextState.toggleFullscreen(enter);
          }
          break;
        }

        case 'generate_quiz': {
          if (contextState.onLaunchQuiz) {
            const questions = Array.isArray(call.args?.questions) ? call.args.questions : undefined;
            contextState.onLaunchQuiz(questions);
          }
          break;
        }

        default:
          console.warn(`[OctaTutor] Unknown function call: ${call.name}`);
      }
    }
  }, [contextState, navigate, setTheme]);

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
      const stepMatch = promptToUse.match(/step\s*(\d+)/i);
      if (stepMatch && contextState.steps && contextState.steps.length > 0) {
        const stepNum = parseInt(stepMatch[1], 10);
        const stepIdx = stepNum - 1;
        if (stepIdx >= 0 && stepIdx < contextState.steps.length) {
          targetStepData = JSON.stringify({
            referenced_step_number: stepNum,
            step_details: contextState.steps[stepIdx],
          });
        }
      }

      if (!targetStepData && contextState.currentStep) {
        targetStepData = JSON.stringify(contextState.currentStep);
      }

      // Prepare payload
      const historyPayload: OctaTutorMessage[] = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const response: OctaTutorResponse = await sendTutorMessage({
          message: promptToUse,
          algorithm_name: contextState.algorithmName,
          algorithm_id: contextState.algorithmId,
          category: contextState.category,
          current_step_description: contextState.currentStepDescription,
          current_step_index: contextState.currentStepIndex,
          total_steps: contextState.totalSteps,
          step_data: targetStepData,
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

        // Handle tool function calls
        if (response.function_calls && response.function_calls.length > 0) {
          dispatchFunctionCalls(response.function_calls);
        }

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
    [inputText, isLoading, messages, contextState, setTheme, llmConfig, navigate, dispatchFunctionCalls]
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
  };
}
