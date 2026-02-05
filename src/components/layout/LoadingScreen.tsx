import { useEffect, useState } from "react";
import { Z_INDEX_CLASSES } from "@/lib/z-index";

export const LoadingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 500);
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 ${Z_INDEX_CLASSES.loadingScreen} flex items-center justify-center bg-background transition-opacity duration-500 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex items-center gap-3 animate-pulse">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow shadow-lg">
          <span className="text-2xl font-bold text-primary-foreground">EVA</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">ERP Vostok Auto</h1>
          <p className="text-sm text-muted-foreground">Управление производством</p>
        </div>
      </div>
    </div>
  );
};
