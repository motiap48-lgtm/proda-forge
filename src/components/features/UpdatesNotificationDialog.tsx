import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { useUnseenChangelog, ChangelogEntry } from "@/hooks/useChangelog";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export const UpdatesNotificationDialog = () => {
  const { unseenEntries, markAsSeen, hasUnseenUpdates } = useUnseenChangelog();
  const [open, setOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    // Show dialog only once per session when there are unseen updates
    if (hasUnseenUpdates && !hasShown && unseenEntries.length > 0) {
      const timer = setTimeout(() => {
        setOpen(true);
        setHasShown(true);
      }, 1500); // Delay to not interrupt initial load

      return () => clearTimeout(timer);
    }
  }, [hasUnseenUpdates, hasShown, unseenEntries.length]);

  const handleClose = () => {
    setOpen(false);
    // Mark all as seen
    const ids = unseenEntries
      .filter(e => !e.id.startsWith('default-'))
      .map(e => e.id);
    if (ids.length > 0) {
      markAsSeen.mutate(ids);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "d MMMM yyyy", { locale: ru });
    } catch {
      return dateStr;
    }
  };

  if (!hasUnseenUpdates || unseenEntries.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(isOpen);
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Новые обновления системы
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-6">
            {unseenEntries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono">
                    v{entry.version}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(entry.date)}
                  </span>
                </div>
                <h4 className="font-medium">{entry.title}</h4>
                <ul className="space-y-1">
                  {entry.changes.map((change, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={handleClose}>
            Отлично, спасибо!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
