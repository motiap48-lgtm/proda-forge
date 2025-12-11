import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Shield, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UserManagement = () => {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Record<string, string>>({});

  const { data: users, isLoading } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      // Получаем профили
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*");

      if (profilesError) throw profilesError;

      // Получаем роли для каждого пользователя
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Объединяем данные
      return profiles.map(profile => ({
        ...profile,
        user_roles: roles.filter(r => r.user_id === profile.id)
      }));
    },
  });

  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      // Удаляем старые роли
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      // Добавляем новую роль
      const { error } = await supabase
        .from("user_roles")
        .insert([{ user_id: userId, role: role as any }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast.success("Роль обновлена");
    },
    onError: (error) => {
      toast.error("Ошибка: " + error.message);
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast.success("Пользователь удален");
    },
    onError: (error: Error) => {
      toast.error("Ошибка при удалении: " + error.message);
    },
  });

  const getRoleBadge = (roles: any) => {
    if (!roles || (Array.isArray(roles) && roles.length === 0)) {
      return <Badge variant="outline">viewer</Badge>;
    }
    
    const role = Array.isArray(roles) ? roles[0]?.role : roles.role;
    const variants: Record<string, any> = {
      admin: "destructive",
      manager: "default",
      operator: "secondary",
      viewer: "outline",
    };

    return <Badge variant={variants[role] || "outline"}>{role}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <div className="container py-8">
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Управление пользователями
          </h1>
          <p className="text-muted-foreground">
            Управление ролями и правами доступа
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Пользователи системы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users && Array.isArray(users) && users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-primary/10 p-3">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {user.position || "Не указано"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {getRoleBadge(user.user_roles)}
                    
                    <Select
                      value={selectedRole[user.id]}
                      onValueChange={(value) => {
                        setSelectedRole({ ...selectedRole, [user.id]: value });
                        assignRole.mutate({ userId: user.id, role: value });
                      }}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Изменить роль" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="operator">Operator</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm("Удалить пользователя?")) {
                          deleteUser.mutate(user.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Описание ролей</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge variant="destructive">admin</Badge>
                <p className="text-sm text-muted-foreground">
                  Полный доступ ко всем функциям системы, управление пользователями
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge>manager</Badge>
                <p className="text-sm text-muted-foreground">
                  Создание и редактирование заказов, управление производством
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary">operator</Badge>
                <p className="text-sm text-muted-foreground">
                  Выполнение операций, обновление статусов, выдача материалов
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline">viewer</Badge>
                <p className="text-sm text-muted-foreground">
                  Просмотр данных без возможности изменений
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UserManagement;
