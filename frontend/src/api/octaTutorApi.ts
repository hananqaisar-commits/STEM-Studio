import { apiClient } from './apiClient';

export interface OctaTutorMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
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
 * Does NOT require authentication (available to all learners).
 */
export async function sendTutorMessage(req: OctaTutorRequest): Promise<OctaTutorResponse> {
  return apiClient<OctaTutorResponse>('/api/octa-tutor', {
    method: 'POST',
    body: req,
  });
}
