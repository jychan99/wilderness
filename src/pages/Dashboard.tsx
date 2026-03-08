import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SCHEDULE, MEETING, NOTIFICATION, STU_MAIN } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DashboardProps {
  onTabChange: (tab: string) => void;
}

const Dashboard = ({ onTabChange }: DashboardProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    description: "",
  });
  const [selectedEvent, setSelectedEvent] = useState<SCHEDULE | null>(null);
  const [editingEvent, setEditingEvent] = useState<SCHEDULE | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const queryClient = useQueryClient();

  // 캘린더 이벤트 조회
  const { data: events = [], isLoading: eventsLoading } = useQuery<
    SCHEDULE[],
    Error
  >({
    queryKey: ["calendar_events"],
    queryFn: async (): Promise<SCHEDULE[]> => {
      const { data, error } = await supabase.from("SCHEDULE").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // 회의록 조회
  const { data: meetingNotes = [], isLoading: meetingLoading } = useQuery<
    MEETING[],
    Error
  >({
    queryKey: ["meetings"],
    queryFn: async (): Promise<MEETING[]> => {
      const { data, error } = await supabase
        .from("MEETING")
        .select("*")
        .order("DATE", { ascending: false })
        .order("ID", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data || [];
    },
  });

  // 학생 축일 조회
  const { data: students = [] } = useQuery<STU_MAIN[], Error>({
    queryKey: ["students"],
    queryFn: async (): Promise<STU_MAIN[]> => {
      const { data, error } = await supabase.from("STU_MAIN").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // 관리자 공지사항 조회
  const {
    data: adminNotifications = [],
    isLoading: adminNotificationsLoading,
  } = useQuery<NOTIFICATION[], Error>({
    queryKey: ["notifications", "admin"],
    queryFn: async (): Promise<NOTIFICATION[]> => {
      const { data, error } = await supabase
        .from("NOTIFICATION")
        .select("*")
        .eq("POSITION", "0")
        .order("CREATED_AT", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data || [];
    },
  });

  // 회장 공지사항 조회
  const {
    data: chairmanNotifications = [],
    isLoading: chairmanNotificationsLoading,
  } = useQuery<NOTIFICATION[], Error>({
    queryKey: ["notifications", "chairman"],
    queryFn: async (): Promise<NOTIFICATION[]> => {
      const { data, error } = await supabase
        .from("NOTIFICATION")
        .select("*")
        .eq("POSITION", "1")
        .order("CREATED_AT", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data || [];
    },
  });

  // 이벤트 추가 뮤테이션
  const addEventMutation = useMutation<void, Error, SCHEDULE>({
    mutationFn: async (event: SCHEDULE) => {
      const { error } = await (supabase as any).from("SCHEDULE").insert([
        {
          ID: event.ID,
          TITLE: event.TITLE,
          DATE: event.DATE,
          CONTENT: event.CONTENT,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar_events"] });
      setNewEvent({ title: "", date: "", description: "" });
      setShowAddEvent(false);
    },
  });

  // 이벤트 수정 뮤테이션
  const editEventMutation = useMutation<void, Error, SCHEDULE>({
    mutationFn: async (event: SCHEDULE) => {
      const { error } = await (supabase as any)
        .from("SCHEDULE")
        .update({
          TITLE: event.TITLE,
          DATE: event.DATE,
          CONTENT: event.CONTENT,
        })
        .eq("ID", event.ID);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar_events"] });
      setEditingEvent(null);
      setIsEditMode(false);
      setSelectedEvent(null);
    },
  });

  // 이벤트 삭제 뮤테이션
  const deleteEventMutation = useMutation<void, Error, string>({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("SCHEDULE")
        .delete()
        .eq("ID", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar_events"] });
      setSelectedEvent(null);
      setEditingEvent(null);
      setIsEditMode(false);
    },
  });

  const latestMeeting = meetingNotes[0] || null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().split("T")[0];
  const [todayMonthPart, todayDayPart] = todayStr.split("-");
  const todayMonthDay = `${todayMonthPart}-${todayDayPart}`;

  const feastLabelsByMonthDay = useMemo(() => {
    const map = new Map<string, string[]>();

    students.forEach((student) => {
      if (!student.NAME_DAY) return;

      const [monthPart, dayPart] = student.NAME_DAY.split("-");
      const feastMonth = Number(monthPart);
      const feastDay = Number(dayPart);
      const monthKey = String(feastMonth).padStart(2, "0");
      const dayKey = String(feastDay).padStart(2, "0");
      const monthDayKey = `${monthKey}-${dayKey}`;
      const feastLabel = `${student.NAME}${student.BAP_NAME ? ` ${student.BAP_NAME}` : ""} 축일`;

      if (!Number.isFinite(feastMonth) || !Number.isFinite(feastDay)) {
        return;
      }

      const existing = map.get(monthDayKey) || [];
      existing.push(feastLabel);
      map.set(monthDayKey, existing);
    });

    return map;
  }, [students]);

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.DATE === dateStr);
  };

  const todayEvents = events.filter((e) => e.DATE === todayStr);
  const todayFeastLabels = feastLabelsByMonthDay.get(todayMonthDay) || [];

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.date) return;
    const event: SCHEDULE = {
      ID: Date.now().toString(),
      TITLE: newEvent.title,
      DATE: newEvent.date,
      CONTENT: newEvent.description,
    };
    addEventMutation.mutate(event);
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="space-y-6">
      {/* Admin notice */}
      {/* <div className="card-classic p-4"> */}
      {adminNotificationsLoading ? (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : adminNotifications.length > 0 ? (
        <p className="font-bold text-sm" style={{ color: "#2563eb" }}>
          {adminNotifications[0].CONTENT}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground"> 업데이트가 없습니다. </p>
      )}
      {/* </div> */}

      {/* Chairman Notifications */}
      <div className="card-classic p-5">
        <button
          onClick={() => onTabChange("notifications")}
          className="font-heading font-semibold text-lg mb-3 hover:text-primary transition-colors cursor-pointer flex items-center gap-2 group"
        >
          📢 공지사항
          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        {chairmanNotificationsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : chairmanNotifications.length > 0 ? (
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-sm flex-1">
                {chairmanNotifications[0].TITLE}
              </h4>
              <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                {new Date(
                  chairmanNotifications[0].CREATED_AT,
                ).toLocaleDateString("ko-KR")}
              </span>
            </div>
            <p className="text-sm text-foreground/80 mb-2">
              {chairmanNotifications[0].CONTENT}
            </p>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">
            공지사항이 없습니다.
          </p>
        )}
      </div>

      {/* Calendar */}
      <div className="card-classic p-5">
        <div className="flex items-center justify-between mb-4 gap-2">
          <h3 className="font-heading font-semibold text-base sm:text-lg">
            📅 {year}년 {month + 1}월
          </h3>
          <div className="flex items-center gap-1 sm:gap-2">
            <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">일정 추가</span>
                  <span className="sm:hidden">추가</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-heading">일정 추가</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>제목</Label>
                    <Input
                      value={newEvent.title}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, title: e.target.value })
                      }
                      placeholder="일정 제목"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>날짜</Label>
                    <Input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>설명</Label>
                    <Textarea
                      value={newEvent.description}
                      onChange={(e) =>
                        setNewEvent({
                          ...newEvent,
                          description: e.target.value,
                        })
                      }
                      placeholder="일정 설명 (선택)"
                    />
                  </div>
                  <Button
                    onClick={handleAddEvent}
                    className="w-full"
                    disabled={addEventMutation.isPending}
                  >
                    {addEventMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        추가 중...
                      </>
                    ) : (
                      "추가"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {eventsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {weekDays.map((day) => (
              <div
                key={day}
                className="bg-muted p-1 sm:p-2 text-center text-xs sm:text-base font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
            {days.map((day, i) => {
              const dateStr = day
                ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                : "";
              const isToday = day ? dateStr === todayStr : false;
              const monthDayKey = day
                ? `${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                : "";
              const feastLabels = day
                ? feastLabelsByMonthDay.get(monthDayKey) || []
                : [];
              return (
                <div
                  key={i}
                  className={`min-h-[72px] sm:min-h-[120px] p-1 sm:p-1.5 ${
                    day ? "bg-card" : "bg-muted/50"
                  }`}
                >
                  {day && (
                    <>
                      <span
                        className={`text-sm font-medium ${
                          i % 7 === 0
                            ? "text-destructive"
                            : i % 7 === 6
                              ? "text-primary"
                              : "text-foreground"
                        } ${isToday ? "bg-primary/15 text-primary rounded px-1.5 py-0.5" : ""}`}
                      >
                        {day}
                      </span>
                      {feastLabels.length > 0 && (
                        <p
                          className="mt-1 text-[10px] sm:text-xs font-semibold text-primary truncate"
                          title={feastLabels.join(", ")}
                        >
                          {feastLabels.join(", ")}
                        </p>
                      )}
                      <div className="mt-1 space-y-1 max-h-[60px] sm:max-h-[84px] overflow-y-auto pr-1 calendar-scrollbar">
                        {getEventsForDay(day).map((event) => (
                          <div
                            key={event.ID}
                            className="text-[15px] px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary font-semibold truncate cursor-pointer hover:bg-primary/15"
                            title={event.TITLE}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedEvent(event)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedEvent(event);
                              }
                            }}
                          >
                            {event.TITLE}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Today's Schedule */}
      <div className="card-classic p-5">
        <h3 className="font-heading font-semibold text-base sm:text-lg mb-4">
          📌 오늘 일정
        </h3>
        {eventsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : todayEvents.length > 0 || todayFeastLabels.length > 0 ? (
          <div className="space-y-2">
            {todayFeastLabels.map((feastLabel) => (
              <p
                key={feastLabel}
                className="p-3 rounded-lg border border-primary/30 bg-primary/10 text-primary font-semibold"
              >
                {feastLabel}
              </p>
            ))}
            {todayEvents.map((event) => (
              <button
                key={event.ID}
                onClick={() => setSelectedEvent(event)}
                className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <p className="font-semibold text-base text-foreground">
                  {event.TITLE}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">
            오늘 일정이 없습니다.
          </p>
        )}
      </div>

      {/* Event Detail */}
      <Dialog
        open={!!selectedEvent && !isEditMode}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">일정 상세</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">
                  제목
                </p>
                <p className="font-medium text-base">{selectedEvent.TITLE}</p>
              </div>
              <div>
                <hr />
              </div>
              <div>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                  {selectedEvent.CONTENT || "내용이 없습니다."}
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setEditingEvent(selectedEvent);
                    setIsEditMode(true);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  수정
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    if (confirm("일정을 삭제하시겠습니까?")) {
                      deleteEventMutation.mutate(selectedEvent.ID);
                    }
                  }}
                  disabled={deleteEventMutation.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  {deleteEventMutation.isPending ? "삭제 중..." : "삭제"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Event Edit */}
      <Dialog
        open={isEditMode && !!editingEvent}
        onOpenChange={(open) => {
          if (!open) {
            setIsEditMode(false);
            setEditingEvent(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">일정 수정</DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>제목</Label>
                <Input
                  value={editingEvent.TITLE}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, TITLE: e.target.value })
                  }
                  placeholder="일정 제목"
                />
              </div>
              <div className="space-y-2">
                <Label>날짜</Label>
                <Input
                  type="date"
                  value={editingEvent.DATE}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, DATE: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>설명</Label>
                <Textarea
                  value={editingEvent.CONTENT}
                  onChange={(e) =>
                    setEditingEvent({
                      ...editingEvent,
                      CONTENT: e.target.value,
                    })
                  }
                  placeholder="일정 설명 (선택)"
                />
              </div>
              <Button
                onClick={() => editEventMutation.mutate(editingEvent)}
                className="w-full"
                disabled={editEventMutation.isPending}
              >
                {editEventMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  "저장"
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Latest Meeting Note */}
      <div className="card-classic p-5">
        <button
          onClick={() => onTabChange("meetings")}
          className="font-heading font-semibold text-lg mb-3 hover:text-primary transition-colors cursor-pointer flex items-center gap-2 group"
        >
          📝 최근 회의록
          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        {meetingLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : latestMeeting ? (
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{latestMeeting.TITLE}</h4>
              <span className="text-xs text-muted-foreground">
                {latestMeeting.DATE.split("T")[0]}
              </span>
            </div>
            <pre className="text-sm whitespace-pre-wrap font-body text-foreground/80">
              {latestMeeting.CONTENT}
            </pre>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">
            회의록이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
