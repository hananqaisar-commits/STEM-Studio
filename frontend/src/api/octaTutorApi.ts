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
  conversation_history?: OctaTutorMessage[];
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
}

/**
 * Send a message to the Octa AI Tutor backend API.
 */
export async function sendTutorMessage(req: OctaTutorRequest): Promise<OctaTutorResponse> {
  return apiClient<OctaTutorResponse>('/api/octa-tutor', {
    method: 'POST',
    body: req,
  });
}

/**
 * Test connection to custom LLM provider & API key.
 */
export async function testTutorConnection(config: UserLLMConfig): Promise<OctaTutorTestResponse> {
  return apiClient<OctaTutorTestResponse>('/api/octa-tutor/test', {
    method: 'POST',
    body: {
      provider: config.provider,
      api_key: config.apiKey,
      base_url: config.baseUrl,
      model_name: config.modelName,
    },
  });
}
