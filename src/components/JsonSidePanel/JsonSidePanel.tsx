import { useCallback } from 'react'
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
        <button
          type="button"
          className="json-side-panel__copy-button"
          onClick={handleCopy}
          disabled={!canCopy}
          aria-label={`Copy ${title}`}
          title={`Copy ${title}`}
        >
          Copy
        </button>
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
  const handleOverlayClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose()
      }
    },
    [onClose],
  )

  if (!isOpen) {
    return null
  }

  return (
    <div className="json-side-panel-overlay" onClick={handleOverlayClick}>
      <aside
        className="json-side-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Request and response JSON"
      >
        <div className="json-side-panel__header">
          <div>
            <p className="json-side-panel__eyebrow">Debug</p>
            <h2 className="json-side-panel__title">Request and response JSON</h2>
          </div>
          <button
            type="button"
            className="json-side-panel__close-button"
            onClick={onClose}
            aria-label="Close JSON panel"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="json-side-panel__content">
          <JsonSection title="Request JSON" json={requestJson} />
          <JsonSection title="Response JSON" json={responseJson} />
        </div>
      </aside>
    </div>
  )
}
