import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { Z_INDEX } from "@/lib/z-index";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={{ zIndex: Z_INDEX.toast }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg z-[10001]",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:!bg-background group-[.toaster]:!text-foreground group-[.toaster]:!border-border",
          error: "group-[.toaster]:!bg-background group-[.toaster]:!text-foreground group-[.toaster]:!border-destructive",
          info: "group-[.toaster]:!bg-background group-[.toaster]:!text-foreground group-[.toaster]:!border-border",
          warning: "group-[.toaster]:!bg-background group-[.toaster]:!text-foreground group-[.toaster]:!border-warning",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
