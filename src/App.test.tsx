import type { ExplorerErrorDetails, ExplorerResult } from './types'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

interface MockProgressState {
  detail: string
  outputText: string
  phase: 'starting' | 'waiting' | 'streaming' | 'finalizing'
}

const { mockExplorerState } = vi.hoisted(() => ({
  mockExplorerState: {
    clearResult: vi.fn(),
    error: null as ExplorerErrorDetails | null,
    isRunning: false,
    progress: null as MockProgressState | null,
    result: null as ExplorerResult | null,
    runTest: vi.fn(async () => undefined),
    streamedOutputText: '',
  },
}))

vi.mock('./hooks/useLogprobsExplorer', () => ({
  useLogprobsExplorer: () => mockExplorerState,
}))

import App from './App'
import { APP_SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS } from './types'

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mockExplorerState.clearResult.mockClear()
    mockExplorerState.runTest.mockClear()
    mockExplorerState.error = null
    mockExplorerState.isRunning = false
    mockExplorerState.progress = null
    mockExplorerState.result = null
    mockExplorerState.streamedOutputText = ''
  })

  it('renders the explorer shell with the disabled composer warning state', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Logprobs Explorer' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View source on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/mattgotteiner/logprobs-explorer',
    )
    expect(
      screen.getByRole('heading', { name: /run a streamed responses api test/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /token-by-token logprobs/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Input text')).toBeDisabled()
    expect(screen.getByLabelText('Input text')).toHaveAttribute('rows', '6')
  })

  it('opens settings and renders the updated generation controls', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByLabelText('Open settings'))

    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByLabelText('Endpoint URL')).toBeInTheDocument()
    expect(screen.getByLabelText('API key')).toBeInTheDocument()
    expect(screen.getByLabelText('Model')).toBeInTheDocument()
    expect(screen.getByLabelText('Top logprobs')).toBeInTheDocument()
    expect(screen.getByLabelText('Max output tokens')).toBeInTheDocument()
    expect(screen.getByLabelText('Max output tokens slider')).toBeInTheDocument()
    expect(screen.getByLabelText('Light')).toBeInTheDocument()
    expect(screen.getByLabelText('Dark')).toBeInTheDocument()
    expect(screen.getByLabelText('System')).toBeInTheDocument()
  })

  it('loads persisted settings from localStorage', async () => {
    const user = userEvent.setup()

    localStorage.setItem(
      APP_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        settings: {
          ...DEFAULT_SETTINGS,
          deploymentName: 'logprobs-mini',
          endpoint: 'https://example.openai.azure.com',
          maxOutputTokens: 512,
          modelName: 'gpt-5.2',
          theme: 'dark',
          topLogprobs: 7,
        },
        version: 1,
      }),
    )

    render(<App />)
    await user.click(screen.getByLabelText('Open settings'))

    expect(screen.getByText(/model:/i)).toBeInTheDocument()
    expect(screen.getByText('logprobs-mini')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://example.openai.azure.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('7')).toBeInTheDocument()
    expect(screen.getByLabelText('Max output tokens')).toHaveValue(512)
    expect(screen.getByLabelText('Max output tokens slider')).toHaveValue('512')
  })

  it('enables the input text after entering an API key', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByLabelText('Open settings'))
    await user.type(screen.getByLabelText('Endpoint URL'), 'https://example.openai.azure.com')
    await user.type(screen.getByLabelText('API key'), 'secret-key')

    expect(screen.getByLabelText('Input text')).toBeEnabled()
  })

  it('shows streaming progress and detailed errors below the input', () => {
    mockExplorerState.error = {
      body: 'retry later',
      code: 'rate_limit_exceeded',
      message: 'Too many requests',
      requestId: 'req_123',
      status: 429,
      type: 'rate_limit_error',
    }
    mockExplorerState.isRunning = true
    mockExplorerState.progress = {
      detail: 'Streaming output from Azure OpenAI...',
      outputText: 'Partial response',
      phase: 'streaming',
    }
    mockExplorerState.streamedOutputText = 'Partial response'

    render(<App />)

    expect(screen.getByRole('status')).toHaveTextContent(/streaming response/i)
    expect(screen.getByText('Too many requests')).toBeInTheDocument()
    expect(screen.getByText(/status 429/i)).toBeInTheDocument()
    expect(screen.getByText(/request id req_123/i)).toBeInTheDocument()
    expect(screen.getByText('retry later')).toBeInTheDocument()
    expect(screen.getByText('Partial response')).toBeInTheDocument()
  })
})

