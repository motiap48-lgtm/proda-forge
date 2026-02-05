import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface FullscreenPortalProps {
  children: ReactNode;
}

/**
 * In browser fullscreen mode, ONLY the fullscreen element and its descendants are rendered.
 * This portal ensures UI like toast notifications stays visible by rendering them inside
 * `document.fullscreenElement` when present.
 */
export function FullscreenPortal({ children }: FullscreenPortalProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const getTarget = () => (document.fullscreenElement as HTMLElement) ?? document.body;
    const update = () => setContainer(getTarget());

    update();
    document.addEventListener("fullscreenchange", update);

    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  if (!container) return null;
  return createPortal(children, container);
}
