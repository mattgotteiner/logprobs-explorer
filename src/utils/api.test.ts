import { describe, expect, it } from 'vitest'
import { APIError } from 'openai/error'
import { DEFAULT_SETTINGS } from '../types'
import {
  buildExplorerRequest,
  extractExplorerResult,
  normalizeEndpoint,
  toExplorerErrorDetails,
} from './api'

describe('api utilities', () => {
  it('normalizes Azure OpenAI endpoints to /openai/v1', () => {
    expect(normalizeEndpoint('https://example.openai.azure.com')).toBe(
      'https://example.openai.azure.com/openai/v1',
    )
    expect(normalizeEndpoint('https://example.openai.azure.com/')).toBe(
      'https://example.openai.azure.com/openai/v1',
    )
    expect(normalizeEndpoint('https://example.openai.azure.com/openai/v1')).toBe(
      'https://example.openai.azure.com/openai/v1',
    )
  })

  it('builds a bounded responses request with optional sampling controls', () => {
    const request = buildExplorerRequest('hello world', {
      ...DEFAULT_SETTINGS,
      deploymentName: 'custom-deployment',
      maxOutputTokens: 512,
      temperature: 0.4,
      temperatureEnabled: true,
      topLogprobs: 7,
      topP: 0.9,
      topPEnabled: true,
    })

    expect(request).toMatchObject({
      include: ['message.output_text.logprobs'],
      input: 'hello world',
      max_output_tokens: 512,
      model: 'custom-deployment',
      reasoning: {
        effort: 'none',
      },
      temperature: 0.4,
      top_logprobs: 7,
      top_p: 0.9,
    })
  })

  it('adds stream mode when requested', () => {
    const request = buildExplorerRequest('hello world', DEFAULT_SETTINGS, { stream: true })

    expect(request).toMatchObject({
      input: 'hello world',
      max_output_tokens: 5,
      stream: true,
    })
  })

  it('extracts token logprobs and converts them to linear probabilities', () => {
    const result = extractExplorerResult(
      {
        incomplete_details: {
          reason: 'max_output_tokens',
        },
        output: [
          {
            content: [
              {
                logprobs: [
                  {
                    bytes: [72, 101, 108, 108, 111],
                    logprob: -0.2,
                    token: 'Hello',
                    top_logprobs: [
                      {
                        bytes: [72, 101, 108, 108, 111],
                        logprob: -0.2,
                        token: 'Hello',
                      },
                      {
                        bytes: [72, 105],
                        logprob: -1.1,
                        token: 'Hi',
                      },
                    ],
                  },
                ],
                text: 'Hello',
                type: 'output_text',
              },
            ],
            type: 'message',
          },
        ],
        output_text: 'Hello',
        status: 'completed',
        usage: {
          input_tokens: 10,
          output_tokens: 1,
          output_tokens_details: {
            reasoning_tokens: 0,
          },
          total_tokens: 11,
        },
      },
      {
        input: 'hello world',
      },
    )

    expect(result.outputText).toBe('Hello')
    expect(result.incompleteReason).toBe('max_output_tokens')
    expect(result.tokenEntries).toHaveLength(1)
    expect(result.tokenEntries[0]?.token).toBe('Hello')
    expect(result.tokenEntries[0]?.probability).toBeCloseTo(Math.exp(-0.2))
    expect(result.tokenEntries[0]?.topCandidates[1]?.token).toBe('Hi')
    expect(result.usage?.totalTokens).toBe(11)
  })

  it('falls back to nested output text when the top-level output_text is missing', () => {
    const result = extractExplorerResult(
      {
        output: [
          {
            content: [
              {
                text: 'Hello',
                type: 'output_text',
              },
              {
                text: ' world',
                type: 'output_text',
              },
            ],
            type: 'message',
          },
        ],
        status: 'completed',
      },
      {
        input: 'hello world',
      },
    )

    expect(result.outputText).toBe('Hello world')
  })

  it('normalizes API errors with status and body details', () => {
    const error = APIError.generate(
      429,
      {
        error: {
          code: 'rate_limit_exceeded',
          message: 'Too many requests',
          type: 'rate_limit_error',
        },
      },
      undefined,
      new Headers({
        'x-request-id': 'req_123',
      }),
    )

    expect(toExplorerErrorDetails(error)).toEqual({
      body: JSON.stringify(
        {
          code: 'rate_limit_exceeded',
          message: 'Too many requests',
          type: 'rate_limit_error',
        },
        null,
        2,
      ),
      code: 'rate_limit_exceeded',
      message: 'Too many requests',
      requestId: 'req_123',
      status: 429,
      type: 'rate_limit_error',
    })
  })
})

