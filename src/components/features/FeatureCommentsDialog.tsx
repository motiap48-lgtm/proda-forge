import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Send } from "lucide-react";
import { useFeatureComments } from "@/hooks/useFeatureComments";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface FeatureCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureId: string;
  featureName: string;
}

export const FeatureCommentsDialog = ({
  open,
  onOpenChange,
  featureId,
  featureName,
}: FeatureCommentsDialogProps) => {
  const [newComment, setNewComment] = useState("");
  const { comments, isLoading, addComment, deleteComment, user } = useFeatureComments(featureId);

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addComment.mutate({ featureId, content: newComment.trim() });
    setNewComment("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Комментарии: {featureName}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[300px] pr-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-4">Загрузка...</div>
          ) : comments.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              Нет комментариев
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-muted/50 rounded-lg p-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{comment.user_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), "d MMM yyyy, HH:mm", { locale: ru })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    </div>
                    {user?.id === comment.user_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => deleteComment.mutate(comment.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex gap-2">
          <Textarea
            placeholder="Написать комментарий..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="resize-none"
            rows={2}
          />
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || addComment.isPending}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
