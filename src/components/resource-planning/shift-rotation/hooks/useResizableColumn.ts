import { useState, useRef, useCallback, useEffect } from "react";

const EMPLOYEE_COLUMN_WIDTH_KEY = 'shiftRotationCalendar_employeeColumnWidth';

export const useResizableColumn = (minWidth = 120, maxWidth = 400) => {
  const [employeeColumnWidth, setEmployeeColumnWidth] = useState(() => {
    const saved = localStorage.getItem(EMPLOYEE_COLUMN_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : 200;
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = employeeColumnWidth;
  }, [employeeColumnWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX.current;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartWidth.current + delta));
      setEmployeeColumnWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem(EMPLOYEE_COLUMN_WIDTH_KEY, employeeColumnWidth.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, employeeColumnWidth, minWidth, maxWidth]);

  return {
    employeeColumnWidth,
    isResizing,
    handleResizeMouseDown,
  };
};
