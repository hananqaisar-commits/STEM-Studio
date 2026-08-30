import { apiClient } from './apiClient';

export interface CustomCodeExecutionRequest {
  /** Composite key: categoryId.topicId (e.g. "sorting.bubble"). */
  algorithm_key: string;
  language: 'python' | 'cpp' | 'c' | 'java' | 'go' | 'csharp';
  code: string;
  /** Function-style: { args: { paramName: value } }; stateful: { ctorArgs, operations }. */
  state: Record<string, unknown>;
}

export interface CustomCodeExecutionResponse {
  status: 'ok' | 'compile_error' | 'runtime_error' | 'timeout';
  error?: string | null;
  stderr?: string | null;
  trace_steps: { op?: string; value?: unknown }[];
  result?: { result?: unknown; lastMethod?: string | null; returned?: unknown } | null;
  emitted_rows: number[][];
  emitted_pairs: number[][];
}

/**
 * Submit user code to the backend sandbox (Judge0-backed) and await the
 * parsed trace steps / result. Throws ApiError on 4xx/5xx (e.g. 503 when
 * JUDGE0_URL is not configured, 502 when the sandbox is unreachable).
 */
export function executeCustomCode(
  request: CustomCodeExecutionRequest
): Promise<CustomCodeExecutionResponse> {
  return apiClient<CustomCodeExecutionResponse>('/api/execute/custom-code', {
    method: 'POST',
    body: request,
  });
}
