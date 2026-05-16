// lib/ui/hooks/useScreenData.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { mapError, ScreenError } from '../error/mapError';

export type ScreenState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: ScreenError }
  | { status: 'empty' }
  | { status: 'ready'; data: T };

export interface UseScreenDataOptions<T> {
  pollMs?: number;
  isEmpty?: (data: T) => boolean;
}

export function useScreenData<T>(
  load: (signal: AbortSignal) => Promise<T | null>,
  deps: unknown[],
  options: UseScreenDataOptions<T> = {},
): { state: ScreenState<T>; refresh: () => void } {
  const [state, setState] = useState<ScreenState<T>>({ status: 'loading' });
  const tick = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const myTick = ++tick.current;

    setState((prev) => (prev.status === 'ready' ? prev : { status: 'loading' }));
    try {
      const data = await load(controller.signal);
      if (controller.signal.aborted || tick.current !== myTick) return;
      if (data === null || (options.isEmpty && options.isEmpty(data))) {
        setState({ status: 'empty' });
      } else {
        setState({ status: 'ready', data });
      }
    } catch (err) {
      if (controller.signal.aborted || tick.current !== myTick) return;
      setState({ status: 'error', error: mapError(err) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
    if (!options.pollMs) {
      return () => controllerRef.current?.abort();
    }
    const interval = setInterval(run, options.pollMs);
    return () => {
      clearInterval(interval);
      controllerRef.current?.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, options.pollMs]);

  return { state, refresh: run };
}
