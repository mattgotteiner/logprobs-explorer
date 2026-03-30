import { useMemo, useState, type CSSProperties } from 'react'
import { Button, FormField, ThemeToggle } from '@mattgotteiner/spa-ui-controls'
import {
  BUILTIN_MODELS,
  CUSTOM_MODEL_OPTION,
  MAX_MAX_OUTPUT_TOKENS,
  MAX_TOP_LOGPROBS,
  MIN_MAX_OUTPUT_TOKENS,
  MIN_TOP_LOGPROBS,
  type AppSettings,
} from '../../types'
import './SettingsPanel.css'

interface SettingsPanelProps {
  onClearStoredData: () => void
  onReset: () => void
  onUpdate: (updates: Partial<AppSettings>) => void
  settings: AppSettings
}

interface SliderStyleProperties extends CSSProperties {
  '--settings-range-progress'?: string
}

function getSliderStyle(value: number, minimum: number, maximum: number): SliderStyleProperties {
  const boundedValue = Math.min(maximum, Math.max(minimum, value))
  const progress = maximum === minimum ? 0 : ((boundedValue - minimum) / (maximum - minimum)) * 100

  return {
    '--settings-range-progress': `${progress}%`,
  }
}

export function SettingsPanel({
  onClearStoredData,
  onReset,
  onUpdate,
  settings,
}: SettingsPanelProps): React.ReactElement {
  const [showCustomModelInput, setShowCustomModelInput] = useState(
    !BUILTIN_MODELS.includes(settings.modelName as (typeof BUILTIN_MODELS)[number]),
  )

  const modelOptions = useMemo(() => BUILTIN_MODELS, [])

  return (
    <div className="settings-panel">
      <section className="settings-section">
        <h3 className="settings-section__title">Appearance</h3>

        <div className="settings-field">
          <span className="settings-field__label">Theme</span>
          <ThemeToggle
            className="settings-field__theme-toggle"
            onChange={(theme) => onUpdate({ theme })}
            value={settings.theme}
          />
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-section__title">Azure OpenAI</h3>

        <FormField
          hint="Your Azure OpenAI resource endpoint. The app normalizes it to /openai/v1."
          htmlFor="settings-endpoint"
          label="Endpoint URL"
        >
          <input
            id="settings-endpoint"
            className="settings-panel__control"
            type="url"
            value={settings.endpoint}
            onChange={(event) => onUpdate({ endpoint: event.target.value })}
            placeholder="https://your-resource.openai.azure.com"
            required
          />
        </FormField>

        <FormField
          hint="Saved encrypted in browser storage when supported by the runtime."
          htmlFor="settings-api-key"
          label="API key"
        >
          <input
            id="settings-api-key"
            className="settings-panel__control"
            type="password"
            value={settings.apiKey}
            onChange={(event) => onUpdate({ apiKey: event.target.value })}
            placeholder="Enter your Azure OpenAI API key"
            required
          />
        </FormField>

        <FormField
          hint="Choose a model that supports reasoning effort none. That is the fixed mode in this app."
          htmlFor="settings-model"
          label="Model"
        >
          <select
            id="settings-model"
            className="settings-panel__control"
            value={showCustomModelInput ? CUSTOM_MODEL_OPTION : settings.modelName}
            required
            onChange={(event) => {
              const { value } = event.target
              if (value === CUSTOM_MODEL_OPTION) {
                setShowCustomModelInput(true)
                return
              }

              setShowCustomModelInput(false)
              onUpdate({ modelName: value })
            }}
          >
            {modelOptions.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
            <option value={CUSTOM_MODEL_OPTION}>Custom...</option>
          </select>
        </FormField>

        {showCustomModelInput ? (
          <FormField
            hint="Use this if your deployment targets another model that still supports reasoning effort none."
            htmlFor="settings-custom-model"
            label="Custom model"
          >
            <input
              id="settings-custom-model"
              className="settings-panel__control"
              type="text"
              value={settings.modelName}
              onChange={(event) => onUpdate({ modelName: event.target.value })}
              placeholder="gpt-5.4-mini"
              required
            />
          </FormField>
        ) : null}

        <FormField
          hint="Optional. If empty, the selected model name is sent as the deployment."
          htmlFor="settings-deployment"
          label="Deployment name"
        >
          <input
            id="settings-deployment"
            className="settings-panel__control"
            type="text"
            value={settings.deploymentName}
            onChange={(event) => onUpdate({ deploymentName: event.target.value })}
            placeholder={settings.modelName}
          />
        </FormField>
      </section>

      <section className="settings-section">
        <h3 className="settings-section__title">Generation</h3>
        <p className="settings-section__notice">
          Reasoning effort is fixed to <code>none</code> so sampling controls and logprobs stay available.
        </p>

        <label className="settings-checkbox">
          <input
            type="checkbox"
            checked={settings.temperatureEnabled}
            onChange={(event) => onUpdate({ temperatureEnabled: event.target.checked })}
          />
          <span>
            <span className="settings-field__label">Set temperature</span>
            <span className="settings-checkbox__hint">
              Leave this off to use the model&apos;s default temperature.
            </span>
          </span>
        </label>

        {settings.temperatureEnabled ? (
          <FormField
            hint={`Current value: ${(settings.temperature ?? 1).toFixed(1)}`}
            htmlFor="settings-temperature"
            label="Temperature"
          >
            <input
              id="settings-temperature"
              className="settings-panel__range"
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature ?? 1}
              style={getSliderStyle(settings.temperature ?? 1, 0, 2)}
              onChange={(event) =>
                onUpdate({ temperature: Number.parseFloat(event.target.value) })
              }
            />
          </FormField>
        ) : null}

        <label className="settings-checkbox">
          <input
            type="checkbox"
            checked={settings.topPEnabled}
            onChange={(event) => onUpdate({ topPEnabled: event.target.checked })}
          />
          <span>
            <span className="settings-field__label">Set top P</span>
            <span className="settings-checkbox__hint">
              Leave this off to use the model&apos;s default top_p behavior.
            </span>
          </span>
        </label>

        {settings.topPEnabled ? (
          <FormField
            hint={`Current value: ${(settings.topP ?? 1).toFixed(2)}`}
            htmlFor="settings-top-p"
            label="Top P"
          >
            <input
              id="settings-top-p"
              className="settings-panel__range"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.topP ?? 1}
              style={getSliderStyle(settings.topP ?? 1, 0, 1)}
              onChange={(event) => onUpdate({ topP: Number.parseFloat(event.target.value) })}
            />
          </FormField>
        ) : null}

        <FormField
          hint={`How many alternative tokens to request at each output position (${MIN_TOP_LOGPROBS}-${MAX_TOP_LOGPROBS}).`}
          htmlFor="settings-top-logprobs"
          label="Top logprobs"
        >
          <div className="settings-panel__range-input-group">
            <div className="settings-panel__range-with-bounds">
              <input
                aria-label="Top logprobs slider"
                className="settings-panel__range settings-panel__range-input-group-slider"
                type="range"
                min={MIN_TOP_LOGPROBS}
                max={MAX_TOP_LOGPROBS}
                step="1"
                value={settings.topLogprobs}
                style={getSliderStyle(settings.topLogprobs, MIN_TOP_LOGPROBS, MAX_TOP_LOGPROBS)}
                onChange={(event) =>
                  onUpdate({ topLogprobs: Number.parseInt(event.target.value || '0', 10) })
                }
              />
              <div className="settings-panel__range-bounds" aria-hidden="true">
                <span>{MIN_TOP_LOGPROBS}</span>
                <span>{MAX_TOP_LOGPROBS}</span>
              </div>
            </div>
            <input
              id="settings-top-logprobs"
              className="settings-panel__control settings-panel__range-input-group-number"
              type="number"
              min={MIN_TOP_LOGPROBS}
              max={MAX_TOP_LOGPROBS}
              step="1"
              value={settings.topLogprobs}
              onChange={(event) =>
                onUpdate({ topLogprobs: Number.parseInt(event.target.value || '0', 10) })
              }
            />
          </div>
        </FormField>

        <FormField
          hint={`Bound the output length between ${MIN_MAX_OUTPUT_TOKENS} and ${MAX_MAX_OUTPUT_TOKENS} tokens.`}
          htmlFor="settings-max-output-tokens"
          label="Max output tokens"
        >
          <div className="settings-panel__range-input-group">
            <div className="settings-panel__range-with-bounds">
              <input
                aria-label="Max output tokens slider"
                className="settings-panel__range settings-panel__range-input-group-slider"
                type="range"
                min={MIN_MAX_OUTPUT_TOKENS}
                max={MAX_MAX_OUTPUT_TOKENS}
                step="1"
                value={settings.maxOutputTokens}
                style={getSliderStyle(
                  settings.maxOutputTokens,
                  MIN_MAX_OUTPUT_TOKENS,
                  MAX_MAX_OUTPUT_TOKENS,
                )}
                onChange={(event) =>
                  onUpdate({ maxOutputTokens: Number.parseInt(event.target.value || '0', 10) })
                }
              />
              <div className="settings-panel__range-bounds" aria-hidden="true">
                <span>{MIN_MAX_OUTPUT_TOKENS}</span>
                <span>{MAX_MAX_OUTPUT_TOKENS}</span>
              </div>
            </div>
            <input
              id="settings-max-output-tokens"
              className="settings-panel__control settings-panel__range-input-group-number"
              type="number"
              min={MIN_MAX_OUTPUT_TOKENS}
              max={MAX_MAX_OUTPUT_TOKENS}
              step="1"
              value={settings.maxOutputTokens}
              onChange={(event) =>
                onUpdate({ maxOutputTokens: Number.parseInt(event.target.value || '0', 10) })
              }
            />
          </div>
        </FormField>
      </section>

      <section className="settings-section settings-section--clear">
        <h3 className="settings-section__title">Reset</h3>
        <p className="settings-section__notice">
          Reset the current form values, or clear persisted settings and stored API key material.
        </p>
        <div className="settings-panel__actions">
          <Button variant="secondary" onClick={onClearStoredData}>
            Clear stored data
          </Button>
          <Button variant="danger" onClick={onReset}>
            Reset defaults
          </Button>
        </div>
      </section>
    </div>
  )
}

