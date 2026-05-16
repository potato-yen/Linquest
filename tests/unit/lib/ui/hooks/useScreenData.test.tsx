// tests/unit/lib/ui/hooks/useScreenData.test.tsx
import { renderHook, act } from '@testing-library/react-native';
import { useScreenData } from '../../../../../lib/ui/hooks/useScreenData';

describe('useScreenData', () => {
  it('starts in loading then transitions to ready', async () => {
    const load = jest.fn().mockResolvedValue({ value: 1 });
    const { result } = renderHook(() => useScreenData(load, []));
    expect(result.current.state.status).toBe('loading');
    await act(async () => { await Promise.resolve(); });
    expect(result.current.state).toEqual({ status: 'ready', data: { value: 1 } });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('emits empty when isEmpty(data) is true', async () => {
    const load = jest.fn().mockResolvedValue([]);
    const { result } = renderHook(() =>
      useScreenData<unknown[]>(load, [], { isEmpty: (d) => d.length === 0 }),
    );
    await act(async () => { await Promise.resolve(); });
    expect(result.current.state.status).toBe('empty');
  });

  it('emits empty when load() resolves null', async () => {
    const load = jest.fn().mockResolvedValue(null);
    const { result } = renderHook(() => useScreenData(load, []));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.state.status).toBe('empty');
  });

  it('emits error and exposes refresh()', async () => {
    const load = jest.fn().mockRejectedValueOnce(new TypeError('Network request failed'));
    const { result } = renderHook(() => useScreenData(load, []));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.state.status).toBe('error');

    load.mockResolvedValueOnce({ ok: true });
    await act(async () => { result.current.refresh(); await Promise.resolve(); });
    expect(result.current.state).toEqual({ status: 'ready', data: { ok: true } });
  });

  it('aborts the previous request when deps change', async () => {
    const load = jest.fn(async (signal: AbortSignal) => {
      return new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')));
        setTimeout(() => resolve({ done: true }), 100);
      });
    });
    const { rerender } = renderHook(({ k }: { k: number }) => useScreenData(load, [k]), {
      initialProps: { k: 1 },
    });
    rerender({ k: 2 });
    // The first load's signal must have been aborted; second load is still pending.
    expect(load).toHaveBeenCalledTimes(2);
    expect((load.mock.calls[0][0] as AbortSignal).aborted).toBe(true);
  });
});
