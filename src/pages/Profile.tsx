import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, User, Mail, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Profile = () => {
  const { user, userRoles } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      admin: "Администратор",
      production_manager: "Менеджер производства",
      warehouse_manager: "Менеджер склада",
      operator: "Оператор",
      viewer: "Наблюдатель",
    };
    return roleLabels[role] || role;
  };

  const getInitials = (email: string) => {
    return email.slice(0, 2).toUpperCase();
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // TODO: Implement profile update logic with Supabase
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Профиль успешно обновлен");
    } catch (error) {
      toast.error("Ошибка при обновлении профиля");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Профиль пользователя</h1>
          <p className="text-muted-foreground">Управление персональными данными и настройками</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Summary Card */}
          <Card className="md:col-span-1">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4 border-4 border-primary/20">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground text-2xl">
                    {getInitials(user?.email || "U")}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {user?.email}
                </h3>
                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  {userRoles.map((role) => (
                    <Badge key={role} variant="secondary">
                      {getRoleLabel(role)}
                    </Badge>
                  ))}
                </div>
                <div className="w-full space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>ID: {user?.id.slice(0, 8)}...</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Details Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Личные данные
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">ФИО</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Введите ФИО"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 (___) ___-__-__"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Должность</Label>
                  <Input
                    id="position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="Введите должность"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Отдел</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Введите отдел"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="bg-gradient-to-r from-primary to-primary-glow"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Сохранить изменения
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Информация об аккаунте</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Email</p>
                <p className="font-medium text-foreground">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Дата регистрации</p>
                <p className="font-medium text-foreground">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Последний вход</p>
                <p className="font-medium text-foreground">
                  {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Роли в системе</p>
                <div className="flex flex-wrap gap-1">
                  {userRoles.map((role) => (
                    <Badge key={role} variant="outline">
                      {getRoleLabel(role)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;
