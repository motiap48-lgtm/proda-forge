import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useDistributionSettings, DISTRIBUTION_STRATEGY_LABELS } from "@/hooks/useDistributionSettings";
import { DistributionStrategy } from "@/hooks/useSmartDistribution";
import { Sparkles, Factory, Settings } from "lucide-react";
import { toast } from "sonner";

const strategyIcons: Record<DistributionStrategy, typeof Sparkles> = {
  smart: Sparkles,
  all_operations: Factory,
  even: Settings,
};

export function DistributionStrategySettings() {
  const { defaultStrategy, updateDefaultStrategy, isLoaded } = useDistributionSettings();

  const handleChange = (value: DistributionStrategy) => {
    updateDefaultStrategy(value);
    toast.success(`Стратегия по умолчанию: ${DISTRIBUTION_STRATEGY_LABELS[value].name}`);
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Выберите стратегию распределения компонентов, которая будет использоваться по умолчанию при создании техмаршрутов.
      </p>
      
      <RadioGroup
        value={defaultStrategy}
        onValueChange={(value) => handleChange(value as DistributionStrategy)}
        className="space-y-3"
      >
        {(Object.keys(DISTRIBUTION_STRATEGY_LABELS) as DistributionStrategy[]).map((strategy) => {
          const Icon = strategyIcons[strategy];
          const { name, description } = DISTRIBUTION_STRATEGY_LABELS[strategy];
          
          return (
            <div
              key={strategy}
              className="flex items-start space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleChange(strategy)}
            >
              <RadioGroupItem value={strategy} id={strategy} className="mt-1" />
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor={strategy}
                  className="flex items-center gap-2 font-medium cursor-pointer"
                >
                  <Icon className="h-4 w-4" />
                  {name}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
