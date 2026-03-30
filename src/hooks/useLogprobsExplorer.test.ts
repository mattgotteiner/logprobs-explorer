import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExplorerResult } from '../types'
import { useLogprobsExplorer } from './useLogprobsExplorer'

const { mockRunLogprobsRequest } = vi.hoisted(() => ({
  mockRunLogprobsRequest: vi.fn(),
}))

vi.mock('../utils/api', async () => {
  const actual = await vi.importActual<typeof import('../utils/api')>('../utils/api')

  return {
    ...actual,
    runLogprobsRequest: mockRunLogprobsRequest,
  }
})

describe('useLogprobsExplorer', () => {
  beforeEach(() => {
    mockRunLogprobsRequest.mockReset()
  })

  it('preserves streamed output when the final response text is empty', async () => {
    mockRunLogprobsRequest.mockImplementation(
      async (
        _prompt: string,
        _settings: object,
        onProgress?: (update: {
          detail: string
          outputText: string
          phase: 'starting' | 'waiting' | 'streaming' | 'finalizing'
        }) => void,
      ): Promise<ExplorerResult> => {
        onProgress?.({
          detail: 'Streaming output from Azure OpenAI...',
          outputText: 'Hello from the stream',
          phase: 'streaming',
        })

        return {
          outputText: '',
          request: {},
          status: 'completed',
          tokenEntries: [],
        }
      },
    )

    const { result } = renderHook(() => useLogprobsExplorer())

    await act(async () => {
      await result.current.runTest('hello', {
        apiKey: 'secret',
        deploymentName: '',
        endpoint: 'https://example.openai.azure.com',
        maxOutputTokens: 5,
        modelName: 'gpt-5.4-mini',
        temperature: 1,
        temperatureEnabled: false,
        theme: 'system',
        topLogprobs: 5,
        topP: 1,
        topPEnabled: false,
      })
    })

    expect(result.current.result?.status).toBe('completed')
    expect(result.current.streamedOutputText).toBe('Hello from the stream')
  })
})
