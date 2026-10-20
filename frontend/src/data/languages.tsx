import type { ReactNode } from 'react';
import { Braces, Code2, Cpu, FileCode2, Terminal, Workflow } from 'lucide-react';

/** The only language catalogue used by debugger reference and custom code. */
export type DebuggerLanguage = 'c' | 'cpp' | 'java' | 'python' | 'go' | 'csharp';

export interface DebuggerLanguageDefinition {
  id: DebuggerLanguage;
  label: string;
  judge0LanguageId: number;
  icon: ReactNode;
}

/** Judge0 CE IDs. Keep this ordered list in sync with the custom-code registry. */
export const DEBUGGER_LANGUAGES: readonly DebuggerLanguageDefinition[] = [
  { id: 'c', label: 'C', judge0LanguageId: 50, icon: <FileCode2 size={14} /> },
  { id: 'cpp', label: 'C++', judge0LanguageId: 54, icon: <Cpu size={14} /> },
  { id: 'java', label: 'Java', judge0LanguageId: 62, icon: <Code2 size={14} /> },
  { id: 'python', label: 'Python', judge0LanguageId: 71, icon: <Terminal size={14} /> },
  { id: 'go', label: 'Go', judge0LanguageId: 60, icon: <Workflow size={14} /> },
  { id: 'csharp', label: 'C#', judge0LanguageId: 51, icon: <Braces size={14} /> },
];

export const DEBUGGER_LANGUAGE_IDS = DEBUGGER_LANGUAGES.map(({ id }) => id);

export function getDebuggerLanguage(language: DebuggerLanguage): DebuggerLanguageDefinition {
  return DEBUGGER_LANGUAGES.find(({ id }) => id === language)!;
}
