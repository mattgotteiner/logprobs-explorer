import { useCallback, useState } from 'react'
import type { AppSettings, ExplorerErrorDetails, ExplorerResult } from '../types'
import {
  runLogprobsRequest,
  toExplorerErrorDetails,
  type LogprobsRequestProgressUpdate,
} from '../utils/api'

export interface UseLogprobsExplorerReturn {
  clearResult: () => void
  error: ExplorerErrorDetails | null
  isRunning: boolean
  progress: LogprobsRequestProgressUpdate | null
  result: ExplorerResult | null
  streamedOutputText: string
  runTest: (prompt: string, settings: AppSettings) => Promise<void>
}

export function useLogprobsExplorer(): UseLogprobsExplorerReturn {
  const [error, setError] = useState<ExplorerErrorDetails | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState<LogprobsRequestProgressUpdate | null>(null)
  const [result, setResult] = useState<ExplorerResult | null>(null)
  const [streamedOutputText, setStreamedOutputText] = useState('')

  const runTest = useCallback(async (prompt: string, settings: AppSettings) => {
    setError(null)
    setIsRunning(true)
    setProgress({
      detail: 'Connecting to Azure OpenAI...',
      outputText: '',
      phase: 'starting',
    })
    setResult(null)
    setStreamedOutputText('')

    try {
      const nextResult = await runLogprobsRequest(prompt, settings, (nextProgress) => {
        setProgress(nextProgress)
        setStreamedOutputText(nextProgress.outputText)
      })
      setResult(nextResult)
      setStreamedOutputText((currentOutputText) => nextResult.outputText || currentOutputText)
      setProgress(null)
    } catch (nextError) {
      setError(toExplorerErrorDetails(nextError))
      setResult(null)
      setProgress(null)
    } finally {
      setIsRunning(false)
    }
  }, [])

  const clearResult = useCallback(() => {
    setError(null)
    setProgress(null)
    setResult(null)
    setStreamedOutputText('')
  }, [])

  return {
    clearResult,
    error,
    isRunning,
    progress,
    result,
    streamedOutputText,
    runTest,
  }
}

