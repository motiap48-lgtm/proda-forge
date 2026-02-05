/**
 * Centralized z-index constants for consistent layering hierarchy.
 * 
 * Hierarchy (lowest to highest):
 * 1. Base content (default/auto)
 * 2. Sticky headers, fixed elements (10-40)
 * 3. HoverCards (50) - Closes when modals open
 * 4. Modal overlays - Dialog, Sheet, AlertDialog, Drawer (9998)
 * 5. Modal content - Dialog, Sheet, AlertDialog, Drawer (9999)
 * 6. Interactive overlays within modals - Popovers, Dropdowns, Select, ContextMenu (10000)
 */

export const Z_INDEX = {
  // Base layers
  base: 0,
  
  // Sticky/fixed elements within content
  stickyHeader: 10,
  fixedElement: 20,
  scrollFade: 70,
  headerFade: 90,
  
  // HoverCards (close when modals open, so lower z-index is fine)
  hoverCard: 50,
  
  // Modal overlays (dimmed backgrounds)
  modalOverlay: 9998,
  
  // Modal content (dialogs, sheets, drawers)
  modalContent: 9999,
  
  // Interactive overlays that can appear within modals (must be above modal content)
  popover: 10000,
  tooltip: 10000,
  dropdown: 10000,
  contextMenu: 10000,
  select: 10000,
  
  // Toast notifications (must be above everything including fullscreen)
  toast: 10001,
} as const;

// Tailwind class equivalents for use in className
export const Z_INDEX_CLASSES = {
  hoverCard: "z-50",
  modalOverlay: "z-[9998]",
  modalContent: "z-[9999]",
  popover: "z-[10000]",
  tooltip: "z-[10000]",
  dropdown: "z-[10000]",
  contextMenu: "z-[10000]",
  select: "z-[10000]",
  toast: "z-[10001]",
} as const;
