import { useState, useEffect } from 'react';

interface BetaSettings {
  showBetaBadge: boolean;
  showFeaturesPage: boolean;
}

const BETA_SETTINGS_KEY = 'eva-beta-settings';

const defaultSettings: BetaSettings = {
  showBetaBadge: true,
  showFeaturesPage: true,
};

export const useBetaSettings = () => {
  const [settings, setSettings] = useState<BetaSettings>(() => {
    try {
      const stored = localStorage.getItem(BETA_SETTINGS_KEY);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Failed to load beta settings:', e);
    }
    return defaultSettings;
  });

  useEffect(() => {
    try {
      localStorage.setItem(BETA_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save beta settings:', e);
    }
  }, [settings]);

  const updateSettings = (updates: Partial<BetaSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  return { settings, updateSettings };
};
