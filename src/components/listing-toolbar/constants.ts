import { LayoutGrid, LayoutList } from "@lucide/vue";
import type { Component } from "vue";

// the small heading above each group of controls in the Filters panel
export const SECTION_LABEL_CLASS =
  "text-xs font-medium tracking-wide text-muted-foreground uppercase";

// the same heading above each part of the sort menu
export const MENU_SECTION_LABEL_CLASS =
  "text-xs text-muted-foreground uppercase";

/** A way a listing can show its items, as the sort menu offers it. */
export interface ListingViewOption {
  value: string;
  label: string;
  shortLabel: string;
  icon: Component;
}

// the ways a library page can show its items
export const VIEW_MODES: readonly ListingViewOption[] = [
  {
    value: "panel",
    label: "view.panel",
    shortLabel: "view.panel_short",
    icon: LayoutGrid,
  },
  {
    value: "list",
    label: "view.list",
    shortLabel: "view.list_short",
    icon: LayoutList,
  },
];
