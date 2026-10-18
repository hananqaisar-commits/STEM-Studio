import { apiClient } from './apiClient';

export interface OctaTutorMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type LLMProvider = 'dashscope' | 'openai' | 'openrouter' | 'anthropic' | 'custom';

export interface UserLLMConfig {
  provider: LLMProvider;
  apiKey: string;
  baseUrl: string;
  modelName: string;
}

export interface OctaTutorRequest {
  message: string;
  algorithm_name?: string;
  algorithm_id?: string;
  category?: string;
  current_step_description?: string;
  current_step_index?: number;
  total_steps?: number;
  step_data?: string;
  current_page?: string;
  site_catalog?: string;
  topic_knowledge?: string;
  conversation_history?: OctaTutorMessage[];
  mode?: 'interactive' | 'natural';
  // BYOK LLM Config
  provider?: string;
  api_key?: string;
  base_url?: string;
  model_name?: string;
}

export interface OctaTutorTestResponse {
  success: boolean;
  message: string;
  model_used: string;
}

export interface OctaTutorFunctionCall {
  name: string;
  args: Record<string, any>;
}

export interface OctaTutorResponse {
  reply: string;
  function_calls: OctaTutorFunctionCall[];
  mascot_expression: string;
  answer_source?: 'model' | 'offline' | 'grounded';
  provider_status?: 'connected' | 'missing' | 'limit' | 'unavailable' | null;
}

export interface OctaTutorProviderStatus {
  configured: boolean;
  provider: 'dashscope';
}

export type OctaResponseStyle = 'balanced' | 'simpler' | 'stepwise' | 'examples';

export interface OctaTutorLearningProfile {
  response_style: OctaResponseStyle;
  helpful_count: number;
  needs_detail_count: number;
  quiz_signals_used: number;
  strengths: Array<{ category: string; algorithm_id: string; accuracy_percent: number; attempts: number }>;
  practice_areas: Array<{ category: string; algorithm_id: string; accuracy_percent: number; attempts: number }>;
}

/**
 * Send a message to the Octa AI Tutor backend API.
 */
export async function sendTutorMessage(req: OctaTutorRequest): Promise<OctaTutorResponse> {
  return apiClient<OctaTutorResponse>('/api/octa-tutor', {
    method: 'POST',
    body: req,
    requiresAuth: true,
  });
}

/** Returns a safe configuration flag only; never returns a provider secret. */
export async function getTutorProviderStatus(): Promise<OctaTutorProviderStatus> {
  return apiClient<OctaTutorProviderStatus>('/api/octa-tutor/status');
}

export async function getTutorLearningProfile(): Promise<OctaTutorLearningProfile> {
  return apiClient<OctaTutorLearningProfile>('/api/octa-tutor/profile', { requiresAuth: true });
}

export async function updateTutorResponseStyle(response_style: OctaResponseStyle): Promise<OctaTutorLearningProfile> {
  return apiClient<OctaTutorLearningProfile>('/api/octa-tutor/profile', {
    method: 'PATCH',
    body: { response_style },
    requiresAuth: true,
  });
}

export async function submitTutorFeedback(input: {
  helpful: boolean;
  response_style?: Exclude<OctaResponseStyle, 'balanced'>;
}): Promise<OctaTutorLearningProfile> {
  return apiClient<OctaTutorLearningProfile>('/api/octa-tutor/feedback', {
    method: 'POST',
    body: input,
    requiresAuth: true,
  });
}

export async function clearTutorFeedbackProfile(): Promise<OctaTutorLearningProfile> {
  return apiClient<OctaTutorLearningProfile>('/api/octa-tutor/profile', {
    method: 'DELETE',
    requiresAuth: true,
  });
}

/**
 * Test connection to custom LLM provider & API key.
 */
export async function testTutorConnection(config: UserLLMConfig): Promise<OctaTutorTestResponse> {
  return apiClient<OctaTutorTestResponse>('/api/octa-tutor/test', {
    method: 'POST',
    requiresAuth: true,
    body: {
      provider: config.provider,
      api_key: config.apiKey,
      base_url: config.baseUrl,
      model_name: config.modelName,
    },
  });
}
