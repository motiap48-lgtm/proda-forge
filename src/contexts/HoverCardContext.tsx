import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface HoverCardContextType {
  /** Close all managed hover cards */
  closeAllHoverCards: () => void;
  /** Subscribe to close events, returns unsubscribe function */
  subscribeToClose: (callback: () => void) => () => void;
  /** Notify that a modal (Dialog/Sheet/AlertDialog) has opened */
  notifyModalOpened: () => void;
}

const HoverCardContext = createContext<HoverCardContextType | null>(null);

export function HoverCardProvider({ children }: { children: React.ReactNode }) {
  const [listeners] = useState<Set<() => void>>(() => new Set());

  const closeAllHoverCards = useCallback(() => {
    listeners.forEach((callback) => callback());
  }, [listeners]);

  const subscribeToClose = useCallback(
    (callback: () => void) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    [listeners]
  );

  const notifyModalOpened = useCallback(() => {
    closeAllHoverCards();
  }, [closeAllHoverCards]);

  return (
    <HoverCardContext.Provider
      value={{ closeAllHoverCards, subscribeToClose, notifyModalOpened }}
    >
      {children}
    </HoverCardContext.Provider>
  );
}

export function useHoverCardContext() {
  return useContext(HoverCardContext);
}

/**
 * Hook to make a HoverCard controlled - it will auto-close when modals open.
 * Returns [open, setOpen] similar to useState.
 */
export function useControlledHoverCard(defaultOpen = false): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(defaultOpen);
  const context = useHoverCardContext();

  useEffect(() => {
    if (!context) return;
    
    const unsubscribe = context.subscribeToClose(() => {
      setOpen(false);
    });
    
    return unsubscribe;
  }, [context]);

  return [open, setOpen];
}
