import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRoles: string[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    let tokenRefreshErrorCount = 0;
    const MAX_REFRESH_ERRORS = 3;

    // Check for existing session first
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      
      if (error) {
        console.error("Session error:", error);
        setLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRoles(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log("Auth state change event:", event, "Session:", session ? "exists" : "null");
        
        // Handle token refresh errors with retry logic
        if (event === "TOKEN_REFRESHED") {
          if (!session) {
            tokenRefreshErrorCount++;
            console.error(`Token refresh failed (attempt ${tokenRefreshErrorCount}/${MAX_REFRESH_ERRORS})`);
            
            // Only sign out after multiple consecutive failures
            if (tokenRefreshErrorCount >= MAX_REFRESH_ERRORS) {
              console.error("Max token refresh errors reached, signing out");
              toast({
                title: "Ошибка аутентификации",
                description: "Не удалось обновить сессию. Пожалуйста, войдите снова.",
                variant: "destructive",
              });
              setSession(null);
              setUser(null);
              setUserRoles([]);
              setLoading(false);
              tokenRefreshErrorCount = 0;
            } else {
              // Don't sign out yet, just log the error
              console.warn("Token refresh failed but keeping current session");
            }
            return;
          } else {
            // Reset error count on successful refresh
            tokenRefreshErrorCount = 0;
          }
        }
        
        // Handle explicit sign out
        if (event === "SIGNED_OUT") {
          console.log("User signed out explicitly");
          setSession(null);
          setUser(null);
          setUserRoles([]);
          setLoading(false);
          tokenRefreshErrorCount = 0;
          return;
        }
        
        // Update session state
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer Supabase calls with setTimeout to prevent deadlock
          setTimeout(() => {
            fetchUserRoles(session.user.id);
          }, 0);
        } else {
          setUserRoles([]);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      
      if (error) {
        console.error("Error fetching user roles:", error);
        setUserRoles([]);
        return;
      }
      
      setUserRoles(data?.map(r => r.role) || []);
    } catch (error) {
      console.error("Error in fetchUserRoles:", error);
      setUserRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error) {
      navigate("/");
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    if (!error) {
      navigate("/");
    }
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserRoles([]);
    navigate("/auth");
  };

  const hasRole = (role: string) => {
    return userRoles.includes(role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRoles,
        loading,
        signIn,
        signUp,
        signOut,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
