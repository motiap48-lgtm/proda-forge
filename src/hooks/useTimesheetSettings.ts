import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "timesheet_settings";

interface TimesheetSettings {
  restrictFillByPlanToLastDay: boolean;
}

const defaultSettings: TimesheetSettings = {
  restrictFillByPlanToLastDay: false,
};

export const useTimesheetSettings = () => {
  const [settings, setSettings] = useState<TimesheetSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error("Failed to load timesheet settings:", e);
    }
    return defaultSettings;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save timesheet settings:", e);
    }
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<TimesheetSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  return { settings, updateSettings };
};

export const getTimesheetSettings = (): TimesheetSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Failed to load timesheet settings:", e);
  }
  return defaultSettings;
};
