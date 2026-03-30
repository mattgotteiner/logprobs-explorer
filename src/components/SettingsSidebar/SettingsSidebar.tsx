import { SettingsDrawer } from '@mattgotteiner/spa-ui-controls'
import type { AppSettings } from '../../types'
import { SettingsPanel } from '../SettingsPanel/SettingsPanel'

interface SettingsSidebarProps {
  onClearStoredData: () => void
  isOpen: boolean
  onClose: () => void
  onReset: () => void
  onUpdate: (updates: Partial<AppSettings>) => void
  settings: AppSettings
}

export function SettingsSidebar({
  isOpen,
  onClose,
  onClearStoredData,
  onReset,
  onUpdate,
  settings,
}: SettingsSidebarProps): React.ReactElement {
  return (
    <SettingsDrawer isOpen={isOpen} onClose={onClose} title="Settings" width={400}>
      <SettingsPanel
        onClearStoredData={onClearStoredData}
        onReset={onReset}
        onUpdate={onUpdate}
        settings={settings}
      />
    </SettingsDrawer>
  )
}
