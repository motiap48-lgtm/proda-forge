import { useState, useCallback, useMemo } from "react";
import { differenceInDays, addDays, format, isSameDay, isWithinInterval, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useUpdateOperatorAbsence, type OperatorAbsence } from "@/hooks/useOperatorAbsences";

type ResizeEdge = 'start' | 'end' | null;

interface DragState {
  absence: OperatorAbsence;
  operatorId: string;
  startDate: Date;
  resizeEdge: ResizeEdge;
}

export interface DragPreview {
  absenceId: string;
  operatorId: string;
  newStartDate: string;
  newEndDate: string;
  formattedRange: string;
}

export const useAbsenceDragDrop = () => {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<{ date: Date; operatorId: string } | null>(null);
  const [hoveredAbsenceId, setHoveredAbsenceId] = useState<string | null>(null);
  const [selectedAbsenceId, setSelectedAbsenceId] = useState<string | null>(null);
  const updateAbsence = useUpdateOperatorAbsence();

  // Calculate preview of the drag result
  const dragPreview = useMemo<DragPreview | null>(() => {
    if (!dragState || !dropTarget || dragState.operatorId !== dropTarget.operatorId) {
      return null;
    }

    const absence = dragState.absence;
    const originalStartDate = new Date(absence.start_date);
    const originalEndDate = new Date(absence.end_date);
    const targetDate = dropTarget.date;

    let newStartDate: Date;
    let newEndDate: Date;

    if (dragState.resizeEdge === 'start') {
      newStartDate = targetDate <= originalEndDate ? targetDate : originalEndDate;
      newEndDate = originalEndDate;
    } else if (dragState.resizeEdge === 'end') {
      newStartDate = originalStartDate;
      newEndDate = targetDate >= originalStartDate ? targetDate : originalStartDate;
    } else {
      const daysDiff = differenceInDays(targetDate, originalStartDate);
      newStartDate = addDays(originalStartDate, daysDiff);
      newEndDate = addDays(originalEndDate, daysDiff);
    }

    const formattedRange = isSameDay(newStartDate, newEndDate)
      ? format(newStartDate, "d MMM yyyy", { locale: ru })
      : `${format(newStartDate, "d MMM", { locale: ru })} — ${format(newEndDate, "d MMM yyyy", { locale: ru })}`;

    return {
      absenceId: absence.id,
      operatorId: dragState.operatorId,
      newStartDate: format(newStartDate, "yyyy-MM-dd"),
      newEndDate: format(newEndDate, "yyyy-MM-dd"),
      formattedRange,
    };
  }, [dragState, dropTarget]);

  // Check if a date is within the drag preview range
  const isInDragPreview = useCallback((date: Date, operatorId: string): boolean => {
    if (!dragPreview || dragPreview.operatorId !== operatorId) return false;
    
    const dateStr = format(date, "yyyy-MM-dd");
    return dateStr >= dragPreview.newStartDate && dateStr <= dragPreview.newEndDate;
  }, [dragPreview]);

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

  // Selection state for keyboard shortcuts
  const handleAbsenceSelect = useCallback((absenceId: string | null) => {
    setSelectedAbsenceId(absenceId);
  }, []);

  const isAbsenceSelected = useCallback((absenceId: string) => {
    return selectedAbsenceId === absenceId;
  }, [selectedAbsenceId]);

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
    dragPreview,
    handleDragStart,
    handleResizeStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    isDropTarget,
    isDragging,
    isResizing,
    isInDragPreview,
    handleAbsenceHover,
    isAbsenceHovered,
    handleAbsenceSelect,
    isAbsenceSelected,
    selectedAbsenceId,
    isAbsenceEdge,
  };
};
