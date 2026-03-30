import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { APP_SETTINGS_STORAGE_KEY } from '../types'
import { useSettings } from './useSettings'

describe('useSettings', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('loads defaults when storage is empty', () => {
    const { result } = renderHook(() => useSettings())

    expect(result.current.settings.modelName).toBe('gpt-5.4-mini')
    expect(result.current.settings.theme).toBe('system')
    expect(result.current.settings.maxOutputTokens).toBe(5)
    expect(result.current.settings.temperatureEnabled).toBe(false)
    expect(result.current.settings.topLogprobs).toBe(5)
  })

  it('persists updates to localStorage using the versioned settings shape', () => {
    const { result } = renderHook(() => useSettings())

    act(() => {
      result.current.updateSettings({
        deploymentName: 'logprobs-mini',
        endpoint: 'https://example.openai.azure.com',
        maxOutputTokens: 777,
        modelName: 'gpt-5.2',
        temperature: 0.3,
        temperatureEnabled: true,
        theme: 'dark',
        topLogprobs: 7,
        topP: 0.85,
        topPEnabled: true,
      })
    })

    const persisted = JSON.parse(window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY) ?? '{}')

    expect(persisted.version).toBe(1)
    expect(persisted.settings.deploymentName).toBe('logprobs-mini')
    expect(persisted.settings.endpoint).toBe('https://example.openai.azure.com')
    expect(persisted.settings.maxOutputTokens).toBe(777)
    expect(persisted.settings.modelName).toBe('gpt-5.2')
    expect(persisted.settings.temperature).toBe(0.3)
    expect(persisted.settings.theme).toBe('dark')
    expect(persisted.settings.topLogprobs).toBe(7)
    expect(persisted.settings.topP).toBe(0.85)
  })
})
