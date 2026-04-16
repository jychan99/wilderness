import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { USER_MAIN, NOTIFICATION } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { toRenderableHtml } from "@/utils/html";

type UserWithGrades = USER_MAIN & { MANAGE_GRADES: string[] };
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Users,
  Trash2,
  Bell,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";

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

  const toLocalDateTimeValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const toUtcIsoStringFromLocalInput = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  };

  const getDefaultPopupForm = () => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(9, 0, 0, 0);

    const end = new Date(now);
    end.setDate(end.getDate() + 1);
    end.setHours(18, 0, 0, 0);

    return {
      enabled: false,
      startAt: toLocalDateTimeValue(start),
      endAt: toLocalDateTimeValue(end),
    };
  };

  const [showAdd, setShowAdd] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<NOTIFICATION | null>(null);
  const [isDetailMode, setIsDetailMode] = useState(false);
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
  const [popupForm, setPopupForm] = useState(getDefaultPopupForm);
  const [editForm, setEditForm] = useState({
    title: "",
    content: "",
    popupEnabled: false,
    popupStartAt: "",
    popupEndAt: "",
  });
  const [expandedMonthSections, setExpandedMonthSections] = useState<
    Record<string, boolean>
  >({});
  const [activeTab, setActiveTab] = useState("admins");

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
      setPopupForm(getDefaultPopupForm());
      setShowAdd(false);
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
    mutationFn: async (
      updatedNotification: NOTIFICATION & {
        POPUP_YN: boolean;
        POPUP_START_AT: string | null;
        POPUP_END_AT: string | null;
      },
    ) => {
      const { error } = await (supabase as any)
        .from("NOTIFICATION")
        .update({
          TITLE: updatedNotification.TITLE,
          CONTENT: updatedNotification.CONTENT,
          POPUP_YN: updatedNotification.POPUP_YN,
          POPUP_START_AT: updatedNotification.POPUP_START_AT,
          POPUP_END_AT: updatedNotification.POPUP_END_AT,
        })
        .eq("ID", updatedNotification.ID);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      if (selectedNotification) {
        supabase
          .from("NOTIFICATION")
          .select("*")
          .eq("ID", selectedNotification.ID)
          .single()
          .then(({ data }) => {
            if (data) setSelectedNotification(data);
          });
      }
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
    if (
      !notificationForm.title.trim() ||
      !getPlainText(notificationForm.content)
    ) {
      toast({
        title: "입력 필요",
        description: "제목과 내용을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (popupForm.enabled) {
      if (!popupForm.startAt || !popupForm.endAt) {
        toast({
          title: "입력 필요",
          description: "팝업 공지 기간(시작/종료)을 입력해주세요.",
          variant: "destructive",
        });
        return;
      }

      if (new Date(popupForm.startAt) > new Date(popupForm.endAt)) {
        toast({
          title: "기간 오류",
          description: "팝업 시작일은 종료일보다 늦을 수 없습니다.",
          variant: "destructive",
        });
        return;
      }
    }

    const popupStartAt = popupForm.enabled
      ? toUtcIsoStringFromLocalInput(popupForm.startAt)
      : null;
    const popupEndAt = popupForm.enabled
      ? toUtcIsoStringFromLocalInput(popupForm.endAt)
      : null;

    addNotificationMutation.mutate({
      TITLE: notificationForm.title.trim(),
      CONTENT: notificationForm.content,
      AUTHOR: "관리자",
      POSITION: "0",
      POPUP_YN: popupForm.enabled,
      POPUP_START_AT: popupStartAt,
      POPUP_END_AT: popupEndAt,
    });
  };

  const handleDeleteNotification = (notificationId: string) => {
    openConfirmDialog({
      title: "공지사항 삭제",
      description: "정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
      actionLabel: "삭제",
      actionVariant: "destructive",
      onConfirm: () => {
        deleteNotificationMutation.mutate(notificationId);
        setSelectedNotification(null);
        setIsDetailMode(false);
      },
    });
  };

  const handleShowDetail = (notification: NOTIFICATION) => {
    setSelectedNotification(notification);
    setIsDetailMode(true);
    setIsEditMode(false);
  };

  const handleEditStart = () => {
    if (!selectedNotification) return;
    setEditForm({
      title: selectedNotification.TITLE,
      content: selectedNotification.CONTENT,
      popupEnabled: selectedNotification.POPUP_YN || false,
      popupStartAt: selectedNotification.POPUP_START_AT
        ? toLocalDateTimeValue(new Date(selectedNotification.POPUP_START_AT))
        : "",
      popupEndAt: selectedNotification.POPUP_END_AT
        ? toLocalDateTimeValue(new Date(selectedNotification.POPUP_END_AT))
        : "",
    });
    setIsEditMode(true);
  };

  const handleEditSave = () => {
    if (
      !editForm.title.trim() ||
      !getPlainText(editForm.content) ||
      !selectedNotification
    )
      return;

    if (editForm.popupEnabled) {
      if (!editForm.popupStartAt || !editForm.popupEndAt) {
        toast({
          title: "입력 필요",
          description: "팝업 공지 기간(시작/종료)을 입력해주세요.",
          variant: "destructive",
        });
        return;
      }

      if (new Date(editForm.popupStartAt) > new Date(editForm.popupEndAt)) {
        toast({
          title: "기간 오류",
          description: "팝업 시작일은 종료일보다 늦을 수 없습니다.",
          variant: "destructive",
        });
        return;
      }
    }

    const popupStartAt = editForm.popupEnabled
      ? toUtcIsoStringFromLocalInput(editForm.popupStartAt)
      : null;
    const popupEndAt = editForm.popupEnabled
      ? toUtcIsoStringFromLocalInput(editForm.popupEndAt)
      : null;

    updateNotificationMutation.mutate({
      ...selectedNotification,
      TITLE: editForm.title.trim(),
      CONTENT: editForm.content,
      POPUP_YN: editForm.popupEnabled,
      POPUP_START_AT: popupStartAt,
      POPUP_END_AT: popupEndAt,
    });
    setIsEditMode(false);
  };

  const handleEditCancel = () => {
    setIsEditMode(false);
    setEditForm({
      title: "",
      content: "",
      popupEnabled: false,
      popupStartAt: "",
      popupEndAt: "",
    });
  };

  const handleCloseDetail = () => {
    setSelectedNotification(null);
    setIsDetailMode(false);
    setIsEditMode(false);
    setEditForm({
      title: "",
      content: "",
      popupEnabled: false,
      popupStartAt: "",
      popupEndAt: "",
    });
    setActiveTab("notices");
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

  const formatPopupPeriod = (
    startAt: string | null | undefined,
    endAt: string | null | undefined,
  ) => {
    if (!startAt && !endAt) return "";
    if (startAt && endAt) {
      return `${formatDateTime(startAt)} ~ ${formatDateTime(endAt)}`;
    }
    if (startAt) return `${formatDateTime(startAt)} ~`;
    return `~ ${formatDateTime(endAt as string)}`;
  };

  const notificationGroupsByMonth = useMemo(() => {
    const grouped = new Map<string, NOTIFICATION[]>();

    notifications.forEach((notification) => {
      const createdAt = new Date(notification.CREATED_AT);
      if (Number.isNaN(createdAt.getTime())) return;

      const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
      const existing = grouped.get(key) || [];
      existing.push(notification);
      grouped.set(key, existing);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, items]) => {
        const [year, month] = key.split("-");

        return {
          key,
          label: `${year}년 ${Number(month)}월`,
          items: items.sort(
            (a, b) =>
              new Date(b.CREATED_AT).getTime() -
              new Date(a.CREATED_AT).getTime(),
          ),
        };
      });
  }, [notifications]);

  const toggleMonthSection = (monthKey: string, defaultExpanded: boolean) => {
    setExpandedMonthSections((prev) => ({
      ...prev,
      [monthKey]: !(prev[monthKey] ?? defaultExpanded),
    }));
  };

  const getPlainText = (html: string) =>
    html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .trim();

  // 수정 모드
  if (isEditMode && selectedNotification) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            handleEditCancel();
            setActiveTab("notices");
          }}
        >
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
              <RichTextEditor
                value={editForm.content}
                onChange={(html) => setEditForm({ ...editForm, content: html })}
                placeholder="공지사항 내용을 작성하세요"
                minHeight="220px"
              />
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-popup-notice"
                  checked={editForm.popupEnabled}
                  onCheckedChange={(checked) =>
                    setEditForm((prev) => ({
                      ...prev,
                      popupEnabled: checked === true,
                    }))
                  }
                />
                <Label htmlFor="edit-popup-notice" className="cursor-pointer">
                  팝업공지
                </Label>
              </div>

              {editForm.popupEnabled && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-popup-start-at">팝업 시작일시</Label>
                    <Input
                      id="edit-popup-start-at"
                      type="datetime-local"
                      value={editForm.popupStartAt}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          popupStartAt: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-popup-end-at">팝업 종료일시</Label>
                    <Input
                      id="edit-popup-end-at"
                      type="datetime-local"
                      value={editForm.popupEndAt}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          popupEndAt: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              )}
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

  if (showAdd) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setShowAdd(false);
            setNotificationForm({ title: "", content: "" });
            setPopupForm(getDefaultPopupForm());
            setActiveTab("notices");
          }}
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          목록으로
        </Button>
        <div className="card-classic p-6">
          <h2 className="font-heading text-xl font-bold mb-4">
            관리자 공지사항 등록
          </h2>
          <div className="space-y-4">
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
              <RichTextEditor
                value={notificationForm.content}
                onChange={(html) =>
                  setNotificationForm({
                    ...notificationForm,
                    content: html,
                  })
                }
                placeholder="공지사항 내용을 작성하세요"
                minHeight="220px"
              />
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="admin-popup-notice"
                  checked={popupForm.enabled}
                  onCheckedChange={(checked) =>
                    setPopupForm((prev) => ({
                      ...prev,
                      enabled: checked === true,
                    }))
                  }
                />
                <Label htmlFor="admin-popup-notice" className="cursor-pointer">
                  팝업공지
                </Label>
              </div>

              {popupForm.enabled && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="popup-start-at">팝업 시작일시</Label>
                    <Input
                      id="popup-start-at"
                      type="datetime-local"
                      value={popupForm.startAt}
                      onChange={(e) =>
                        setPopupForm((prev) => ({
                          ...prev,
                          startAt: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="popup-end-at">팝업 종료일시</Label>
                    <Input
                      id="popup-end-at"
                      type="datetime-local"
                      value={popupForm.endAt}
                      onChange={(e) =>
                        setPopupForm((prev) => ({
                          ...prev,
                          endAt: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleAddNotification}
                className="flex-1"
                disabled={addNotificationMutation.isPending}
              >
                {addNotificationMutation.isPending ? "등록 중..." : "등록 완료"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowAdd(false);
                  setNotificationForm({ title: "", content: "" });
                  setPopupForm(getDefaultPopupForm());
                }}
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isDetailMode && selectedNotification) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleCloseDetail}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          목록으로
        </Button>
        <div className="card-classic p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="font-heading text-xl font-bold mb-2">
                  {selectedNotification.TITLE}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(selectedNotification.CREATED_AT)} ·{" "}
                  {selectedNotification.AUTHOR}
                </p>
                {selectedNotification.POPUP_YN &&
                  (selectedNotification.POPUP_START_AT ||
                    selectedNotification.POPUP_END_AT) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      팝업 기간:{" "}
                      {formatPopupPeriod(
                        selectedNotification.POPUP_START_AT,
                        selectedNotification.POPUP_END_AT,
                      )}
                    </p>
                  )}
              </div>
            </div>
          </div>
          <hr className="my-4" />
          <div
            className="rich-html mb-6"
            dangerouslySetInnerHTML={{
              __html: toRenderableHtml(selectedNotification.CONTENT),
            }}
          />
          <div className="flex gap-3">
            <Button onClick={handleEditStart} className="flex-1">
              수정
            </Button>
            <Button
              variant="outline"
              onClick={handleCloseDetail}
              className="flex-1"
            >
              취소
            </Button>
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

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="admins">관리자 목록</TabsTrigger>
          <TabsTrigger value="pending">가입 허가</TabsTrigger>
          <TabsTrigger value="notices">관리자 공지사항</TabsTrigger>
        </TabsList>

        <TabsContent value="admins" className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">관리자 계정</p>
            <p className="text-sm text-muted-foreground">
              총 {admins.length}명
            </p>
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
        </TabsContent>

        <TabsContent value="pending" className="space-y-3">
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
        </TabsContent>

        <TabsContent value="notices" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">관리자 공지사항</p>
            <Button
              size="sm"
              onClick={() => {
                setSelectedNotification(null);
                setIsDetailMode(false);
                setIsEditMode(false);
                setNotificationForm({ title: "", content: "" });
                setPopupForm(getDefaultPopupForm());
                setShowAdd(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              관리자 공지사항 등록
            </Button>
          </div>

          <div className="space-y-3">
            {notificationGroupsByMonth.map((group, index) => {
              const defaultExpanded = index === 0;
              const isExpanded =
                expandedMonthSections[group.key] ?? defaultExpanded;

              return (
                <div
                  key={group.key}
                  className="card-classic p-0 overflow-hidden"
                >
                  <button
                    type="button"
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    onClick={() =>
                      toggleMonthSection(group.key, defaultExpanded)
                    }
                  >
                    <div className="flex items-center gap-2">
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          isExpanded ? "rotate-0" : "-rotate-90"
                        }`}
                      />
                      <p className="text-sm font-medium">{group.label}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {group.items.length}개
                    </p>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border p-2 space-y-2">
                      {group.items.map((notification) => (
                        <div
                          key={notification.ID}
                          className="p-3 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => handleShowDetail(notification)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                                <Bell className="w-4.5 h-4.5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <div className="mb-1 flex items-center gap-2">
                                  <h4 className="font-medium text-sm">
                                    {notification.TITLE}
                                  </h4>
                                  {notification.POPUP_YN && (
                                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                      팝업공지
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">
                                  {getPlainText(notification.CONTENT)}
                                </p>
                                {notification.POPUP_YN &&
                                  (notification.POPUP_START_AT ||
                                    notification.POPUP_END_AT) && (
                                    <p className="text-xs text-muted-foreground mb-1">
                                      팝업 기간:{" "}
                                      {formatPopupPeriod(
                                        notification.POPUP_START_AT,
                                        notification.POPUP_END_AT,
                                      )}
                                    </p>
                                  )}
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
                    </div>
                  )}
                </div>
              );
            })}
            {notificationGroupsByMonth.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                등록된 공지사항이 없습니다.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
