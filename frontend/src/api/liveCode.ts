import { apiClient } from './apiClient';
import type { DebuggerLanguage } from '../data/languages';

export type RuntimeValue =
  | { kind: 'scalar'; type: string; value: unknown; truncated?: boolean }
  | { kind: 'ref'; type: string; object_id: string }
  | { kind: 'opaque'; type: string; preview?: string };

export interface RuntimeObjectEntry {
  key: string;
  value: RuntimeValue;
}

export interface RuntimeObject {
  object_id: string;
  type: string;
  entries: RuntimeObjectEntry[];
  truncated?: boolean;
  opaque?: boolean;
}

export interface RuntimeFrame {
  function: string;
  line: number;
  scope: Record<string, RuntimeValue>;
}

export interface RuntimeTraceEvent {
  seq: number;
  kind: 'line' | 'call' | 'return' | 'exception' | string;
  phase?: 'before' | 'after' | 'at' | string;
  line: number;
  function: string;
  frames: RuntimeFrame[];
  heap: Record<string, RuntimeObject>;
  return_value?: RuntimeValue;
  exception_type?: string;
}

export interface LiveCodeExecutionRequest {
  category_id: string;
  topic_id?: string;
  language: DebuggerLanguage;
  code: string;
  stdin: string;
  revision: string;
}

export interface LiveCodeExecutionResponse {
  status: 'ok' | 'compile_error' | 'runtime_error' | 'timeout';
  revision: string;
  stdout: string;
  stderr: string;
  error?: string | null;
  trace_steps: RuntimeTraceEvent[];
  trace_support: 'automatic' | 'not_available';
  trace_truncated: boolean;
  trace_error?: { kind?: string; line?: number; message?: string } | null;
}

export function executeLiveCode(
  request: LiveCodeExecutionRequest,
  signal?: AbortSignal,
): Promise<LiveCodeExecutionResponse> {
  return apiClient<LiveCodeExecutionResponse>('/api/execute/live-code', {
    method: 'POST',
    body: request,
    requiresAuth: true,
    signal,
  });
}
