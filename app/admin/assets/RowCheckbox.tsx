"use client";

import { useBulkSelection } from "./BulkSelectionShell";

/**
 * Per-row checkbox in the admin moderation table. Reads selection
 * state from the shared `BulkSelectionShell` context — drop it into
 * any table row and it Just Works.
 *
 * The wrapping `<label>` swallows row clicks, so clicking anywhere
 * inside the checkbox cell toggles selection (the surrounding `<tr>`
 * doesn't navigate anywhere on row click anyway).
 */
export function RowCheckbox({ id }: { id: string }) {
  const { isSelected, toggle } = useBulkSelection();
  const checked = isSelected(id);

  return (
    <label
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center justify-center w-8 h-8 cursor-pointer"
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => toggle(id)}
        aria-label={`Select asset ${id} for bulk action`}
        className="w-4 h-4 accent-accent cursor-pointer"
      />
    </label>
  );
}

/**
 * "Select all visible" checkbox for the table header. Flips every
 * visibleIds entry on/off in one click.
 */
export function SelectAllCheckbox() {
  const { selectAllChecked, onSelectAllChange } = useBulkSelection();

  return (
    <label className="inline-flex items-center justify-center w-8 h-8 cursor-pointer">
      <input
        type="checkbox"
        checked={selectAllChecked}
        onChange={(e) => onSelectAllChange(e.target.checked)}
        aria-label="Select all visible assets"
        className="w-4 h-4 accent-accent cursor-pointer"
      />
    </label>
  );
}
