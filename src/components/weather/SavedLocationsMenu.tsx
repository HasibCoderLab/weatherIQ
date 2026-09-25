"use client";

import { useEffect, useId, useRef, useState } from "react";
import { IconButton } from "@/components/ui/primitives";
import { useSavedLocations } from "@/stores/locations";
import type { SavedLocation } from "@/stores/locations";

/**
 * Per-location actions menu: set default, rename, remove (PRD §16).
 * Keyboard-accessible popover with outside-click and Escape handling.
 */
export function SavedLocationsMenu({ location }: { location: SavedLocation }) {
  const { setDefaultLocation, removeLocation, renameLocation } = useSavedLocations();
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftLabel, setDraftLabel] = useState(location.label ?? "");
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const commitRename = () => {
    const trimmed = draftLabel.trim();
    if (trimmed.length > 0) renameLocation(location.id, trimmed);
    setRenaming(false);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <IconButton
        label={`Actions for ${location.label ?? location.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        className="size-9"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-lg">
          more_vert
        </span>
      </IconButton>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={`Actions for ${location.label ?? location.name}`}
          className="absolute right-0 z-30 mt-1 w-48 overflow-hidden rounded-xl border border-outline-variant bg-surface-container py-1 shadow-xl"
        >
          {renaming ? (
            <form
              className="px-3 py-2"
              onSubmit={(event) => {
                event.preventDefault();
                commitRename();
              }}
            >
              <label className="mb-1 block text-xs text-on-surface-muted" htmlFor={`${menuId}-rename`}>
                Label
              </label>
              <input
                id={`${menuId}-rename`}
                autoFocus
                value={draftLabel}
                onChange={(event) => setDraftLabel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.stopPropagation();
                    setRenaming(false);
                  }
                }}
                className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container-high px-2 text-sm text-on-surface focus:border-primary focus:outline-none"
              />
              <div className="mt-2 flex justify-end gap-1">
                <button
                  type="button"
                  className="rounded-full px-2.5 py-1 text-xs text-on-surface-muted hover:text-on-surface"
                  onClick={() => setRenaming(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <>
              <button
                role="menuitem"
                type="button"
                disabled={location.isDefault}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-on-surface hover:bg-surface-container-high disabled:opacity-40"
                onClick={() => {
                  setDefaultLocation(location.id);
                  setOpen(false);
                }}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-lg">
                  home
                </span>
                Set as default
              </button>
              <button
                role="menuitem"
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-on-surface hover:bg-surface-container-high"
                onClick={() => setRenaming(true)}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-lg">
                  edit
                </span>
                Rename
              </button>
              <button
                role="menuitem"
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-surface-container-high"
                onClick={() => {
                  removeLocation(location.id);
                  setOpen(false);
                }}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-lg">
                  delete
                </span>
                Remove
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
