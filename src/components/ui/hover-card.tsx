import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";

import { cn } from "@/lib/utils";
import { Z_INDEX_CLASSES } from "@/lib/z-index";
import { useHoverCardContext, useControlledHoverCard } from "@/contexts/HoverCardContext";

const HoverCardRoot = HoverCardPrimitive.Root;

const HoverCardTrigger = HoverCardPrimitive.Trigger;

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => {
  const [portalContainer, setPortalContainer] = React.useState<HTMLElement | undefined>(undefined);

  React.useEffect(() => {
    const updateContainer = () => {
      const fullscreenEl = document.fullscreenElement as HTMLElement | null;
      setPortalContainer(fullscreenEl ?? undefined);
    };

    updateContainer();

    document.addEventListener("fullscreenchange", updateContainer);
    return () => {
      document.removeEventListener("fullscreenchange", updateContainer);
    };
  }, []);

  return (
    <HoverCardPrimitive.Portal container={portalContainer}>
      <HoverCardPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          `${Z_INDEX_CLASSES.hoverCard} w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2`,
          className,
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
});
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

/**
 * Controlled HoverCard that auto-closes when modals open.
 * Use this instead of HoverCardRoot when you want the hover card to 
 * automatically close when Dialog/Sheet/AlertDialog opens.
 */
const HoverCard = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Root>
>(({ open: openProp, onOpenChange: onOpenChangeProp, ...props }, ref) => {
  const [controlledOpen, setControlledOpen] = useControlledHoverCard(false);
  
  // If external control is provided, use it; otherwise use the controlled hook
  const isControlledExternally = openProp !== undefined;
  const open = isControlledExternally ? openProp : controlledOpen;
  const onOpenChange = isControlledExternally ? onOpenChangeProp : setControlledOpen;

  return (
    <HoverCardRoot open={open} onOpenChange={onOpenChange} {...props} />
  );
});
HoverCard.displayName = "HoverCard";

export { HoverCard, HoverCardRoot, HoverCardTrigger, HoverCardContent, useControlledHoverCard };
