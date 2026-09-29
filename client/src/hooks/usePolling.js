import { useCallback, useEffect, useRef, useState } from 'react';

export default function usePolling(task, intervalMs = 5000, { immediate = true } = {}) {
  const taskRef = useRef(task);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await taskRef.current();
      setData(result);
      setError(null);
      return result;
    } catch (caughtError) {
      setError(caughtError);
      throw caughtError;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let timeoutId;
    const run = async () => {
      if (!active) return;
      try {
        await refresh();
      } catch {
        // The caller observes the current error through the returned state.
      }
      if (active) timeoutId = window.setTimeout(run, intervalMs);
    };
    if (immediate) timeoutId = window.setTimeout(run, 0);
    else timeoutId = window.setTimeout(run, intervalMs);
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [immediate, intervalMs, refresh]);

  return { data, error, loading, refresh };
}
