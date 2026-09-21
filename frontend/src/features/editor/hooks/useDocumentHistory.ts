import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_ENTRIES = 50;

interface UseDocumentHistoryOpts {
  /** JSON signature of the full editable document (source of truth for change detection). */
  signature: string;
  /** Apply a previously committed signature back onto the document state. */
  onRestore: (snapshot: any) => void;
  /** True while bulk loads are settling — changes are ignored, not recorded. */
  isBulkLoading: () => boolean;
  debounceMs?: number;
}

/**
 * Debounced full-document undo/redo over JSON signatures.
 *
 * - Typing coalesces: rapid signature changes settle into one entry.
 * - Undo/redo flush any pending (not yet committed) edit first, so nothing
 *   is ever lost when mashing Ctrl+Z right after typing.
 * - A fresh edit after an undo clears the redo stack (new branch).
 * - `reset()` reseeds the baseline — call it once bulk loads settle.
 */
export function useDocumentHistory(opts: UseDocumentHistoryOpts) {
  const { signature, debounceMs = 700 } = opts;
  const onRestoreRef = useRef(opts.onRestore);
  onRestoreRef.current = opts.onRestore;
  const isBulkLoadingRef = useRef(opts.isBulkLoading);
  isBulkLoadingRef.current = opts.isBulkLoading;

  const pastRef = useRef<string[]>([]);
  const futureRef = useRef<string[]>([]);
  const committedRef = useRef<string | null>(null);
  const pendingSigRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const commit = useCallback(
    (sig: string) => {
      if (committedRef.current === null) {
        committedRef.current = sig;
      } else if (sig !== committedRef.current) {
        pastRef.current.push(committedRef.current);
        if (pastRef.current.length > MAX_ENTRIES) pastRef.current.shift();
        committedRef.current = sig;
        futureRef.current = [];
      }
      syncFlags();
    },
    [syncFlags]
  );

  const flushPending = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingSigRef.current !== null) {
      const sig = pendingSigRef.current;
      pendingSigRef.current = null;
      commit(sig);
    }
  }, [commit]);

  // Observe signature changes (debounced). Restores converge onto the
  // already-committed value, so they are natural no-ops here.
  useEffect(() => {
    if (isBulkLoadingRef.current()) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pendingSigRef.current = null;
      return;
    }
    if (signature === committedRef.current || signature === pendingSigRef.current) return;
    pendingSigRef.current = signature;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (pendingSigRef.current !== null) {
        const sig = pendingSigRef.current;
        pendingSigRef.current = null;
        commit(sig);
      }
    }, debounceMs);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [signature, commit, debounceMs]);

  const undo = useCallback(() => {
    if (isBulkLoadingRef.current()) return false;
    flushPending();
    const prev = pastRef.current.pop();
    if (prev === undefined || committedRef.current === null) {
      syncFlags();
      return false;
    }
    futureRef.current.push(committedRef.current);
    committedRef.current = prev;
    try {
      onRestoreRef.current(JSON.parse(prev));
    } catch {
      // Corrupt entry — drop it and report failure.
      committedRef.current = futureRef.current.pop() ?? prev;
      syncFlags();
      return false;
    }
    syncFlags();
    return true;
  }, [flushPending, syncFlags]);

  const redo = useCallback(() => {
    if (isBulkLoadingRef.current()) return false;
    flushPending();
    const next = futureRef.current.pop();
    if (next === undefined || committedRef.current === null) {
      syncFlags();
      return false;
    }
    pastRef.current.push(committedRef.current);
    if (pastRef.current.length > MAX_ENTRIES) pastRef.current.shift();
    committedRef.current = next;
    try {
      onRestoreRef.current(JSON.parse(next));
    } catch {
      committedRef.current = pastRef.current.pop() ?? next;
      syncFlags();
      return false;
    }
    syncFlags();
    return true;
  }, [flushPending, syncFlags]);

  const reset = useCallback(
    (baseline: string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pendingSigRef.current = null;
      pastRef.current = [];
      futureRef.current = [];
      committedRef.current = baseline;
      syncFlags();
    },
    [syncFlags]
  );

  return { canUndo, canRedo, undo, redo, reset };
}
