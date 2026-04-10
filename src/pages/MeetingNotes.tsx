import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { MEETING } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { toRenderableHtml } from "@/utils/html";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  FileText,
  ArrowLeft,
  Edit,
  Trash2,
  ChevronDown,
} from "lucide-react";

const MeetingNotes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showWrite, setShowWrite] = useState(false);
  const [selectedNote, setSelectedNote] = useState<MEETING | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [form, setForm] = useState({ TITLE: "", CONTENT: "" });
  const [expandedMonthSections, setExpandedMonthSections] = useState<
    Record<string, boolean>
  >({});

  // 회의록 조회 (MEETING 테이블)
  const { data: notes = [] } = useQuery<MEETING[], Error>({
    queryKey: ["meetings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("MEETING")
        .select("*")
        .order("DATE", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // 회의록 작성 뮤테이션
  const submitNoteMutation = useMutation({
    mutationFn: async (newNote: Omit<MEETING, "ID" | "DATE">) => {
      const { error } = await (supabase as any)
        .from("MEETING")
        .insert([newNote]);
      if (error) {
        console.error("회의록 작성 에러:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setForm({ TITLE: "", CONTENT: "" });
      setShowWrite(false);
    },
    onError: (error: any) => {
      console.error("Mutation 실패:", error);
    },
  });

  // 회의록 수정 뮤테이션
  const updateNoteMutation = useMutation({
    mutationFn: async (updatedNote: MEETING) => {
      const { error } = await (supabase as any)
        .from("MEETING")
        .update({
          TITLE: updatedNote.TITLE,
          CONTENT: updatedNote.CONTENT,
        })
        .eq("ID", updatedNote.ID);
      if (error) {
        console.error("회의록 수정 에러:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setForm({ TITLE: "", CONTENT: "" });
      setIsEditMode(false);
      setSelectedNote(null);
    },
    onError: (error: any) => {
      console.error("수정 Mutation 실패:", error);
    },
  });

  // 회의록 삭제 뮤테이션
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await (supabase as any)
        .from("MEETING")
        .delete()
        .eq("ID", noteId);
      if (error) {
        console.error("회의록 삭제 에러:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setSelectedNote(null);
    },
    onError: (error: any) => {
      console.error("삭제 Mutation 실패:", error);
    },
  });

  if (!user) return null;

  const isViceChairOrSecretary =
    user.position === "2" ||
    user.position === "4" ||
    user.position === "부회장" ||
    user.position === "서기";

  // 관리자, 부회장, 서기가 작성 가능
  const isAuthorized = user.role === "admin" || isViceChairOrSecretary;

  // 오늘 날짜 (로컬 시간대 기준)
  const today = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  })();

  const formatDateOnly = (dateStr: string) => {
    return dateStr.split("T")[0].split(" ")[0];
  };

  const formatDateTime = (dateStr: string) => {
    const datePart = dateStr.split("T")[0].split(" ")[0];
    const timePart = dateStr.includes("T")
      ? dateStr.split("T")[1]
      : dateStr.split(" ")[1] || "";
    const hhmm = timePart ? timePart.slice(0, 5) : "";
    return hhmm ? `${datePart} ${hhmm}` : datePart;
  };

  const noteGroupsByMonth = useMemo(() => {
    const grouped = new Map<string, MEETING[]>();

    notes.forEach((note) => {
      const createdAt = new Date(note.DATE);
      if (Number.isNaN(createdAt.getTime())) return;

      const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
      const existing = grouped.get(key) || [];
      existing.push(note);
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
            (a, b) => new Date(b.DATE).getTime() - new Date(a.DATE).getTime(),
          ),
        };
      });
  }, [notes]);

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

  const handleSubmit = () => {
    if (!form.TITLE.trim() || !getPlainText(form.CONTENT)) return;

    submitNoteMutation.mutate({
      TITLE: form.TITLE.trim(),
      CONTENT: form.CONTENT,
      AUTHOR: user?.name || "관리자",
      // DATE 제거 (DB default NOW())
    });
  };

  const handleEditStart = () => {
    if (selectedNote) {
      setForm({ TITLE: selectedNote.TITLE, CONTENT: selectedNote.CONTENT });
      setIsEditMode(true);
    }
  };

  const handleEditSave = () => {
    if (!form.TITLE.trim() || !getPlainText(form.CONTENT) || !selectedNote)
      return;

    updateNoteMutation.mutate({
      ...selectedNote,
      TITLE: form.TITLE.trim(),
      CONTENT: form.CONTENT,
    });
  };

  const handleDelete = () => {
    if (selectedNote && confirm("정말 삭제하시겠습니까?")) {
      deleteNoteMutation.mutate(selectedNote.ID);
    }
  };

  const canEditDelete =
    selectedNote &&
    (user?.name === selectedNote.AUTHOR ||
      user?.role === "admin" ||
      isViceChairOrSecretary);

  if (showWrite) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setShowWrite(false);
            setForm({ TITLE: "", CONTENT: "" });
          }}
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          목록으로
        </Button>

        <div className="card-classic p-6">
          <h2 className="font-heading text-xl font-bold mb-4">회의록 작성</h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>제목</Label>
              <Input
                value={form.TITLE}
                onChange={(e) => setForm({ ...form, TITLE: e.target.value })}
                placeholder="회의록 제목"
              />
            </div>
            <div className="space-y-1.5">
              <Label>내용</Label>
              <RichTextEditor
                value={form.CONTENT}
                onChange={(html) => setForm({ ...form, CONTENT: html })}
                placeholder="회의 내용을 작성하세요"
                minHeight="220px"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSubmit} className="flex-1">
                작성 완료
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowWrite(false);
                  setForm({ TITLE: "", CONTENT: "" });
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

  // 수정 모드
  if (selectedNote && isEditMode) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsEditMode(false);
            setForm({ TITLE: "", CONTENT: "" });
          }}
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          취소
        </Button>
        <div className="card-classic p-6">
          <h2 className="font-heading text-xl font-bold mb-4">회의록 수정</h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>제목</Label>
              <Input
                value={form.TITLE}
                onChange={(e) => setForm({ ...form, TITLE: e.target.value })}
                placeholder="회의록 제목"
              />
            </div>
            <div className="space-y-1.5">
              <Label>내용</Label>
              <RichTextEditor
                value={form.CONTENT}
                onChange={(html) => setForm({ ...form, CONTENT: html })}
                placeholder="회의 내용을 작성하세요"
                minHeight="220px"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleEditSave} className="flex-1">
                저장
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditMode(false);
                  setForm({ TITLE: "", CONTENT: "" });
                }}
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

  // 상세 보기
  if (selectedNote) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedNote(null)}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          목록으로
        </Button>
        <div className="card-classic p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h2 className="font-heading text-xl font-bold mb-2">
                {selectedNote.TITLE}
              </h2>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>작성자: {selectedNote.AUTHOR}</span>
                <span>{formatDateTime(selectedNote.DATE)}</span>
              </div>
            </div>
            {canEditDelete && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleEditStart}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
          <hr className="border-border mb-4" />
          <div
            className="rich-html text-foreground/85"
            dangerouslySetInnerHTML={{
              __html: toRenderableHtml(selectedNote.CONTENT),
            }}
          />
        </div>
      </div>
    );
  }

  // 목록 보기
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">총 {notes.length}건</p>
        {isAuthorized && (
          <Button
            size="sm"
            onClick={() => {
              setSelectedNote(null);
              setIsEditMode(false);
              setForm({ TITLE: "", CONTENT: "" });
              setShowWrite(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            회의록 작성
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {noteGroupsByMonth.map((group, index) => {
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
                  {group.items.length}건
                </p>
              </button>

              {isExpanded && (
                <div className="border-t border-border p-2 space-y-2">
                  {group.items.map((note) => (
                    <button
                      key={note.ID}
                      onClick={() => setSelectedNote(note)}
                      className="w-full text-left p-3 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm">
                                {note.TITLE}
                              </h4>
                              {note.DATE.startsWith(today) && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs px-1.5 py-0"
                                >
                                  NEW
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {note.AUTHOR} · {formatDateTime(note.DATE)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {noteGroupsByMonth.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            등록된 회의록이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingNotes;
