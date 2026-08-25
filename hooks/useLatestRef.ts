import { useRef, useLayoutEffect, useEffect } from 'react';

/**
 * Custom hook that returns a ref containing the latest value passed to it.
 * Updates synchronously in useLayoutEffect (or immediately during render) to guarantee
 * that any event handlers or callbacks always read the freshest state without stale closures.
 */
export function useLatestRef<T>(value: T): React.MutableRefObject<T> {
  const ref = useRef<T>(value);
  const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
  useIsomorphicLayoutEffect(() => {
    ref.current = value;
  });
  ref.current = value;
  return ref;
}
