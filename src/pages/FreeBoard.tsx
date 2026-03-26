import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  BOARD,
  COMMENTS_LIKES,
  COMMENTS,
  POST_LIKES,
  USER_MAIN,
} from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  MessageSquareText,
  Plus,
  ArrowLeft,
  Pencil,
  Trash2,
  Heart,
} from "lucide-react";

const FREE_BOARD_CODES = ["FREE_BOARD", "FREE"];
const POSTS_PER_PAGE = 10;

const FreeBoard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isWriteMode, setIsWriteMode] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BOARD | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [replyTargetCommentId, setReplyTargetCommentId] = useState<
    number | null
  >(null);
  const [replyInput, setReplyInput] = useState("");

  const [editForm, setEditForm] = useState({
    title: "",
    content: "",
  });

  const [form, setForm] = useState({
    title: "",
    content: "",
    isAnonymous: false,
    isPinned: false,
  });

  const canPinPost = useMemo(() => {
    if (!user) return false;
    return (
      user.position === "0" ||
      user.position === "1" ||
      user.position === "관리자" ||
      user.position === "회장"
    );
  }, [user]);

  const { data: posts = [] } = useQuery<BOARD[], Error>({
    queryKey: ["free_board_posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("BOARD")
        .select("*")
        .in("BOARD_CODE", FREE_BOARD_CODES)
        .eq("IS_DELETED", false)
        .order("IS_PINNED", { ascending: false })
        .order("CREATED_AT", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const postIds = useMemo(() => posts.map((post) => post.ID), [posts]);
  const postIdsKey = useMemo(() => postIds.join(","), [postIds]);

  const { data: comments = [] } = useQuery<COMMENTS[], Error>({
    queryKey: ["free_board_comments", selectedPost?.ID],
    enabled: Boolean(selectedPost?.ID),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("COMMENTS")
        .select("*")
        .eq("POST_ID", selectedPost!.ID)
        .order("CREATED_AT", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const commentIds = useMemo(
    () => comments.map((comment) => comment.ID),
    [comments],
  );
  const commentIdsKey = useMemo(() => commentIds.join(","), [commentIds]);

  const { data: allCommentsForCount = [] } = useQuery<
    Pick<COMMENTS, "POST_ID">[],
    Error
  >({
    queryKey: ["free_board_comment_counts", postIdsKey],
    enabled: postIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("COMMENTS")
        .select("POST_ID")
        .in("POST_ID", postIds);

      if (error) throw error;
      return data || [];
    },
  });

  const { data: postLikes = [] } = useQuery<POST_LIKES[], Error>({
    queryKey: ["free_board_post_likes", postIdsKey],
    enabled: postIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("POST_LIKES")
        .select("*")
        .in("POST_ID", postIds);

      if (error) throw error;
      return data || [];
    },
  });

  const { data: commentLikes = [] } = useQuery<COMMENTS_LIKES[], Error>({
    queryKey: ["free_board_COMMENTS_LIKES", selectedPost?.ID, commentIdsKey],
    enabled: commentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("COMMENTS_LIKES")
        .select("*")
        .in("COMMENT_ID", commentIds);

      if (error) throw error;
      return data || [];
    },
  });

  const userCodes = useMemo(() => {
    return Array.from(
      new Set(
        [
          ...posts.map((post) => post.USER_CODE),
          ...comments.map((comment) => comment.USER_CODE),
        ].filter(Boolean),
      ),
    );
  }, [posts, comments]);

  const userCodesKey = useMemo(() => userCodes.join(","), [userCodes]);

  const { data: users = [] } = useQuery<
    Pick<USER_MAIN, "USER_CODE" | "NAME">[],
    Error
  >({
    queryKey: ["free_board_users", userCodesKey],
    enabled: userCodes.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("USER_MAIN")
        .select("USER_CODE, NAME")
        .in("USER_CODE", userCodes);

      if (error) throw error;
      return data || [];
    },
  });

  const userNameMap = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((item) => {
      map.set(item.USER_CODE, item.NAME);
    });
    return map;
  }, [users]);

  const commentCountMap = useMemo(() => {
    const map = new Map<number, number>();
    allCommentsForCount.forEach((row) => {
      map.set(row.POST_ID, (map.get(row.POST_ID) || 0) + 1);
    });
    return map;
  }, [allCommentsForCount]);

  const postLikeCountMap = useMemo(() => {
    const map = new Map<number, number>();
    postLikes.forEach((like) => {
      if (like.IS_LIKE) {
        map.set(like.POST_ID, (map.get(like.POST_ID) || 0) + 1);
      }
    });
    return map;
  }, [postLikes]);

  const likedPostSet = useMemo(() => {
    const me = user?.USER_CODE;
    return new Set(
      postLikes
        .filter((like) => like.USER_CODE === me && like.IS_LIKE)
        .map((like) => Number(like.POST_ID)),
    );
  }, [postLikes, user?.USER_CODE]);

  const commentLikeCountMap = useMemo(() => {
    const map = new Map<number, number>();
    commentLikes.forEach((like) => {
      if (like.IS_LIKE) {
        map.set(like.COMMENT_ID, (map.get(like.COMMENT_ID) || 0) + 1);
      }
    });
    return map;
  }, [commentLikes]);

  const likedCommentSet = useMemo(() => {
    const me = user?.USER_CODE;
    return new Set(
      commentLikes
        .filter((like) => like.USER_CODE === me && like.IS_LIKE)
        .map((like) => Number(like.COMMENT_ID)),
    );
  }, [commentLikes, user?.USER_CODE]);

  const addPostMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      content: string;
      isAnonymous: boolean;
      isPinned: boolean;
    }) => {
      const now = new Date().toISOString();
      const newPost = {
        BOARD_CODE: "FREE_BOARD",
        USER_CODE: user?.USER_CODE,
        CATEGORY: "자유게시판",
        TITLE: payload.title,
        CONTENT: payload.content,
        VIEW: 0,
        IS_DELETED: false,
        IS_PINNED: payload.isPinned,
        IS_ANNONYMOUS: payload.isAnonymous,
        CREATED_AT: now,
        UPDATED_AT: now,
      };

      const { error } = await (supabase as any).from("BOARD").insert([newPost]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["free_board_posts"] });
      setForm({ title: "", content: "", isAnonymous: false, isPinned: false });
      setIsWriteMode(false);
      toast({
        title: "글 등록 완료",
        description: "자유게시판에 글이 등록되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "글 등록 실패",
        description: `등록 중 오류가 발생했습니다: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  const increaseViewMutation = useMutation({
    mutationFn: async (post: BOARD) => {
      const { error } = await (supabase as any)
        .from("BOARD")
        .update({ VIEW: (post.VIEW || 0) + 1 })
        .eq("ID", post.ID);

      if (error) throw error;
    },
    onSuccess: (_, post) => {
      setSelectedPost((prev) =>
        prev && prev.ID === post.ID
          ? { ...prev, VIEW: (prev.VIEW || 0) + 1 }
          : prev,
      );
      queryClient.invalidateQueries({ queryKey: ["free_board_posts"] });
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: async (payload: {
      postId: number;
      title: string;
      content: string;
    }) => {
      if (!user?.USER_CODE) {
        throw new Error("사용자 정보가 없습니다.");
      }

      const { error } = await (supabase as any)
        .from("BOARD")
        .update({
          TITLE: payload.title,
          CONTENT: payload.content,
          UPDATED_AT: new Date().toISOString(),
        })
        .eq("ID", payload.postId)
        .eq("USER_CODE", user.USER_CODE);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["free_board_posts"] });
      setSelectedPost((prev) =>
        prev
          ? {
              ...prev,
              TITLE: editForm.title,
              CONTENT: editForm.content,
              UPDATED_AT: new Date().toISOString(),
            }
          : prev,
      );
      setIsEditMode(false);
      toast({
        title: "글 수정 완료",
        description: "게시글이 수정되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "글 수정 실패",
        description: `수정 중 오류가 발생했습니다: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      if (!user?.USER_CODE) {
        throw new Error("사용자 정보가 없습니다.");
      }

      const { data: targetPost, error: targetPostError } = await supabase
        .from("BOARD")
        .select("ID")
        .eq("ID", postId)
        .eq("USER_CODE", user.USER_CODE)
        .maybeSingle();
      if (targetPostError) throw targetPostError;
      if (!targetPost) {
        throw new Error("본인이 작성한 게시글만 삭제할 수 있습니다.");
      }

      const { data: commentRows, error: commentSelectError } = await supabase
        .from("COMMENTS")
        .select("ID")
        .eq("POST_ID", postId);
      if (commentSelectError) throw commentSelectError;

      const commentIdsToDelete = (commentRows || []).map((row: any) => row.ID);
      if (commentIdsToDelete.length > 0) {
        const { error: commentLikeError } = await supabase
          .from("COMMENTS_LIKES")
          .delete()
          .in("COMMENT_ID", commentIdsToDelete);
        if (commentLikeError) throw commentLikeError;
      }

      const { error: commentDeleteError } = await supabase
        .from("COMMENTS")
        .delete()
        .eq("POST_ID", postId);
      if (commentDeleteError) throw commentDeleteError;

      const { error: postLikeError } = await supabase
        .from("POST_LIKES")
        .delete()
        .eq("POST_ID", postId);
      if (postLikeError) throw postLikeError;

      const { error } = await supabase
        .from("BOARD")
        .delete()
        .eq("ID", postId)
        .eq("USER_CODE", user.USER_CODE);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["free_board_posts"] });
      queryClient.invalidateQueries({
        queryKey: ["free_board_comment_counts"],
      });
      queryClient.invalidateQueries({ queryKey: ["free_board_post_likes"] });
      setSelectedPost(null);
      setIsEditMode(false);
      toast({
        title: "글 삭제 완료",
        description: "게시글이 삭제되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "글 삭제 실패",
        description: `삭제 중 오류가 발생했습니다: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (payload: {
      postId: number;
      content: string;
      parentId?: number;
    }) => {
      const { error } = await (supabase as any).from("COMMENTS").insert([
        {
          POST_ID: payload.postId,
          USER_CODE: user?.USER_CODE,
          PARENT_ID: payload.parentId ?? 0,
          CONTENT: payload.content,
          CREATED_AT: new Date().toISOString(),
        },
      ]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["free_board_comments", selectedPost?.ID],
      });
      queryClient.invalidateQueries({
        queryKey: ["free_board_comment_counts"],
      });
      setCommentInput("");
      setReplyTargetCommentId(null);
      setReplyInput("");
      toast({
        title: "댓글 등록 완료",
        description: "댓글이 등록되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "댓글 등록 실패",
        description: `댓글 등록 중 오류가 발생했습니다: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async (payload: { commentId: number; content: string }) => {
      if (!user?.USER_CODE) {
        throw new Error("사용자 정보가 없습니다.");
      }

      const { error } = await (supabase as any)
        .from("COMMENTS")
        .update({ CONTENT: payload.content })
        .eq("ID", payload.commentId)
        .eq("USER_CODE", user.USER_CODE);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["free_board_comments", selectedPost?.ID],
      });
      setEditingCommentId(null);
      setEditingCommentContent("");
      toast({
        title: "댓글 수정 완료",
        description: "댓글이 수정되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "댓글 수정 실패",
        description: `댓글 수정 중 오류가 발생했습니다: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (payload: { commentId: number }) => {
      if (!user?.USER_CODE) {
        throw new Error("사용자 정보가 없습니다.");
      }

      const { data: targetComment, error: targetCommentError } = await supabase
        .from("COMMENTS")
        .select("ID")
        .eq("ID", payload.commentId)
        .eq("USER_CODE", user.USER_CODE)
        .maybeSingle();
      if (targetCommentError) throw targetCommentError;
      if (!targetComment) {
        throw new Error("본인이 작성한 댓글만 삭제할 수 있습니다.");
      }

      const { error: likeError } = await supabase
        .from("COMMENTS_LIKES")
        .delete()
        .eq("COMMENT_ID", payload.commentId);
      if (likeError) throw likeError;

      const { error } = await supabase
        .from("COMMENTS")
        .delete()
        .eq("ID", payload.commentId)
        .eq("USER_CODE", user.USER_CODE);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["free_board_comments", selectedPost?.ID],
      });
      queryClient.invalidateQueries({
        queryKey: ["free_board_comment_counts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["free_board_COMMENTS_LIKES"],
      });
      toast({
        title: "댓글 삭제 완료",
        description: "댓글이 삭제되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "댓글 삭제 실패",
        description: `댓글 삭제 중 오류가 발생했습니다: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  const likePostMutation = useMutation({
    mutationFn: async (payload: { postId: number; isLiked: boolean }) => {
      if (!user?.USER_CODE) {
        throw new Error("사용자 정보가 없습니다.");
      }

      const { error } = await (supabase as any).from("POST_LIKES").upsert(
        [
          {
            POST_ID: payload.postId,
            USER_CODE: user.USER_CODE,
            IS_LIKE: !payload.isLiked,
          },
        ],
        { onConflict: "POST_ID,USER_CODE" },
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["free_board_post_likes"] });
    },
    onError: (error) => {
      toast({
        title: "좋아요 실패",
        description: `게시글 좋아요 처리 중 오류가 발생했습니다: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  const likeCommentMutation = useMutation({
    mutationFn: async (payload: { commentId: number; isLiked: boolean }) => {
      if (!user?.USER_CODE) {
        throw new Error("사용자 정보가 없습니다.");
      }

      const { data: existingRows, error: findError } = await (supabase as any)
        .from("COMMENTS_LIKES")
        .select("COMMENT_ID")
        .eq("COMMENT_ID", payload.commentId)
        .eq("USER_CODE", user.USER_CODE);
      if (findError) throw findError;

      const nextLikeState = !payload.isLiked;

      if ((existingRows || []).length > 0) {
        const { error: updateError } = await (supabase as any)
          .from("COMMENTS_LIKES")
          .update({ IS_LIKE: nextLikeState })
          .eq("COMMENT_ID", payload.commentId)
          .eq("USER_CODE", user.USER_CODE);
        if (updateError) throw updateError;
        return;
      }

      const { error: insertError } = await (supabase as any)
        .from("COMMENTS_LIKES")
        .insert([
          {
            COMMENT_ID: payload.commentId,
            USER_CODE: user.USER_CODE,
            IS_LIKE: true,
          },
        ]);
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["free_board_COMMENTS_LIKES"],
      });
    },
    onError: (error) => {
      toast({
        title: "좋아요 실패",
        description: `댓글 좋아요 처리 중 오류가 발생했습니다: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  const handleWrite = () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({
        title: "입력 필요",
        description: "제목과 내용을 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    addPostMutation.mutate({
      title: form.title.trim(),
      content: form.content.trim(),
      isAnonymous: form.isAnonymous,
      isPinned: canPinPost ? form.isPinned : false,
    });
  };

  const handleWriteCancel = () => {
    setForm({ title: "", content: "", isAnonymous: false, isPinned: false });
    setIsWriteMode(false);
  };

  const getPostAuthorName = (post: BOARD) => {
    if (post.IS_ANNONYMOUS) return "익명";
    return userNameMap.get(post.USER_CODE) || "사용자";
  };

  const openPostDetail = (post: BOARD) => {
    setSelectedPost(post);
    setIsEditMode(false);
    setEditingCommentId(null);
    setEditingCommentContent("");
    setReplyTargetCommentId(null);
    setReplyInput("");
    increaseViewMutation.mutate(post);
  };

  const handleEditStart = () => {
    if (!selectedPost) return;
    if (user?.USER_CODE !== selectedPost.USER_CODE) {
      toast({
        title: "권한 없음",
        description: "본인이 작성한 게시글만 수정할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }

    setEditForm({
      title: selectedPost.TITLE,
      content: selectedPost.CONTENT,
    });
    setIsEditMode(true);
  };

  const handleEditSave = () => {
    if (!selectedPost || !editForm.title.trim() || !editForm.content.trim()) {
      toast({
        title: "입력 필요",
        description: "제목과 내용을 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    updatePostMutation.mutate({
      postId: selectedPost.ID,
      title: editForm.title.trim(),
      content: editForm.content.trim(),
    });
  };

  const handleDelete = () => {
    if (!selectedPost) return;
    if (user?.USER_CODE !== selectedPost.USER_CODE) {
      toast({
        title: "권한 없음",
        description: "본인이 작성한 게시글만 삭제할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("정말 삭제하시겠습니까?")) return;
    deletePostMutation.mutate(selectedPost.ID);
  };

  const handleAddComment = () => {
    if (!selectedPost || !commentInput.trim()) {
      toast({
        title: "입력 필요",
        description: "댓글 내용을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    addCommentMutation.mutate({
      postId: selectedPost.ID,
      content: commentInput.trim(),
      parentId: 0,
    });
  };

  const handleReplyStart = (comment: COMMENTS) => {
    const rootCommentId =
      comment.PARENT_ID === 0 ? comment.ID : comment.PARENT_ID;
    setReplyTargetCommentId(rootCommentId);
    setReplyInput("");
  };

  const handleReplyCancel = () => {
    setReplyTargetCommentId(null);
    setReplyInput("");
  };

  const handleAddReply = (parentCommentId: number) => {
    if (!selectedPost || !replyInput.trim()) {
      toast({
        title: "입력 필요",
        description: "대댓글 내용을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    addCommentMutation.mutate({
      postId: selectedPost.ID,
      content: replyInput.trim(),
      parentId: parentCommentId,
    });
  };

  const handleCommentEditStart = (comment: COMMENTS) => {
    if (user?.USER_CODE !== comment.USER_CODE) {
      toast({
        title: "권한 없음",
        description: "본인이 작성한 댓글만 수정할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }

    setEditingCommentId(comment.ID);
    setEditingCommentContent(comment.CONTENT);
  };

  const handleCommentEditCancel = () => {
    setEditingCommentId(null);
    setEditingCommentContent("");
  };

  const handleCommentEditSave = (comment: COMMENTS) => {
    if (!editingCommentContent.trim()) {
      toast({
        title: "입력 필요",
        description: "댓글 내용을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    updateCommentMutation.mutate({
      commentId: comment.ID,
      content: editingCommentContent.trim(),
    });
  };

  const handleCommentDelete = (comment: COMMENTS) => {
    if (user?.USER_CODE !== comment.USER_CODE) {
      toast({
        title: "권한 없음",
        description: "본인이 작성한 댓글만 삭제할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    deleteCommentMutation.mutate({ commentId: comment.ID });
  };

  const handleLikePost = (post: BOARD) => {
    likePostMutation.mutate({
      postId: post.ID,
      isLiked: isPostLikedByMe(post.ID),
    });
  };

  const handleLikeComment = (comment: COMMENTS) => {
    likeCommentMutation.mutate({
      commentId: comment.ID,
      isLiked: isCommentLikedByMe(comment.ID),
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateOnly = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const filteredPosts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return posts;

    return posts.filter((post) => {
      const title = (post.TITLE || "").toLowerCase();
      const content = (post.CONTENT || "").toLowerCase();
      const author = (
        post.IS_ANNONYMOUS ? "익명" : userNameMap.get(post.USER_CODE) || ""
      ).toLowerCase();
      return (
        title.includes(keyword) ||
        content.includes(keyword) ||
        author.includes(keyword)
      );
    });
  }, [posts, searchText, userNameMap]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPosts.length / POSTS_PER_PAGE),
  );

  const pagedPosts = useMemo(() => {
    const start = (currentPage - 1) * POSTS_PER_PAGE;
    return filteredPosts.slice(start, start + POSTS_PER_PAGE);
  }, [filteredPosts, currentPage]);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    return pages;
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const postCountText = useMemo(() => {
    if (!searchText.trim()) return `총 ${posts.length}건`;
    return `검색 ${filteredPosts.length}건 (전체 ${posts.length}건)`;
  }, [posts.length, filteredPosts.length, searchText]);

  const canEditDelete =
    !!selectedPost && user?.USER_CODE === selectedPost.USER_CODE;

  const canManageComment = (comment: COMMENTS) => {
    return user?.USER_CODE === comment.USER_CODE;
  };

  const isPostLikedByMe = (postId: number) => likedPostSet.has(postId);
  const isCommentLikedByMe = (commentId: number) =>
    likedCommentSet.has(commentId);

  const rootComments = useMemo(
    () => comments.filter((comment) => comment.PARENT_ID === 0),
    [comments],
  );

  const replyMap = useMemo(() => {
    const map = new Map<number, COMMENTS[]>();
    comments.forEach((comment) => {
      if (comment.PARENT_ID !== 0) {
        const current = map.get(comment.PARENT_ID) || [];
        current.push(comment);
        map.set(comment.PARENT_ID, current);
      }
    });
    return map;
  }, [comments]);

  if (!user) return null;

  if (isWriteMode) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleWriteCancel}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          목록으로
        </Button>

        <div className="card-classic p-6">
          <h2 className="font-heading text-xl font-bold mb-4">
            자유게시판 글쓰기
          </h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>제목</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="제목을 입력하세요"
              />
            </div>
            <div className="flex items-center gap-5 flex-wrap">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="freeboard-anonymous"
                  checked={form.isAnonymous}
                  onCheckedChange={(checked) =>
                    setForm({
                      ...form,
                      isAnonymous: checked === true,
                    })
                  }
                />
                <Label htmlFor="freeboard-anonymous" className="cursor-pointer">
                  익명으로 작성
                </Label>
              </div>
              {canPinPost && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="freeboard-pinned"
                    checked={form.isPinned}
                    onCheckedChange={(checked) =>
                      setForm({
                        ...form,
                        isPinned: checked === true,
                      })
                    }
                  />
                  <Label htmlFor="freeboard-pinned" className="cursor-pointer">
                    상단고정
                  </Label>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>내용</Label>
              <RichTextEditor
                value={form.content}
                onChange={(html) => setForm({ ...form, content: html })}
                placeholder="내용을 입력하세요"
                minHeight="260px"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleWrite}
                className="flex-1"
                disabled={addPostMutation.isPending}
              >
                {addPostMutation.isPending ? "등록 중..." : "등록"}
              </Button>
              <Button
                variant="outline"
                onClick={handleWriteCancel}
                className="flex-1"
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedPost && isEditMode) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setIsEditMode(false)}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          취소
        </Button>
        <div className="card-classic p-6">
          <h2 className="font-heading text-xl font-bold mb-4">게시글 수정</h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>제목</Label>
              <Input
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
                placeholder="제목을 입력하세요"
              />
            </div>
            <div className="space-y-1.5">
              <Label>내용</Label>
              <RichTextEditor
                value={editForm.content}
                onChange={(html) => setEditForm({ ...editForm, content: html })}
                placeholder="내용을 입력하세요"
                minHeight="220px"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleEditSave}
                className="flex-1"
                disabled={updatePostMutation.isPending}
              >
                {updatePostMutation.isPending ? "저장 중..." : "저장"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditMode(false)}
                className="flex-1"
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedPost) {
    const selectedPostAuthor = getPostAuthorName(selectedPost);
    const selectedPostLikeCount = postLikeCountMap.get(selectedPost.ID) || 0;
    const selectedPostLikedByMe = isPostLikedByMe(selectedPost.ID);

    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedPost(null)}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          목록으로
        </Button>

        <div className="card-classic p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h2 className="font-heading text-xl font-bold mb-2">
                {selectedPost.TITLE}
              </h2>
              <p className="text-xs text-muted-foreground">
                {selectedPostAuthor} · {formatDateTime(selectedPost.CREATED_AT)}{" "}
                · 조회 {selectedPost.VIEW}
              </p>
              <div className="mt-2">
                <Button
                  type="button"
                  size="sm"
                  variant={selectedPostLikedByMe ? "default" : "outline"}
                  className="h-8 px-2.5"
                  onClick={() => handleLikePost(selectedPost)}
                  disabled={likePostMutation.isPending}
                >
                  <Heart
                    className={`w-3.5 h-3.5 mr-1.5 ${selectedPostLikedByMe ? "fill-current" : ""}`}
                  />
                  {selectedPostLikedByMe ? "취소" : ""} {selectedPostLikeCount}
                </Button>
              </div>
            </div>

            {canEditDelete && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleEditStart}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDelete}
                  disabled={deletePostMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <hr className="my-4" />
          <div
            className="prose prose-sm max-w-none text-sm leading-relaxed mb-6"
            dangerouslySetInnerHTML={{ __html: selectedPost.CONTENT }}
          />

          <div className="space-y-3 border-t border-border pt-4">
            <h3 className="font-heading font-semibold text-sm">댓글</h3>
            <div className="space-y-2">
              <Textarea
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="댓글을 입력하세요"
                className="min-h-[100px]"
              />
              <Button
                onClick={handleAddComment}
                disabled={addCommentMutation.isPending}
              >
                {addCommentMutation.isPending ? "등록 중..." : "댓글 등록"}
              </Button>
            </div>

            <div className="space-y-2 pt-1">
              {rootComments.map((comment) => {
                const commentAuthor =
                  userNameMap.get(comment.USER_CODE) || "사용자";
                const commentLikeCount =
                  commentLikeCountMap.get(comment.ID) || 0;
                const commentLikedByMe = isCommentLikedByMe(comment.ID);
                const replies = replyMap.get(comment.ID) || [];

                return (
                  <div key={comment.ID} className="space-y-2">
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs text-muted-foreground">
                            {commentAuthor} ·{" "}
                            {formatDateTime(comment.CREATED_AT)}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1 text-xs text-muted-foreground"
                            onClick={() => handleReplyStart(comment)}
                          >
                            대댓글 달기
                          </Button>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-7 px-2 text-xs ${commentLikedByMe ? "text-rose-600 hover:text-rose-600" : ""}`}
                            onClick={() => handleLikeComment(comment)}
                            disabled={likeCommentMutation.isPending}
                          >
                            <Heart
                              className={`w-3 h-3 mr-1 ${commentLikedByMe ? "fill-current" : ""}`}
                            />
                            {commentLikeCount}
                          </Button>

                          {canManageComment(comment) && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleCommentEditStart(comment)}
                              >
                                수정
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-destructive"
                                onClick={() => handleCommentDelete(comment)}
                                disabled={deleteCommentMutation.isPending}
                              >
                                삭제
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {editingCommentId === comment.ID ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingCommentContent}
                            onChange={(e) =>
                              setEditingCommentContent(e.target.value)
                            }
                            className="min-h-[90px]"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleCommentEditSave(comment)}
                              disabled={updateCommentMutation.isPending}
                            >
                              {updateCommentMutation.isPending
                                ? "저장 중..."
                                : "저장"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCommentEditCancel}
                            >
                              취소
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">
                          {comment.CONTENT}
                        </p>
                      )}
                    </div>

                    {replies.map((reply) => {
                      const replyAuthor =
                        userNameMap.get(reply.USER_CODE) || "사용자";
                      const replyLikeCount =
                        commentLikeCountMap.get(reply.ID) || 0;
                      const replyLikedByMe = isCommentLikedByMe(reply.ID);

                      return (
                        <div
                          key={reply.ID}
                          className="ml-4 p-3 rounded-lg border border-border bg-background"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {replyAuthor} ·{" "}
                                {formatDateTime(reply.CREATED_AT)}
                              </p>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-7 px-2 text-xs ${replyLikedByMe ? "text-rose-600 hover:text-rose-600" : ""}`}
                                onClick={() => handleLikeComment(reply)}
                                disabled={likeCommentMutation.isPending}
                              >
                                <Heart
                                  className={`w-3 h-3 mr-1 ${replyLikedByMe ? "fill-current" : ""}`}
                                />
                                {replyLikeCount}
                              </Button>

                              {canManageComment(reply) && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() =>
                                      handleCommentEditStart(reply)
                                    }
                                  >
                                    수정
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-destructive"
                                    onClick={() => handleCommentDelete(reply)}
                                    disabled={deleteCommentMutation.isPending}
                                  >
                                    삭제
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {editingCommentId === reply.ID ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingCommentContent}
                                onChange={(e) =>
                                  setEditingCommentContent(e.target.value)
                                }
                                className="min-h-[90px]"
                              />
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleCommentEditSave(reply)}
                                  disabled={updateCommentMutation.isPending}
                                >
                                  {updateCommentMutation.isPending
                                    ? "저장 중..."
                                    : "저장"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCommentEditCancel}
                                >
                                  취소
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">
                              {reply.CONTENT}
                            </p>
                          )}
                        </div>
                      );
                    })}

                    {replyTargetCommentId === comment.ID && (
                      <div className="ml-4 space-y-2 rounded-lg border border-border bg-background p-3">
                        <Textarea
                          value={replyInput}
                          onChange={(e) => setReplyInput(e.target.value)}
                          placeholder="대댓글을 입력하세요"
                          className="min-h-[90px]"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAddReply(comment.ID)}
                            disabled={addCommentMutation.isPending}
                          >
                            {addCommentMutation.isPending
                              ? "등록 중..."
                              : "등록"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleReplyCancel}
                          >
                            취소
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {rootComments.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">
                  아직 댓글이 없습니다.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{postCountText}</p>
          <div className="w-full sm:w-72">
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="제목, 내용, 작성자 검색"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button size="sm" onClick={() => setIsWriteMode(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            글쓰기
          </Button>
        </div>
      </div>

      <div className="card-classic overflow-hidden">
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="w-20 py-3 px-3 text-center text-muted-foreground font-medium">
                  번호
                </th>
                <th className="py-3 px-3 text-left text-muted-foreground font-medium">
                  제목
                </th>
                <th className="w-28 py-3 px-3 text-center text-muted-foreground font-medium">
                  작성자
                </th>
                <th className="w-28 py-3 px-3 text-center text-muted-foreground font-medium">
                  작성일
                </th>
                <th className="w-20 py-3 px-3 text-center text-muted-foreground font-medium">
                  조회
                </th>
                <th className="w-20 py-3 px-3 text-center text-muted-foreground font-medium">
                  추천
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedPosts.map((post, index) => {
                const authorName = getPostAuthorName(post);
                const commentCount = commentCountMap.get(post.ID) || 0;
                const likeCount = postLikeCountMap.get(post.ID) || 0;
                const rowNo =
                  filteredPosts.length -
                  ((currentPage - 1) * POSTS_PER_PAGE + index);

                return (
                  <tr
                    key={post.ID}
                    className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-3 text-center text-muted-foreground">
                      {post.IS_PINNED ? "공지" : rowNo}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => openPostDetail(post)}
                        className="inline-flex items-center gap-2 text-left hover:underline"
                      >
                        {post.IS_PINNED && (
                          <span className="inline-flex items-center rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[11px] font-medium">
                            고정
                          </span>
                        )}
                        <span className="font-medium break-all">
                          {post.TITLE}
                        </span>
                        {commentCount > 0 && (
                          <span className="text-primary text-xs font-medium">
                            [{commentCount}]
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-center text-muted-foreground">
                      {authorName}
                    </td>
                    <td className="py-3 px-3 text-center text-muted-foreground">
                      {formatDateOnly(post.CREATED_AT)}
                    </td>
                    <td className="py-3 px-3 text-center text-muted-foreground">
                      {post.VIEW}
                    </td>
                    <td className="py-3 px-3 text-center text-muted-foreground">
                      {likeCount}
                    </td>
                  </tr>
                );
              })}
              {pagedPosts.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    {searchText.trim()
                      ? "검색 결과가 없습니다."
                      : "아직 등록된 게시글이 없습니다."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="sm:hidden divide-y divide-border/70">
          {pagedPosts.map((post) => {
            const authorName = getPostAuthorName(post);
            const commentCount = commentCountMap.get(post.ID) || 0;
            const likeCount = postLikeCountMap.get(post.ID) || 0;

            return (
              <button
                type="button"
                key={post.ID}
                className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors"
                onClick={() => openPostDetail(post)}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {post.IS_PINNED && (
                    <span className="inline-flex items-center rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[11px] font-medium">
                      고정
                    </span>
                  )}
                  <p className="font-medium text-sm break-all">{post.TITLE}</p>
                  {commentCount > 0 && (
                    <span className="text-primary text-xs font-medium">
                      [{commentCount}]
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {authorName} · {formatDateOnly(post.CREATED_AT)} · 조회{" "}
                  {post.VIEW} · 추천 {likeCount}
                </p>
              </button>
            );
          })}

          {pagedPosts.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {searchText.trim()
                ? "검색 결과가 없습니다."
                : "아직 등록된 게시글이 없습니다."}
            </div>
          )}
        </div>
      </div>

      {filteredPosts.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            이전
          </Button>
          {pageNumbers.map((page) => (
            <Button
              key={page}
              size="sm"
              variant={page === currentPage ? "default" : "outline"}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
};

export default FreeBoard;
