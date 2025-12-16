import { forwardRef, ReactNode, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [zoom, setZoom] = useState(50);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 10, 100));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 10, 30));
  };

  const handlePrint = () => {
    onPrint();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 30}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground w-12 text-center">
                {zoom}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 100}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto bg-muted/30 p-4">
          <div 
            className="mx-auto bg-white shadow-lg origin-top transition-transform"
            style={{ 
              transform: `scale(${zoom / 100})`,
              width: `${100 / (zoom / 100)}%`,
              maxWidth: '210mm',
            }}
          >
            {children}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Отмена
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
