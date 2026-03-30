export function getStoredValue<T>(key: string, fallbackValue: T): T {
  try {
    const raw = window.localStorage.getItem(key)

    if (raw === null) {
      return fallbackValue
    }

    return JSON.parse(raw) as T
  } catch (error) {
    console.error(`Failed to read localStorage key "${key}".`, error)
    return fallbackValue
  }
}

export function setStoredValue<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Failed to write localStorage key "${key}".`, error)
  }
}

export function removeStoredValue(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch (error) {
    console.error(`Failed to remove localStorage key "${key}".`, error)
  }
}

