import { useState, useCallback } from "react";
import { differenceInDays, addDays, format } from "date-fns";
import { useUpdateOperatorAbsence, type OperatorAbsence } from "@/hooks/useOperatorAbsences";

interface DragState {
  absence: OperatorAbsence;
  operatorId: string;
  startDate: Date;
}

export const useAbsenceDragDrop = () => {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<{ date: Date; operatorId: string } | null>(null);
  const updateAbsence = useUpdateOperatorAbsence();

  const handleDragStart = useCallback((absence: OperatorAbsence, operatorId: string, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", absence.id);
    setDragState({
      absence,
      operatorId,
      startDate: new Date(absence.start_date),
    });
  }, []);

  const handleDragOver = useCallback((date: Date, operatorId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    
    if (dragState && dragState.operatorId === operatorId) {
      setDropTarget({ date, operatorId });
    }
  }, [dragState]);

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback((targetDate: Date, operatorId: string, e: React.DragEvent) => {
    e.preventDefault();
    
    if (!dragState || dragState.operatorId !== operatorId) {
      setDragState(null);
      setDropTarget(null);
      return;
    }

    const absence = dragState.absence;
    const originalStartDate = new Date(absence.start_date);
    const originalEndDate = new Date(absence.end_date);
    const daysDiff = differenceInDays(targetDate, originalStartDate);

    if (daysDiff !== 0) {
      const newStartDate = addDays(originalStartDate, daysDiff);
      const newEndDate = addDays(originalEndDate, daysDiff);

      updateAbsence.mutate({
        id: absence.id,
        start_date: format(newStartDate, "yyyy-MM-dd"),
        end_date: format(newEndDate, "yyyy-MM-dd"),
      });
    }

    setDragState(null);
    setDropTarget(null);
  }, [dragState, updateAbsence]);

  const handleDragEnd = useCallback(() => {
    setDragState(null);
    setDropTarget(null);
  }, []);

  const isDropTarget = useCallback((date: Date, operatorId: string) => {
    if (!dropTarget) return false;
    return (
      dropTarget.operatorId === operatorId &&
      format(dropTarget.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    );
  }, [dropTarget]);

  const isDragging = useCallback((absenceId: string) => {
    return dragState?.absence.id === absenceId;
  }, [dragState]);

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    isDropTarget,
    isDragging,
  };
};
