import { useCallback, useState } from 'react'
import type { AppSettings, ExplorerResult } from '../types'
import { runLogprobsRequest } from '../utils/api'

export interface UseLogprobsExplorerReturn {
  clearResult: () => void
  error: string | null
  isRunning: boolean
  result: ExplorerResult | null
  runTest: (prompt: string, settings: AppSettings) => Promise<void>
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'The request failed.'
}

export function useLogprobsExplorer(): UseLogprobsExplorerReturn {
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<ExplorerResult | null>(null)

  const runTest = useCallback(async (prompt: string, settings: AppSettings) => {
    setError(null)
    setIsRunning(true)

    try {
      const nextResult = await runLogprobsRequest(prompt, settings)
      setResult(nextResult)
    } catch (nextError) {
      setError(toErrorMessage(nextError))
    } finally {
      setIsRunning(false)
    }
  }, [])

  const clearResult = useCallback(() => {
    setError(null)
    setResult(null)
  }, [])

  return {
    clearResult,
    error,
    isRunning,
    result,
    runTest,
  }
}

