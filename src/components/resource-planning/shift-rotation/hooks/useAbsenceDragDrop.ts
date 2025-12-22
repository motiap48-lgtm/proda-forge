import { useState, useCallback } from "react";
import { differenceInDays, addDays, format, isSameDay, parseISO } from "date-fns";
import { useUpdateOperatorAbsence, type OperatorAbsence } from "@/hooks/useOperatorAbsences";

type ResizeEdge = 'start' | 'end' | null;

interface DragState {
  absence: OperatorAbsence;
  operatorId: string;
  startDate: Date;
  resizeEdge: ResizeEdge;
}

export const useAbsenceDragDrop = () => {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<{ date: Date; operatorId: string } | null>(null);
  const [hoveredAbsenceId, setHoveredAbsenceId] = useState<string | null>(null);
  const updateAbsence = useUpdateOperatorAbsence();

  // Regular drag (move entire absence)
  const handleDragStart = useCallback((absence: OperatorAbsence, operatorId: string, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", absence.id);
    setDragState({
      absence,
      operatorId,
      startDate: new Date(absence.start_date),
      resizeEdge: null,
    });
  }, []);

  // Resize drag (change start or end date)
  const handleResizeStart = useCallback((absence: OperatorAbsence, operatorId: string, edge: 'start' | 'end', e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${absence.id}-${edge}`);
    setDragState({
      absence,
      operatorId,
      startDate: new Date(absence.start_date),
      resizeEdge: edge,
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

    if (dragState.resizeEdge === 'start') {
      // Resizing start date
      if (!isSameDay(targetDate, originalStartDate) && targetDate <= originalEndDate) {
        updateAbsence.mutate({
          id: absence.id,
          start_date: format(targetDate, "yyyy-MM-dd"),
        });
      }
    } else if (dragState.resizeEdge === 'end') {
      // Resizing end date
      if (!isSameDay(targetDate, originalEndDate) && targetDate >= originalStartDate) {
        updateAbsence.mutate({
          id: absence.id,
          end_date: format(targetDate, "yyyy-MM-dd"),
        });
      }
    } else {
      // Moving the entire absence
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

  const isResizing = useCallback(() => {
    return dragState?.resizeEdge !== null;
  }, [dragState]);

  // Hover state for highlighting entire absence period
  const handleAbsenceHover = useCallback((absenceId: string | null) => {
    setHoveredAbsenceId(absenceId);
  }, []);

  const isAbsenceHovered = useCallback((absenceId: string) => {
    return hoveredAbsenceId === absenceId;
  }, [hoveredAbsenceId]);

  // Check if a date is the start or end of an absence (for resize handles)
  const isAbsenceEdge = useCallback((absence: OperatorAbsence, date: Date): { isStart: boolean; isEnd: boolean } => {
    const dateStr = format(date, "yyyy-MM-dd");
    return {
      isStart: absence.start_date === dateStr,
      isEnd: absence.end_date === dateStr,
    };
  }, []);

  return {
    dragState,
    handleDragStart,
    handleResizeStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    isDropTarget,
    isDragging,
    isResizing,
    handleAbsenceHover,
    isAbsenceHovered,
    isAbsenceEdge,
  };
};
