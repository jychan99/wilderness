import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { USER_MAIN, Position, Grade, NOTIFICATION } from "@/types";
import { supabase } from "@/integrations/supabase/client";

type UserWithGrades = USER_MAIN & { MANAGE_GRADES: string[] };
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Users, Trash2, Bell, Edit, ArrowLeft } from "lucide-react";

const gradeGroups = [
  { label: "유치부", children: ["유치부"] },
  { label: "초등부", children: ["초1", "초2", "초3", "초4", "초5", "초6"] },
  { label: "중등부", children: ["중1", "중2", "중3"] },
  { label: "고등부", children: ["고1", "고2", "고3"] },
];

const Admin = () => {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<NOTIFICATION | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [form, setForm] = useState({
    name: "",
    baptismalName: "",
    username: "",
    password: "",
    position: "" as Position,
    grades: [] as string[],
  });
  const [notificationForm, setNotificationForm] = useState({
    title: "",
    content: "",
  });
  const [editForm, setEditForm] = useState({
    title: "",
    content: "",
  });

  const positions: Position[] = ["회장", "부회장", "총무", "서기", "일반"];
  const grades: Grade[] = [
    "모든학년",
    "유치부",
    "초등부",
    "초1",
    "초2",
    "초3",
    "초4",
    "초5",
    "초6",
    "중등부",
    "중1",
    "중2",
    "중3",
    "고등부",
    "고1",
    "고2",
    "고3",
  ];

  // 학년 코드 변환 함수
  const gradeToCode = (grade: string): string => {
    const gradeMap: { [key: string]: string } = {
      유치부: "K",
      초1: "E1",
      초2: "E2",
      초3: "E3",
      초4: "E4",
      초5: "E5",
      초6: "E6",
      중1: "M1",
      중2: "M2",
      중3: "M3",
      고1: "H1",
      고2: "H2",
      고3: "H3",
    };
    return gradeMap[grade] || grade;
  };

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

  // 직책을 숫자로 변환
  const positionToNumber = (position: Position | ""): number => {
    const positionMap: { [key: string]: number } = {
      관리자: 0,
      회장: 1,
      부회장: 2,
      총무: 3,
      서기: 4,
      일반: 5,
    };
    return positionMap[position] || 5;
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

  // 학년을 숫자로 변환
  const gradeToNumber = (grade: Grade | ""): number => {
    const gradeMap: { [key: string]: number } = {
      모든학년: 0,
      유치부: 1,
      초등부: 2,
      초1: 3,
      초2: 4,
      초3: 5,
      초4: 6,
      초5: 7,
      초6: 8,
      중등부: 9,
      중1: 10,
      중2: 11,
      중3: 12,
      고등부: 13,
      고1: 14,
      고2: 15,
      고3: 16,
    };
    return gradeMap[grade] || 0;
  };

  // 숫자를 학년으로 변환
  const numberToGrade = (num: number | string): string => {
    const numberMap: { [key: number]: string } = {
      0: "모든학년",
      1: "유치부",
      2: "초등부",
      3: "초1",
      4: "초2",
      5: "초3",
      6: "초4",
      7: "초5",
      8: "초6",
      9: "중등부",
      10: "중1",
      11: "중2",
      12: "중3",
      13: "고등부",
      14: "고1",
      15: "고2",
      16: "고3",
    };
    const numValue = typeof num === "string" ? parseInt(num) : num;
    return numberMap[numValue] || "모든학년";
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

  // 사용자 추가 mutation
  const addUserMutation = useMutation({
    mutationFn: async (params: {
      user: Omit<USER_MAIN, "USER_CODE">;
      grades: string[];
    }) => {
      // USER_MAIN에 사용자 추가
      const { data: userData, error: userError } = await (supabase as any)
        .from("USER_MAIN")
        .insert([params.user])
        .select();

      if (userError) {
        console.error("Insert USER_MAIN error:", userError);
        throw userError;
      }

      if (userData && userData[0] && params.grades.length > 0) {
        // USER_MANAGE_GRADE에 담당학년 다건 추가 (한글을 코드로 변환)
        const rows = params.grades.map((grade) => ({
          USER_CODE: userData[0].USER_CODE,
          MANAGE_GRADE: gradeToCode(grade),
        }));

        const { error: gradeError } = await (supabase as any)
          .from("USER_MANAGE_GRADE")
          .insert(rows);

        if (gradeError) {
          console.error("Insert USER_MANAGE_GRADE error:", gradeError);
          throw gradeError;
        }
      }

      return userData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usermain"] });
      setForm({
        name: "",
        baptismalName: "",
        username: "",
        password: "",
        position: "" as Position,
        grades: [],
      });
      setShowAdd(false);
    },
    onError: (error) => {
      console.error("Mutation error:", error);
      alert("사용자 추가 중 오류가 발생했습니다: " + (error as any).message);
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
      setEditForm({ title: "", content: "" });
      setIsEditMode(false);
      setSelectedNotification(null);
    },
    onError: (error) => {
      alert("공지사항 수정 중 오류가 발생했습니다: " + (error as any).message);
    },
  });

  const handleAdd = () => {
    if (
      !form.name ||
      !form.username ||
      !form.password ||
      !form.position
    )
      return;

    // 회장이 아닌데 학년이 선택되지 않은 경우
    if (form.position !== "회장" && form.grades.length === 0) {
      alert("담당학년을 선택해주세요.");
      return;
    }

    const newUser: Omit<USER_MAIN, "USER_CODE"> = {
      ID: form.username,
      NAME: form.name,
      BAP_NAME: form.baptismalName,
      PASSWORD: form.password,
      POSITION: positionToNumber(form.position),
    };

    // 회장은 모든 학년, 아니면 선택한 학년들
    const allGrades = ["유치부", "초1", "초2", "초3", "초4", "초5", "초6", "중1", "중2", "중3", "고1", "고2", "고3"];
    const grades = form.position === "회장" ? allGrades : form.grades;

    addUserMutation.mutate({ user: newUser, grades });
  };

  const toggleGrade = (grade: string, checked: boolean) => {
    const nextGrades = checked
      ? Array.from(new Set([...form.grades, grade]))
      : form.grades.filter((item) => item !== grade);
    setForm({ ...form, grades: nextGrades });
  };

  const toggleGroup = (children: string[], checked: boolean) => {
    const nextGrades = checked
      ? Array.from(new Set([...form.grades, ...children]))
      : form.grades.filter((item) => !children.includes(item));
    setForm({ ...form, grades: nextGrades });
  };

  const formatGradesLabel = (grades: string[]) => {
    if (grades.length === 0) return "학년 선택";
    if (grades.length <= 2) return grades.join(", ");
    return `${grades.slice(0, 2).join(", ")} 외 ${grades.length - 2}개`;
  };

  const handleDelete = (USER_CODE: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    deleteUserMutation.mutate(USER_CODE);
  };

  const handleAddNotification = () => {
    if (!notificationForm.title || !notificationForm.content) {
      alert("제목과 내용을 입력해주세요.");
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
    if (!confirm("정말 삭제하시겠습니까?")) return;
    deleteNotificationMutation.mutate(notificationId);
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
      <div className="flex items-center justify-end">
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              유저 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">유저 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>이름</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="이름"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>세례명</Label>
                  <Input
                    value={form.baptismalName}
                    onChange={(e) =>
                      setForm({ ...form, baptismalName: e.target.value })
                    }
                    placeholder="세례명"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>아이디</Label>
                  <Input
                    value={form.username}
                    onChange={(e) =>
                      setForm({ ...form, username: e.target.value })
                    }
                    placeholder="로그인 아이디"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>비밀번호</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    placeholder="비밀번호"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>직책</Label>
                <Select
                  value={form.position}
                  onValueChange={(v) =>
                    setForm({ ...form, position: v as Position })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="직책 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>담당학년</Label>
                {form.position === "회장" ? (
                  <Input value="모든학년 (자동 설정)" disabled />
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        {formatGradesLabel(form.grades)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-3" align="start" style={{ zIndex: 9999 }}>
                      <div className="space-y-3">
                        {gradeGroups.map((group) => {
                          const selectedCount = group.children.filter((grade) =>
                            form.grades.includes(grade),
                          ).length;
                          const allSelected = selectedCount === group.children.length;

                          return (
                            <div key={group.label} className="space-y-2">
                              <label className="flex items-center gap-2">
                                <Checkbox
                                  checked={allSelected}
                                  onCheckedChange={(checked) =>
                                    toggleGroup(group.children, Boolean(checked))
                                  }
                                />
                                <span className="text-sm font-medium">{group.label}</span>
                              </label>
                              <div className="grid grid-cols-3 gap-2 pl-6">
                                {group.children.map((grade) => (
                                  <label
                                    key={grade}
                                    className="flex items-center gap-1.5 text-sm"
                                  >
                                    <Checkbox
                                      checked={form.grades.includes(grade)}
                                      onCheckedChange={(checked) =>
                                        toggleGrade(grade, Boolean(checked))
                                      }
                                    />
                                    <span>{grade}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <Button onClick={handleAdd} className="w-full">
                추가
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
