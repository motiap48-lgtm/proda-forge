import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChangelogEntry, ChangelogFormData, getNextVersion, getLatestVersion, VersionIncrementType } from "@/hooks/useChangelog";
import { format } from "date-fns";

interface ChangelogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: ChangelogEntry | null;
  onSave: (data: ChangelogFormData) => void;
  isLoading?: boolean;
  changelog?: ChangelogEntry[];
}

export const ChangelogDialog = ({
  open,
  onOpenChange,
  entry,
  onSave,
  isLoading,
  changelog = []
}: ChangelogDialogProps) => {
  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [changesText, setChangesText] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [incrementType, setIncrementType] = useState<VersionIncrementType>("patch");

  useEffect(() => {
    if (entry) {
      setVersion(entry.version);
      setTitle(entry.title);
      setDate(entry.date);
      setChangesText(entry.changes.join("\n"));
      setIsPublished(entry.is_published);
    } else {
      // Auto-generate next version
      const latestVersion = getLatestVersion(changelog);
      const nextVersion = getNextVersion(latestVersion, incrementType);
      setVersion(nextVersion);
      setTitle("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setChangesText("");
      setIsPublished(true);
    }
  }, [entry, open, changelog]);

  // Update version when increment type changes (only for new entries)
  useEffect(() => {
    if (!entry && open) {
      const latestVersion = getLatestVersion(changelog);
      const nextVersion = getNextVersion(latestVersion, incrementType);
      setVersion(nextVersion);
    }
  }, [incrementType, entry, open, changelog]);

  const handleSubmit = () => {
    const changes = changesText
      .split("\n")
      .map(c => c.trim())
      .filter(c => c.length > 0);

    onSave({
      version,
      title,
      date,
      changes,
      is_published: isPublished
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {entry ? "Редактировать запись" : "Новая запись changelog"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!entry && (
            <div className="space-y-2">
              <Label>Тип инкремента версии</Label>
              <Select value={incrementType} onValueChange={(v) => setIncrementType(v as VersionIncrementType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patch">
                    <div className="flex flex-col items-start">
                      <span>Patch</span>
                      <span className="text-xs text-muted-foreground">0.9.5 → 0.9.6 (исправления)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="minor">
                    <div className="flex flex-col items-start">
                      <span>Minor</span>
                      <span className="text-xs text-muted-foreground">0.9.5 → 0.10.0 (новые функции)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="major">
                    <div className="flex flex-col items-start">
                      <span>Major</span>
                      <span className="text-xs text-muted-foreground">0.9.5 → 1.0.0 (крупные изменения)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="version">Версия</Label>
              <Input
                id="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="0.9.6"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Дата</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Заголовок</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название обновления"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="changes">Изменения (каждое с новой строки)</Label>
            <Textarea
              id="changes"
              value={changesText}
              onChange={(e) => setChangesText(e.target.value)}
              placeholder="Добавлена новая функция&#10;Исправлена ошибка&#10;Улучшена производительность"
              rows={6}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="published"
              checked={isPublished}
              onCheckedChange={setIsPublished}
            />
            <Label htmlFor="published">Опубликовано</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !version || !title}>
            {entry ? "Сохранить" : "Создать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
