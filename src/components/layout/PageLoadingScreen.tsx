import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";

export const PageLoadingScreen = () => {
  const { isLoading } = useNavigationLoading();

  if (!isLoading) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm transition-all duration-300 ${
        isLoading ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-3 animate-pulse">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow shadow-lg">
          <span className="text-lg font-bold text-primary-foreground">EVA</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">ERP Vostok Auto</h1>
          <p className="text-xs text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    </div>
  );
};
