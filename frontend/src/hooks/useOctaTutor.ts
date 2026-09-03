import { useState, useCallback, useRef, useEffect } from 'react';
import { sendTutorMessage, type OctaTutorMessage, type OctaTutorResponse } from '../api/octaTutorApi';
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
}

export function useOctaTutor(): UseOctaTutorReturn {
  const { contextState } = useTutorContext();
  const { setTheme } = useTheme();

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Hello! I'm Octa Tutor, your personal DSA teaching assistant! 🐙\nI can explain ${contextState.algorithmName || 'algorithms'}, break down specific step numbers, switch themes, or create custom quizzes. How can I help you today?`,
      expression: 'happy',
      timestamp: new Date(),
    },
  ]);

  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechLang, setSpeechLang] = useState<SupportedSpeechLang>('en-US');
  const [mascotExpression, setMascotExpression] = useState<MascotExpression>('neutral');
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
      setMascotExpression('listening');
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
    if (!recognitionRef.current) return;
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
        content: `Conversation reset! What shall we learn about ${contextState.algorithmName || 'DSA'} next?`,
        expression: 'excited',
        timestamp: new Date(),
      },
    ]);
  }, [contextState.algorithmName]);

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
        });

        // Update mascot mood
        const expr = (response.mascot_expression as MascotExpression) || 'helping';
        setMascotExpression(expr);

        // Handle tool function calls
        if (response.function_calls && response.function_calls.length > 0) {
          for (const call of response.function_calls) {
            if (call.name === 'switch_theme' && call.args?.mode) {
              setTheme(call.args.mode);
            } else if (call.name === 'toggle_debugger' && contextState.setShowDebugger) {
              const vis = call.args?.visible !== undefined ? call.args.visible : true;
              contextState.setShowDebugger(vis);
            } else if (call.name === 'start_visualization' && contextState.onSetInput) {
              const vals = call.args?.values;
              if (Array.isArray(vals) && vals.length > 0) {
                contextState.onSetInput(vals);
                if (contextState.reset) contextState.reset();
                if (contextState.play) contextState.play();
                setIsGuidedMode(true);
                setGuidedStepIndex(0);
              }
            } else if (call.name === 'generate_quiz' && contextState.onLaunchQuiz) {
              contextState.onLaunchQuiz(call.args);
            }
          }
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
            content: `Oops! ${errorDetail} Please make sure backend is running and DASHSCOPE_API_KEY is configured.`,
            expression: 'confused',
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [inputText, isLoading, messages, contextState, setTheme]
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
  };
}
