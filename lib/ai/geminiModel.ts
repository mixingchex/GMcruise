import { logger } from '@/lib/logger';

const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';

type AliasConfig = {
  target: string;
  reason: string;
};

const MODEL_ALIAS_MAP: Record<string, AliasConfig> = {
  'gemini-flash-latest': {
    target: 'gemini-2.0-flash',
    reason: 'gemini-flash-latest is not a valid API model ID, using gemini-2.0-flash.',
  },
  'gemini-flash': {
    target: 'gemini-2.0-flash',
    reason: 'Prefer the explicit versioned model ID.',
  },
  'gemini-pro-latest': {
    target: 'gemini-2.0-flash',
    reason: 'gemini-pro-latest is deprecated, using gemini-2.0-flash.',
  },
};

function normalizeInput(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^models\//i, '');
}

/**
 * Resolves the Gemini model name to use for API requests.
 * - Strips deprecated `models/` prefixes.
 * - Maps deprecated/unsupported model names to newer aliases.
 * - Falls back to a sensible default when unset.
 */
export function resolveGeminiModelName() {
  const envValue = normalizeInput(process.env.GEMINI_MODEL);
  if (!envValue) {
    return DEFAULT_GEMINI_MODEL;
  }

  const alias = MODEL_ALIAS_MAP[envValue.toLowerCase()];
  if (alias) {
    logger.warn(`[GeminiModel] "${envValue}" -> "${alias.target}" (${alias.reason})`);
    return alias.target;
  }

  return envValue;
}

export function getDefaultGeminiModel() {
  return DEFAULT_GEMINI_MODEL;
}

export function getChatModelName() {
  return resolveGeminiModelName();
}

