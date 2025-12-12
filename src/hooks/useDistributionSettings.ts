import { useState, useEffect, useCallback } from "react";
import { DistributionStrategy } from "./useSmartDistribution";

const STORAGE_KEY = "distribution_strategy_preference";

export function useDistributionSettings() {
  const [defaultStrategy, setDefaultStrategy] = useState<DistributionStrategy>("smart");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && ["smart", "all_operations", "even"].includes(saved)) {
        setDefaultStrategy(saved as DistributionStrategy);
      }
    } catch (error) {
      console.error("Failed to load distribution settings:", error);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when changed
  const updateDefaultStrategy = useCallback((strategy: DistributionStrategy) => {
    setDefaultStrategy(strategy);
    try {
      localStorage.setItem(STORAGE_KEY, strategy);
    } catch (error) {
      console.error("Failed to save distribution settings:", error);
    }
  }, []);

  return {
    defaultStrategy,
    updateDefaultStrategy,
    isLoaded,
  };
}

export const DISTRIBUTION_STRATEGY_LABELS: Record<DistributionStrategy, { name: string; description: string }> = {
  smart: {
    name: "По типу продукта",
    description: "Материалы → первая операция, ПФ/СБ → последняя операция",
  },
  all_operations: {
    name: "На все операции",
    description: "Каждый компонент добавляется на все производственные операции",
  },
  even: {
    name: "Равномерно",
    description: "Компоненты распределяются поровну между операциями",
  },
};
