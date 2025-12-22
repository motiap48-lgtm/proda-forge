import { useState, useCallback } from "react";
import { format, isBefore, isAfter } from "date-fns";

export interface RangeSelection {
  operatorId: string;
  operatorName: string;
  startDate: Date;
  endDate: Date | null;
  isSelecting: boolean;
}

export const useAbsenceRangeSelection = () => {
  const [rangeSelection, setRangeSelection] = useState<RangeSelection | null>(null);

  // Start selection on mouse down
  const handleRangeStart = useCallback((operatorId: string, operatorName: string, date: Date) => {
    setRangeSelection({
      operatorId,
      operatorName,
      startDate: date,
      endDate: date,
      isSelecting: true,
    });
  }, []);

  // Update end date on mouse enter while selecting
  const handleRangeMove = useCallback((operatorId: string, date: Date) => {
    setRangeSelection(prev => {
      if (!prev || !prev.isSelecting || prev.operatorId !== operatorId) return prev;
      return {
        ...prev,
        endDate: date,
      };
    });
  }, []);

  // Complete selection on mouse up
  const handleRangeEnd = useCallback((): RangeSelection | null => {
    if (!rangeSelection || !rangeSelection.endDate) {
      setRangeSelection(null);
      return null;
    }

    const result = { ...rangeSelection, isSelecting: false };
    
    // Normalize dates so startDate is always before endDate
    if (isBefore(result.endDate, result.startDate)) {
      const temp = result.startDate;
      result.startDate = result.endDate;
      result.endDate = temp;
    }
    
    setRangeSelection(null);
    return result;
  }, [rangeSelection]);

  // Cancel selection
  const cancelRangeSelection = useCallback(() => {
    setRangeSelection(null);
  }, []);

  // Check if a date is in the current selection
  const isInSelection = useCallback((operatorId: string, date: Date): boolean => {
    if (!rangeSelection || rangeSelection.operatorId !== operatorId || !rangeSelection.endDate) {
      return false;
    }

    const start = isBefore(rangeSelection.endDate, rangeSelection.startDate) 
      ? rangeSelection.endDate 
      : rangeSelection.startDate;
    const end = isAfter(rangeSelection.endDate, rangeSelection.startDate) 
      ? rangeSelection.endDate 
      : rangeSelection.startDate;

    const dateStr = format(date, "yyyy-MM-dd");
    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");

    return dateStr >= startStr && dateStr <= endStr;
  }, [rangeSelection]);

  // Get formatted result for creating absence
  const getSelectionResult = useCallback((): { 
    operatorId: string; 
    operatorName: string; 
    startDate: string; 
    endDate: string; 
  } | null => {
    if (!rangeSelection || !rangeSelection.endDate) return null;

    let start = rangeSelection.startDate;
    let end = rangeSelection.endDate;

    // Normalize
    if (isBefore(end, start)) {
      const temp = start;
      start = end;
      end = temp;
    }

    return {
      operatorId: rangeSelection.operatorId,
      operatorName: rangeSelection.operatorName,
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    };
  }, [rangeSelection]);

  return {
    rangeSelection,
    handleRangeStart,
    handleRangeMove,
    handleRangeEnd,
    cancelRangeSelection,
    isInSelection,
    getSelectionResult,
    isSelecting: rangeSelection?.isSelecting ?? false,
  };
};