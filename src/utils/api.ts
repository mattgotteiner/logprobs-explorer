import OpenAI from 'openai'
import type {
  AppSettings,
  ExplorerResult,
  LogprobCandidate,
  ResponseUsageSummary,
  TokenLogprobEntry,
} from '../types'

interface AzureCredentials {
  apiKey: string
  endpoint: string
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

  if (settings.temperatureEnabled) {
    request.temperature = settings.temperature ?? 1
  }

  if (settings.topPEnabled) {
    request.top_p = settings.topP ?? 1
  }

  return request
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
    outputText: getString(response.output_text) ?? '',
    request,
    status: getString(response.status),
    tokenEntries: extractTokenEntries(response),
    usage: extractUsageSummary(response),
  }
}

export async function runLogprobsRequest(
  prompt: string,
  settings: AppSettings,
): Promise<ExplorerResult> {
  const client = createAzureClient({
    apiKey: settings.apiKey.trim(),
    endpoint: settings.endpoint.trim(),
  })

  const request = buildExplorerRequest(prompt, settings)
  const response = await client.responses.create(
    request as Parameters<typeof client.responses.create>[0],
  )

  return extractExplorerResult(response as unknown, request)
}

