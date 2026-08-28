/**
 * Shared Universal Batch Input Parser for STEM Studio
 * Handles flexible delimiters (commas, spaces, newlines), error detection,
 * edge cases (trailing/consecutive delimiters), and type safety.
 */

export interface NumberParseResult {
  values: number[];
  isValid: boolean;
  error?: string;
}

export interface StringParseResult {
  values: string[];
  isValid: boolean;
  error?: string;
}

export interface KeyValueItem {
  key: string;
  value: string | number;
}

export interface KeyValueParseResult {
  pairs: KeyValueItem[];
  isValid: boolean;
  error?: string;
}

/**
 * Parses numeric collection input like "10, 20, 30, 40" or "10 20\n30, 40"
 */
export function parseNumberList(
  raw: string,
  options?: {
    minVal?: number;
    maxVal?: number;
    maxCount?: number;
    integerOnly?: boolean;
  }
): NumberParseResult {
  if (!raw || !raw.trim()) {
    return { values: [], isValid: false, error: 'Input is empty. Please enter values.' };
  }

  // Split by comma, space, newline, semicolon, or tab
  const tokens = raw
    .trim()
    .split(/[\s,;\n\t]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (tokens.length === 0) {
    return { values: [], isValid: false, error: 'No values found.' };
  }

  const values: number[] = [];
  const invalidTokens: string[] = [];

  for (const token of tokens) {
    const num = Number(token);
    if (isNaN(num)) {
      invalidTokens.push(token);
    } else {
      if (options?.integerOnly && !Number.isInteger(num)) {
        invalidTokens.push(token);
      } else {
        values.push(num);
      }
    }
  }

  if (invalidTokens.length > 0) {
    return {
      values,
      isValid: false,
      error: `Invalid number${invalidTokens.length > 1 ? 's' : ''}: ${invalidTokens.slice(0, 3).join(', ')}${invalidTokens.length > 3 ? '...' : ''}`,
    };
  }

  if (options?.maxCount && values.length > options.maxCount) {
    return {
      values: values.slice(0, options.maxCount),
      isValid: false,
      error: `Maximum of ${options.maxCount} values allowed.`,
    };
  }

  return { values, isValid: true };
}

/**
 * Parses word/string collection input like "cat, car, dog" or "cat car dog"
 */
export function parseStringList(
  raw: string,
  options?: {
    lowercase?: boolean;
    maxCount?: number;
    pattern?: RegExp;
  }
): StringParseResult {
  if (!raw || !raw.trim()) {
    return { values: [], isValid: false, error: 'Input is empty. Please enter words.' };
  }

  const tokens = raw
    .trim()
    .split(/[\s,;\n\t]+/)
    .map((t) => (options?.lowercase ? t.trim().toLowerCase() : t.trim()))
    .filter((t) => t.length > 0);

  if (tokens.length === 0) {
    return { values: [], isValid: false, error: 'No words found.' };
  }

  if (options?.pattern) {
    const invalid = tokens.filter((t) => !options.pattern!.test(t));
    if (invalid.length > 0) {
      return {
        values: tokens,
        isValid: false,
        error: `Invalid string format for: ${invalid.slice(0, 3).join(', ')}`,
      };
    }
  }

  return {
    values: options?.maxCount ? tokens.slice(0, options.maxCount) : tokens,
    isValid: true,
  };
}

/**
 * Parses key-value pairs like "apple:10, banana:20, orange:30" or "apple=10 banana=20"
 */
export function parseKeyValueList(raw: string): KeyValueParseResult {
  if (!raw || !raw.trim()) {
    return { pairs: [], isValid: false, error: 'Input is empty. Please enter key-value pairs.' };
  }

  // Split pairs by comma, semicolon, or newline
  const pairTokens = raw
    .trim()
    .split(/[,;\n]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const pairs: KeyValueItem[] = [];
  const invalidPairs: string[] = [];

  for (const token of pairTokens) {
    // Delimiters can be : or = or ->
    const parts = token.split(/[:=]|->/).map((s) => s.trim());
    if (parts.length === 2 && parts[0].length > 0 && parts[1].length > 0) {
      const numVal = Number(parts[1]);
      pairs.push({
        key: parts[0],
        value: isNaN(numVal) ? parts[1] : numVal,
      });
    } else {
      invalidPairs.push(token);
    }
  }

  if (invalidPairs.length > 0) {
    return {
      pairs,
      isValid: false,
      error: `Malformed pair${invalidPairs.length > 1 ? 's' : ''}: ${invalidPairs.slice(0, 2).join(', ')} (expected key:value)`,
    };
  }

  return { pairs, isValid: true };
}
