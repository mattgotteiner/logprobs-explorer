import { createContext, useContext, type ReactNode } from 'react'
import { useSettings, type UseSettingsReturn } from '../hooks/useSettings'

const SettingsContext = createContext<UseSettingsReturn | null>(null)

interface SettingsProviderProps {
  children: ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps): React.ReactElement {
  const settingsValue = useSettings()

  return (
    <SettingsContext.Provider value={settingsValue}>{children}</SettingsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettingsContext(): UseSettingsReturn {
  const context = useContext(SettingsContext)

  if (!context) {
    throw new Error('useSettingsContext must be used within a SettingsProvider')
  }

  return context
}
