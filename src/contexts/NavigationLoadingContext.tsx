import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface NavigationLoadingContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextType | undefined>(undefined);

export const useNavigationLoading = () => {
  const context = useContext(NavigationLoadingContext);
  if (!context) {
    throw new Error("useNavigationLoading must be used within NavigationLoadingProvider");
  }
  return context;
};

export const NavigationLoadingProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Показываем загрузку при смене маршрута
    setIsLoading(true);
    
    // Скрываем через короткое время
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <NavigationLoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {children}
    </NavigationLoadingContext.Provider>
  );
};
