/**
 * Mascot state definitions for Octa the Octopus.
 * Expressions map to one of Octa's transparent plush sprite states.
 */

export type MascotExpression =
  | 'neutral'
  | 'happy'
  | 'focused'
  | 'thinking'
  | 'reading'
  | 'excited'
  | 'confused'
  | 'surprised'
  | 'tired'
  | 'sad'
  | 'helping'
  | 'review'
  | 'listening'
  | 'wink'
  | 'angry';

export type MascotContext =
  | 'dashboard'
  | 'signin'
  | 'signup'
  | 'create-account'
  | 'review'
  | 'learning'
  | 'quiz'
  | 'lab'
  | 'projects'
  | 'tools'
  | 'loading'
  | 'success'
  | 'tutor';

export type MascotSize = 'tiny' | 'small' | 'medium' | 'large' | 'xl';

export interface MascotState {
  expression: MascotExpression;
  context: MascotContext;
  previousExpression?: MascotExpression;
  message?: string;
}

export interface MascotApi {
  state: MascotState;
  setExpression: (
    expression: MascotExpression,
    options?: { temporary?: boolean; durationMs?: number; message?: string }
  ) => void;
  setContext: (context: MascotContext) => void;
  restorePrevious: () => void;
}

/** Priority order used when competing state changes fire. */
export const EXPRESSION_PRIORITY: Record<MascotExpression, number> = {
  excited: 90,
  surprised: 85,
  happy: 80,
  confused: 70,
  listening: 65,
  angry: 63,
  thinking: 60,
  focused: 50,
  reading: 45,
  review: 44,
  helping: 43,
  sad: 42,
  tired: 40,
  wink: 38,
  neutral: 10,
};

/** Default state */
export const DEFAULT_MASCOT_STATE: MascotState = {
  expression: 'neutral',
  context: 'dashboard',
};

/** All available expressions (for iteration/validation). */
export const ALL_EXPRESSIONS: readonly MascotExpression[] = [
  'neutral', 'happy', 'focused', 'thinking', 'reading', 'excited',
  'confused', 'surprised', 'tired', 'sad', 'helping', 'review', 'listening',
  'wink', 'angry',
];
