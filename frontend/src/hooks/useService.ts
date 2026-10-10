import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Minimal async data hook with in-flight guards and a manual `reload`.
 *
 * Feature screens call their REST-ready service and hand the promise to this
 * hook. When the service layer is pointed at the real API the screens need no
 * change at all.
 */

export interface AsyncState<T> {
  data: T | null
  error: string | null
  loading: boolean
  reload: () => void
}

export function useService<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)
  const requestId = useRef(0)
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    const id = requestId.current + 1
    requestId.current = id
    setLoading(true)
    setError(null)
    loaderRef
      .current()
      .then((result) => {
        if (requestId.current !== id) return
        setData(result)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (requestId.current !== id) return
        setError(
          cause instanceof Error ? cause.message : "Something went wrong",
        )
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const reload = useCallback(() => setNonce((value) => value + 1), [])

  return { data, error, loading, reload }
}
