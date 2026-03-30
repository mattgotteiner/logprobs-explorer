import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { JsonSidePanel } from './JsonSidePanel'

describe('JsonSidePanel', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    onClose.mockReset()
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <JsonSidePanel
        isOpen={false}
        onClose={onClose}
        requestJson={{ input: 'hello' }}
        responseJson={{ output_text: 'world' }}
      />,
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders both request and response sections', () => {
    render(
      <JsonSidePanel
        isOpen
        onClose={onClose}
        requestJson={{ input: 'hello' }}
        responseJson={{ output_text: 'world' }}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Request and response JSON' })).toBeInTheDocument()
    expect(screen.getByText(/"input": "hello"/)).toBeInTheDocument()
    expect(screen.getByText(/"output_text": "world"/)).toBeInTheDocument()
  })

  it('closes when the close button is clicked', () => {
    render(
      <JsonSidePanel isOpen onClose={onClose} requestJson={{}} responseJson={{}} />,
    )

    fireEvent.click(screen.getByLabelText('Close JSON panel'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('copies a section JSON payload', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText,
      },
    })

    render(
      <JsonSidePanel
        isOpen
        onClose={onClose}
        requestJson={{ input: 'hello' }}
        responseJson={{ output_text: 'world' }}
      />,
    )

    fireEvent.click(screen.getByLabelText('Copy Request JSON'))

    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('{\n  "input": "hello"\n}')
    })
  })
})
