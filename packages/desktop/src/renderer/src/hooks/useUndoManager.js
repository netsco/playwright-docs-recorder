import { useRef, useCallback, useState } from 'react';

export function useUndoManager(maxHistory = 100) {
  const historyRef = useRef([]);
  const indexRef = useRef(-1);
  const [, forceUpdate] = useState(0);

  const push = useCallback(
    (value, selectionStart = 0, selectionEnd = 0) => {
      const history = historyRef.current;
      const index = indexRef.current;

      // Discard any redo history beyond the current index
      if (index < history.length - 1) {
        history.splice(index + 1);
      }

      history.push({ value, selectionStart, selectionEnd });

      // Enforce max history limit
      if (history.length > maxHistory) {
        history.shift();
      }

      indexRef.current = history.length - 1;
      forceUpdate((n) => n + 1);
    },
    [maxHistory]
  );

  const undo = useCallback(() => {
    if (indexRef.current <= 0) return null;
    indexRef.current -= 1;
    forceUpdate((n) => n + 1);
    return historyRef.current[indexRef.current];
  }, []);

  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) return null;
    indexRef.current += 1;
    forceUpdate((n) => n + 1);
    return historyRef.current[indexRef.current];
  }, []);

  const clear = useCallback(() => {
    historyRef.current = [];
    indexRef.current = -1;
    forceUpdate((n) => n + 1);
  }, []);

  const canUndo = indexRef.current > 0;
  const canRedo = indexRef.current < historyRef.current.length - 1;

  return { push, undo, redo, clear, canUndo, canRedo };
}
