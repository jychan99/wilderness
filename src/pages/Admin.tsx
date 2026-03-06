import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { USER_MAIN, NOTIFICATION } from "@/types";
import { supabase } from "@/integrations/supabase/client";

type UserWithGrades = USER_MAIN & { MANAGE_GRADES: string[] };
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Trash2, Bell, ArrowLeft } from "lucide-react";

type ConfirmDialogState = {
  open: boolean;
  title: string;
  description: string;
  actionLabel: string;
  actionVariant?: "default" | "destructive";
  onConfirm: (() => void) | null;
};

const Admin = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showNotification, setShowNotification] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<NOTIFICATION | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: "",
    description: "",
    actionLabel: "확인",
    actionVariant: "default",
    onConfirm: null,
  });
  const [notificationForm, setNotificationForm] = useState({
    title: "",
    content: "",
  });
  const [editForm, setEditForm] = useState({
    title: "",
    content: "",
  });

  const codeToLabel = (code: string): string => {
    const codeMap: { [key: string]: string } = {
      K: "유치부",
      E: "초등부",
      E1: "초1",
      E2: "초2",
      E3: "초3",
      E4: "초4",
      E5: "초5",
      E6: "초6",
      M: "중등부",
      M1: "중1",
      M2: "중2",
      M3: "중3",
      H: "고등부",
      H1: "고1",
      H2: "고2",
      H3: "고3",
    };
    if (codeMap[code]) return codeMap[code];

    // 레가시 숫자 코드 지원
    const legacyMap: { [key: string]: string } = {
      "0": "모든학년",
      "1": "유치부",
      "2": "초등부",
      "3": "초1",
      "4": "초2",
      "5": "초3",
      "6": "초4",
      "7": "초5",
      "8": "초6",
      "9": "중등부",
      "10": "중1",
      "11": "중2",
      "12": "중3",
      "13": "고등부",
      "14": "고1",
      "15": "고2",
      "16": "고3",
    };
    return legacyMap[code] || code;
  };

  // 숫자를 직책으로 변환
  const numberToPosition = (num: number | string): string => {
    const numberMap: { [key: number]: string } = {
      0: "관리자",
      1: "회장",
      2: "부회장",
      3: "총무",
      4: "서기",
      5: "일반",
    };
    const numValue = typeof num === "string" ? parseInt(num) : num;
    return numberMap[numValue] || "일반";
  };

  // 사용자 목록 조회 (USER_MANAGE_GRADE와 조인)
  const { data: users = [] } = useQuery<UserWithGrades[], Error>({
    queryKey: ["usermain"],
    queryFn: async () => {
      const { data: userMainData, error: userMainError } = await supabase
        .from("USER_MAIN")
        .select("*");
      if (userMainError) throw userMainError;

      const { data: gradeData, error: gradeError } = await supabase
        .from("USER_MANAGE_GRADE")
        .select("*");
      if (gradeError) throw gradeError;

      // USER_MAIN과 USER_MANAGE_GRADE를 조인하여 다중 학년 배열로 변환
      const result = (userMainData || []).map((user: any) => {
        const grades = (gradeData || [])
          .filter((g: any) => g.USER_CODE === user.USER_CODE)
          .map((g: any) => {
            const raw = String(g.MANAGE_GRADE ?? "");
            return codeToLabel(raw);
          })
          .filter((grade: string) => grade && grade !== "모든학년");

        return {
          ...user,
          MANAGE_GRADES: Array.from(new Set(grades)),
        } as UserWithGrades;
      });
      return result;
    },
  });

  // 관리자만 필터링 (POSITION이 숫자 0)
  const admins = users.filter((u) => u.POSITION === 0);
  const pendingUsers = users.filter((u) => u.USE_YN !== true);

  // 관리자 공지사항 목록 조회
  const { data: notifications = [] } = useQuery<NOTIFICATION[], Error>({
    queryKey: ["notifications", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("NOTIFICATION")
        .select("*")
        .eq("POSITION", "0")
        .order("CREATED_AT", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // 사용자 삭제 mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (USER_CODE: string) => {
      // USER_MANAGE_GRADE 먼저 삭제
      const { error: gradeError } = await supabase
        .from("USER_MANAGE_GRADE")
        .delete()
        .eq("USER_CODE", USER_CODE);
      if (gradeError) throw gradeError;

      // USER_MAIN 삭제
      const { error: userError } = await supabase
        .from("USER_MAIN")
        .delete()
        .eq("USER_CODE", USER_CODE);
      if (userError) throw userError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usermain"] });
      toast({
        title: "사용자 삭제 완료",
        description: "사용자 계정을 삭제했습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "사용자 삭제 실패",
        description:
          "사용자 삭제 중 오류가 발생했습니다: " + (error as any).message,
        variant: "destructive",
      });
    },
  });

  const approveUserMutation = useMutation({
    mutationFn: async (userCode: string) => {
      const { error } = await (supabase as any)
        .from("USER_MAIN")
        .update({ USE_YN: true })
        .eq("USER_CODE", userCode);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usermain"] });
      toast({
        title: "사용자 승인 완료",
        description: "승인된 사용자는 이제 로그인할 수 있습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "사용자 승인 실패",
        description:
          "사용자 승인 중 오류가 발생했습니다: " + (error as any).message,
        variant: "destructive",
      });
    },
  });

  const rejectUserMutation = useMutation({
    mutationFn: async (userCode: string) => {
      const { error: gradeError } = await supabase
        .from("USER_MANAGE_GRADE")
        .delete()
        .eq("USER_CODE", userCode);
      if (gradeError) throw gradeError;

      const { error: userError } = await supabase
        .from("USER_MAIN")
        .delete()
        .eq("USER_CODE", userCode);
      if (userError) throw userError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usermain"] });
      toast({
        title: "사용자 거부 완료",
        description: "회원가입 요청을 거부했습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "사용자 거부 실패",
        description:
          "사용자 거부 중 오류가 발생했습니다: " + (error as any).message,
        variant: "destructive",
      });
    },
  });

  // 공지사항 추가 mutation
  const addNotificationMutation = useMutation({
    mutationFn: async (
      notification: Omit<NOTIFICATION, "ID" | "CREATED_AT">,
    ) => {
      const { error } = await (supabase as any)
        .from("NOTIFICATION")
        .insert([notification]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setNotificationForm({ title: "", content: "" });
      setShowNotification(false);
    },
    onError: (error) => {
      toast({
        title: "공지사항 추가 실패",
        description:
          "공지사항 추가 중 오류가 발생했습니다: " + (error as any).message,
        variant: "destructive",
      });
    },
  });

  // 공지사항 삭제 mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("NOTIFICATION")
        .delete()
        .eq("ID", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({
        title: "공지사항 삭제 완료",
        description: "공지사항을 삭제했습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "공지사항 삭제 실패",
        description:
          "공지사항 삭제 중 오류가 발생했습니다: " + (error as any).message,
        variant: "destructive",
      });
    },
  });

  // 공지사항 수정 mutation
  const updateNotificationMutation = useMutation({
    mutationFn: async (updatedNotification: NOTIFICATION) => {
      const { error } = await (supabase as any)
        .from("NOTIFICATION")
        .update({
          TITLE: updatedNotification.TITLE,
          CONTENT: updatedNotification.CONTENT,
        })
        .eq("ID", updatedNotification.ID);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setEditForm({ title: "", content: "" });
      setIsEditMode(false);
      setSelectedNotification(null);
    },
    onError: (error) => {
      toast({
        title: "공지사항 수정 실패",
        description:
          "공지사항 수정 중 오류가 발생했습니다: " + (error as any).message,
        variant: "destructive",
      });
    },
  });

  const openConfirmDialog = (config: Omit<ConfirmDialogState, "open">) => {
    setConfirmDialog({
      open: true,
      ...config,
    });
  };

  const handleDelete = (USER_CODE: string) => {
    openConfirmDialog({
      title: "사용자 삭제",
      description: "정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
      actionLabel: "삭제",
      actionVariant: "destructive",
      onConfirm: () => deleteUserMutation.mutate(USER_CODE),
    });
  };

  const handleApproveUser = (userCode: string) => {
    openConfirmDialog({
      title: "회원가입 승인",
      description:
        "해당 사용자를 승인하시겠습니까? 승인 후 로그인할 수 있습니다.",
      actionLabel: "승인",
      actionVariant: "default",
      onConfirm: () => approveUserMutation.mutate(userCode),
    });
  };

  const handleRejectUser = (userCode: string) => {
    openConfirmDialog({
      title: "회원가입 거부",
      description: "해당 사용자를 거부하고 삭제하시겠습니까?",
      actionLabel: "거부",
      actionVariant: "destructive",
      onConfirm: () => rejectUserMutation.mutate(userCode),
    });
  };

  const handleAddNotification = () => {
    if (!notificationForm.title || !notificationForm.content) {
      toast({
        title: "입력 필요",
        description: "제목과 내용을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    addNotificationMutation.mutate({
      TITLE: notificationForm.title,
      CONTENT: notificationForm.content,
      AUTHOR: "관리자",
      POSITION: "0",
    });
  };

  const handleDeleteNotification = (notificationId: string) => {
    openConfirmDialog({
      title: "공지사항 삭제",
      description: "정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
      actionLabel: "삭제",
      actionVariant: "destructive",
      onConfirm: () => deleteNotificationMutation.mutate(notificationId),
    });
  };

  const handleEditStart = (notification: NOTIFICATION) => {
    setSelectedNotification(notification);
    setEditForm({ title: notification.TITLE, content: notification.CONTENT });
    setIsEditMode(true);
  };

  const handleEditSave = () => {
    if (!editForm.title || !editForm.content || !selectedNotification) return;

    updateNotificationMutation.mutate({
      ...selectedNotification,
      TITLE: editForm.title,
      CONTENT: editForm.content,
    });
  };

  const handleEditCancel = () => {
    setIsEditMode(false);
    setSelectedNotification(null);
    setEditForm({ title: "", content: "" });
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

  // 수정 모드
  if (isEditMode && selectedNotification) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleEditCancel}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          취소
        </Button>
        <div className="card-classic p-6">
          <h2 className="font-heading text-xl font-bold mb-4">공지사항 수정</h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>제목</Label>
              <Input
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
                placeholder="공지사항 제목"
              />
            </div>
            <div className="space-y-1.5">
              <Label>내용</Label>
              <Textarea
                value={editForm.content}
                onChange={(e) =>
                  setEditForm({ ...editForm, content: e.target.value })
                }
                placeholder="공지사항 내용을 작성하세요"
                className="min-h-[200px]"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleEditSave} className="flex-1">
                저장
              </Button>
              <Button
                variant="outline"
                onClick={handleEditCancel}
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

  return (
    <div className="space-y-6">
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          setConfirmDialog((prev) => ({
            ...prev,
            open,
            ...(open ? {} : { onConfirm: null }),
          }));
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirmDialog.actionVariant === "destructive"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
              onClick={() => {
                confirmDialog.onConfirm?.();
                setConfirmDialog((prev) => ({
                  ...prev,
                  open: false,
                  onConfirm: null,
                }));
              }}
            >
              {confirmDialog.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">관리자 계정</p>
          <p className="text-sm text-muted-foreground">총 {admins.length}명</p>
        </div>
        <div className="space-y-2">
          {admins.map((u) => (
            <div
              key={u.USER_CODE}
              className="card-classic p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {u.NAME}{" "}
                    <span className="text-muted-foreground">
                      ({u.BAP_NAME})
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {numberToPosition(u.POSITION)} ·{" "}
                    {u.MANAGE_GRADES.length > 0
                      ? u.MANAGE_GRADES.length <= 2
                        ? u.MANAGE_GRADES.join(", ")
                        : `${u.MANAGE_GRADES.slice(0, 2).join(", ")} 외 ${u.MANAGE_GRADES.length - 2}개`
                      : "학년없음"}{" "}
                    · @{u.ID}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => handleDelete(u.USER_CODE)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          {admins.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              등록된 사용자가 없습니다.
            </div>
          )}
        </div>
      </div>
      {/* Separator */}
      <hr className="border-t border-border" />

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">가입 승인 대기</p>
          <p className="text-sm text-muted-foreground">
            총 {pendingUsers.length}명
          </p>
        </div>
        <div className="space-y-2">
          {pendingUsers.map((u) => (
            <div
              key={u.USER_CODE}
              className="card-classic p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {u.NAME}{" "}
                    <span className="text-muted-foreground">
                      ({u.BAP_NAME})
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">@{u.ID}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleApproveUser(u.USER_CODE)}
                  disabled={approveUserMutation.isPending}
                >
                  승인
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRejectUser(u.USER_CODE)}
                  disabled={rejectUserMutation.isPending}
                >
                  거부
                </Button>
              </div>
            </div>
          ))}
          {pendingUsers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              승인 대기중인 사용자가 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* Separator */}
      <hr className="border-t border-border" />
      {/* Notification Section */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">관리자 공지사항</p>
        <Dialog open={showNotification} onOpenChange={setShowNotification}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              공지사항 등록
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading">공지사항 등록</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>제목</Label>
                <Input
                  value={notificationForm.title}
                  onChange={(e) =>
                    setNotificationForm({
                      ...notificationForm,
                      title: e.target.value,
                    })
                  }
                  placeholder="공지사항 제목"
                />
              </div>
              <div className="space-y-1.5">
                <Label>내용</Label>
                <Textarea
                  value={notificationForm.content}
                  onChange={(e) =>
                    setNotificationForm({
                      ...notificationForm,
                      content: e.target.value,
                    })
                  }
                  placeholder="공지사항 내용을 작성하세요"
                  className="min-h-[200px]"
                />
              </div>
              <Button
                onClick={handleAddNotification}
                className="w-full"
                disabled={addNotificationMutation.isPending}
              >
                {addNotificationMutation.isPending ? "등록 중..." : "등록 완료"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {/* Notification List */}
      <div className="space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.ID}
            className="card-classic p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleEditStart(notification)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <Bell className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1">
                    {notification.TITLE}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {notification.CONTENT}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(notification.CREATED_AT)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNotification(notification.ID);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {notifications.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            등록된 공지사항이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
