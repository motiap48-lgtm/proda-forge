/**
 * Centralized z-index constants for consistent layering hierarchy.
 * 
 * Hierarchy (lowest to highest):
 * 1. Base content (default/auto)
 * 2. Sticky headers, fixed elements (10-40)
 * 3. Popovers, Tooltips, HoverCards, Dropdowns, Select, ContextMenu (50)
 * 4. Modal overlays - Dialog, Sheet, AlertDialog, Drawer (9998)
 * 5. Modal content - Dialog, Sheet, AlertDialog, Drawer (9999)
 */

export const Z_INDEX = {
  // Base layers
  base: 0,
  
  // Sticky/fixed elements within content
  stickyHeader: 10,
  fixedElement: 20,
  scrollFade: 70,
  headerFade: 90,
  
  // Interactive overlays (popovers, tooltips, dropdowns)
  popover: 50,
  tooltip: 50,
  hoverCard: 50,
  dropdown: 50,
  contextMenu: 50,
  select: 50,
  
  // Modal overlays (dimmed backgrounds)
  modalOverlay: 9998,
  
  // Modal content (dialogs, sheets, drawers)
  modalContent: 9999,
} as const;

// Tailwind class equivalents for use in className
export const Z_INDEX_CLASSES = {
  popover: "z-50",
  tooltip: "z-50",
  hoverCard: "z-50",
  dropdown: "z-50",
  contextMenu: "z-50",
  select: "z-50",
  modalOverlay: "z-[9998]",
  modalContent: "z-[9999]",
} as const;
