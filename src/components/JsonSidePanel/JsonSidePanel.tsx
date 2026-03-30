import { useCallback } from 'react'
import { IconButton, SettingsDrawer } from '@mattgotteiner/spa-ui-controls'
import './JsonSidePanel.css'

interface JsonSidePanelProps {
  isOpen: boolean
  onClose: () => void
  requestJson?: Record<string, unknown>
  responseJson?: Record<string, unknown>
}

interface JsonSectionProps {
  title: string
  json?: Record<string, unknown>
}

function ClipboardIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M9 4.75A2.25 2.25 0 0 1 11.25 2.5h1.5A2.25 2.25 0 0 1 15 4.75h1.25A2.75 2.75 0 0 1 19 7.5v10A2.75 2.75 0 0 1 16.25 20.25h-8.5A2.75 2.75 0 0 1 5 17.5v-10a2.75 2.75 0 0 1 2.75-2.75H9Zm2.25-.75a.75.75 0 0 0-.75.75V5h3v-.25a.75.75 0 0 0-.75-.75h-1.5ZM7.75 6.25a1.25 1.25 0 0 0-1.25 1.25v10c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25v-10c0-.69-.56-1.25-1.25-1.25H15v.5A.75.75 0 0 1 14.25 7.5h-4.5A.75.75 0 0 1 9 6.75v-.5H7.75Z"
        fill="currentColor"
      />
    </svg>
  )
}

function JsonSection({ title, json }: JsonSectionProps): React.ReactElement {
  const canCopy = Boolean(json) && Boolean(navigator.clipboard?.writeText)

  const handleCopy = useCallback(() => {
    if (!json || !navigator.clipboard?.writeText) {
      return
    }

    void navigator.clipboard.writeText(JSON.stringify(json, null, 2))
  }, [json])

  return (
    <section className="json-side-panel__section" aria-label={title}>
      <div className="json-side-panel__section-header">
        <h3 className="json-side-panel__section-title">{title}</h3>
        <IconButton
          className="json-side-panel__copy-button"
          label={`Copy ${title}`}
          onClick={handleCopy}
          disabled={!canCopy}
        >
          <ClipboardIcon />
        </IconButton>
      </div>

      {json ? (
        <pre className="json-side-panel__json">{JSON.stringify(json, null, 2)}</pre>
      ) : (
        <p className="json-side-panel__empty">No {title.toLowerCase()} available.</p>
      )}
    </section>
  )
}

export function JsonSidePanel({
  isOpen,
  onClose,
  requestJson,
  responseJson,
}: JsonSidePanelProps): React.ReactElement | null {
  if (!isOpen) {
    return null
  }

  return (
    <SettingsDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Request and response JSON"
      description={<span className="json-side-panel__description">Debug</span>}
      width="36rem"
    >
      <div className="json-side-panel__content">
        <JsonSection title="Request JSON" json={requestJson} />
        <JsonSection title="Response JSON" json={responseJson} />
      </div>
    </SettingsDrawer>
  )
}
