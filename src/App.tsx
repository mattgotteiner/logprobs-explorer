import { useMemo, useState } from 'react'
import {
  AppShell,
  Button,
  Panel,
  SettingsButton,
  ThemeProvider,
  TopBar,
} from '@mattgotteiner/spa-ui-controls'
import './App.css'
import { SettingsSidebar } from './components/SettingsSidebar/SettingsSidebar'
import { SettingsProvider, useSettingsContext } from './context/SettingsContext'
import { useLogprobsExplorer } from './hooks/useLogprobsExplorer'
import { APP_TITLE, type TokenLogprobEntry } from './types'
import type { LogprobsRequestProgressUpdate } from './utils/api'

const REPOSITORY_URL = 'https://github.com/mattgotteiner/logprobs-explorer'

function formatToken(token: string): string {
  return JSON.stringify(token)
}

function formatProbability(value: number): string {
  if (value === 0) {
    return '0'
  }

  if (value < 0.0001) {
    return value.toExponential(2)
  }

  return value.toFixed(6)
}

function getProgressTitle(phase?: LogprobsRequestProgressUpdate['phase']): string {
  switch (phase) {
    case 'starting':
      return 'Starting request'
    case 'waiting':
      return 'Waiting for output'
    case 'streaming':
      return 'Streaming response'
    case 'finalizing':
      return 'Finalizing results'
    default:
      return 'Running request'
  }
}

function getRunButtonLabel(phase?: LogprobsRequestProgressUpdate['phase']): string {
  switch (phase) {
    case 'starting':
      return 'Connecting...'
    case 'waiting':
      return 'Waiting...'
    case 'streaming':
      return 'Streaming...'
    case 'finalizing':
      return 'Finalizing...'
    default:
      return 'Run test'
  }
}

function TokenCard({ token }: { token: TokenLogprobEntry }): React.ReactElement {
  return (
    <article className="token-card">
      <header className="token-card__header">
        <div>
          <p className="token-card__eyebrow">Output token {token.tokenIndex + 1}</p>
          <h3 className="token-card__title">{formatToken(token.token)}</h3>
        </div>
        <div className="token-card__summary">
          <span>logprob {token.logprob.toFixed(4)}</span>
          <span>p {formatProbability(token.probability)}</span>
        </div>
      </header>

      <div className="token-card__bytes">
        Bytes: {token.bytes.length > 0 ? token.bytes.join(', ') : 'none'}
      </div>

      <table className="token-table">
        <thead>
          <tr>
            <th scope="col">Candidate</th>
            <th scope="col">Logprob</th>
            <th scope="col">Linear p</th>
          </tr>
        </thead>
        <tbody>
          {token.topCandidates.map((candidate) => (
            <tr key={`${token.tokenIndex}-${candidate.token}-${candidate.logprob}`}>
              <td>{formatToken(candidate.token)}</td>
              <td>{candidate.logprob.toFixed(4)}</td>
              <td>{formatProbability(candidate.probability)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  )
}

function AppContent(): React.ReactElement {
  const { clearStoredData, isConfigured, isHydrated, resetSettings, settings, updateSettings } =
    useSettingsContext()
  const { clearResult, error, isRunning, progress, result, runTest, streamedOutputText } =
    useLogprobsExplorer()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const hasApiKey = settings.apiKey.trim().length > 0

  const requestSummary = useMemo(
    () => {
      const summary: Array<[string, string]> = [
        ['Model', settings.deploymentName.trim() || settings.modelName || 'Not set'],
        ['Top logprobs', String(settings.topLogprobs)],
        ['Max tokens', String(settings.maxOutputTokens)],
      ]

      if (settings.temperatureEnabled) {
        summary.splice(1, 0, ['Temperature', (settings.temperature ?? 1).toFixed(1)])
      }

      if (settings.topPEnabled) {
        summary.splice(settings.temperatureEnabled ? 2 : 1, 0, ['Top P', (settings.topP ?? 1).toFixed(2)])
      }

      return summary
    },
    [
      settings.deploymentName,
      settings.maxOutputTokens,
      settings.modelName,
      settings.temperature,
      settings.temperatureEnabled,
      settings.topLogprobs,
      settings.topP,
      settings.topPEnabled,
    ],
  )

  const canRun = isConfigured && prompt.trim().length > 0 && !isRunning
  const responseText = streamedOutputText || result?.outputText || ''
  const responseStatus = result?.status ?? (isRunning ? getProgressTitle(progress?.phase) : undefined)

  return (
    <ThemeProvider
      onThemeChange={(theme) => updateSettings({ theme })}
      persist={false}
      theme={settings.theme}
    >
      <AppShell
        header={
          <TopBar
            title={
              <div className="app-title-block">
                <h1>{APP_TITLE}</h1>
              </div>
            }
            subtitle={
              <div className="app-subtitle-row">
                <span>
                  Probe Azure OpenAI response tokens with reasoning fixed to <code>none</code>.
                </span>
                <a
                  href={REPOSITORY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="app-subtitle-link"
                  aria-label="View source on GitHub"
                  title="View source repository"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </a>
              </div>
            }
            trailing={<SettingsButton onClick={() => setIsSettingsOpen(true)} />}
          />
        }
      >
        <div className="app-layout">
          <Panel as="section">
            <div className="explorer-panel">
                <div className="explorer-panel__header">
                  <div>
                    <p className="explorer-panel__eyebrow">Prompt</p>
                    <h2 className="explorer-panel__title">Run a streamed Responses API test</h2>
                  </div>
                  <div className="explorer-panel__actions">
                    <Button
                      onClick={() => void runTest(prompt.trim(), settings)}
                      disabled={!canRun}
                    >
                      {getRunButtonLabel(progress?.phase)}
                    </Button>
                    <Button variant="secondary" onClick={clearResult} disabled={isRunning}>
                      Clear result
                    </Button>
                  </div>
                </div>

                <p className="explorer-panel__body">
                  Enter prompt text, stream the model output live, and inspect the chosen token
                  probabilities alongside the top alternatives returned after the response completes.
                </p>

              {!isHydrated ? (
                <div className="app-callout">Loading persisted settings...</div>
              ) : null}

              {!isConfigured ? (
                <div className="app-callout app-callout--warning">
                  Configure endpoint, API key, and model in the sidebar before running a test.
                </div>
              ) : null}

                <label className="composer" htmlFor="prompt-input">
                  <span className="composer__label">Input text</span>
                  <textarea
                  id="prompt-input"
                  className="composer__textarea"
                  value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Explain why log probabilities are useful for debugging model output."
                    rows={6}
                    disabled={!hasApiKey}
                  />
                </label>

                {isRunning ? (
                  <div className="request-progress" role="status" aria-live="polite">
                    <span className="request-progress__spinner" aria-hidden="true" />
                    <div className="request-progress__copy">
                      <p className="request-progress__title">{getProgressTitle(progress?.phase)}</p>
                      <p className="request-progress__detail">
                        {progress?.detail ?? 'Connecting to Azure OpenAI...'}
                      </p>
                    </div>
                  </div>
                ) : null}

                {error ? (
                  <div className="app-callout app-callout--danger composer-error">
                    <p className="composer-error__title">Request failed</p>
                    <p className="composer-error__message">{error.message}</p>
                    {error.status !== undefined || error.type || error.requestId ? (
                      <div className="composer-error__meta">
                        {error.status !== undefined ? <span>Status {error.status}</span> : null}
                        {error.type ? <span>Type {error.type}</span> : null}
                        {error.requestId ? <span>Request ID {error.requestId}</span> : null}
                      </div>
                    ) : null}
                    {error.body ? <pre className="composer-error__body">{error.body}</pre> : null}
                  </div>
                ) : null}

                <div className="request-summary" aria-label="Request summary">
                  {requestSummary.map(([label, value]) => (
                    <span key={label} className="request-summary__item">
                    <span className="request-summary__label">{label}:</span> {value}
                  </span>
                ))}
              </div>

                <section className="response-panel" aria-label="Response preview">
                  <div className="response-panel__header">
                    <h3 className="response-panel__title">Model output</h3>
                    {responseStatus ? (
                      <span className="response-panel__meta">Status: {responseStatus}</span>
                    ) : null}
                  </div>

                  {responseText.length > 0 ? (
                    <>
                      <pre className="response-panel__text">{responseText}</pre>
                      {result?.incompleteReason ? (
                        <div className="app-callout app-callout--warning">
                          Response ended early: {result.incompleteReason}
                        </div>
                      ) : null}
                      {result?.usage ? (
                        <p className="response-panel__usage">
                          Input {result.usage.inputTokens ?? 0} tokens, output{' '}
                          {result.usage.outputTokens ?? 0} tokens, total {result.usage.totalTokens ?? 0}
                          .
                        </p>
                      ) : null}
                    </>
                  ) : result ? (
                    <>
                      <pre className="response-panel__text">(empty output)</pre>
                      {result.incompleteReason ? (
                        <div className="app-callout app-callout--warning">
                          Response ended early: {result.incompleteReason}
                        </div>
                      ) : null}
                      {result.usage ? (
                        <p className="response-panel__usage">
                          Input {result.usage.inputTokens ?? 0} tokens, output{' '}
                          {result.usage.outputTokens ?? 0} tokens, total {result.usage.totalTokens ?? 0}
                          .
                        </p>
                      ) : null}
                    </>
                  ) : isRunning ? (
                    <p className="response-panel__empty">Waiting for streamed output...</p>
                  ) : (
                    <p className="response-panel__empty">
                      No response yet. Run a test to inspect the generated token logprobs.
                  </p>
                )}
              </section>

              <section className="results-section" aria-label="Token logprob results">
                <div className="explorer-panel__header">
                  <div>
                    <p className="explorer-panel__eyebrow">Results</p>
                    <h2 className="explorer-panel__title">Token-by-token logprobs</h2>
                  </div>
                </div>

                <p className="explorer-panel__body">
                  Each token shows the chosen token&apos;s log probability and linear probability, plus
                  the top returned alternatives for that token position.
                </p>

                {result?.tokenEntries.length ? (
                  <div className="token-list">
                    {result.tokenEntries.map((tokenEntry) => (
                      <TokenCard key={`${tokenEntry.tokenIndex}-${tokenEntry.token}`} token={tokenEntry} />
                    ))}
                  </div>
                ) : (
                  <div className="results-empty">
                    {isRunning ? (
                      <p>Token analysis will appear once the streamed response completes.</p>
                    ) : result ? (
                      <p>
                        The response completed, but no output token logprobs were returned for this model or
                        deployment.
                      </p>
                    ) : (
                      <p>Run a test to populate the token explorer.</p>
                    )}
                  </div>
                )}
              </section>
            </div>
          </Panel>
        </div>

        <SettingsSidebar
          isOpen={isSettingsOpen}
          onClearStoredData={clearStoredData}
          onClose={() => setIsSettingsOpen(false)}
          onReset={resetSettings}
          onUpdate={updateSettings}
          settings={settings}
        />
      </AppShell>
    </ThemeProvider>
  )
}

function App(): React.ReactElement {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  )
}

export default App

