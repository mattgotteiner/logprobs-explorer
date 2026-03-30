import OpenAI from 'openai'
import { APIError } from 'openai/error'
import type {
  AppSettings,
  ExplorerErrorDetails,
  ExplorerResult,
  LogprobCandidate,
  ResponseUsageSummary,
  TokenLogprobEntry,
} from '../types'

interface AzureCredentials {
  apiKey: string
  endpoint: string
}

export interface LogprobsRequestProgressUpdate {
  detail: string
  outputText: string
  phase: 'starting' | 'waiting' | 'streaming' | 'finalizing'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function getNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is number => typeof entry === 'number')
}

function toProbability(logprob: number): number {
  return Math.exp(logprob)
}

function normalizeCandidate(candidate: unknown): LogprobCandidate | null {
  if (!isRecord(candidate)) {
    return null
  }

  const token = getString(candidate.token)
  const logprob = getNumber(candidate.logprob)

  if (token === undefined || logprob === undefined) {
    return null
  }

  return {
    bytes: getNumberArray(candidate.bytes),
    logprob,
    probability: toProbability(logprob),
    token,
  }
}

function normalizeTokenEntry(entry: unknown, tokenIndex: number): TokenLogprobEntry | null {
  const candidate = normalizeCandidate(entry)
  if (!candidate || !isRecord(entry)) {
    return null
  }

  const topLogprobs = Array.isArray(entry.top_logprobs) ? entry.top_logprobs : []

  return {
    ...candidate,
    tokenIndex,
    topCandidates: topLogprobs
      .map((topLogprob) => normalizeCandidate(topLogprob))
      .filter((topLogprob): topLogprob is LogprobCandidate => topLogprob !== null),
  }
}

function extractUsageSummary(response: Record<string, unknown>): ResponseUsageSummary | undefined {
  if (!isRecord(response.usage)) {
    return undefined
  }

  const usage = response.usage
  const outputTokensDetails = isRecord(usage.output_tokens_details)
    ? usage.output_tokens_details
    : null

  return {
    inputTokens: getNumber(usage.input_tokens),
    outputTokens: getNumber(usage.output_tokens),
    reasoningTokens: outputTokensDetails
      ? getNumber(outputTokensDetails.reasoning_tokens)
      : undefined,
    totalTokens: getNumber(usage.total_tokens),
  }
}

function extractTokenEntries(response: Record<string, unknown>): TokenLogprobEntry[] {
  if (!Array.isArray(response.output)) {
    return []
  }

  let tokenIndex = 0
  const tokenEntries: TokenLogprobEntry[] = []

  for (const outputItem of response.output) {
    if (
      !isRecord(outputItem) ||
      outputItem.type !== 'message' ||
      !Array.isArray(outputItem.content)
    ) {
      continue
    }

    for (const contentPart of outputItem.content) {
      if (
        !isRecord(contentPart) ||
        contentPart.type !== 'output_text' ||
        !Array.isArray(contentPart.logprobs)
      ) {
        continue
      }

      for (const tokenLogprob of contentPart.logprobs) {
        const normalizedEntry = normalizeTokenEntry(tokenLogprob, tokenIndex)
        if (normalizedEntry) {
          tokenEntries.push(normalizedEntry)
          tokenIndex += 1
        }
      }
    }
  }

  return tokenEntries
}

function extractOutputText(response: Record<string, unknown>): string {
  const directOutputText = getString(response.output_text)
  if (directOutputText !== undefined) {
    return directOutputText
  }

  if (!Array.isArray(response.output)) {
    return ''
  }

  let outputText = ''

  for (const outputItem of response.output) {
    if (
      !isRecord(outputItem) ||
      outputItem.type !== 'message' ||
      !Array.isArray(outputItem.content)
    ) {
      continue
    }

    for (const contentPart of outputItem.content) {
      if (!isRecord(contentPart) || contentPart.type !== 'output_text') {
        continue
      }

      outputText += getString(contentPart.text) ?? ''
    }
  }

  return outputText
}

function extractIncompleteReason(response: Record<string, unknown>): string | undefined {
  if (!isRecord(response.incomplete_details)) {
    return undefined
  }

  return getString(response.incomplete_details.reason)
}

export function normalizeEndpoint(endpoint: string): string {
  let normalized = endpoint.trim()

  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1)
  }

  if (!normalized.endsWith('/openai/v1')) {
    normalized = `${normalized}/openai/v1`
  }

  return normalized
}

export function createAzureClient(credentials: AzureCredentials): OpenAI {
  return new OpenAI({
    apiKey: credentials.apiKey,
    baseURL: normalizeEndpoint(credentials.endpoint),
    dangerouslyAllowBrowser: true,
    maxRetries: 2,
  })
}

export function buildExplorerRequest(
  prompt: string,
  settings: AppSettings,
  options: { stream?: boolean } = {},
): Record<string, unknown> {
  const deployment = settings.deploymentName.trim() || settings.modelName.trim()

  const request: Record<string, unknown> = {
    include: ['message.output_text.logprobs'],
    input: prompt,
    max_output_tokens: settings.maxOutputTokens,
    model: deployment,
    reasoning: {
      effort: 'none',
    },
    top_logprobs: settings.topLogprobs,
  }

  if (options.stream) {
    request.stream = true
  }

  if (settings.temperatureEnabled) {
    request.temperature = settings.temperature ?? 1
  }

  if (settings.topPEnabled) {
    request.top_p = settings.topP ?? 1
  }

  return request
}

function stringifyErrorBody(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined
  }

  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function toExplorerErrorDetails(error: unknown): ExplorerErrorDetails {
  if (error instanceof APIError) {
    const apiErrorBody = stringifyErrorBody(error.error)
    const apiErrorMessage =
      isRecord(error.error) && typeof error.error.message === 'string'
        ? error.error.message
        : error.message

    return {
      body: apiErrorBody,
      code: error.code,
      message: apiErrorMessage || 'The request failed.',
      requestId: error.requestID,
      status: error.status,
      type: error.type,
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    }
  }

  return {
    message: 'The request failed.',
  }
}

export function extractExplorerResult(
  response: unknown,
  request: Record<string, unknown>,
): ExplorerResult {
  if (!isRecord(response)) {
    return {
      outputText: '',
      request,
      tokenEntries: [],
    }
  }

  return {
    incompleteReason: extractIncompleteReason(response),
    outputText: extractOutputText(response),
    request,
    responseJson: response,
    status: getString(response.status),
    tokenEntries: extractTokenEntries(response),
    usage: extractUsageSummary(response),
  }
}

export async function runLogprobsRequest(
  prompt: string,
  settings: AppSettings,
  onProgress?: (update: LogprobsRequestProgressUpdate) => void,
): Promise<ExplorerResult> {
  const client = createAzureClient({
    apiKey: settings.apiKey.trim(),
    endpoint: settings.endpoint.trim(),
  })

  const request = buildExplorerRequest(prompt, settings, { stream: true })
  let outputText = ''
  const emitProgress = (
    phase: LogprobsRequestProgressUpdate['phase'],
    detail: string,
  ): void => {
    onProgress?.({
      detail,
      outputText,
      phase,
    })
  }

  emitProgress('starting', 'Connecting to Azure OpenAI...')

  const stream = client.responses.stream(request as Parameters<typeof client.responses.stream>[0])

  stream.on('response.created', () => {
    emitProgress('waiting', 'Request started. Waiting for the first streamed tokens...')
  })

  stream.on('response.in_progress', () => {
    if (outputText.length === 0) {
      emitProgress('waiting', 'Model is preparing a streamed response...')
    }
  })

  stream.on('response.output_text.delta', (event) => {
    outputText = event.snapshot
    emitProgress('streaming', 'Streaming output from Azure OpenAI...')
  })

  stream.on('response.completed', () => {
    emitProgress('finalizing', 'Stream complete. Collecting final token logprobs...')
  })

  const response = await stream.finalResponse()

  return extractExplorerResult(response as unknown, request)
}

