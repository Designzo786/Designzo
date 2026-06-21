"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { BulkActionsBar } from "./BulkActionsBar";

interface BulkContextValue {
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  selectAllChecked: boolean;
  onSelectAllChange: (checked: boolean) => void;
}

const BulkContext = createContext<BulkContextValue | null>(null);

/**
 * Hook used by per-row checkboxes + the select-all header checkbox to
 * read / mutate the shared selection. Throws when used outside the
 * shell so a misplaced `<RowCheckbox>` fails loud instead of silently.
 */
export function useBulkSelection(): BulkContextValue {
  const ctx = useContext(BulkContext);
  if (!ctx) {
    throw new Error(
      "useBulkSelection must be used inside <BulkSelectionShell>"
    );
  }
  return ctx;
}

interface Props {
  /** Every asset id visible in the table. Drives the "select all"
   *  semantics — without it the header checkbox couldn't know what
   *  "all" means. */
  visibleIds: string[];
  children: ReactNode;
}

/**
 * Thin client wrapper that owns the multi-row selection state and
 * renders the sticky action bar. Composes via React Context so the
 * admin page can stay a server component and just drop `<RowCheckbox
 * id={a.id} />` into each table row.
 */
export function BulkSelectionShell({ visibleIds, children }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isSelected = useCallback(
    (id: string) => selected.has(id),
    [selected]
  );

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllChecked = useMemo(
    () =>
      visibleIds.length > 0 &&
      visibleIds.every((id) => selected.has(id)),
    [visibleIds, selected]
  );

  const onSelectAllChange = useCallback(
    (checked: boolean) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (checked) {
          for (const id of visibleIds) next.add(id);
        } else {
          for (const id of visibleIds) next.delete(id);
        }
        return next;
      });
    },
    [visibleIds]
  );

  const clear = useCallback(() => setSelected(new Set()), []);

  const value = useMemo<BulkContextValue>(
    () => ({ isSelected, toggle, selectAllChecked, onSelectAllChange }),
    [isSelected, toggle, selectAllChecked, onSelectAllChange]
  );

  return (
    <BulkContext.Provider value={value}>
      {children}
      <BulkActionsBar selected={Array.from(selected)} onClear={clear} />
    </BulkContext.Provider>
  );
}
