import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Factory } from "lucide-react";

const Auth = () => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFullName, setSignupFullName] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(loginEmail, loginPassword);
      
      if (error) {
        toast({
          title: "Ошибка входа",
          description: error.message === "Invalid login credentials" 
            ? "Неверный email или пароль" 
            : error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Успешный вход",
          description: "Добро пожаловать в ERP систему!",
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Произошла непредвиденная ошибка",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return "Пароль должен содержать минимум 8 символов";
    }
    if (!/[A-ZА-ЯЁ]/.test(password)) {
      return "Пароль должен содержать хотя бы одну заглавную букву";
    }
    if (!/[a-zа-яё]/.test(password)) {
      return "Пароль должен содержать хотя бы одну строчную букву";
    }
    if (!/[0-9]/.test(password)) {
      return "Пароль должен содержать хотя бы одну цифру";
    }
    return null;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const passwordError = validatePassword(signupPassword);
    if (passwordError) {
      toast({
        title: "Слабый пароль",
        description: passwordError,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { error } = await signUp(signupEmail, signupPassword, signupFullName);
      
      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Пользователь уже существует",
            description: "Этот email уже зарегистрирован. Попробуйте войти.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Ошибка регистрации",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Регистрация успешна!",
          description: "Ваш аккаунт создан. Добро пожаловать!",
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Произошла непредвиденная ошибка",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center">
            <Factory className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">ERP Система</CardTitle>
          <CardDescription>
            Управление производством и складом
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Вход</TabsTrigger>
              <TabsTrigger value="signup">Регистрация</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Пароль</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-primary-glow"
                  disabled={loading}
                >
                  {loading ? "Вход..." : "Войти"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Полное имя</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Иванов Иван"
                    value={signupFullName}
                    onChange={(e) => setSignupFullName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Пароль</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={8}
                  />
                  <div className="space-y-1 text-xs">
                    <p className={signupPassword.length >= 8 ? "text-green-600" : "text-muted-foreground"}>
                      {signupPassword.length >= 8 ? "✓" : "○"} Минимум 8 символов
                    </p>
                    <p className={/[A-ZА-ЯЁ]/.test(signupPassword) ? "text-green-600" : "text-muted-foreground"}>
                      {/[A-ZА-ЯЁ]/.test(signupPassword) ? "✓" : "○"} Заглавная буква
                    </p>
                    <p className={/[a-zа-яё]/.test(signupPassword) ? "text-green-600" : "text-muted-foreground"}>
                      {/[a-zа-яё]/.test(signupPassword) ? "✓" : "○"} Строчная буква
                    </p>
                    <p className={/[0-9]/.test(signupPassword) ? "text-green-600" : "text-muted-foreground"}>
                      {/[0-9]/.test(signupPassword) ? "✓" : "○"} Цифра
                    </p>
                  </div>
                </div>
                <Button
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-primary-glow"
                  disabled={loading}
                >
                  {loading ? "Регистрация..." : "Зарегистрироваться"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
