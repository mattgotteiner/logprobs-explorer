import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { APP_SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS } from './types'

describe('App', () => {
  it('renders the explorer shell', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Logprobs Explorer' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View source on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/mattgotteiner/logprobs-explorer',
    )
    expect(
      screen.getByRole('heading', { name: /run a bounded responses api test/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /token-by-token logprobs/i }),
    ).toBeInTheDocument()
  })

  it('opens settings and renders the explorer controls', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByLabelText('Open settings'))

    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByLabelText('Endpoint URL')).toBeInTheDocument()
    expect(screen.getByLabelText('API key')).toBeInTheDocument()
    expect(screen.getByLabelText('Model')).toBeInTheDocument()
    expect(screen.getByLabelText('Max output tokens')).toBeInTheDocument()
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
        },
        version: 1,
      }),
    )

    render(<App />)
    await user.click(screen.getByLabelText('Open settings'))

    expect(screen.getByText('logprobs-mini')).toBeInTheDocument()
    expect(screen.getByText('512')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://example.openai.azure.com')).toBeInTheDocument()
  })
})

