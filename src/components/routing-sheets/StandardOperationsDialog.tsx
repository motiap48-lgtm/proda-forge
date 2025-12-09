import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Pencil,
  Trash2,
  Wand2,
  Wrench,
  Truck,
  ClipboardCheck,
  Settings2,
  Search,
} from 'lucide-react';
import {
  useStandardOperations,
  useCreateStandardOperation,
  useUpdateStandardOperation,
  useDeleteStandardOperation,
  StandardOperation,
} from '@/hooks/useStandardOperations';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface StandardOperationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const operationTypeOptions = [
  { value: 'production', label: 'Производственная', icon: Wrench },
  { value: 'transport', label: 'Транспортная', icon: Truck },
  { value: 'control', label: 'Контрольная', icon: ClipboardCheck },
  { value: 'setup', label: 'Наладочная', icon: Settings2 },
];

const getOperationTypeLabel = (type: string) => {
  return operationTypeOptions.find(o => o.value === type)?.label || type;
};

const getOperationTypeIcon = (type: string) => {
  const IconComponent = operationTypeOptions.find(o => o.value === type)?.icon || Wrench;
  return IconComponent;
};

export function StandardOperationsDialog({
  open,
  onOpenChange,
}: StandardOperationsDialogProps) {
  const { data: operations = [], isLoading } = useStandardOperations();
  const createMutation = useCreateStandardOperation();
  const updateMutation = useUpdateStandardOperation();
  const deleteMutation = useDeleteStandardOperation();

  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingOperation, setEditingOperation] = useState<StandardOperation | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    operation_type: 'production',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    if (editingOperation) {
      setFormData({
        name: editingOperation.name,
        operation_type: editingOperation.operation_type,
        description: editingOperation.description || '',
        is_active: editingOperation.is_active,
      });
    } else {
      setFormData({
        name: '',
        operation_type: 'production',
        description: '',
        is_active: true,
      });
    }
  }, [editingOperation]);

  const filteredOperations = operations.filter(op =>
    op.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    op.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Укажите название операции');
      return;
    }

    try {
      if (editingOperation) {
        await updateMutation.mutateAsync({
          id: editingOperation.id,
          ...formData,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setIsEditing(false);
      setEditingOperation(null);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleEdit = (operation: StandardOperation) => {
    setEditingOperation(operation);
    setIsEditing(true);
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteMutation.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleAddNew = () => {
    setEditingOperation(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingOperation(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Справочник типовых операций
            </DialogTitle>
          </DialogHeader>

          {isEditing ? (
            <div className="space-y-4 p-4">
              <h3 className="text-lg font-medium">
                {editingOperation ? 'Редактирование операции' : 'Новая типовая операция'}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Код</Label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                    <Wand2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {editingOperation?.code || 'Автоматически'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Тип операции</Label>
                  <Select
                    value={formData.operation_type}
                    onValueChange={value => setFormData(prev => ({ ...prev, operation_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {operationTypeOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <opt.icon className="h-4 w-4" />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Название операции *</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Например: Токарная обработка"
                />
              </div>

              <div className="space-y-2">
                <Label>Описание</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Описание операции..."
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Активна</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  Отмена
                </Button>
                <Button onClick={handleSubmit}>
                  {editingOperation ? 'Сохранить' : 'Создать'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center gap-4 px-4 pb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по названию или коду..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleAddNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить операцию
                </Button>
              </div>

              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Загрузка...
                  </div>
                ) : filteredOperations.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {searchQuery ? 'Операции не найдены' : 'Нет типовых операций. Добавьте первую!'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Код</TableHead>
                        <TableHead>Название</TableHead>
                        <TableHead className="w-36">Тип</TableHead>
                        <TableHead>Описание</TableHead>
                        <TableHead className="w-24 text-center">Статус</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOperations.map(op => {
                        const TypeIcon = getOperationTypeIcon(op.operation_type);
                        return (
                          <TableRow key={op.id}>
                            <TableCell className="font-mono text-sm">{op.code}</TableCell>
                            <TableCell className="font-medium">{op.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <TypeIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{getOperationTypeLabel(op.operation_type)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground line-clamp-1">
                                {op.description || '—'}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={op.is_active ? 'default' : 'secondary'}>
                                {op.is_active ? 'Активна' : 'Неактивна'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(op)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteConfirmId(op.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>

              <div className="flex justify-end gap-2 pt-4 border-t px-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Закрыть
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить типовую операцию?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Типовая операция будет удалена из справочника.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
