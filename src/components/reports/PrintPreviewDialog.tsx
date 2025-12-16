import { ReactNode, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";

interface PrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onPrint: () => void;
  children: ReactNode;
}

export const PrintPreviewDialog = ({
  open,
  onOpenChange,
  title,
  onPrint,
  children,
}: PrintPreviewDialogProps) => {
  const [zoom, setZoom] = useState(70);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 10, 150));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 10, 30));
  }, []);

  const handlePrint = () => {
    onPrint();
    onOpenChange(false);
  };

  // Keyboard shortcuts for zoom
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=' || (e.key === '+' && e.shiftKey)) {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleZoomIn, handleZoomOut, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-none w-screen h-screen m-0 rounded-none flex flex-col p-0 [&>button]:hidden"
      >
        <DialogHeader className="px-6 py-3 border-b flex-shrink-0 bg-background">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="sr-only">
                Предпросмотр печатного документа. Используйте + и - для изменения масштаба.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 30}
                title="Уменьшить масштаб (-)"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground w-14 text-center font-mono">
                {zoom}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 150}
                title="Увеличить масштаб (+)"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto bg-muted/50 p-6">
          <div 
            className="mx-auto bg-white shadow-xl origin-top transition-transform border"
            style={{ 
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              width: '210mm',
              minHeight: '297mm',
            }}
          >
            {children}
          </div>
        </div>

        <DialogFooter className="px-6 py-3 border-t flex-shrink-0 bg-background">
          <div className="text-xs text-muted-foreground mr-auto hidden sm:block">
            Горячие клавиши: + / - (масштаб), Esc (закрыть)
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Печать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
