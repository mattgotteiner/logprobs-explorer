import type { ThemeMode } from '@mattgotteiner/spa-ui-controls'

export const APP_TITLE = 'Logprobs Explorer'
export const APP_SETTINGS_STORAGE_KEY = 'logprobs-explorer-settings'
export const CUSTOM_MODEL_OPTION = '__custom__'
export const DEFAULT_TOP_LOGPROBS = 5
export const MIN_TOP_LOGPROBS = 1
export const MAX_TOP_LOGPROBS = 20
export const MIN_MAX_OUTPUT_TOKENS = 1
export const MAX_MAX_OUTPUT_TOKENS = 4096

export const BUILTIN_MODELS = [
  'gpt-5.1',
  'gpt-5.2',
  'gpt-5.4',
  'gpt-5.4-mini',
  'gpt-5.4-nano',
] as const

export type Theme = ThemeMode
export type ModelName = string

export interface AppSettings {
  apiKey: string
  deploymentName: string
  endpoint: string
  maxOutputTokens: number
  modelName: ModelName
  temperature?: number
  temperatureEnabled: boolean
  theme: Theme
  topLogprobs: number
  topP?: number
  topPEnabled: boolean
}

export interface LogprobCandidate {
  bytes: number[]
  logprob: number
  probability: number
  token: string
}

export interface TokenLogprobEntry {
  bytes: number[]
  logprob: number
  probability: number
  token: string
  tokenIndex: number
  topCandidates: LogprobCandidate[]
}

export interface ResponseUsageSummary {
  inputTokens?: number
  outputTokens?: number
  reasoningTokens?: number
  totalTokens?: number
}

export interface ExplorerResult {
  incompleteReason?: string
  outputText: string
  request: Record<string, unknown>
  status?: string
  tokenEntries: TokenLogprobEntry[]
  usage?: ResponseUsageSummary
}

export interface ExplorerErrorDetails {
  body?: string
  code?: string | null
  message: string
  requestId?: string | null
  status?: number
  type?: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  deploymentName: '',
  endpoint: '',
  maxOutputTokens: 16,
  modelName: 'gpt-5.4-mini',
  temperature: 1,
  temperatureEnabled: false,
  theme: 'system',
  topLogprobs: DEFAULT_TOP_LOGPROBS,
  topP: 1,
  topPEnabled: false,
}

