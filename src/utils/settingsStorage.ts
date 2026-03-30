import Dexie, { type Table } from 'dexie'
import { APP_SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS, type AppSettings } from '../types'
import { removeStoredValue, setStoredValue } from './localStorage'

const SETTINGS_STORAGE_VERSION = 1
const SETTINGS_KEY_DATABASE_NAME = 'logprobs-explorer-secure-settings'
const SETTINGS_KEY_NAME = 'azure-openai-api-key'
const AES_GCM_IV_LENGTH = 12

interface EncryptedApiKeyPayload {
  algorithm: 'AES-GCM'
  ciphertext: string
  iv: string
  version: number
}

interface PersistedSettingsRecord {
  encryptedApiKey?: EncryptedApiKeyPayload
  settings: Omit<AppSettings, 'apiKey'>
  version: number
}

interface SettingsKeyEntry {
  key: CryptoKey
  name: string
}

export interface StoredSettingsSnapshot {
  hasEncryptedApiKey: boolean
  settings: AppSettings
}

class SettingsKeyDatabase extends Dexie {
  public keyEntries!: Table<SettingsKeyEntry, string>

  public constructor() {
    super(SETTINGS_KEY_DATABASE_NAME)
    this.version(1).stores({
      keyEntries: '&name',
    })
  }
}

const settingsKeyDatabase =
  typeof indexedDB === 'undefined' ? null : new SettingsKeyDatabase()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isTheme(value: unknown): value is AppSettings['theme'] {
  return value === 'light' || value === 'dark' || value === 'system'
}

function normalizeNumber(
  value: unknown,
  fallback: number | undefined,
  minimum: number,
  maximum: number,
): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback
  }

  return Math.min(maximum, Math.max(minimum, value))
}

function normalizeSettings(stored: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    apiKey: DEFAULT_SETTINGS.apiKey,
    deploymentName:
      typeof stored.deploymentName === 'string'
        ? stored.deploymentName
        : DEFAULT_SETTINGS.deploymentName,
    endpoint:
      typeof stored.endpoint === 'string' ? stored.endpoint : DEFAULT_SETTINGS.endpoint,
    maxOutputTokens:
      normalizeNumber(stored.maxOutputTokens, DEFAULT_SETTINGS.maxOutputTokens, 1, 4096) ??
      DEFAULT_SETTINGS.maxOutputTokens,
    modelName:
      typeof stored.modelName === 'string' && stored.modelName.trim().length > 0
        ? stored.modelName
        : DEFAULT_SETTINGS.modelName,
    temperature: normalizeNumber(stored.temperature, DEFAULT_SETTINGS.temperature, 0, 2),
    temperatureEnabled: stored.temperatureEnabled === true,
    theme: isTheme(stored.theme) ? stored.theme : DEFAULT_SETTINGS.theme,
    topP: normalizeNumber(stored.topP, DEFAULT_SETTINGS.topP, 0, 1),
    topPEnabled: stored.topPEnabled === true,
  }
}

function getStoredJsonValue(): unknown {
  try {
    const stored = window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY)
    return stored === null ? null : (JSON.parse(stored) as unknown)
  } catch {
    return null
  }
}

function isEncryptedApiKeyPayload(value: unknown): value is EncryptedApiKeyPayload {
  return (
    isRecord(value) &&
    value.algorithm === 'AES-GCM' &&
    typeof value.iv === 'string' &&
    typeof value.ciphertext === 'string'
  )
}

function isPersistedSettingsRecord(value: unknown): value is PersistedSettingsRecord {
  return (
    isRecord(value) &&
    value.version === SETTINGS_STORAGE_VERSION &&
    isRecord(value.settings) &&
    (value.encryptedApiKey === undefined || isEncryptedApiKeyPayload(value.encryptedApiKey))
  )
}

function uint8ArrayToBase64(value: Uint8Array): string {
  let binary = ''
  for (const byte of value) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

function base64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new Uint8Array(bytes.buffer.slice(0))
}

function getWebCrypto(): Crypto {
  if (typeof globalThis.crypto?.subtle === 'undefined') {
    throw new Error('Web Crypto API is unavailable.')
  }

  return globalThis.crypto
}

async function getStoredEncryptionKey(): Promise<CryptoKey | undefined> {
  if (!settingsKeyDatabase) {
    return undefined
  }

  return settingsKeyDatabase.keyEntries.get(SETTINGS_KEY_NAME).then((entry) => entry?.key)
}

async function getOrCreateEncryptionKey(): Promise<CryptoKey | undefined> {
  if (!settingsKeyDatabase) {
    return undefined
  }

  const existingKey = await getStoredEncryptionKey()
  if (existingKey) {
    return existingKey
  }

  const key = await getWebCrypto().subtle.generateKey(
    {
      length: 256,
      name: 'AES-GCM',
    },
    false,
    ['encrypt', 'decrypt'],
  )

  await settingsKeyDatabase.keyEntries.put({
    key,
    name: SETTINGS_KEY_NAME,
  })

  return key
}

async function encryptApiKey(apiKey: string): Promise<EncryptedApiKeyPayload | undefined> {
  const webCrypto = getWebCrypto()
  const key = await getOrCreateEncryptionKey()

  if (!key) {
    return undefined
  }

  const iv = webCrypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH))
  const encodedApiKey = new TextEncoder().encode(apiKey)
  const ciphertext = await webCrypto.subtle.encrypt(
    { iv, name: 'AES-GCM' },
    key,
    encodedApiKey,
  )

  return {
    algorithm: 'AES-GCM',
    ciphertext: uint8ArrayToBase64(new Uint8Array(ciphertext)),
    iv: uint8ArrayToBase64(iv),
    version: SETTINGS_STORAGE_VERSION,
  }
}

async function decryptApiKey(payload: EncryptedApiKeyPayload): Promise<string> {
  const key = await getStoredEncryptionKey()
  if (!key) {
    return DEFAULT_SETTINGS.apiKey
  }

  const decrypted = await getWebCrypto().subtle.decrypt(
    {
      iv: base64ToUint8Array(payload.iv),
      name: payload.algorithm,
    },
    key,
    base64ToUint8Array(payload.ciphertext),
  )

  return new TextDecoder().decode(decrypted)
}

export function readStoredSettingsSnapshot(): StoredSettingsSnapshot {
  const storedValue = getStoredJsonValue()

  if (!storedValue || !isPersistedSettingsRecord(storedValue)) {
    return {
      hasEncryptedApiKey: false,
      settings: DEFAULT_SETTINGS,
    }
  }

  return {
    hasEncryptedApiKey: storedValue.encryptedApiKey !== undefined,
    settings: normalizeSettings(storedValue.settings),
  }
}

export async function hydrateStoredApiKey(): Promise<string> {
  const storedValue = getStoredJsonValue()

  if (!storedValue || !isPersistedSettingsRecord(storedValue) || !storedValue.encryptedApiKey) {
    return DEFAULT_SETTINGS.apiKey
  }

  return decryptApiKey(storedValue.encryptedApiKey)
}

export async function persistStoredSettings(settings: AppSettings): Promise<void> {
  const { apiKey, ...publicSettings } = settings
  const encryptedApiKey =
    apiKey.trim().length > 0 ? await encryptApiKey(apiKey.trim()) : undefined

  const record: PersistedSettingsRecord = {
    encryptedApiKey,
    settings: publicSettings,
    version: SETTINGS_STORAGE_VERSION,
  }

  setStoredValue(APP_SETTINGS_STORAGE_KEY, record)
}

export async function clearStoredSettings(): Promise<void> {
  removeStoredValue(APP_SETTINGS_STORAGE_KEY)

  if (settingsKeyDatabase) {
    await settingsKeyDatabase.keyEntries.delete(SETTINGS_KEY_NAME)
  }
}

