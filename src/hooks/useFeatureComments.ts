import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface FeatureComment {
  id: string;
  feature_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
}

export const useFeatureComments = (featureId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["feature-comments", featureId],
    queryFn: async () => {
      let query = supabase
        .from("feature_comments")
        .select("*")
        .order("created_at", { ascending: true });

      if (featureId) {
        query = query.eq("feature_id", featureId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get user names from profiles
      const userIds = [...new Set((data || []).map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      return (data || []).map(comment => ({
        ...comment,
        user_name: profileMap.get(comment.user_id) || "Пользователь"
      })) as FeatureComment[];
    },
    enabled: !!featureId,
  });

  const { data: allComments = [] } = useQuery({
    queryKey: ["feature-comments-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_comments")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const addComment = useMutation({
    mutationFn: async ({ featureId, content }: { featureId: string; content: string }) => {
      if (!user) throw new Error("Необходима авторизация");

      const { data, error } = await supabase
        .from("feature_comments")
        .insert({
          feature_id: featureId,
          user_id: user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-comments"] });
      queryClient.invalidateQueries({ queryKey: ["feature-comments-all"] });
      toast.success("Комментарий добавлен");
    },
    onError: (error) => {
      toast.error("Ошибка добавления комментария: " + error.message);
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("feature_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-comments"] });
      queryClient.invalidateQueries({ queryKey: ["feature-comments-all"] });
      toast.success("Комментарий удалён");
    },
    onError: (error) => {
      toast.error("Ошибка удаления: " + error.message);
    },
  });

  const getCommentsCount = (featureId: string) => {
    return allComments.filter(c => c.feature_id === featureId).length;
  };

  return {
    comments,
    allComments,
    isLoading,
    addComment,
    deleteComment,
    getCommentsCount,
    user,
  };
};
