import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_SETTINGS,
  MAX_MAX_OUTPUT_TOKENS,
  MIN_MAX_OUTPUT_TOKENS,
  type AppSettings,
} from '../types'
import {
  clearStoredSettings,
  hydrateStoredApiKey,
  persistStoredSettings,
  readStoredSettingsSnapshot,
} from '../utils/settingsStorage'

function clampNumber(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function normalizeSettings(candidate: AppSettings): AppSettings {
  return {
    ...candidate,
    maxOutputTokens: clampNumber(
      candidate.maxOutputTokens,
      MIN_MAX_OUTPUT_TOKENS,
      MAX_MAX_OUTPUT_TOKENS,
    ),
    modelName: candidate.modelName.trim(),
    temperature:
      candidate.temperature === undefined
        ? DEFAULT_SETTINGS.temperature
        : clampNumber(candidate.temperature, 0, 2),
    topP:
      candidate.topP === undefined
        ? DEFAULT_SETTINGS.topP
        : clampNumber(candidate.topP, 0, 1),
  }
}

export interface UseSettingsReturn {
  clearStoredData: () => void
  isConfigured: boolean
  isHydrated: boolean
  resetSettings: () => void
  settings: AppSettings
  updateSettings: (updates: Partial<AppSettings>) => void
}

export function useSettings(): UseSettingsReturn {
  const initialSnapshotRef = useRef(readStoredSettingsSnapshot())
  const initialSnapshot = initialSnapshotRef.current
  const [settings, setSettings] = useState<AppSettings>(initialSnapshot.settings)
  const [isHydrated, setIsHydrated] = useState(!initialSnapshot.hasEncryptedApiKey)

  useEffect(() => {
    if (!initialSnapshot.hasEncryptedApiKey) {
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const storedApiKey = await hydrateStoredApiKey()
        if (!cancelled) {
          setSettings((currentSettings) =>
            normalizeSettings({
              ...currentSettings,
              apiKey: storedApiKey,
            }),
          )
        }
      } catch (error) {
        console.error('Failed to hydrate the stored API key.', error)
      } finally {
        if (!cancelled) {
          setIsHydrated(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [initialSnapshot.hasEncryptedApiKey])

  useEffect(() => {
    if (!isHydrated) {
      return
    }

    void persistStoredSettings(settings).catch((error) => {
      console.error('Failed to persist application settings.', error)
    })
  }, [isHydrated, settings])

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((currentSettings) =>
      normalizeSettings({
        ...currentSettings,
        ...updates,
      }),
    )
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [])

  const clearStoredData = useCallback(() => {
    void clearStoredSettings()
    setSettings(DEFAULT_SETTINGS)
    setIsHydrated(true)
  }, [])

  const isConfigured =
    isHydrated &&
    settings.endpoint.trim().length > 0 &&
    settings.apiKey.trim().length > 0 &&
    settings.modelName.trim().length > 0

  return {
    clearStoredData,
    isConfigured,
    isHydrated,
    resetSettings,
    settings,
    updateSettings,
  }
}
