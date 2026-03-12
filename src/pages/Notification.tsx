import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { NOTIFICATION } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Bell, ArrowLeft, ChevronDown } from "lucide-react";

const Notification = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<NOTIFICATION | null>(null);
  const [isDetailMode, setIsDetailMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    title: "",
    content: "",
  });
  const [editForm, setEditForm] = useState({
    title: "",
    content: "",
  });
  const [expandedMonthSections, setExpandedMonthSections] = useState<
    Record<string, boolean>
  >({});

  if (!user) return null;

  // 관리자, 회장만 수정/삭제 가능
  const canEditDelete = user.position === "0" || user.position === "1";

  // 회장 공지사항 목록 조회
  const { data: notifications = [] } = useQuery<NOTIFICATION[], Error>({
    queryKey: ["notifications", "chairman"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("NOTIFICATION")
        .select("*")
        .eq("POSITION", "1")
        .order("CREATED_AT", { ascending: false });
      if (error) throw error;
      return data || [];
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
      setShowAdd(false);
    },
    onError: (error) => {
      alert("공지사항 추가 중 오류가 발생했습니다: " + (error as any).message);
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
      // 수정된 데이터를 다시 불러와서 selectedNotification 업데이트
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
      alert("공지사항 수정 중 오류가 발생했습니다: " + (error as any).message);
    },
  });

  const handleAddNotification = () => {
    if (!notificationForm.title || !notificationForm.content) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    addNotificationMutation.mutate({
      TITLE: notificationForm.title,
      CONTENT: notificationForm.content,
      AUTHOR: user?.name || "회장",
      POSITION: "1",
    });
  };

  const handleDeleteNotification = (notificationId: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    deleteNotificationMutation.mutate(notificationId);
    setSelectedNotification(null);
    setIsDetailMode(false);
  };

  const handleShowDetail = (notification: NOTIFICATION) => {
    setSelectedNotification(notification);
    setIsDetailMode(true);
    setIsEditMode(false);
  };

  const handleStartEdit = () => {
    if (!selectedNotification) return;
    setEditForm({
      title: selectedNotification.TITLE,
      content: selectedNotification.CONTENT,
    });
    setIsEditMode(true);
  };

  const handleEditSave = () => {
    if (!editForm.title || !editForm.content || !selectedNotification) return;

    updateNotificationMutation.mutate({
      ...selectedNotification,
      TITLE: editForm.title,
      CONTENT: editForm.content,
    });
    // 저장 후 수정 모드만 종료 (상세보기는 유지)
    setIsEditMode(false);
  };

  const handleEditCancel = () => {
    setIsEditMode(false);
    setEditForm({ title: "", content: "" });
  };

  const handleCloseDetail = () => {
    setSelectedNotification(null);
    setIsDetailMode(false);
    setIsEditMode(false);
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

  // 상세보기 모드
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
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Bell className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h2 className="font-heading text-xl font-bold mb-2">
                  {selectedNotification.TITLE}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(selectedNotification.CREATED_AT)} ·{" "}
                  {selectedNotification.AUTHOR}
                </p>
              </div>
            </div>
          </div>
          <hr className="my-4" />
          <div className="whitespace-pre-wrap text-sm leading-relaxed mb-6">
            {selectedNotification.CONTENT}
          </div>
          <div className="flex gap-3">
            {canEditDelete && (
              <Button onClick={handleStartEdit} className="flex-1">
                수정
              </Button>
            )}
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
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">공지사항</p>
        {canEditDelete && (
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                공지사항 등록
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-heading">
                  공지사항 등록
                </DialogTitle>
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
                  {addNotificationMutation.isPending
                    ? "등록 중..."
                    : "등록 완료"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {notificationGroupsByMonth.map((group, index) => {
          const defaultExpanded = index === 0;
          const isExpanded =
            expandedMonthSections[group.key] ?? defaultExpanded;

          return (
            <div key={group.key} className="card-classic p-0 overflow-hidden">
              <button
                type="button"
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                onClick={() => toggleMonthSection(group.key, defaultExpanded)}
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
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mt-0.5">
                            <Bell className="w-4.5 h-4.5 text-blue-500" />
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
                        {canEditDelete && (
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
                        )}
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
    </div>
  );
};

export default Notification;
