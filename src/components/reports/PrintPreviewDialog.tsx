import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, ZoomIn, ZoomOut } from "lucide-react";
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

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 10, 150));
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
      <DialogContent className="max-w-none w-screen h-screen m-0 rounded-none flex flex-col p-0">
        <DialogHeader className="px-6 py-3 border-b flex-shrink-0 bg-background">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="sr-only">
                Предпросмотр печатного документа
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 30}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground w-14 text-center">
                {zoom}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 150}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-2" />
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
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
